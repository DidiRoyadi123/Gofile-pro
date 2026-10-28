#!/usr/bin/env python3
"""
GoFile Pro Downloader - Native Windows Desktop Application
Uses Microsoft Edge WebView2 via pywebview to display a modern, fast GUI
with native file explorer integration, folder dialogs, and multi-threading.
"""

import os
import sys
import json
import http.server
import socket
import threading
import urllib.parse
import mimetypes
from datetime import datetime
from pathlib import Path
import webview
from engine.gofile_engine import GoFileEngine

# Ensure working directory and resource path support PyInstaller bundles
if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
    CURRENT_DIR = Path(sys._MEIPASS)
else:
    CURRENT_DIR = Path(__file__).resolve().parent

os.chdir(Path(__file__).resolve().parent if not getattr(sys, 'frozen', False) else Path(sys.executable).parent)


class WifiShareServer:
    def __init__(self):
        self.server = None
        self.thread = None
        self.port = 8080
        self.download_dir = "./downloads"
        self.ip = "127.0.0.1"

    @staticmethod
    def get_local_ip():
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            return "127.0.0.1"

    def is_running(self):
        return self.server is not None

    def start(self, download_dir="./downloads", preferred_port=8080):
        if self.is_running():
            return True
        self.download_dir = Path(download_dir).resolve()
        self.ip = self.get_local_ip()
        self.port = preferred_port
        base_dir = self.download_dir

        class GoFileShareHandler(http.server.BaseHTTPRequestHandler):
            def log_message(self, format, *args):
                pass

            def do_HEAD(self):
                self.handle_request(head_only=True)

            def do_GET(self):
                self.handle_request(head_only=False)

            def handle_request(self, head_only=False):
                parsed = urllib.parse.urlparse(self.path)
                path = parsed.path
                query = urllib.parse.parse_qs(parsed.query)

                if path in ("/", "/index.html"):
                    self.serve_index(base_dir)
                elif path == "/api/files":
                    self.serve_api(base_dir)
                elif path in ("/file", "/download", "/stream"):
                    file_param = query.get("f", [""])[0]
                    is_dl = path == "/download" or query.get("dl", ["0"])[0] == "1"
                    self.serve_file(base_dir, file_param, is_dl, head_only)
                else:
                    self.send_error(404, "Not Found")

            def serve_index(self, root_dir: Path):
                files = []
                if root_dir.exists():
                    for p in root_dir.rglob("*"):
                        if p.is_file() and not p.name.endswith(".part"):
                            rel = str(p.relative_to(root_dir).parent)
                            if rel == ".":
                                rel = ""
                            st = p.stat()
                            mime, _ = mimetypes.guess_type(p.name)
                            files.append({
                                "name": p.name,
                                "size": st.st_size,
                                "modified": st.st_mtime,
                                "relDir": rel,
                                "mime": mime or "application/octet-stream",
                                "streamPath": f"{rel}/{p.name}".lstrip("/")
                            })

                total_size = sum(f["size"] for f in files)
                def fmt_bytes(b):
                    for u in ['B', 'KB', 'MB', 'GB']:
                        if b < 1024.0:
                            return f"{b:.1f} {u}"
                        b /= 1024.0
                    return f"{b:.1f} TB"

                rows = []
                for f in files:
                    enc_path = urllib.parse.quote(f["streamPath"])
                    sz_str = fmt_bytes(f["size"])
                    dt_str = datetime.fromtimestamp(f["modified"]).strftime("%d %b %Y, %H:%M")
                    mime = f["mime"]
                    is_playable = mime.startswith("video/") or mime.startswith("audio/")
                    is_img = mime.startswith("image/")

                    if mime.startswith("video/"):
                        icon_svg = '<svg class="f-icon" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="2.18" fill="none" stroke="#818cf8" stroke-width="2"/><polygon points="10 8 16 12 10 16 10 8" fill="#818cf8"/></svg>'
                    elif mime.startswith("audio/"):
                        icon_svg = '<svg class="f-icon" viewBox="0 0 24 24"><path d="M9 18V5l12-2v13" fill="none" stroke="#a78bfa" stroke-width="2"/><circle cx="6" cy="18" r="3" fill="#a78bfa"/><circle cx="18" cy="16" r="3" fill="#a78bfa"/></svg>'
                    elif mime.startswith("image/"):
                        icon_svg = '<svg class="f-icon" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="#38bdf8" stroke-width="2"/><circle cx="8.5" cy="8.5" r="1.5" fill="#38bdf8"/><polyline points="21 15 16 10 5 21" fill="none" stroke="#38bdf8" stroke-width="2"/></svg>'
                    else:
                        icon_svg = '<svg class="f-icon" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="none" stroke="#94a3b8" stroke-width="2"/><polyline points="14 2 14 8 20 8" fill="none" stroke="#94a3b8" stroke-width="2"/></svg>'

                    folder_tag = f' • <span class="folder-tag">/{f["relDir"]}</span>' if f["relDir"] else ''
                    play_btn = f'<a href="/stream?f={enc_path}" target="_blank" class="btn btn-secondary">Putar</a>' if is_playable else (f'<a href="/file?f={enc_path}" target="_blank" class="btn btn-secondary">Lihat</a>' if is_img else '')

                    rows.append(f'''<div class="file-card" data-name="{f['name'].lower()}">
                        <div class="file-header">
                            {icon_svg}
                            <div class="file-info">
                                <div class="file-title" title="{f['name']}">{f['name']}</div>
                                <div class="file-meta">{sz_str} • {dt_str}{folder_tag}</div>
                            </div>
                        </div>
                        <div class="file-actions">
                            <a href="/download?f={enc_path}&dl=1" class="btn btn-primary" download>Unduh</a>
                            {play_btn}
                        </div>
                    </div>''')

                rows_html = "".join(rows)
                html = f'''<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">
                <meta name="viewport" content="width=device-width,initial-scale=1">
                <title>GoFile Pro - Berbagi Berkas Wi-Fi</title>
                <style>
                :root{{--bg:#0b0f19;--card:rgba(18,24,38,0.85);--border:rgba(255,255,255,0.08);--text:#f8fafc;--muted:#94a3b8;--primary:#6366f1;--primary-hover:#4f46e5;}}
                * {{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}}
                body{{background:var(--bg);color:var(--text);padding:1.5rem 1rem;min-height:100vh;}}
                .container{{max-width:860px;margin:0 auto;}}
                .header{{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:1px solid var(--border);}}
                .brand{{display:flex;align-items:center;gap:0.75rem;}}
                .logo-badge{{width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#a855f7);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:1.2rem;box-shadow:0 4px 14px rgba(99,102,241,0.4);}}
                .stats{{display:flex;gap:1rem;font-size:0.85rem;color:var(--muted);}}
                .stat-pill{{background:rgba(255,255,255,0.05);padding:0.35rem 0.75rem;border-radius:8px;border:1px solid var(--border);}}
                .search-bar{{width:100%;margin-bottom:1.2rem;}}
                .search-input{{width:100%;padding:0.75rem 1rem;background:var(--card);border:1px solid var(--border);border-radius:10px;color:#fff;font-size:0.95rem;outline:none;}}
                .search-input:focus{{border-color:var(--primary);box-shadow:0 0 0 2px rgba(99,102,241,0.25);}}
                .file-list{{display:flex;flex-direction:column;gap:0.75rem;}}
                .file-card{{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:0.85rem 1.1rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;backdrop-filter:blur(10px);transition:transform 0.15s,border-color 0.15s;}}
                .file-card:hover{{border-color:rgba(99,102,241,0.4);transform:translateY(-1px);}}
                .file-header{{display:flex;align-items:center;gap:0.85rem;min-width:0;flex:1;}}
                .f-icon{{width:28px;height:28px;flex-shrink:0;}}
                .file-info{{min-width:0;flex:1;}}
                .file-title{{font-weight:600;font-size:0.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff;}}
                .file-meta{{font-size:0.75rem;color:var(--muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}}
                .folder-tag{{color:#818cf8;}}
                .file-actions{{display:flex;gap:0.5rem;flex-shrink:0;}}
                .btn{{text-decoration:none;font-size:0.8rem;font-weight:600;padding:0.45rem 0.85rem;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;transition:background 0.15s;}}
                .btn-primary{{background:var(--primary);color:#fff;}}
                .btn-primary:hover{{background:var(--primary-hover);}}
                .btn-secondary{{background:rgba(255,255,255,0.08);color:var(--text);border:1px solid var(--border);}}
                .btn-secondary:hover{{background:rgba(255,255,255,0.14);}}
                @media(max-width:640px){{.file-card{{flex-direction:column;align-items:flex-start;}}.file-actions{{width:100%;justify-content:flex-end;margin-top:0.4rem;}}}}
                </style></head><body>
                <div class="container">
                <div class="header"><div class="brand"><div class="logo-badge">G</div><div><h2>GoFile Pro Share</h2><div style="font-size:0.8rem;color:var(--muted);">Server Berbagi Berkas Wi-Fi Lokal (Windows Desktop)</div></div></div>
                <div class="stats"><div class="stat-pill">{len(files)} Berkas</div><div class="stat-pill">{fmt_bytes(total_size)}</div></div></div>
                <div class="search-bar"><input type="text" class="search-input" id="filter" placeholder="Cari berkas..." oninput="filterFiles()"></div>
                <div class="file-list" id="fileList">{rows_html}</div>
                </div>
                <script>function filterFiles(){{const q=document.getElementById('filter').value.toLowerCase();document.querySelectorAll('.file-card').forEach(el=>{{el.style.display=el.getAttribute('data-name').includes(q)?'flex':'none';}});}}</script>
                </body></html>'''
                body = html.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=UTF-8")
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Connection", "close")
                self.end_headers()
                self.wfile.write(body)

            def serve_api(self, root_dir: Path):
                files = []
                if root_dir.exists():
                    for p in root_dir.rglob("*"):
                        if p.is_file() and not p.name.endswith(".part"):
                            rel = str(p.relative_to(root_dir).parent)
                            if rel == ".":
                                rel = ""
                            st = p.stat()
                            mime, _ = mimetypes.guess_type(p.name)
                            files.append({
                                "name": p.name,
                                "size": st.st_size,
                                "modified": int(st.st_mtime * 1000),
                                "relDir": rel,
                                "mimeType": mime or "application/octet-stream",
                                "streamPath": f"{rel}/{p.name}".lstrip("/")
                            })
                body = json.dumps(files).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=UTF-8")
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Connection", "close")
                self.end_headers()
                self.wfile.write(body)

            def serve_file(self, root_dir: Path, rel_path: str, is_attachment: bool, head_only: bool):
                try:
                    target = (root_dir / rel_path).resolve()
                    if not target.is_relative_to(root_dir) or not target.exists() or not target.is_file():
                        self.send_error(404, "File Not Found")
                        return

                    file_length = target.stat().st_size
                    range_header = self.headers.get("Range")
                    start = 0
                    end = file_length - 1
                    is_partial = False

                    if range_header and range_header.startswith("bytes="):
                        r = range_header[6:].strip()
                        dash = r.find("-")
                        if dash >= 0:
                            s_start = r[:dash].strip()
                            s_end = r[dash+1:].strip()
                            if s_start:
                                start = int(s_start)
                            if s_end:
                                end = min(file_length - 1, int(s_end))
                            if start <= end and start < file_length:
                                is_partial = True

                    content_length = end - start + 1
                    mime, _ = mimetypes.guess_type(target.name)
                    mime = mime or "application/octet-stream"

                    if is_partial:
                        self.send_response(206, "Partial Content")
                        self.send_header("Content-Range", f"bytes {start}-{end}/{file_length}")
                    else:
                        self.send_response(200, "OK")

                    self.send_header("Content-Type", mime)
                    self.send_header("Content-Length", str(content_length))
                    self.send_header("Accept-Ranges", "bytes")
                    self.send_header("Access-Control-Allow-Origin", "*")

                    if is_attachment:
                        safe_name = target.name.replace('"', '')
                        self.send_header("Content-Disposition", f'attachment; filename="{safe_name}"')

                    self.end_headers()

                    if head_only:
                        return

                    with open(target, "rb") as f:
                        if start > 0:
                            f.seek(start)
                        rem = content_length
                        while rem > 0:
                            chunk_sz = min(65536, rem)
                            buf = f.read(chunk_sz)
                            if not buf:
                                break
                            self.wfile.write(buf)
                            rem -= len(buf)
                except Exception:
                    pass

        for attempt in range(10):
            try:
                self.server = http.server.ThreadingHTTPServer(("0.0.0.0", self.port), GoFileShareHandler)
                break
            except Exception:
                self.port += 1

        if not self.server:
            return False

        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        return True

    def stop(self):
        if self.server:
            try:
                self.server.shutdown()
                self.server.server_close()
            except Exception:
                pass
            self.server = None
            self.thread = None


