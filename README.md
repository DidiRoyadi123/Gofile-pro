# 🚀 GoFile Pro Downloader v2.0 Multiplatform

Aplikasi downloader canggih, cepat, dan modern untuk **GoFile.io** dengan dukungan **Multiplatform (Windows Portable .EXE & Android Native .APK)**. Dilengkapi fitur bypass proteksi API, multi-threading concurrent worker, Tree Explorer folder & preview, serta **File Integrity Guard** untuk mencegah unduhan duplikat.

---

## 📂 Struktur & Penjelasan Nama File Proyek

Berikut rincian berkas dan direktori utama dalam repositori ini:

```
├── android/                   # Source code aplikasi Android (Capacitor Native Android + Java Plugin)
│   ├── app/src/main/java/     # Plugin AndroidDownloaderPlugin.java (Download service, MediaStore, Notifikasi)
│   └── build.gradle           # Konfigurasi Gradle Android SDK
├── engine/                    # Core Python Downloader Engine (Backend logic & API parser)
│   ├── gofile_api.py          # Modul komunikasi API GoFile & Bypass Cloudflare/Token
│   └── downloader.py          # Modul unduhan paralel multi-thread & chunked resume
├── ui/                        # Antarmuka Pengguna (Web Frontend Modern & Glassmorphism)
│   ├── index.html             # Struktur halaman (Home, Unduhan, Kelola File, Settings)
│   ├── css/style.css          # Desain visual modern, responsive mobile & dark theme
│   └── js/
│       ├── api.js             # Bridge komunikasi antara UI dengan Python (desktop) & Java (Android)
│       └── app.js             # Logic antrian, filter file, event listeners & telemetry
├── dist/                      # Direktori biner siap pakai
│   ├── GoFile-Pro.apk         # Installer Android siap pasang di HP
│   └── GoFile-Downloader-v2.exe # Aplikasi Windows siap pakai (Portable tanpa install)
├── desktop_app.py             # Entrypoint desktop GUI berbasis PyWebView
├── gofile-downloader.py       # Versi CLI / backend standalone
├── build_windows.bat          # Script kompilasi instan Windows .EXE
├── build_android.bat          # Script kompilasi instan Android .APK
├── run_desktop.bat            # Script menjalankan aplikasi mode development
├── GoFile-Downloader-v2.spec  # Spesifikasi PyInstaller untuk build Windows
├── capacitor.config.json      # Konfigurasi integrasi Capacitor mobile
├── package.json               # Dependensi Capacitor & Node.js
└── pyproject.toml             # Manajemen dependensi Python (uv / pip)
```

---

## ✨ Fitur Unggulan

### 1. ⚡ Ultra-Fast Parallel Multi-Threading
- Mengunduh file dengan beberapa thread worker simultan (dapat diatur 1 hingga 10 worker).
- Dukungan **Resume Otomatis**: Jika koneksi terputus, unduhan otomatis melanjutkan sisa byte file tanpa mengulang dari 0%.

### 2. 🛡️ Proteksi Integritas & Anti-Duplikat (File Integrity Guard)
- Terinspirasi dari mekanisme verifikasi integritas file, aplikasi memverifikasi **ukuran persis byte file (`exact byte size match`)** dan hash terhadap file yang sudah ada di penyimpanan lokal (`Downloads/GoFile`).
- Jika file yang sama sudah ada dan utuh di perangkat, sistem otomatis **melewatinya (SKIP)** sehingga menghemat kuota internet dan ruang memori.

### 3. 📱 Antarmuka Android Touch-Friendly & Modern
- Desain **Ultra-Sleek Telemetry Bar**: Menampilkan kecepatan download (`Speed`), pekerja aktif (`Workers`), dan total unduhan (`Total`) dalam satu baris horizontal ramping tanpa memadati layar.
- **Icon Quick Action**: Tombol tempel link satu sentuhan (`📋`) dan tombol bersihkan input (`✕`).
- **Unified Unduhan Tab**: Menggabungkan antrean aktif dan riwayat unduhan dengan segmented pill yang rapi.

