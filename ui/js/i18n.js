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
      'settings.sponsor_title': 'Open Sponsor & Traktir Kopi',
      'settings.sponsor_subtitle': 'GoFile Pro 100% gratis & bebas iklan. Dukungan sukarela Anda sangat berharga untuk kelangsungan aplikasi.',
      'settings.sponsor_desc': 'Suka dengan kemudahan dan kecepatan GoFile Pro? Traktir secangkir kopi melalui Trakteer untuk mendukung pembaruan fitur di masa depan.',
      'settings.trakteer_btn': 'Dukung Saya di Trakteer',
      'settings.github_btn': 'GitHub Project',

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
      'toast.all_deleted': '{count} file berhasil dihapus dari penyimpanan.'
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
      'settings.sponsor_title': 'Open Sponsor & Coffee Donation',
      'settings.sponsor_subtitle': 'GoFile Pro is 100% free & ad-free. Your voluntary support is greatly appreciated.',
      'settings.sponsor_desc': 'Enjoying the speed and ease of GoFile Pro? Treat the developer to a coffee via Trakteer to support ongoing maintenance and future updates.',
      'settings.trakteer_btn': 'Support on Trakteer',
      'settings.github_btn': 'GitHub Project',

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
      'toast.all_deleted': '{count} file(s) deleted from storage.'
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
