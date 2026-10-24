@echo off
echo ===================================================
echo Building GoFile Pro Downloader Portable (.EXE)
echo ===================================================

echo [1/3] Syncing dependencies with uv...
call uv sync

echo [2/3] Building standalone executable with PyInstaller...
call uv run pyinstaller --noconfirm --clean --onefile --windowed ^
    --name "GoFile-Downloader" ^
    --collect-all curl_cffi ^
    --add-data "ui;ui" ^
    --add-data "engine;engine" ^
    desktop_app.py

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed!
    exit /b %ERRORLEVEL%
)

echo [3/3] Build completed successfully!
echo Executable created at: dist\GoFile-Downloader.exe
echo ===================================================
pause
