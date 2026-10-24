#!/usr/bin/env python3
"""
GoFile Pro Downloader - Native Windows Desktop Application
Uses Microsoft Edge WebView2 via pywebview to display a modern, fast GUI
with native file explorer integration, folder dialogs, and multi-threading.
"""

import os
import sys
import json
from pathlib import Path
import webview
from engine.gofile_engine import GoFileEngine

# Ensure working directory and resource path support PyInstaller bundles
if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
    CURRENT_DIR = Path(sys._MEIPASS)
else:
    CURRENT_DIR = Path(__file__).resolve().parent

os.chdir(Path(__file__).resolve().parent if not getattr(sys, 'frozen', False) else Path(sys.executable).parent)


class DesktopAPI:
    def __init__(self, window_holder):
        self.engine = GoFileEngine()
        self.window_holder = window_holder

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
        """Downloads a single file item with live progress pumped to JS."""
        dest_path = Path(download_dir).resolve()
        dest_path.mkdir(parents=True, exist_ok=True)

        def on_progress(prog: dict):
            if self.window:
                # Dispatch progress event to JavaScript
                prog_json = json.dumps(prog)
                self.window.evaluate_js(f"if (window.updateItemProgress) {{ window.updateItemProgress({prog_json}); }}")

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
        """Reads text from native system clipboard with PowerShell fallback."""
        try:
            import subprocess
            if os.name == "nt":
                res = subprocess.run(
                    ["powershell", "-NoProfile", "-Command", "Get-Clipboard"],
                    capture_output=True,
                    text=True,
                    timeout=2
                )
                return res.stdout.strip()
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
        easy_drag=True
    )
    window_holder["window"] = window

    # Start PyWebView with native Edge Chromium WebView2 engine
    webview.start(debug=False)


if __name__ == "__main__":
    main()
