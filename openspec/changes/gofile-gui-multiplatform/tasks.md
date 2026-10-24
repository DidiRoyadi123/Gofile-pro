# Implementation Checklist: GoFile Downloader Modern UI & Multiplatform

- [x] 1. **Core Engine & Bridge Enhancement**
  - [x] 1.1 Refactor/adapt GoFile engine agar mendukung event-driven state (progress events, file list inspection callback, pause/cancel signals)
  - [x] 1.2 Implementasi API / Bridge controller untuk komunikasi dua arah antara UI dan Python engine (untuk Windows) dan client-side fallback/native engine (untuk Android)

- [x] 2. **Modern Web UI Development**
  - [x] 2.1 Buat fondasi CSS design system (`ui/css/style.css`): glassmorphic dark theme, sleek color palette (Indigo/Violet/Cyan), typography modern, fluid animations
  - [x] 2.2 Buat antarmuka utama (`ui/index.html`): Header status token, Input form (Single & Batch URLs), Password toggle, Folder/File inspection tree modal, Active download queue cards, Speed meter, dan Settings modal
  - [x] 2.3 Implementasi logic interaktif (`ui/js/app.js`): parsing link, fetch contents tree, checkbox selection, state store, multi-file queue manager, real-time speed & progress updates

- [x] 3. **Windows Portable Executable (.EXE)**
  - [x] 3.1 Setup runner desktop native (`desktop_app.py`) berbasis `pywebview` / local server bridge
  - [x] 3.2 Setup build script (`build_windows.bat`) menggunakan PyInstaller `--onefile --windowed`
  - [x] 3.3 Test dan validasi hasil build executable portable di Windows (`dist\GoFile-Downloader.exe`)

- [x] 4. **Android Package (.APK) & Mobile Readiness**
  - [x] 4.1 Setup Capacitor project (`capacitor.config.json` dan folder `android`)
  - [x] 4.2 Optimasi mobile touch UX & integrasi native Android file download / storage
  - [x] 4.3 Build debug APK menggunakan Gradle wrapper & Android SDK lokal
  - [x] 4.4 Verifikasi ketersediaan file APK siap install untuk Android (`dist\GoFile-Pro.apk`)
  - [x] 4.5 Native AndroidDownloaderPlugin: streaming langsung ke `MediaStore.Downloads` (`Download/GoFile`), integrasi `MediaScanner`, dan penampil `ACTION_VIEW` Intent untuk membuka file/video

- [x] 5. **Documentation & Usability**
  - [x] 5.1 Update README & sertakan instruksi menjalankan EXE di Windows dan cara install APK di Android
