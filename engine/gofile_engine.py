"""
GoFile Core Engine with Callback Support and Threaded Execution.
Maintains 100% compatibility with original GoFile download protocol,
browser TLS impersonation via curl_cffi, resumption logic, and
dynamic website token generation with salt fallback.
"""

from os import getenv, name
import os
from sys import stdout, stderr
from typing import Any, Iterator, Callable, Dict, List, Optional
from itertools import count
import re
import json
import requests
from requests import Response, Timeout
from concurrent.futures import ThreadPoolExecutor, Future
from threading import Event, Lock
from hashlib import sha256
from time import perf_counter, time, sleep
from pathlib import Path
from urllib.parse import urlparse, ParseResult
import mimetypes

# Optional curl_cffi for Chrome TLS fingerprint impersonation (bypasses GoFile edge connection resets)
try:
    from curl_cffi import requests as cffi_requests
    _HAS_CFFI = True
except ImportError:
    cffi_requests = None
    _HAS_CFFI = False

DEFAULT_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)
DEFAULT_SALT = getenv("GOFILE_WT_SALT", "12af056dacea0b")
GOFILE_PROXY = getenv("GOFILE_PROXY", "").strip() or None


def sanitize_filename(filename: str) -> str:
    """Removes characters that are invalid on Windows or POSIX filesystems."""
    clean = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '_', filename)
    clean = clean.strip('. ')
    return clean if clean else "file"


