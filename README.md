# GoFile Pro Downloader v2.0 Multiplatform (Android & Windows Portable UI)

GoFile Pro Downloader is a high-speed, modern multi-threaded download manager designed for GoFile.io. It supports both **Android (Native .APK)** and **Windows (Portable .EXE)** platforms. Built with directory tree inspection, automatic chunked resume, a non-blocking dynamic queue, and strict file integrity verification to prevent duplicate downloads.

GoFile Pro Downloader adalah aplikasi pengunduh berkas multi-threaded modern untuk platform GoFile.io, mendukung sistem operasi **Android (.APK)** dan **Windows (.EXE)**. Dilengkapi inspeksi struktur direktori, auto-resume unduhan terputus, antrean dinamis non-blocking, serta verifikasi integritas berkas untuk mencegah unduhan ganda.

---

## Support & Sponsorship / Dukungan & Sponsor

GoFile Pro is 100% free, open-source, and ad-free. If you find this software helpful, consider supporting ongoing development and maintenance by buying a cup of coffee:

GoFile Pro 100% gratis, open-source, dan bebas iklan. Jika aplikasi ini membantu Anda, dukung kelanjutan pengembangan dan pemeliharaan fitur dengan mentraktir secangkir kopi:

- **Trakteer**: [https://trakteer.id/roy1304](https://trakteer.id/roy1304)
- **GitHub**: [https://github.com/DidiRoyadi123/Gofile-pro](https://github.com/DidiRoyadi123/Gofile-pro)

---

## Project Structure / Struktur Berkas

```
├── android/                   # Android source code (Capacitor Native Android + Java Plugin)
│   ├── app/src/main/java/     # AndroidDownloaderPlugin.java (Download service, MediaStore, Intent)
│   └── build.gradle           # Android Gradle configuration
├── engine/                    # Core Python engine (Backend logic & API communication)
│   ├── gofile_engine.py       # GoFile API client, dynamic tokens, multi-threaded worker
│   └── gofile_api.py          # Legacy / helper utilities
├── ui/                        # Modern Web Frontend (Dark & Light Theme)
│   ├── index.html             # UI layout (Home, Downloads, File Manager, Settings)
│   ├── css/style.css          # Responsive styling for mobile and desktop (Dark/Light palettes)
│   └── js/
│       ├── api.js             # Universal API bridge between UI, Python, and Java
│       ├── app.js             # App controller, event handlers, telemetry & queue
│       ├── i18n.js            # Multi-language translation engine (Indonesian & English)
│       ├── theme.js           # Theme manager (Auto, Dark, Light)
│       └── client_engine.js   # Pure client-side GoFile engine fallback
├── dist/                      # Ready-to-use binaries
│   ├── GoFile-Pro.apk         # Android installation package (.APK)
│   └── GoFile-Downloader-v2.exe # Windows portable standalone (.EXE)
├── desktop_app.py             # Desktop GUI entrypoint based on PyWebView
├── gofile-downloader.py       # Standalone CLI / backend script
├── build_windows.bat          # Automated Windows .EXE build script
├── build_android.bat          # Automated Android .APK build script
├── run_desktop.bat            # Development mode runner script
├── GoFile-Downloader-v2.spec  # PyInstaller packaging configuration
├── capacitor.config.json      # Mobile integration config
└── pyproject.toml             # Python dependency configuration
```

---

## Key Features / Fitur Utama

1. **Multi-Language Support (Bilingual ID / EN)**
   - Automatically detects phone/PC system language (`navigator.language`).
   - Seamless manual override in Settings (Indonesian / English).
   - *Dukungan multi-bahasa dengan deteksi otomatis sistem HP/PC dan opsi manual di Pengaturan.*

2. **Dark & Light Mode (Mode Gelap & Terang)**
   - Ultra-clean aesthetic with curated dark (deep obsidian) and light (slate & indigo glass) palettes.
   - Quick header toggle and auto-matching with system preferences (`prefers-color-scheme`).
   - *Dukungan mode gelap dan terang dengan peralihan instan di header dan pengaturan sistem.*

3. **Multi-Threaded Acceleration & Auto-Resume**
   - Configurable concurrent workers (1 to 10 threads).
   - Automatically resumes interrupted downloads without re-downloading existing chunks.
   - *Mendukung pengunduhan simultan multi-worker (1-10 threads) dengan fitur auto-resume.*

4. **File Integrity Verification & Duplicate Skipping**
   - Precise byte-size matching against existing downloads in local storage (`Downloads/GoFile`).
   - Already downloaded files are automatically skipped to preserve mobile data and storage.
   - *Pengecekan ukuran byte persis terhadap penyimpanan lokal; file ganda otomatis dilewati.*

5. **Touch-Friendly Responsive UI & Trakteer Support**
   - Compact single-line telemetry banner displaying real-time speed, active workers, and session total.
   - Prominent header support badge and per-page sponsor cards for Trakteer.
   - *Desain modern responsif dengan bilah telemetri serta integrasi dukungan Trakteer yang elegan.*

6. **Internal Storage Manager (Kelola File)**
   - View, search, and manage downloaded files directly on device storage.
   - Quick category filters: All, Videos, Photos, and Other archives.
   - Direct file launching with default device apps and safe deletion.
   - *Manajemen berkas internal untuk memantau, memfilter, membuka, dan menghapus file hasil unduhan.*

7. **Non-Blocking Dynamic Queue**
   - Add new single links or batch links at any time while active downloads are in progress.
   - *Penambahan link baru dapat dilakukan kapan saja tanpa mengganggu proses unduhan yang sedang berjalan.*

8. **Automatic Startup Storage Synchronization**
   - Automatically scans the download folder on launch to index existing files upon fresh install or update.
   - *Otomatis memindai folder penyimpanan saat aplikasi dibuka untuk mendata file yang telah ada.*

---

## Installation Guide / Panduan Pemasangan

### Android (.APK)
Binary package: `dist/GoFile-Pro.apk` (or download from [GitHub Releases](https://github.com/DidiRoyadi123/Gofile-pro/releases))

1. Copy `GoFile-Pro.apk` to your Android device or download it directly via your mobile browser.
2. Open your device's File Manager and tap `GoFile-Pro.apk` to install.
3. Allow installation from unknown sources if prompted.
4. Downloaded files are saved to `Internal Storage -> Download/GoFile/`.

*1. Salin berkas `GoFile-Pro.apk` ke perangkat Android Anda.*  
*2. Buka File Manager dan ketuk berkas untuk menginstal.*  
*3. Berkas hasil unduhan tersimpan di `Penyimpanan Internal -> Download/GoFile/`.*

### Windows (.EXE Portable)
Binary package: `dist/GoFile-Downloader-v2.exe` (or download from [GitHub Releases](https://github.com/DidiRoyadi123/Gofile-pro/releases))

1. Download or locate `GoFile-Downloader-v2.exe` in the `dist/` directory.
2. Double-click `GoFile-Downloader-v2.exe` to run.
3. If Windows SmartScreen prompts for confirmation, select **More Info** -> **Run anyway**.
4. Runs standalone without installation.

*1. Buka folder `dist/` dan jalankan `GoFile-Downloader-v2.exe`.*  
*2. Jika muncul konfirmasi SmartScreen, pilih Info Selengkapnya lalu Tetap Jalankan.*  
*3. Berjalan portabel tanpa perlu proses instalasi sistem.*

---

## Building from Source / Panduan Build

### Prerequisites / Prasyarat:
- Python 3.10+
- Node.js (v18+) & npm
- JDK 17 or JDK 21
- Android SDK (for Android APK build)

### Build Windows Executable (.EXE):
```cmd
build_windows.bat
```
Or manually:
```powershell
uv run pyinstaller GoFile-Downloader-v2.spec --noconfirm
```
Output: `dist/GoFile-Downloader-v2.exe`

### Build Android Package (.APK):
```cmd
build_android.bat
```
Or manually:
```powershell
npx cap copy android
cd android
gradlew.bat assembleDebug
cd ..
Copy-Item android\app\build\outputs\apk\debug\app-debug.apk dist\GoFile-Pro.apk
```
Output: `dist/GoFile-Pro.apk`

---

## License / Lisensi
Distributed under the GNU General Public License v3.0 (GPLv3). Intended for fast and efficient downloading of user-authorized content from GoFile.io.
