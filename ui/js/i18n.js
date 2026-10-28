/**
 * GoFile Pro Downloader - i18n Translation & Localization Module
 * Seamlessly manages English and Indonesian translations with system auto-detection and persistence.
 */

const I18n = {
  currentLang: 'id',
  langSetting: 'auto',

  translations: {
    id: {
      // Top Header & Status
      'header.status_online': 'Online',
      'header.downloading': 'Mengunduh {done}/{total}',
      'header.theme_toggle': 'Ubah Tema (Gelap / Terang)',
      'header.settings_btn': 'Pengaturan',
      'header.trakteer': 'Traktir Kopi',
      'sponsor.banner_title': 'Dukung Pengembang',
      'sponsor.banner_desc': 'GoFile Pro 100% gratis & tanpa iklan. Traktir secangkir kopi untuk pembaruan fitur!',
      'sponsor.banner_btn': 'Traktir Kopi ☕',

      // Navigation Tabs
      'nav.home': 'Home',
      'nav.downloads': 'Unduhan',
      'nav.files': 'Kelola File',
      'nav.settings': 'Pengaturan',

      // Telemetry Strip
      'telemetry.speed': 'Kecepatan',
      'telemetry.workers': 'Pekerja',
      'telemetry.total': 'Total',

      // Single & Batch Sub-tabs
      'home.single_tab': 'Single Link (Link Tunggal)',
      'home.batch_tab': 'Batch Links (Banyak Link)',
      'home.title': 'Download GoFile Folder & File',
      'home.subtitle': 'Unduh folder penuh secara otomatis dengan pemulihan koneksi & multi-thread',
      'home.url_label': 'GoFile URL / Content ID',
      'home.url_placeholder': 'Contoh: https://gofile.io/d/abc123 atau ID konten',
      'home.paste_title': 'Tempel link dari clipboard',
      'home.clear_title': 'Bersihkan inputan',
      'home.password_label': 'Password Folder (Jika Ada)',
      'home.password_placeholder': 'Biarkan kosong jika tidak diproteksi password',
      'home.explore_btn': 'Jelajahi & Pilih File',
      'home.download_all_btn': 'Unduh Semua Langsung',
      'home.exploring': 'Menghubungi...',
      'home.fetching': 'Mengambil file...',
      'home.batch_label': 'Daftar Link GoFile (Satu link per baris)',
      'home.batch_placeholder': 'Tempel kumpulan link GoFile di sini, satu link per baris...\nContoh:\nhttps://gofile.io/d/xyz123 password123\nhttps://gofile.io/d/abc456',
      'home.batch_paste': 'Tempel Batch',
      'home.batch_clear': 'Hapus Semua',
      'home.batch_summary': '{count} link terdeteksi',
      'home.batch_start': 'Mulai Unduh Semua Link',

      // Downloads Tab
      'downloads.title': 'Pusat Unduhan',
      'downloads.subtitle': 'Pantau progres unduhan aktif dan riwayat file yang selesai',
      'downloads.tab_queue': 'Antrean Aktif',
      'downloads.tab_history': 'Selesai Diunduh',
      'downloads.start_all': 'Lanjutkan Semua',
      'downloads.pause_all': 'Jeda Semua',
      'downloads.retry_all': 'Coba Lagi Semua',
      'downloads.open_folder': 'Buka Folder',
      'downloads.clear_queue': 'Bersihkan Antrean',
      'downloads.clear_history': 'Bersihkan Riwayat',
      'downloads.empty_queue_title': 'Antrean Masih Kosong',
      'downloads.empty_queue_desc': 'Masukkan link di tab Home untuk mulai mengunduh file',
      'downloads.empty_history_title': 'Belum Ada Riwayat Unduhan',
      'downloads.empty_history_desc': 'File yang berhasil selesai diunduh akan tercatat di sini',
      'downloads.status_queued': 'Menunggu',
      'downloads.status_downloading': 'Mengunduh',
      'downloads.status_completed': 'Selesai',
      'downloads.status_failed': 'Gagal',
      'downloads.status_paused': 'Dijeda',
      'downloads.open_file': 'Buka File',
      'downloads.folder_loc': 'Folder',

      // Stored Files Manager
      'files.title': 'Kelola File Tersimpan',
      'files.subtitle': 'Jelajahi, buka, atau hapus file yang sudah tersimpan di memori perangkat',
      'files.search_placeholder': 'Cari nama file...',
      'files.sort_newest': 'Terbaru',
      'files.sort_oldest': 'Terlama',
      'files.sort_largest': 'Ukuran Terbesar',
      'files.sort_smallest': 'Ukuran Terkecil',
      'files.sort_name': 'Nama (A-Z)',
      'files.refresh_btn': 'Segarkan',
      'files.open_dir_btn': 'Buka Folder',
      'files.delete_all_btn': 'Hapus Semua File',
      'files.empty_title': 'Belum Ada File yang Disimpan',
      'files.empty_desc': 'File yang telah diunduh akan otomatis tersinkronisasi dan muncul di sini',
      'files.open': 'Buka',
      'files.delete': 'Hapus',
      'files.stats_summary': '{count} file tersimpan • Total: {size}',
      'files.confirm_delete': 'Hapus file "{name}" dari penyimpanan perangkat?',
      'files.confirm_delete_all': 'PERINGATAN: Anda yakin ingin menghapus SEMUA {count} file dari folder unduhan?',

      // Settings Tab
      'settings.title': 'Pengaturan Aplikasi',
      'settings.save_btn': 'Simpan Pengaturan',
      'settings.lang_label': 'Bahasa Tampilan (Language)',
      'settings.lang_auto': 'Otomatis (Sesuai Bahasa HP/PC)',
      'settings.lang_id': 'Bahasa Indonesia (ID)',
      'settings.lang_en': 'English (EN)',
      'settings.theme_label': 'Tema Tampilan (Theme)',
      'settings.theme_auto': 'Otomatis (Sesuai Sistem)',
      'settings.theme_dark': 'Mode Gelap (Dark)',
      'settings.theme_light': 'Mode Terang (Light)',
      'settings.download_dir_label': 'Folder Penyimpanan Unduhan',
      'settings.browse_btn': 'Telusuri...',
      'settings.download_dir_help': 'Pada Windows, file disimpan di direktori ini. Pada Android, file otomatis disimpan di folder Download internal.',
      'settings.workers_label': 'Maksimal Thread Pekerja (Workers)',
      'settings.chunk_size_label': 'Ukuran Potongan (Chunk Size)',
      'settings.token_label': 'Custom GoFile Account Token (Opsional)',
      'settings.token_placeholder': 'Opsional. Jika Anda memiliki token akun premium GoFile',
      'settings.token_help': 'Biarkan kosong untuk otomatis membuat dan memakai sesi guest gratis.',
      'settings.retries_label': 'Percobaan Ulang Koneksi (Retries)',
      'settings.timeout_label': 'Waktu Tunggu Koneksi (Detik)',
      'settings.notif_label': 'Mode Notifikasi Unduhan',
      'settings.notif_discreet': 'Hening (Hanya beritahu saat semua file selesai - Disarankan)',
      'settings.notif_each': 'Notifikasi setiap 1 file selesai',
      'settings.notif_silent': 'Senyap total (Hanya indikator badge)',
      'settings.notif_help': 'Mode hening mencegah spam notifikasi berlebih saat mengunduh banyak file sekaligus.',
      'settings.auto_cat_label': 'Kategori Folder Otomatis (Smart Subfolders)',
      'settings.auto_cat_help': 'Otomatis memisahkan berkas ke dalam subfolder Videos/, Photos/, Music/, dan Archives/ di folder penyimpanan Anda.',
      'settings.sponsor_title': 'Open Sponsor & Traktir Kopi',
      'settings.sponsor_subtitle': 'GoFile Pro 100% gratis & bebas iklan. Dukungan sukarela Anda sangat berharga untuk kelangsungan aplikasi.',
      'settings.sponsor_desc': 'Suka dengan kemudahan dan kecepatan GoFile Pro? Traktir secangkir kopi melalui Trakteer untuk mendukung pembaruan fitur di masa depan.',
      'settings.trakteer_btn': 'Dukung Saya di Trakteer',
      'settings.github_btn': 'GitHub Project',
      'settings.update_title': 'Pembaruan Aplikasi',
      'settings.update_subtitle': 'Periksa dan perbarui GoFile Pro langsung dari aplikasi.',
      'settings.update_check_btn': 'Cek Pembaruan',
      'settings.update_checking': 'Memeriksa...',
      'settings.update_latest': 'Aplikasi Anda sudah versi terbaru ({version})',
      'settings.update_available': 'Versi baru {version} tersedia!',
      'settings.save_btn_bottom': 'Simpan Pengaturan',

      // Update Modal
      'update_modal.title': 'Pembaruan Aplikasi Tersedia',
      'update_modal.version_badge': 'Versi Terbaru: {version}',
      'update_modal.current_badge': 'Versi Saat Ini: {version}',
      'update_modal.changelog': 'Catatan Rilis / Pembaruan:',
      'update_modal.download_btn': 'Unduh & Pasang Sekarang',
      'update_modal.downloading': 'Mengunduh Pembaruan ({progress}%)',
      'update_modal.installing': 'Membuka Pemasang Paket...',
      'update_modal.later_btn': 'Nanti Saja',
      'update_modal.permission_notice': 'Catatan Android: Jika diminta persetujuan instalasi dari sumber tidak dikenal, silakan izinkan agar pembaruan dapat terpasang otomatis.',
      'update_modal.permission_btn': 'Beri Izin Instalasi HP',

      // Inspection Modal
      'modal.folder_title': 'Konten Folder',
      'modal.folder_subtitle': '{count} file • Total: {size}',
      'modal.select_all': 'Pilih Semua',
      'modal.chip_all': 'Semua',
      'modal.chip_video': 'Video',
      'modal.chip_photo': 'Foto',
      'modal.chip_none': 'Batal',
      'modal.cancel_btn': 'Batal',
      'modal.download_btn': 'Unduh {count} File ({size})',
      'modal.download_default': 'Unduh Terpilih',
      'modal.summary_selected': '{count} dari {total} file terpilih ({size})',

      // Toasts & Messages
      'toast.pasted': 'Link berhasil ditempel.',
      'toast.clipboard_empty': 'Clipboard kosong atau belum ada link yang disalin.',
      'toast.clipboard_error': 'Gagal membaca clipboard.',
      'toast.cleared': 'Inputan berhasil dibersihkan.',
      'toast.enter_url': 'Masukkan link GoFile atau Content ID terlebih dahulu',
      'toast.connecting': 'Menghubungi server GoFile... (Pastikan VPN aktif jika ISP memblokir)',
      'toast.empty_folder': 'Tidak ada file ditemukan dalam folder ini',
      'toast.queue_added': 'Berhasil menambahkan {count} file ke antrean!',
      'toast.settings_saved': 'Pengaturan berhasil disimpan!',
      'toast.all_completed': '🎉 Semua {count} file berhasil diunduh!',
      'toast.already_exists': 'File "{name}" sudah ada di memori internal (di-skip).',
      'toast.failed': 'Gagal: {name}',
      'toast.queue_resumed': 'Melanjutkan {count} unduhan...',
      'toast.all_active': 'Semua unduhan aktif',
      'toast.paused_all': 'Semua unduhan dijeda (Paused)',
      'toast.queue_cleared': 'Semua antrean dibersihkan',
      'toast.history_cleared': 'Riwayat unduhan dibersihkan',
      'toast.dir_selected': 'Folder dipilih: {path}',
      'toast.file_deleted': 'File "{name}" berhasil dihapus.',
      'toast.all_deleted': '{count} file berhasil dihapus dari penyimpanan.',
      'toast.auto_cat_enabled': 'Kategori Folder Otomatis: Diaktifkan',
      'toast.auto_cat_disabled': 'Kategori Folder Otomatis: Dinonaktifkan',
      'toast.initial_sync': 'Sinkronisasi awal: {count} file terdeteksi di folder unduhan.',
      'toast.batch_pasted': 'Link batch berhasil ditempel.',
      'toast.batch_cleared': 'Semua inputan batch berhasil dihapus.',
      'toast.fetching_files': 'Mengambil daftar semua file...',
      'toast.no_downloadable': 'Tidak ada file yang dapat diunduh.',
      'toast.no_video': 'Tidak ada file video di folder ini.',
      'toast.selected_video': 'Memilih {count} file video.',
      'toast.no_photo': 'Tidak ada file foto di folder ini.',
      'toast.selected_photo': 'Memilih {count} file foto.',
      'toast.no_audio': 'Tidak ada file audio di folder ini.',
      'toast.selected_audio': 'Memilih {count} file audio.',
      'toast.select_at_least_one': 'Pilih setidaknya 1 file untuk diunduh',
      'toast.password_required': 'Link ini memerlukan password!',
      'toast.server_copied': 'Tautan server berhasil disalin ke clipboard!',
      'toast.queue_exported': 'Data antrean berhasil disalin ke clipboard!',
      'toast.queue_imported': 'Berhasil menambahkan {count} link antrean!',
      'toast.perm_storage_opening': 'Membuka pengaturan izin akses penyimpanan...',
      'toast.perm_battery_opening': 'Membuka pengaturan optimasi baterai (Unrestricted)...',
      'toast.rate_limit_429': 'IP dibatasi sementara oleh GoFile (HTTP 429). Aktifkan Mode Pesawat di HP selama 3 detik untuk ganti IP baru!',

      // Permissions Onboarding Modal
      'perm.modal_title': 'Persetujuan Izin & Antikill Sistem',
      'perm.modal_desc': 'Aktifkan izin berikut agar GoFile Pro dapat mengunduh di latar belakang saat HP terkunci/sleep:',
      'perm.storage_title': 'Akses Penyimpanan File Penuh',
      'perm.storage_desc': 'Wajib agar file unduhan dapat disimpan ke folder Download & dibaca oleh galeri/aplikasi lain.',
      'perm.storage_btn': 'Beri Izin File',
      'perm.battery_title': 'Antikill Baterai (Unrestricted)',
      'perm.battery_desc': 'Sangat penting agar proses unduhan TIDAK dimatikan Android saat HP sleep, layar mati, atau membuka aplikasi lain.',
      'perm.battery_btn': 'Beri Izin Antikill',
      'perm.notif_title': 'Notifikasi Bilah Status',
      'perm.notif_desc': 'Memastikan bilah progres unduhan tetap aktif dan proses aman dari kill OS.',
      'perm.status_granted': 'Sudah Aktif ✅',
      'perm.status_pending': 'Belum Aktif ⚠️',
      'perm.continue_btn': 'Lanjutkan ke Aplikasi',
      'perm.later_btn': 'Nanti Saja (Mode Terbatas)',

      // Token Validation in Settings
      'settings.token_test_btn': 'Tes Validitas Token',
      'settings.token_verifying': 'Memeriksa ke server GoFile...',
      'settings.token_valid_premium': 'Token Valid: GoFile Premium ✅',
      'settings.token_valid_free': 'Token Valid: Akun Standard ⚡',
      'settings.token_invalid': 'Token Tidak Valid atau Kedaluwarsa ❌',

      // Cross-Device Transfer
      'transfer.btn_title': 'Kirim ke HP Lain',
      'transfer.modal_title': 'Pindah & Bagikan ke HP Lain',
      'transfer.tab_wifi': 'Kirim File via Wi-Fi',
      'transfer.tab_queue': 'Salin Antrean Unduhan',
      'transfer.queue_summary': 'Ekspor seluruh antrean ({count} link) untuk dilanjutkan di HP lain:',
      'transfer.copy_queue': 'Salin Data Antrean',
      'transfer.import_placeholder': 'Tempel data antrean dari HP lain di sini...',
      'transfer.import_btn': 'Impor & Mulai Unduh',

      // IP Limit Modal
      'ip.modal_title': 'Solusi Cepat: IP Dibatasi GoFile',
      'ip.airplane_step': '1. Mode Pesawat (HP): Aktifkan Mode Pesawat selama 3 detik lalu matikan lagi untuk mendapatkan IP baru dari operator.',
      'ip.warp_step': '2. Wi-Fi / IndiHome: Sambungkan ke Cloudflare 1.1.1.1 (WARP) atau VPN gratis untuk bypass IP limit.',
      'ip.token_step': '3. Token Akun: Masukkan token GoFile Anda di tab Pengaturan untuk batas kuota unduhan yang lebih besar.',
      'ip.close_btn': 'Mengerti & Coba Lagi',

      // ExoVideoView Media Player
      'player.locked': 'Layar Terkunci • Ketuk untuk Membuka',
      'player.locked_toast': 'Layar Terkunci (Sentuhan Dinonaktifkan)',
      'player.unlocked_toast': 'Layar Terbuka',
      'player.aspect_fit': 'Sesuai Layar (Fit)',
      'player.aspect_fill': 'Penuhi Layar (Crop/Zoom)',
      'player.aspect_16_9': 'Rasio 16:9',
      'player.aspect_4_3': 'Rasio 4:3',
      'player.aspect_stretch': 'Regang (Stretch)'
    },

    en: {
      // Top Header & Status
      'header.status_online': 'Online',
      'header.downloading': 'Downloading {done}/{total}',
      'header.theme_toggle': 'Toggle Theme (Dark / Light)',
      'header.settings_btn': 'Settings',
      'header.trakteer': 'Buy Coffee',
      'sponsor.banner_title': 'Support Developer',
      'sponsor.banner_desc': 'GoFile Pro is 100% free and ad-free. Treat a cup of coffee to support new features!',
      'sponsor.banner_btn': 'Treat Coffee ☕',

      // Navigation Tabs
      'nav.home': 'Home',
      'nav.downloads': 'Downloads',
      'nav.files': 'Manage Files',
      'nav.settings': 'Settings',

      // Telemetry Strip
      'telemetry.speed': 'Speed',
      'telemetry.workers': 'Workers',
      'telemetry.total': 'Total',

      // Single & Batch Sub-tabs
      'home.single_tab': 'Single Link',
      'home.batch_tab': 'Batch Links',
      'home.title': 'Download GoFile Folders & Files',
      'home.subtitle': 'Download full folders automatically with resume support & multi-threading',
      'home.url_label': 'GoFile URL / Content ID',
      'home.url_placeholder': 'Example: https://gofile.io/d/abc123 or content ID',
      'home.paste_title': 'Paste link from clipboard',
      'home.clear_title': 'Clear input',
      'home.password_label': 'Folder Password (If Any)',
      'home.password_placeholder': 'Leave empty if not password protected',
      'home.explore_btn': 'Explore & Select Files',
      'home.download_all_btn': 'Download All Directly',
      'home.exploring': 'Connecting...',
      'home.fetching': 'Fetching files...',
      'home.batch_label': 'GoFile Links (One link per line)',
      'home.batch_placeholder': 'Paste GoFile links here, one per line...\nExample:\nhttps://gofile.io/d/xyz123 password123\nhttps://gofile.io/d/abc456',
      'home.batch_paste': 'Paste Batch',
      'home.batch_clear': 'Clear All',
      'home.batch_summary': '{count} link(s) detected',
      'home.batch_start': 'Start Downloading All Links',

      // Downloads Tab
      'downloads.title': 'Download Center',
      'downloads.subtitle': 'Monitor active downloads and view completed file history',
      'downloads.tab_queue': 'Active Queue',
      'downloads.tab_history': 'Completed History',
      'downloads.start_all': 'Resume All',
      'downloads.pause_all': 'Pause All',
      'downloads.retry_all': 'Retry All',
      'downloads.open_folder': 'Open Folder',
      'downloads.clear_queue': 'Clear Queue',
      'downloads.clear_history': 'Clear History',
      'downloads.empty_queue_title': 'Queue is Empty',
      'downloads.empty_queue_desc': 'Enter a link on the Home tab to start downloading files',
      'downloads.empty_history_title': 'No Download History Yet',
      'downloads.empty_history_desc': 'Files finished downloading will be listed here',
      'downloads.status_queued': 'Queued',
      'downloads.status_downloading': 'Downloading',
      'downloads.status_completed': 'Completed',
      'downloads.status_failed': 'Failed',
      'downloads.status_paused': 'Paused',
      'downloads.open_file': 'Open File',
      'downloads.folder_loc': 'Folder',

      // Stored Files Manager
      'files.title': 'Manage Stored Files',
      'files.subtitle': 'Browse, open, or delete downloaded files saved on your device storage',
      'files.search_placeholder': 'Search file name...',
      'files.sort_newest': 'Newest',
      'files.sort_oldest': 'Oldest',
      'files.sort_largest': 'Largest Size',
      'files.sort_smallest': 'Smallest Size',
      'files.sort_name': 'Name (A-Z)',
      'files.refresh_btn': 'Refresh',
      'files.open_dir_btn': 'Open Folder',
      'files.delete_all_btn': 'Delete All Files',
      'files.empty_title': 'No Stored Files Found',
      'files.empty_desc': 'Downloaded files will be automatically synced and listed here',
      'files.open': 'Open',
      'files.delete': 'Delete',
      'files.stats_summary': '{count} file(s) stored • Total: {size}',
      'files.confirm_delete': 'Delete file "{name}" from device storage?',
      'files.confirm_delete_all': 'WARNING: Are you sure you want to delete ALL {count} files from the downloads directory?',

      // Settings Tab
      'settings.title': 'Downloader Configuration',
      'settings.save_btn': 'Save Changes',
      'settings.lang_label': 'Interface Language',
      'settings.lang_auto': 'Automatic (System Default)',
      'settings.lang_id': 'Bahasa Indonesia (ID)',
      'settings.lang_en': 'English (EN)',
      'settings.theme_label': 'Appearance Theme',
      'settings.theme_auto': 'Automatic (System Default)',
      'settings.theme_dark': 'Dark Mode',
      'settings.theme_light': 'Light Mode',
      'settings.download_dir_label': 'Download Directory',
      'settings.browse_btn': 'Browse...',
      'settings.download_dir_help': 'On Windows, files are saved in this path. On Android, files go directly to internal Download folder.',
      'settings.workers_label': 'Max Concurrent Workers (Threads)',
      'settings.chunk_size_label': 'Chunk Size',
      'settings.token_label': 'Custom GoFile Account Token (Optional)',
      'settings.token_placeholder': 'Optional. If you have a premium/registered GoFile token',
      'settings.token_help': 'Leave blank to automatically create and use a free guest session.',
      'settings.retries_label': 'Connection Retries',
      'settings.timeout_label': 'Connection Timeout (Seconds)',
      'settings.notif_label': 'Download Notification Mode',
      'settings.notif_discreet': 'Discreet (Only notify when all files finish - Recommended)',
      'settings.notif_each': 'Notify for each file',
      'settings.notif_silent': 'Completely silent (Badge count only)',
      'settings.notif_help': 'Discreet mode prevents annoying notification spam while downloading folders with many files.',
      'settings.auto_cat_label': 'Smart Subfolders (Auto Categorization)',
      'settings.auto_cat_help': 'Automatically separate downloaded files into Videos/, Photos/, Music/, and Archives/ in your download folder.',
      'settings.sponsor_title': 'Open Sponsor & Coffee Donation',
      'settings.sponsor_subtitle': 'GoFile Pro is 100% free & ad-free. Your voluntary support is greatly appreciated.',
      'settings.sponsor_desc': 'Enjoying the speed and ease of GoFile Pro? Treat the developer to a coffee via Trakteer to support ongoing maintenance and future updates.',
      'settings.trakteer_btn': 'Support on Trakteer',
      'settings.github_btn': 'GitHub Project',
      'settings.update_title': 'App Updates',
      'settings.update_subtitle': 'Check and update GoFile Pro directly inside the app.',
      'settings.update_check_btn': 'Check for Updates',
      'settings.update_checking': 'Checking...',
      'settings.update_latest': 'You are on the latest version ({version})',
      'settings.update_available': 'New version {version} is available!',
      'settings.save_btn_bottom': 'Save Settings',

      // Update Modal
      'update_modal.title': 'New Update Available',
      'update_modal.version_badge': 'Latest Version: {version}',
      'update_modal.current_badge': 'Current Version: {version}',
      'update_modal.changelog': 'Release Notes / Changelog:',
      'update_modal.download_btn': 'Download & Install Now',
      'update_modal.downloading': 'Downloading Update ({progress}%)',
      'update_modal.installing': 'Opening Package Installer...',
      'update_modal.later_btn': 'Later',
      'update_modal.permission_notice': 'Android Notice: If prompted to allow installing apps from this source, please permit it to install the update automatically.',
      'update_modal.permission_btn': 'Grant Install Permission',

      // Inspection Modal
      'modal.folder_title': 'Folder Contents',
      'modal.folder_subtitle': '{count} file(s) • Total: {size}',
      'modal.select_all': 'Select All',
      'modal.chip_all': 'All',
      'modal.chip_video': 'Videos',
      'modal.chip_photo': 'Photos',
      'modal.chip_none': 'None',
      'modal.cancel_btn': 'Cancel',
      'modal.download_btn': 'Download {count} File(s) ({size})',
      'modal.download_default': 'Download Selected',
      'modal.summary_selected': '{count} of {total} file(s) selected ({size})',

      // Toasts & Messages
      'toast.pasted': 'Link successfully pasted.',
      'toast.clipboard_empty': 'Clipboard is empty or no valid link found.',
      'toast.clipboard_error': 'Failed to read clipboard.',
      'toast.cleared': 'Input cleared successfully.',
      'toast.enter_url': 'Please enter a GoFile URL or Content ID first',
      'toast.connecting': 'Connecting to GoFile servers... (Ensure VPN is on if ISP blocks)',
      'toast.empty_folder': 'No files found in this folder',
      'toast.queue_added': 'Added {count} file(s) to queue!',
      'toast.settings_saved': 'Settings saved successfully!',
      'toast.all_completed': '🎉 All {count} file(s) downloaded successfully!',
      'toast.already_exists': 'File "{name}" already exists on device (skipped).',
      'toast.failed': 'Failed: {name}',
      'toast.queue_resumed': 'Resuming {count} download(s)...',
      'toast.all_active': 'All downloads active',
      'toast.paused_all': 'All downloads paused',
      'toast.queue_cleared': 'Queue cleared',
      'toast.history_cleared': 'Download history cleared',
      'toast.dir_selected': 'Directory selected: {path}',
      'toast.file_deleted': 'File "{name}" deleted.',
      'toast.all_deleted': '{count} file(s) deleted from storage.',
      'toast.auto_cat_enabled': 'Smart Subfolders: Enabled',
      'toast.auto_cat_disabled': 'Smart Subfolders: Disabled',
      'toast.initial_sync': 'Initial sync: {count} file(s) found in downloads.',
      'toast.batch_pasted': 'Batch links pasted successfully.',
      'toast.batch_cleared': 'Batch inputs cleared.',
      'toast.fetching_files': 'Fetching file list...',
      'toast.no_downloadable': 'No downloadable files found.',
      'toast.no_video': 'No video files in this folder.',
      'toast.selected_video': 'Selected {count} video file(s).',
      'toast.no_photo': 'No photo files in this folder.',
      'toast.selected_photo': 'Selected {count} photo file(s).',
      'toast.no_audio': 'No audio files in this folder.',
      'toast.selected_audio': 'Selected {count} audio file(s).',
      'toast.select_at_least_one': 'Please select at least 1 file to download',
      'toast.password_required': 'This link requires a password!',
      'toast.server_copied': 'Server link copied to clipboard!',
      'toast.queue_exported': 'Queue data copied to clipboard!',
      'toast.queue_imported': 'Successfully imported {count} queue links!',
      'toast.perm_storage_opening': 'Opening storage permission settings...',
      'toast.perm_battery_opening': 'Opening battery optimization settings (Unrestricted)...',
      'toast.rate_limit_429': 'IP temporarily rate-limited by GoFile (HTTP 429). Toggle Airplane Mode on phone for 3s to get a fresh IP!',

      // Permissions Onboarding Modal
      'perm.modal_title': 'System Permissions & Anti-Kill Setup',
      'perm.modal_desc': 'Grant the following permissions so GoFile Pro can download in the background even when screen sleeps:',
      'perm.storage_title': 'All Files Storage Access',
      'perm.storage_desc': 'Required so downloaded files can be saved to public Download folder & opened by media players.',
      'perm.storage_btn': 'Grant File Access',
      'perm.battery_title': 'Battery Anti-Kill (Unrestricted)',
      'perm.battery_desc': 'Critical to prevent Android from killing downloads when screen sleeps or when switching apps.',
      'perm.battery_btn': 'Grant Anti-Kill Access',
      'perm.notif_title': 'Foreground Notification',
      'perm.notif_desc': 'Ensures download progress remains active and service is protected from OS termination.',
      'perm.status_granted': 'Granted ✅',
      'perm.status_pending': 'Pending ⚠️',
      'perm.continue_btn': 'Continue to App',
      'perm.later_btn': 'Later (Limited Mode)',

      // Token Validation in Settings
      'settings.token_test_btn': 'Verify Token',
      'settings.token_verifying': 'Verifying with GoFile servers...',
      'settings.token_valid_premium': 'Valid Token: GoFile Premium ✅',
      'settings.token_valid_free': 'Valid Token: Standard Account ⚡',
      'settings.token_invalid': 'Invalid or Expired Token ❌',

      // Cross-Device Transfer
      'transfer.btn_title': 'Send to Other Phone',
      'transfer.modal_title': 'Transfer & Share to Other Device',
      'transfer.tab_wifi': 'Send Files via Wi-Fi',
      'transfer.tab_queue': 'Export / Import Queue',
      'transfer.queue_summary': 'Export entire queue ({count} links) to resume on another phone:',
      'transfer.copy_queue': 'Copy Queue Data',
      'transfer.import_placeholder': 'Paste queue data from other phone here...',
      'transfer.import_btn': 'Import & Start Download',

      // IP Limit Modal
      'ip.modal_title': 'Quick Fix: GoFile IP Rate Limited',
      'ip.airplane_step': '1. Airplane Mode (Mobile): Turn on Airplane Mode for 3 seconds then turn off to get a fresh IP from mobile carrier.',
      'ip.warp_step': '2. Wi-Fi / ISP: Connect to Cloudflare 1.1.1.1 (WARP) or a free VPN to bypass IP limits and ISP censorship.',
      'ip.token_step': '3. Account Token: Enter your GoFile token in Settings for higher download quotas.',
      'ip.close_btn': 'Understood & Retry',

      // ExoVideoView Media Player
      'player.locked': 'Screen Locked • Tap to Unlock',
      'player.locked_toast': 'Screen Locked (Touch Gestures Disabled)',
      'player.unlocked_toast': 'Screen Unlocked',
      'player.aspect_fit': 'Fit to Screen',
      'player.aspect_fill': 'Fill / Crop Screen',
      'player.aspect_16_9': '16:9 Ratio',
      'player.aspect_4_3': '4:3 Ratio',
      'player.aspect_stretch': 'Stretch Fullscreen'
    }
  },

  init() {
    const savedSetting = localStorage.getItem('gf_lang') || 'auto';
    this.langSetting = savedSetting;
    this.currentLang = this.resolveLanguage(savedSetting);
    this.applyLanguage(this.currentLang);
  },

  resolveLanguage(setting) {
    if (setting === 'id' || setting === 'en') {
      return setting;
    }
    // Auto-detect from system/browser language
    const sysLang = (navigator.language || navigator.userLanguage || 'id').toLowerCase();
    if (sysLang.startsWith('id')) {
      return 'id';
    }
    return 'en';
  },

  setLanguage(setting) {
    this.langSetting = setting;
    localStorage.setItem('gf_lang', setting);
    this.currentLang = this.resolveLanguage(setting);
    this.applyLanguage(this.currentLang);
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: this.currentLang } }));
  },

  t(key, params = {}) {
    const dict = this.translations[this.currentLang] || this.translations['id'];
    let text = dict[key] || this.translations['en']?.[key] || key;
    for (const [pKey, pVal] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${pKey}\\}`, 'g'), pVal);
    }
    return text;
  },

  applyLanguage(lang) {
    this.currentLang = lang;
    document.documentElement.setAttribute('lang', lang);

    // Update all elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        el.textContent = this.t(key);
      }
    });

    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) {
        el.setAttribute('placeholder', this.t(key));
      }
    });

    // Update titles / tooltips
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key) {
        el.setAttribute('title', this.t(key));
      }
    });
  }
};

window.I18n = I18n;