def generate_website_token(
    user_agent: str = DEFAULT_UA,
    account_token: str = "",
    window_offset: int = 0,
    salt: str = DEFAULT_SALT
) -> str:
    """
    Generates dynamic X-Website-Token required by GoFile API.
    Formula: sha256(f"{userAgent}::en-US::{accountToken}::{window}::{salt}")
    """
    time_slot = int(time() // 14400) + window_offset
    raw = f"{user_agent}::en-US::{account_token}::{time_slot}::{salt}"
    return sha256(raw.encode()).hexdigest()


class GoFileEngine:
    def __init__(
        self,
        user_agent: str = DEFAULT_UA,
        account_token: Optional[str] = None,
        timeout: float = 15.0,
        retries: int = 4,
        chunk_size: int = 2097152,  # 2MB
        proxy: Optional[str] = None
    ):
        self.user_agent = user_agent
        self.account_token = account_token or getenv("GF_TOKEN")
        self.timeout = timeout
        self.retries = retries
        self.chunk_size = chunk_size
        self.proxy = proxy or GOFILE_PROXY

        # Initialize session with curl_cffi Chrome impersonation if available
        if _HAS_CFFI and cffi_requests is not None:
            self.session = cffi_requests.Session(impersonate="chrome")
        else:
            self.session = requests.Session()

        if self.proxy:
            self.session.proxies = {"http": self.proxy, "https": self.proxy}

        self.session.headers.update({
            "Accept-Encoding": "gzip, deflate, br",
            "User-Agent": self.user_agent,
            "Connection": "keep-alive",
            "Accept": "*/*",
            "Origin": "https://gofile.io",
            "Referer": "https://gofile.io/",
        })

        self._stop_event = Event()
        self._lock = Lock()
        self._active_downloads: Dict[str, Dict[str, Any]] = {}
        self.executor: Optional[ThreadPoolExecutor] = None

        self._token_file = Path.home() / ".gofile_token"
        if not self.account_token and self._token_file.exists():
            try:
                cached = self._token_file.read_text().strip()
                if cached:
                    self.account_token = cached
            except Exception:
                pass

        try:
            self._ensure_account_token()
        except Exception:
            pass

    def _ensure_account_token(self) -> str:
        """Ensures an account token exists, creating a guest token if needed."""
        if self.account_token:
            self.session.cookies.set("accountToken", self.account_token)
            self.session.headers.update({"Authorization": f"Bearer {self.account_token}"})
            return self.account_token

        if self._token_file.exists():
            try:
                cached = self._token_file.read_text().strip()
                if cached:
                    self.account_token = cached
                    self.session.cookies.set("accountToken", self.account_token)
                    self.session.headers.update({"Authorization": f"Bearer {self.account_token}"})
                    return self.account_token
            except Exception:
                pass

        wt = generate_website_token(self.user_agent, "")
        for attempt in range(self.retries):
            try:
                res = self.session.post(
                    "https://api.gofile.io/accounts",
                    headers={
                        "X-Website-Token": wt,
                        "X-BL": "en-US",
                        "Origin": "https://gofile.io",
                        "Referer": "https://gofile.io/"
                    },
                    timeout=self.timeout
                ).json()
                if res and res.get("status") == "ok":
                    self.account_token = res["data"]["token"]
                    self.session.cookies.set("accountToken", self.account_token)
                    self.session.headers.update({"Authorization": f"Bearer {self.account_token}"})
                    try:
                        self._token_file.write_text(self.account_token)
                    except Exception:
                        pass
                    return self.account_token
            except Exception:
                sleep(1.0)
                continue

        if self.account_token:
            return self.account_token

        raise RuntimeError("Gagal mendapatkan GoFile account token. Pastikan koneksi internet stabil atau gunakan VPN/Proxy.")

    def parse_content_id(self, url: str) -> str:
        """Extracts content ID from GoFile URL."""
        clean = url.strip().split("#")[0].split("?")[0].rstrip("/")
        parts = clean.split("/")
        if len(parts) >= 2 and parts[-2] == "d":
            return parts[-1]
        return parts[-1]

    def _get_content_from_web_fallback(self, content_id: str, password: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Web fallback extracted from reverse-engineered GoFile client."""
        try:
            url = f"https://gofile.io/d/{content_id}"
            resp = self.session.get(url, timeout=self.timeout)
            if resp.status_code != 200:
                return None

            # Look for embedded JSON content
            html = resp.text
            patterns = [
                r'contentData\s*=\s*({.*?});',
                r'var\s+content\s*=\s*({.*?});',
                r'window\.contentData\s*=\s*({.*?});',
                r'const\s+contentData\s*=\s*({.*?});',
            ]
            for pattern in patterns:
                matches = re.findall(pattern, html, re.DOTALL)
                if matches:
                    try:
                        parsed = json.loads(matches[0])
                        return {"status": "ok", "data": parsed}
                    except json.JSONDecodeError:
                        continue
            return None
        except Exception:
            return None

    def inspect_content(self, url: str, password: Optional[str] = None) -> Dict[str, Any]:
        """
        Inspects a GoFile content ID or URL and recursively returns metadata
        and flat list of all files found without downloading them.
        """
        self._ensure_account_token()
        content_id = self.parse_content_id(url)
        hashed_password = sha256(password.encode()).hexdigest() if password else None

        items: List[Dict[str, Any]] = []
        total_size = 0

        def traverse(parent_dir_rel: str, cid: str):
            nonlocal total_size
            # Use GoFile official client parameters
            base_api_url = f"https://api.gofile.io/contents/{cid}"
            params = {
                "contentFilter": "",
                "page": 1,
                "pageSize": 1000,
                "sortField": "createTime",
                "sortDirection": -1
            }
            if hashed_password:
                params["password"] = hashed_password

            # Try current token window (0), and previous window (-1) if error-notPremium
            offsets = [0, -1, 1]
            json_data = None
            last_status = None

            for attempt in range(self.retries):
                offset = offsets[attempt % len(offsets)]
                wt = generate_website_token(self.user_agent, self.account_token or "", window_offset=offset)
                headers = {
                    "Authorization": f"Bearer {self.account_token}",
                    "X-Website-Token": wt,
                    "X-BL": "en-US",
                    "User-Agent": self.user_agent,
                    "Accept": "*/*",
                    "Origin": "https://gofile.io",
                    "Referer": "https://gofile.io/",
                }

                try:
                    resp = self.session.get(base_api_url, params=params, headers=headers, timeout=self.timeout)
                    if resp.status_code == 200:
                        data = resp.json()
                        st = data.get("status")
                        if st == "ok":
                            json_data = data
                            break
                        elif st == "error-rateLimit":
                            sleep(2.0 * (attempt + 1))
                            continue
                        elif st == "error-notPremium":
                            last_status = st
                            sleep(1.0)
                            continue
                        else:
                            last_status = st
                            break
                    else:
                        last_status = f"HTTP {resp.status_code}"
                except Exception as e:
                    last_status = str(e)
                    sleep(1.0)
                    continue

            # If token rejected or error, try web fallback
            if not json_data:
                web_res = self._get_content_from_web_fallback(cid, password)
                if web_res and web_res.get("status") == "ok":
                    json_data = web_res

            if not json_data or json_data.get("status") != "ok":
                raise RuntimeError(
                    f"Koneksi ke server GoFile gagal ({last_status or 'Timeout'}). "
                    "Di Indonesia, koneksi GoFile sering diblokir provider (IndiHome/Telkomsel). "
                    "Pastikan VPN non-Indonesia aktif atau gunakan Proxy."
                )

            data = json_data.get("data", {})
            if data.get("password") and data.get("passwordStatus") != "passwordOk":
                raise PermissionError("Folder ini diproteksi password. Masukkan password yang benar.")

            if data.get("type") != "folder":
                filename = data.get("name", f"file_{cid}")
                file_size = data.get("size", 0)
                total_size += file_size
                raw_mime = data.get("mimetype") or data.get("mimeType")
                if not raw_mime or raw_mime == "application/octet-stream":
                    guessed, _ = mimetypes.guess_type(filename)
                    effective_mime = guessed or "application/octet-stream"
                else:
                    effective_mime = raw_mime

                items.append({
                    "id": data.get("id", cid),
                    "name": filename,
                    "rel_dir": parent_dir_rel,
                    "relDir": parent_dir_rel,
                    "size": file_size,
                    "link": data.get("link"),
                    "mimetype": effective_mime,
                    "md5": data.get("md5", "")
                })
                return

            folder_name = data.get("name", cid)
            current_rel = f"{parent_dir_rel}/{folder_name}".strip("/") if parent_dir_rel else folder_name

            children = data.get("children", {})
            if isinstance(children, dict):
                children_list = list(children.values())
            else:
                children_list = children

            for child in children_list:
                if child.get("type") == "folder":
                    traverse(current_rel, child["id"])
                else:
                    filename = child.get("name", "file")
                    file_size = child.get("size", 0)
                    total_size += file_size

                    raw_child_mime = child.get("mimetype") or child.get("mimeType")
                    if not raw_child_mime or raw_child_mime == "application/octet-stream":
                        guessed, _ = mimetypes.guess_type(filename)
                        effective_child_mime = guessed or "application/octet-stream"
                    else:
                        effective_child_mime = raw_child_mime

                    items.append({
                        "id": child.get("id"),
                        "name": filename,
                        "rel_dir": current_rel,
                        "relDir": current_rel,
                        "size": file_size,
                        "link": child.get("link"),
                        "mimetype": effective_child_mime,
                        "md5": child.get("md5", "")
                    })

        traverse("", content_id)
        return {
            "content_id": content_id,
            "contentId": content_id,
            "url": url,
            "total_files": len(items),
            "totalFiles": len(items),
            "total_size": total_size,
            "totalSize": total_size,
            "files": items
        }

    def _download_simultaneous_file(
        self,
        url: str,
        base_headers: Dict[str, str],
        total_size: float,
        part_path: Path,
        item: Dict[str, Any],
        raw_filename: str,
        on_progress: Optional[Callable[[Dict[str, Any]], None]] = None,
    ) -> bool:
        """
        Downloads a large file using multiple parallel HTTP Range connections (4 to 8 workers).
        """
        num_workers = 8 if total_size >= 200 * 1024 * 1024 else (6 if total_size >= 30 * 1024 * 1024 else 4)
        chunk_segment_size = int((int(total_size) + num_workers - 1) // num_workers)

        try:
            with open(part_path, "wb") as f:
                f.truncate(int(total_size))
        except Exception:
            return False

        file_lock = Lock()
        downloaded_bytes = 0
        failed = False
        start_time = perf_counter()
        last_notify_time = [perf_counter()]

        def worker_segment(seg_idx: int) -> bool:
            nonlocal downloaded_bytes, failed
            seg_start = seg_idx * chunk_segment_size
            seg_end = min((seg_idx + 1) * chunk_segment_size - 1, int(total_size) - 1)
            if seg_start > seg_end:
                return True

            seg_written = 0
            expected = seg_end - seg_start + 1

            for _ in range(3):
                if self._stop_event.is_set() or failed:
                    return False
                s = None
                try:
                    s_headers = dict(base_headers)
                    current_start = seg_start + seg_written
                    s_headers["Range"] = f"bytes={current_start}-{seg_end}"

                    if _HAS_CFFI and cffi_requests is not None:
                        s = cffi_requests.Session(impersonate="chrome")
                    else:
                        s = requests.Session()
                    if self.proxy:
                        s.proxies = {"http": self.proxy, "https": self.proxy}

                    r = s.get(url, headers=s_headers, stream=True, timeout=self.timeout)
                    if r.status_code != 206 and r.status_code != 200:
                        sleep(0.5)
                        continue

                    with open(part_path, "r+b") as out_f:
                        for chunk in r.iter_content(chunk_size=262144):
                            if self._stop_event.is_set() or failed:
                                return False
                            if not chunk:
                                continue
                            c_len = len(chunk)
                            if seg_written + c_len > expected:
                                c_len = expected - seg_written
                                chunk = chunk[:c_len]

                            with file_lock:
                                out_f.seek(seg_start + seg_written)
                                out_f.write(chunk)
                                downloaded_bytes += c_len
                                now = perf_counter()
                                if now - last_notify_time[0] >= 0.2:
                                    last_notify_time[0] = now
                                    elapsed = now - start_time
                                    speed = downloaded_bytes / elapsed if elapsed > 0 else 0
                                    pct = (downloaded_bytes / total_size * 100) if total_size > 0 else 0
                                    if on_progress:
                                        on_progress({
                                            "id": item["id"],
                                            "filename": raw_filename,
                                            "status": "downloading",
                                            "progress": round(pct, 1),
                                            "downloaded": downloaded_bytes,
                                            "total": total_size,
                                            "speed": speed,
                                        })

                            seg_written += c_len
                            if seg_written >= expected:
                                break

                    if seg_written >= expected:
                        return True
                except Exception:
                    sleep(0.5)
                finally:
                    if s:
                        try:
                            s.close()
                        except Exception:
                            pass

            if seg_written < expected:
                failed = True
                return False
            return True

        with ThreadPoolExecutor(max_workers=num_workers) as executor:
            futures = [executor.submit(worker_segment, i) for i in range(num_workers)]
            for fut in futures:
                if not fut.result():
                    return False

        return not failed and downloaded_bytes >= int(total_size)

    def download_file(
        self,
        item: Dict[str, Any],
        dest_dir: Path,
        on_progress: Optional[Callable[[Dict[str, Any]], None]] = None,
    ) -> bool:
        """
        Downloads a single file item with chunking, resume support, and progress events.
        """
        rel_dir = item.get("relDir") or item.get("rel_dir") or ""
        # Strict path traversal protection on rel_dir
        safe_rel_parts = [sanitize_filename(p) for p in Path(rel_dir).parts if p not in (".", "..", "/", "\\", "")]
        safe_rel = Path(*safe_rel_parts) if safe_rel_parts else Path()
        dest_base = dest_dir.resolve()
        file_dir = (dest_base / safe_rel).resolve()
        if not file_dir.is_relative_to(dest_base):
            file_dir = dest_base
        file_dir.mkdir(parents=True, exist_ok=True)

        raw_filename = item["name"]
        filename = sanitize_filename(raw_filename)
        expected_size = int(item.get("size") or 0)
        final_path = file_dir / filename
        part_path = file_dir / f"{filename}.part"

        overwrite = bool(item.get("overwrite") or item.get("isUpdate"))
        if overwrite:
            if final_path.exists():
                try:
                    final_path.unlink()
                except Exception:
                    pass
            if part_path.exists():
                try:
                    part_path.unlink()
                except Exception:
                    pass
        elif final_path.exists() and final_path.stat().st_size > 0:
            if expected_size > 0 and final_path.stat().st_size == expected_size:
                if on_progress:
                    on_progress({
                        "id": item["id"],
                        "filename": filename,
                        "status": "completed",
                        "progress": 100.0,
                        "downloaded": final_path.stat().st_size,
                        "total": final_path.stat().st_size,
                        "speed": 0,
                        "alreadyExists": True,
                        "message": "Already downloaded"
                    })
                return True
            elif expected_size > 0 and final_path.stat().st_size != expected_size:
                # File exists but has a different size -> different file with same name!
                stem = Path(filename).stem
                suffix = Path(filename).suffix
                counter = 1
                while counter < 1000:
                    candidate_name = f"{stem} ({counter}){suffix}"
                    candidate_path = file_dir / candidate_name
                    if not candidate_path.exists():
                        filename = candidate_name
                        final_path = candidate_path
                        part_path = file_dir / f"{filename}.part"
                        break
                    elif candidate_path.stat().st_size == expected_size:
                        if on_progress:
                            on_progress({
                                "id": item["id"],
                                "filename": candidate_name,
                                "status": "completed",
                                "progress": 100.0,
                                "downloaded": candidate_path.stat().st_size,
                                "total": candidate_path.stat().st_size,
                                "speed": 0,
                                "alreadyExists": True,
                                "message": "Already downloaded"
                            })
                        return True
                    counter += 1

        part_size = 0
        url = item.get("link")
        if not url:
            if on_progress:
                on_progress({
                    "id": item["id"],
                    "filename": raw_filename,
                    "status": "failed",
                    "message": "Link unduhan tidak tersedia dari server GoFile"
                })
            return False

        headers = {
            "Referer": "https://gofile.io/",
            "Origin": "https://gofile.io",
            "User-Agent": self.user_agent,
            "Accept": "*/*",
        }
        if self.account_token:
            headers["Cookie"] = f"accountToken={self.account_token}"
        if part_path.exists():
            part_size = part_path.stat().st_size
            headers["Range"] = f"bytes={part_size}-"

        # Create an isolated worker session to avoid thread-safety contention in curl_cffi
        if _HAS_CFFI and cffi_requests is not None:
            worker_session = cffi_requests.Session(impersonate="chrome")
        else:
            worker_session = requests.Session()
        if self.proxy:
            worker_session.proxies = {"http": self.proxy, "https": self.proxy}

        resp: Optional[Any] = None

        try:
            for _ in range(self.retries):
                if self._stop_event.is_set():
                    return False
                try:
                    resp = worker_session.get(url, headers=headers, stream=True, timeout=self.timeout)
                    if resp.status_code in (200, 206):
                        break
                except Exception:
                    sleep(1.0)
                    continue

            if not resp or resp.status_code not in (200, 206):
                if on_progress:
                    on_progress({
                        "id": item["id"],
                        "filename": raw_filename,
                        "status": "failed",
                        "message": f"Server returned status {resp.status_code if resp else 'timeout'}"
                    })
                return False

            # Extract file size
            content_length = resp.headers.get("Content-Length")
            content_range = resp.headers.get("Content-Range")
            total_size: float = 0
            if part_size == 0 and content_length:
                total_size = float(content_length)
            elif content_range:
                total_size = float(content_range.split("/")[-1])
            else:
                total_size = float(item.get("size", 0))

            start_time = perf_counter()
            downloaded = part_size

            # Simultaneous Connections for files >= 6 MB supporting HTTP Range
            supports_range = (resp.headers.get("Accept-Ranges") == "bytes") or (resp.status_code == 206) or (content_range is not None)
            if part_size == 0 and total_size >= 6 * 1024 * 1024 and supports_range:
                try:
                    resp.close()
                except Exception:
                    pass
                simul_ok = self._download_simultaneous_file(
                    url, headers, total_size, part_path, item, raw_filename, on_progress
                )
                if simul_ok and part_path.exists() and part_path.stat().st_size >= int(total_size):
                    if final_path.exists():
                        final_path.unlink()
                    part_path.rename(final_path)
                    if on_progress:
                        on_progress({
                            "id": item["id"],
                            "filename": raw_filename,
                            "status": "completed",
                            "progress": 100.0,
                            "downloaded": total_size,
                            "total": total_size,
                            "speed": 0,
                        })
                    return True
                if part_path.exists():
                    try:
                        part_path.unlink()
                    except Exception:
                        pass
                # Fallback to single stream if simultaneous download failed
                resp = worker_session.get(url, headers=headers, stream=True, timeout=self.timeout)

            with open(part_path, "ab" if part_size > 0 else "wb") as f:
                last_notify_time = perf_counter()
                for chunk in resp.iter_content(chunk_size=self.chunk_size):
                    if self._stop_event.is_set():
                        return False

                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)

                        now = perf_counter()
                        # Update progress every 200ms
                        if now - last_notify_time >= 0.2 or downloaded >= total_size:
                            elapsed = now - start_time
                            speed = (downloaded - part_size) / elapsed if elapsed > 0 else 0
                            pct = (downloaded / total_size * 100) if total_size > 0 else 0

                            if on_progress:
                                on_progress({
                                    "id": item["id"],
                                    "filename": raw_filename,
                                    "status": "downloading",
                                    "progress": round(pct, 1),
                                    "downloaded": downloaded,
                                    "total": total_size,
                                    "speed": speed,
                                })
                            last_notify_time = now

            # Finalize
            if total_size > 0 and part_path.stat().st_size >= int(total_size):
                if final_path.exists():
                    final_path.unlink()
                part_path.rename(final_path)

                if on_progress:
                    on_progress({
                        "id": item["id"],
                        "filename": raw_filename,
                        "status": "completed",
                        "progress": 100.0,
                        "downloaded": total_size,
                        "total": total_size,
                        "speed": 0,
                    })
                return True
            else:
                return False
        except Exception as e:
            if on_progress:
                on_progress({
                    "id": item["id"],
                    "filename": raw_filename,
                    "status": "failed",
                    "message": str(e)
                })
            return False
        finally:
            try:
                worker_session.close()
            except Exception:
                pass

    def stop_all(self):
        """Stops all active download tasks gracefully."""
        self._stop_event.set()

    def reset_stop(self):
        """Resets the stop event to allow new downloads."""
        self._stop_event.clear()