class DesktopAPI:
    def __init__(self, window_holder):
        self.engine = GoFileEngine()
        self.window_holder = window_holder
        self.wifi_server = WifiShareServer()

    @property
    def window(self):
        return self.window_holder.get("window")

    def inspect_content(self, url: str, password: str = ""):
        """Inspects GoFile content URL/ID and returns metadata and file tree."""
        try:
            res = self.engine.inspect_content(url, password if password else None)
            return res
        except Exception as e:
            raise Exception(str(e))

    def download_file(self, item: dict, download_dir: str = "./downloads"):
        """Downloads a single file item with live progress pumped to JS safely."""
        dest_path = Path(download_dir).resolve()
        dest_path.mkdir(parents=True, exist_ok=True)

        import time
        last_eval_time = [0.0]

        def on_progress(prog: dict):
            if self.window:
                now = time.time()
                st = prog.get("status")
                # Dispatch immediately on terminal state or throttle to max 12 calls/sec
                if st in ("completed", "failed") or (now - last_eval_time[0]) >= 0.08:
                    last_eval_time[0] = now
                    try:
                        prog_json = json.dumps(prog)
                        self.window.evaluate_js(f"if (window.updateItemProgress) {{ window.updateItemProgress({prog_json}); }}")
                    except Exception:
                        pass

        try:
            self.engine.reset_stop()
            success = self.engine.download_file(item, dest_path, on_progress=on_progress)
            return success
        except Exception as e:
            raise Exception(str(e))

    def choose_folder(self):
        """Opens native Windows folder selection dialog."""
        if not self.window:
            return None
        result = self.window.create_file_dialog(webview.FOLDER_DIALOG)
        if result and len(result) > 0:
            return result[0]
        return None

    def open_folder(self, folder_path: str = "./downloads"):
        """Opens the folder in Windows File Explorer."""
        try:
            target = Path(folder_path).resolve()
            if not target.exists():
                target.mkdir(parents=True, exist_ok=True)
            if os.name == "nt":
                os.startfile(str(target))
            else:
                import subprocess
                subprocess.run(["xdg-open", str(target)])
            return True
        except Exception as e:
            return False

    def check_file_exists(self, filename: str, rel_dir: str = "", expected_size: int = 0, download_dir: str = "./downloads") -> bool:
        """Checks if a file exists safely within the downloads directory."""
        try:
            dest_base = Path(download_dir).resolve()
            safe_rel = (rel_dir or "").replace("..", "").replace("\\", "/").strip("/")
            safe_name = Path(filename).name
            candidate = (dest_base / safe_rel / safe_name).resolve()
            fallback_base = Path("./downloads").resolve()
            if not (candidate.is_relative_to(dest_base) or candidate.is_relative_to(fallback_base)):
                return False
            if candidate.exists() and candidate.is_file():
                sz = candidate.stat().st_size
                if expected_size > 0:
                    return sz == expected_size
                return sz > 0
            return False
        except Exception:
            return False

    def open_file(self, file_path: str, download_dir: str = "./downloads") -> bool:
        """Opens a downloaded file safely with its default system app."""
        try:
            target = Path(file_path).resolve()
            dest_base = Path(download_dir).resolve()
            fallback_base = Path("./downloads").resolve()
            # Security boundary check: prevent opening files outside downloads
            if not (target.is_relative_to(dest_base) or target.is_relative_to(fallback_base)):
                return False
            if not target.exists() or not target.is_file():
                return False
            if os.name == "nt":
                os.startfile(str(target))
            else:
                import subprocess
                subprocess.run(["xdg-open", str(target)])
            return True
        except Exception:
            return False

    def open_url(self, url: str) -> bool:
        """Opens an external URL safely in default system browser."""
        try:
            import webbrowser
            if url and (url.startswith("http://") or url.startswith("https://")):
                webbrowser.open(url)
                return True
            return False
        except Exception:
            return False

    def install_update(self, exe_path: str) -> bool:
        """Launches the updated Windows executable and closes the current application."""
        try:
            target = Path(exe_path).resolve()
            if not target.exists() or not target.is_file():
                return False
            import subprocess
            if os.name == "nt":
                subprocess.Popen([str(target)], shell=True)
            else:
                subprocess.Popen([str(target)])
            if self.window:
                self.window.destroy()
            return True
        except Exception:
            return False

    def verify_account_token(self, token: str = "") -> dict:
        """Verifies a GoFile account token against the GoFile API."""
        try:
            active_token = token.strip() if token else (self.engine.account_token or "")
            if not active_token:
                return {"valid": False, "status": "no_token", "message": "Token tidak ditemukan"}

            headers = {
                "User-Agent": self.engine.user_agent,
                "Authorization": f"Bearer {active_token}",
                "Accept": "*/*",
                "Origin": "https://gofile.io",
                "Referer": "https://gofile.io/"
            }
            resp = self.engine.session.get("https://api.gofile.io/accounts/getAccountDetails", headers=headers, timeout=8.0)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == "ok":
                    account_data = data.get("data", {})
                    return {
                        "valid": True,
                        "status": "ok",
                        "token": active_token,
                        "email": account_data.get("email", ""),
                        "tier": account_data.get("tier", "standard"),
                        "rootFolder": account_data.get("rootFolder", "")
                    }
            return {"valid": False, "status": "invalid", "message": f"Token tidak valid (HTTP {resp.status_code})"}
        except Exception as e:
            return {"valid": False, "status": "error", "message": str(e)}

    def open_network_settings(self) -> bool:
        """Opens Windows Network & Internet Settings for manual or quick IP reset."""
        try:
            import os
            os.system("start ms-settings:network")
            return True
        except Exception:
            return False

    def purge_network_cache(self) -> bool:
        """Flushes DNS cache and resets requests session socket pool."""
        try:
            import requests
            # Recreate clean session
            self.engine.session.close()
            self.engine.session = requests.Session()
            return True
        except Exception:
            return False

    def stop_all(self):
        """Stops all active download tasks."""
        self.engine.stop_all()
        return True

    def list_downloaded_files(self, download_dir: str = "./downloads"):
        """Scans the downloads directory and returns file metadata."""
        dest_path = Path(download_dir).resolve()
        if not dest_path.exists():
            return []
        results = []
        for p in dest_path.rglob("*"):
            if p.is_file() and not p.name.endswith(".part"):
                rel = str(p.relative_to(dest_path).parent)
                if rel == ".":
                    rel = ""
                st = p.stat()
                results.append({
                    "name": p.name,
                    "path": str(p),
                    "size": st.st_size,
                    "modified": int(st.st_mtime * 1000),
                    "relDir": rel
                })
        return results

    def read_clipboard(self):
        """Reads text from native system clipboard with zero subprocess overhead via Win32 ctypes."""
        if os.name == "nt":
            try:
                import ctypes
                from ctypes import wintypes

                user32 = ctypes.windll.user32
                kernel32 = ctypes.windll.kernel32
                CF_UNICODETEXT = 13

                if user32.OpenClipboard(None):
                    try:
                        h_mem = user32.GetClipboardData(CF_UNICODETEXT)
                        if h_mem:
                            kernel32.GlobalLock.restype = wintypes.LPVOID
                            ptr = kernel32.GlobalLock(h_mem)
                            if ptr:
                                try:
                                    val = ctypes.c_wchar_p(ptr).value or ""
                                    return val.strip()
                                finally:
                                    kernel32.GlobalUnlock(h_mem)
                    finally:
                        user32.CloseClipboard()
            except Exception:
                pass
        return ""

    def delete_file(self, file_path: str, download_dir: str = "./downloads"):
        """Deletes a downloaded file from disk safely, preventing path traversal."""
        try:
            target = Path(file_path).resolve()
            dest_base = Path(download_dir).resolve()
            fallback_base = Path("./downloads").resolve()
            # Security boundary check: file must be inside dest_base or downloads folder
            if not (target.is_relative_to(dest_base) or target.is_relative_to(fallback_base)):
                return False
            if target.exists() and target.is_file():
                target.unlink()
                return True
            return False
        except Exception:
            return False

    def get_media_url(self, file_path: str):
        """Returns local file URI or webview-friendly path for media player."""
        try:
            target = Path(file_path).resolve()
            if target.exists() and target.is_file():
                return target.as_uri()
            return ""
        except Exception:
            return ""

    def start_wifi_share(self, download_dir: str = "./downloads", port: int = 8080):
        ok = self.wifi_server.start(download_dir=download_dir, preferred_port=port)
        return {
            "success": ok,
            "isRunning": self.wifi_server.is_running(),
            "port": self.wifi_server.port,
            "ip": self.wifi_server.ip,
            "url": f"http://{self.wifi_server.ip}:{self.wifi_server.port}"
        }

    def stop_wifi_share(self):
        self.wifi_server.stop()
        return {
            "success": True,
            "isRunning": False
        }

    def get_wifi_share_status(self):
        running = self.wifi_server.is_running()
        ip = WifiShareServer.get_local_ip()
        port = self.wifi_server.port if running else 8080
        if running:
            self.wifi_server.ip = ip
        is_local = (ip != "127.0.0.1" and not ip.startswith("127."))
        return {
            "isRunning": running,
            "port": port,
            "ip": ip,
            "url": f"http://{ip}:{port}",
            "isLocalNetwork": is_local
        }

    def refresh_wifi_share_ip(self):
        return self.get_wifi_share_status()


def main():
    ui_index_path = CURRENT_DIR / "ui" / "index.html"
    if not ui_index_path.exists():
        print(f"Error: UI not found at {ui_index_path}")
        sys.exit(1)

    window_holder = {}
    api = DesktopAPI(window_holder)

    window = webview.create_window(
        title="GoFile Pro Downloader",
        url=str(ui_index_path.as_uri()),
        js_api=api,
        width=1080,
        height=760,
        min_size=(780, 580),
        background_color="#0a0d14",
        easy_drag=False
    )
    window_holder["window"] = window

    # Start PyWebView with native Edge Chromium WebView2 engine
    webview.start(debug=False)


if __name__ == "__main__":
    main()
