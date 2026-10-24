# Design: GoFile Downloader Modern UI & Multiplatform (Windows EXE + Android APK)

## 1. Flow Analysis of `gofile-downloader.py`
Setelah meneliti arsitektur dan kode `gofile-downloader.py`, berikut adalah alur kerja intinya:

1. **Inisialisasi & Konfigurasi**:
   - Membaca environment variables atau parameter: `GF_DOWNLOAD_DIR`, `GF_MAX_CONCURRENT_DOWNLOADS`, `GF_MAX_RETRIES`, `GF_TIMEOUT`, `GF_CHUNK_SIZE`, `GF_USERAGENT`, `GF_TOKEN`.
2. **GoFile Account Token**:
   - Jika `GF_TOKEN` disetel, digunakan langsung (`Authorization: Bearer <token>`, `Cookie: accountToken=<token>`).
   - Jika tidak, memanggil API `POST https://api.gofile.io/accounts` untuk mendapatkan akun guest secara otomatis.
3. **Dynamic Website Token (`X-Website-Token`)**:
   - GoFile memproteksi endpoint API dengan salt rahasia dan interval 4 jam:
     `time_slot = int(time()) // 14400`
     `raw = f"{user_agent}::en-US::{account_token}::{time_slot}::12af056dacea0b"`
     `X-Website-Token = sha256(raw.encode()).hexdigest()`
4. **Traversal Pohon Konten (`contents/{id}`)**:
   - URL GoFile (`gofile.io/d/{id}`) diurai untuk mengambil `contentId`.
   - Jika folder berpassword, password di-hash `sha256(password)` dan dikirim ke parameter `&password=...`.
   - Mengambil hierarki folder dan file secara rekursif (`api.gofile.io/contents/{contentId}`).
   - Menangani tabrakan nama file dengan penomoran unik otomatis `(1)`, `(2)`.
5. **Download Engine & Resume**:
   - Multi-threading (`ThreadPoolExecutor`) dengan antrean unduhan paralel.
   - Menggunakan file `.part` sementara.
   - Mendukung **Resume Download**: jika file `.part` sudah ada di disk, kirim header `Range: bytes={part_size}-` dan menerima status `206 Partial Content`.
   - Menghitung kecepatan rata-rata (B/s, KB/s, MB/s, GB/s) dan persentase progress secara real-time.
   - Setelah selesai dan verifikasi ukuran cocok, rename `.part` menjadi file final.

---

## 2. Solusi Arsitektur Multiplatform

Untuk menghadirkan **UI yang rapi dan memukau** serta bisa diinstall di **Windows (EXE/Portable)** dan **Android (APK)**:

### Frontend UI (Unified Premium Design)
- **Tech**: HTML5, Modern CSS (Design System bernuansa sleek dark mode, glassmorphism, accent indigo/cyan gradient, typography Outfit/Inter), Vanilla JS / SPA responsif.
- **Fitur UI**:
  - **Single & Batch Link Input**: Mendukung input 1 link atau banyak link sekaligus + kolom password per-link.
  - **Folder/File Tree Explorer**: Sebelum download, tampilkan preview struktur folder dan daftar file lengkap dengan ukuran, icon tipe file, dan checkbox pilih file.
  - **Live Download Dashboard**: Real-time progress bar, kecepatan (MB/s), ETA, indikator multi-worker, tombol Pause, Resume, Cancel, dan Open Folder.
  - **Settings Panel**: Ganti direktori download, batas concurrent worker (1-10), timeout, chunk size, dan custom token akun GoFile.
  - **History & Completed Log**: Riwayat unduhan yang berhasil / gagal.
  - **Fully Responsive**: Nyaman digunakan di layar Desktop (Windows) maupun Mobile Touchscreen (Android).

### Target Windows: Portable Executable (.exe)
- Dibungkus dengan **PyWebView + PyInstaller**.
- Menjalankan native Edge WebView2 window (ringan, tanpa perlu instalasi browser tambahan, tanpa console terminal hitam).
- Menjalankan core engine Python multi-threaded dengan performa maksimal dan akses penuh ke sistem file Windows.
- Output: `GoFile-Downloader.exe` (Single Portable Exe, siap klik).

### Target Android: Native APK (.apk)
- Dibungkus menggunakan **Capacitor 8** (Android native wrapper).
- Menggunakan Android SDK & Java 21 yang sudah terpasang di sistem pengguna (`C:\Users\Pongo\AppData\Local\Android\Sdk`).
- Download engine client-side terintegrasi (menggunakan HTTP native / Android DownloadManager / Blob streaming) yang menyimpan file langsung ke folder `Download` Android.
- Output: `app-debug.apk` (dapat langsung diinstall di HP Android).
- Dilengkapi juga dengan dukungan **PWA (Progressive Web App)** sehingga bisa juga diinstall instan dari browser mobile jika diinginkan.
