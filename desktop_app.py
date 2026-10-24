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

    def open_file(self, file_path: str):
        """Opens a downloaded file directly with its default system app."""
        try:
            target = Path(file_path).resolve()
            if not target.exists():
                return False
            if os.name == "nt":
                os.startfile(str(target))
            else:
                import subprocess
                subprocess.run(["xdg-open", str(target)])
            return True
        except Exception as e:
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

    def delete_file(self, file_path: str):
        """Deletes a downloaded file from disk."""
        try:
            target = Path(file_path).resolve()
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
