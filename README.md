# GoFile Pro Downloader v2.0 Multiplatform

GoFile Pro Downloader adalah aplikasi pengunduh berkas multi-threaded modern untuk platform GoFile.io, mendukung sistem operasi Windows (Portable .EXE) dan Android (Native .APK). Aplikasi ini dilengkapi sistem inspeksi struktur direktori, auto-resume unduhan terputus, antrean dinamis non-blocking, serta verifikasi integritas berkas untuk mencegah unduhan ganda.

---

## Struktur Berkas Proyek

Rincian struktur dan fungsi direktori serta berkas utama dalam proyek ini:

```
├── android/                   # Kode sumber aplikasi Android (Capacitor Native Android + Java Plugin)
│   ├── app/src/main/java/     # Plugin AndroidDownloaderPlugin.java (Download service, MediaStore, Notifikasi)
│   └── build.gradle           # Konfigurasi Gradle Android SDK
├── engine/                    # Modul inti Python (Backend logic & GoFile API parser)
│   ├── gofile_api.py          # Komunikasi API GoFile, bypass Cloudflare & pembuatan token
│   └── downloader.py          # Engine pengunduhan paralel multi-thread & chunked resume
├── ui/                        # Antarmuka Pengguna (Web Frontend Modern & Dark Theme)
│   ├── index.html             # Struktur tampilan aplikasi (Home, Unduhan, Kelola File, Settings)
│   ├── css/style.css          # Desain visual responsif mobile dan desktop
│   └── js/
│       ├── api.js             # Bridge komunikasi antara antarmuka UI dengan Python & Java
│       └── app.js             # Logika antrian, event listener, filter file & telemetry
├── dist/                      # Direktori rilis berkas biner siap pakai
│   ├── GoFile-Pro.apk         # Berkas instalasi Android
│   └── GoFile-Downloader-v2.exe # Berkas executable Windows portable
├── desktop_app.py             # Entrypoint aplikasi desktop GUI berbasis PyWebView
├── gofile-downloader.py       # Versi CLI / backend standalone
├── build_windows.bat          # Skrip kompilasi otomatis Windows .EXE
├── build_android.bat          # Skrip kompilasi otomatis Android .APK
├── run_desktop.bat            # Skrip menjalankan aplikasi dalam mode development
├── GoFile-Downloader-v2.spec  # Konfigurasi PyInstaller untuk kompilasi Windows
├── capacitor.config.json      # Konfigurasi integrasi Capacitor mobile
├── package.json               # Dependensi Capacitor & Node.js
└── pyproject.toml             # Manajemen dependensi Python
```

---

## Fitur Utama

### 1. Multi-Threading & Resume Support
- Mendukung pengunduhan berkas simultan dengan alokasi 1 hingga 10 worker.
- Fitur auto-resume otomatis melanjutkan sisa byte saat koneksi terputus tanpa mengulang proses dari awal.

### 2. Verifikasi Integritas & Anti-Duplikat
- Menggunakan verifikasi ukuran byte persis dan pencocokan nama berkas terhadap penyimpanan lokal (`Downloads/GoFile`).
- Berkas yang telah lengkap tersimpan di perangkat akan otomatis dilewati (skip) untuk menghemat bandwidth dan kapasitas memori.

### 3. Antarmuka Responsif & Ramah Sentuh
- Desain telemetry bar satu baris yang menyajikan metrik kecepatan, worker aktif, dan akumulasi unduhan secara ringkas.
- Tombol aksi cepat terintegrasi (paste dari clipboard dan pembersih input).
- Tab Unduhan terpadu yang memisahkan antrean aktif dan berkas selesai dengan segmented pill.

### 4. Manajemen Berkas Lokal (Kelola File)
- Tab khusus untuk memantau berkas hasil unduhan langsung di penyimpanan internal.
- Ringkasan ruang memori: total berkas dan kapasitas penyimpanan yang digunakan.
- Filter kategori berkas: Semua, Video, Foto, dan Lainnya.
- Aksi pembuka berkas langsung dengan aplikasi default perangkat dan opsi penghapusan berkas.

### 5. Antrean Dinamis Non-Blocking
- Penambahan link baru (Single Link maupun Batch Links) dapat dilakukan kapan saja saat proses pengunduhan lain sedang berjalan tanpa menghentikan worker yang aktif.

### 6. Mode Single Link & Batch Links
- Single Link: Eksplorasi folder GoFile untuk memilih berkas tertentu atau mengunduh seluruh isi folder.
- Batch Links: Memproses daftar banyak tautan sekaligus secara berurutan.

---

## Panduan Pemasangan

### A. Pengguna Android (.APK)
Berkas installer tersedia di: `dist/GoFile-Pro.apk`

1. Salin berkas `GoFile-Pro.apk` ke perangkat Android Anda.
2. Buka aplikasi File Manager pada perangkat, lalu ketuk berkas `GoFile-Pro.apk`.
3. Pilih opsi Pasang (Install). Jika diminta izin penginstalan dari sumber tidak dikenal, aktifkan izin untuk File Manager Anda.
4. Buka aplikasi GoFile Pro. Berkas yang diunduh akan otomatis tersimpan di direktori `Internal Storage -> Download/GoFile/`.

### B. Pengguna Windows (.EXE Portable)
Berkas aplikasi siap pakai tersedia di: `dist/GoFile-Downloader-v2.exe`

1. Buka folder `dist/` pada komputer Anda.
2. Klik dua kali pada `GoFile-Downloader-v2.exe`.
3. Jika Windows SmartScreen menampilkan konfirmasi, pilih More Info lalu klik Run anyway.
4. Aplikasi akan terbuka langsung tanpa memerlukan proses instalasi sistem.

---

## Panduan Build dari Source Code

### Prasyarat Sistem:
- Python 3.10+
- Node.js (v18+) & npm
- JDK 17 atau 21
- Android SDK (untuk build APK Android)

### 1. Build Windows Portable (.EXE):
Jalankan file batch:
```cmd
build_windows.bat
```
Atau melalui terminal:
```powershell
.venv\Scripts\pyinstaller GoFile-Downloader-v2.spec --noconfirm
```
Hasil kompilasi akan tersimpan di `dist/GoFile-Downloader-v2.exe`.

### 2. Build Android Package (.APK):
Jalankan file batch:
```cmd
build_android.bat
```
Atau melalui terminal:
```powershell
npx cap sync android
cd android
gradlew.bat assembleDebug
cd ..
copy android\app\build\outputs\apk\debug\app-debug.apk dist\GoFile-Pro.apk
```

### 3. Menjalankan Mode Development:
Untuk menjalankan aplikasi desktop secara langsung dari kode sumber:
```cmd
run_desktop.bat
```
Atau:
```powershell
python desktop_app.py
```

---

## Lisensi
Didistribusikan di bawah lisensi GPL v3.0. Dibuat untuk efisiensi pengunduhan konten legal di GoFile.io.