### 4. 📂 Kelola File (Storage & Media Manager)
- Tab navigasi khusus untuk memantau semua file hasil unduhan langsung dari dalam aplikasi.
- Dashboard kapasitas memori: menampilkan jumlah file dan total gigabyte terpakai.
- Filter instan kategori: `Semua`, `🎬 Video`, `🖼️ Foto`, `📦 Lainnya`.
- Buka file langsung menggunakan pemutar video / foto default HP, atau hapus file fisik dari penyimpanan dan MediaStore.

### 5. 🔄 Non-Blocking Queue (Unduh Dinamis)
- Saat proses unduhan sedang berjalan, Anda tetap bisa memasukkan link baru kapan saja (baik Single URL maupun Batch URL).
- Link baru otomatis masuk ke antrean dan langsung diproses oleh worker yang tersedia tanpa menghentikan unduhan yang ada.

### 6. 🌐 Single & Batch Link Explorer
- **Single Link**: Menyediakan tombol **Explore & Select Files** untuk memilih file tertentu saja (Video/Foto), atau **Download All Directly**.
- **Batch Links**: Tempel banyak link sekaligus (satu link per baris) beserta password opsional untuk diunduh secara berurutan.

---

## 📥 Panduan Instalasi & Cara Menggunakan

### A. Pengguna Android (Install APK Langsung)
File installer sudah tersedia di: **`dist/GoFile-Pro.apk`**

1. Salin file `dist/GoFile-Pro.apk` ke HP Android (melalui kabel USB, WhatsApp, Telegram, atau Google Drive).
2. Di HP Anda, buka aplikasi **File Manager** / **Pengelola File** lalu ketuk file `GoFile-Pro.apk`.
3. Pilih **Install**. Jika muncul izin sumber tak dikenal, aktifkan toggle **"Izinkan dari sumber ini"**.
4. Jika Google Play Protect menampilkan peringatan aplikasi dari luar store, ketuk **Detail selengkapnya** -> **Tetap pasang (Install anyway)**.
5. Buka **GoFile Pro**. Semua file yang diunduh otomatis tersimpan di folder **Internal Storage -> `Download/GoFile/`** dan langsung terbaca di Galeri HP.

### B. Pengguna Windows (Portable .EXE Tanpa Install)
File aplikasi siap pakai tersedia di: **`dist/GoFile-Downloader-v2.exe`**

1. Buka folder `dist/` di komputer Anda.
2. Klik dua kali pada **`GoFile-Downloader-v2.exe`**.
3. Jika Windows SmartScreen memunculkan proteksi, klik **More info** -> **Run anyway**.
4. Aplikasi langsung berjalan dengan antarmuka desktop modern berbasis Edge Chromium.

---

## 🛠️ Panduan Build dari Source Code

### Prasyarat Sistem:
- **Python 3.10+** (disarankan dengan [uv](https://docs.astral.sh/uv/))
- **Node.js (v18+) & npm**
- **JDK 17 atau 21**
- **Android SDK** (untuk build APK Android)

### 1. Build Windows Portable (.EXE):
Cukup jalankan script batch:
```cmd
build_windows.bat
```
Atau manual melalui terminal:
```powershell
.venv\Scripts\pyinstaller GoFile-Downloader-v2.spec --noconfirm
```
File executable akan ter-generate di `dist/GoFile-Downloader-v2.exe`.

### 2. Build Android Package (.APK):
Cukup jalankan script batch:
```cmd
build_android.bat
```
Atau manual melalui terminal:
```powershell
npx cap sync android
cd android
gradlew.bat assembleDebug
cd ..
copy android\app\build\outputs\apk\debug\app-debug.apk dist\GoFile-Pro.apk
```

### 3. Menjalankan Mode Development Desktop:
Untuk menjalankan aplikasi secara langsung dari kode sumber tanpa build:
```cmd
run_desktop.bat
```
atau:
```powershell
python desktop_app.py
```

---

## 📄 Lisensi
Didistribusikan di bawah lisensi GPL v3.0. Dibuat untuk kenyamanan dan efisiensi pengunduhan konten legal di GoFile.io.
