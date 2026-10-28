/**
 * GoFile Pro Downloader - Core UI Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const CURRENT_VERSION = 'v2.4.0';

  // Ensure native Android PiP is strictly disarmed until a video is played
  if (window.ApiBridge && typeof window.ApiBridge.setVideoPlaybackState === 'function') {
    window.ApiBridge.setVideoPlaybackState(false);
  }

  // Ensure Admin APK edition strictly directs to admin.html
  if (window.ApiBridge && typeof window.ApiBridge.getPlatformInfo === 'function') {
    const plat = window.ApiBridge.getPlatformInfo();
    if (plat.isAndroid && window.ApiBridge.androidStatus?.packageName?.includes('admin')) {
      window.location.replace('admin.html');
      return;
    }
  }

  // State Management
  const state = {
    activeTab: 'tab-home',
    queue: [],         // Active / Queued items
    history: [],       // Completed items
    concurrentMax: parseInt(localStorage.getItem('gf_workers') || '5', 10),
    downloadDir: localStorage.getItem('gf_download_dir') || './downloads',
    notificationMode: localStorage.getItem('gf_notif_mode') || 'summary_only',
    autoCategorize: localStorage.getItem('gf_auto_categorize') === 'true',
    sessionBatchTotal: 0,
    sessionBatchCompleted: 0,
    activeWorkersCount: 0,
    totalDownloadedBytes: 0,
    inspectedData: null,
    inspectedFilter: 'all',
    inspectedRenderLimit: 35,
    selectedItemIds: new Set(),
    storedFiles: [],
    storedFilesFilter: 'all',
    storedFilesSort: 'recent',
    storedFilesSearch: '',
    storedFilesRenderLimit: 35,
    selectedStoredFileNames: new Set()
  };

  // DOM Elements
  const navTabs = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const toastContainer = document.getElementById('toast-container');

  // Metrics Elements
  const globalSpeedEl = document.getElementById('global-speed-val');
  const activeTasksEl = document.getElementById('active-tasks-val');
  const totalDownloadedEl = document.getElementById('total-downloaded-val');
  const activeQueueCountEl = document.getElementById('active-queue-count');

  // Single Tab Form Elements
  const singleUrlInput = document.getElementById('single-url-input');
  const singlePwInput = document.getElementById('single-password-input');
  const btnPasteUrl = document.getElementById('btn-paste-url');
  const toggleSinglePwBtn = document.getElementById('toggle-single-pw-btn');
  const btnInspectUrl = document.getElementById('btn-inspect-url');
  const btnQuickDownload = document.getElementById('btn-quick-download');

  // Batch Tab Elements
  const batchUrlsInput = document.getElementById('batch-urls-input');
  const batchParsedSummary = document.getElementById('batch-parsed-summary');
  const btnStartBatch = document.getElementById('btn-start-batch');

  // Queue & History Elements
  const queueContainer = document.getElementById('queue-container');
  const queueEmptyState = document.getElementById('queue-empty-state');
  const historyContainer = document.getElementById('history-container');
  const historyEmptyState = document.getElementById('history-empty-state');
  const btnStartAllQueue = document.getElementById('btn-start-all-queue');
  const btnPauseAll = document.getElementById('btn-pause-all-queue');
  const btnRetryAllQueue = document.getElementById('btn-retry-all-queue');
  const retryFailedCountLabel = document.getElementById('retry-failed-count');
  const btnOpenFolderQueue = document.getElementById('btn-open-folder-queue');
  const btnOpenFolderHistory = document.getElementById('btn-open-folder-history');
  const btnClearQueue = document.getElementById('btn-clear-queue');
  const btnClearHistory = document.getElementById('btn-clear-history');

  // Active Download Notification Bar (Below Telemetry Strip)
  const activeDownloadStrip = document.getElementById('active-download-strip');
  const activeDownloadText = document.getElementById('active-download-text');
  const activeDownloadFill = document.getElementById('active-download-fill');
  const activeDownloadPctBadge = document.getElementById('active-download-pct-badge');

  // Settings Elements
  const settingLang = document.getElementById('setting-lang');
  const settingTheme = document.getElementById('setting-theme');
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const btnHeaderTrakteer = document.getElementById('btn-header-trakteer');
  const settingDownloadDir = document.getElementById('setting-download-dir');
  const btnChooseFolder = document.getElementById('btn-choose-folder');
  const settingWorkers = document.getElementById('setting-workers');
  const valWorkers = document.getElementById('val-workers');
  const settingChunkSize = document.getElementById('setting-chunk-size');
  const settingToken = document.getElementById('setting-token');
  const settingNotifMode = document.getElementById('setting-notif-mode');
  const settingAutoCategorize = document.getElementById('setting-auto-categorize');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const openSettingsHeaderBtn = document.getElementById('open-settings-header-btn');

  // Clipboard Auto-Detect Elements
  const clipboardDetectBanner = document.getElementById('clipboard-detect-banner');
  const clipboardBannerUrl = document.getElementById('clipboard-banner-url');
  const btnClipboardExplore = document.getElementById('btn-clipboard-explore');
  const btnClipboardDismiss = document.getElementById('btn-clipboard-dismiss');

  // Wi-Fi Local File Sharing Elements
  const btnOpenWifiShare = document.getElementById('btn-open-wifi-share');
  const wifiShareModal = document.getElementById('wifi-share-modal');
  const btnCloseWifiShareModal = document.getElementById('btn-close-wifi-share-modal');
  const btnCloseWifiShareBottom = document.getElementById('btn-close-wifi-share-bottom');
  const toggleWifiServer = document.getElementById('toggle-wifi-server');
  const wifiServerStatusTitle = document.getElementById('wifi-server-status-title');
  const wifiServerStatusDesc = document.getElementById('wifi-server-status-desc');
  const wifiServerDetails = document.getElementById('wifi-server-details');
  const wifiQrContainer = document.getElementById('wifi-qr-container');
  const wifiServerUrlText = document.getElementById('wifi-server-url-text');
  const btnCopyWifiUrl = document.getElementById('btn-copy-wifi-url');
  const wifiNetworkStatusBox = document.getElementById('wifi-network-status-box');
  const wifiNetDot = document.getElementById('wifi-net-dot');
  const wifiNetLabel = document.getElementById('wifi-net-label');
  const btnRefreshWifiIp = document.getElementById('btn-refresh-wifi-ip');

  // Modal Elements
  const inspectionModal = document.getElementById('inspection-modal');
  const modalFolderTitle = document.getElementById('modal-folder-title');
  const modalFolderSubtitle = document.getElementById('modal-folder-subtitle');
  const modalFileList = document.getElementById('modal-file-list');
  const modalSelectAll = document.getElementById('modal-select-all');
  const modalSelectedSummary = document.getElementById('modal-selected-summary');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnCancelModal = document.getElementById('btn-cancel-modal');
  const btnConfirmDownloadModal = document.getElementById('btn-confirm-download-modal');
  const modalLoadMoreBar = document.getElementById('modal-load-more-bar');
  const btnModalLoadMore = document.getElementById('btn-modal-load-more');
  const modalPaginationStatus = document.getElementById('modal-pagination-status');

  // Filter Chips in Modal
  const btnChipAll = document.getElementById('btn-chip-all');
  const btnChipVideo = document.getElementById('btn-chip-video');
  const btnChipPhoto = document.getElementById('btn-chip-photo');
  const btnChipAudio = document.getElementById('btn-chip-audio');
  const btnChipNone = document.getElementById('btn-chip-none');
  const chipCountAll = document.getElementById('chip-count-all');
  const chipCountVideo = document.getElementById('chip-count-video');
  const chipCountPhoto = document.getElementById('chip-count-photo');
  const chipCountAudio = document.getElementById('chip-count-audio');

  // Storage Manager Elements (Kelola File)
  const filesListContainer = document.getElementById('files-list-container');
  const filesEmptyState = document.getElementById('files-empty-state');
  const btnRefreshFiles = document.getElementById('btn-refresh-files');
  const btnOpenFolderFiles = document.getElementById('btn-open-folder-files');
  const searchFilesInput = document.getElementById('search-files-input');
  const storageTotalFilesEl = document.getElementById('storage-total-files');
  const storageTotalSizeEl = document.getElementById('storage-total-size');
  const storedFilesCountEl = document.getElementById('stored-files-count');

  const chipFileAll = document.getElementById('chip-file-all');
  const chipFileVideo = document.getElementById('chip-file-video');
  const chipFilePhoto = document.getElementById('chip-file-photo');
  const chipFileAudio = document.getElementById('chip-file-audio');
  const chipFileOther = document.getElementById('chip-file-other');
  const chipStoredCountAll = document.getElementById('chip-stored-count-all');
  const chipStoredCountVideo = document.getElementById('chip-stored-count-video');
  const chipStoredCountPhoto = document.getElementById('chip-stored-count-photo');
  const chipStoredCountAudio = document.getElementById('chip-stored-count-audio');
  const chipStoredCountOther = document.getElementById('chip-stored-count-other');
  const btnClearFileSearch = document.getElementById('btn-clear-file-search');

  const checkSelectAllStored = document.getElementById('check-select-all-stored');
  const storedSelectedCountLabel = document.getElementById('stored-selected-count-label');
  const customSortDropdown = document.getElementById('custom-sort-dropdown');
  const btnSortTrigger = document.getElementById('btn-sort-trigger');
  const sortTriggerIcon = document.getElementById('sort-trigger-icon');
  const sortTriggerText = document.getElementById('sort-trigger-text');
  const sortMenuItems = document.querySelectorAll('.sort-menu-item');
  const btnBatchDeleteStored = document.getElementById('btn-batch-delete-stored');
  const btnBatchDeleteText = document.getElementById('btn-batch-delete-text');
  const filesLoadMoreBar = document.getElementById('files-load-more-bar');
  const btnFilesLoadMore = document.getElementById('btn-files-load-more');
  const filesPaginationStatus = document.getElementById('files-pagination-status');

  // Storage Permission Banner & Android Power Elements
  const storagePermissionBanner = document.getElementById('storage-permission-banner');
  const btnRequestStoragePerm = document.getElementById('btn-request-storage-perm');
  const cardAndroidPower = document.getElementById('card-android-power');
  const btnRequestBatteryOpt = document.getElementById('btn-request-battery-opt');
  const btnSettingsStoragePerm = document.getElementById('btn-settings-storage-perm');
  const batteryOptimizationStatusText = document.getElementById('battery-optimization-status-text');
  const storagePermStatusText = document.getElementById('storage-perm-status-text');

  // In-App Update Engine Elements
  const updateModal = document.getElementById('update-modal');
  const btnCloseUpdateModal = document.getElementById('btn-close-update-modal');
  const btnLaterUpdate = document.getElementById('btn-later-update');
  const btnDownloadUpdate = document.getElementById('btn-download-update');
  const btnDownloadUpdateText = document.getElementById('btn-download-update-text');
  const updateNewVersionBadge = document.getElementById('update-new-version-badge');
  const updateCurrVersionBadge = document.getElementById('update-curr-version-badge');
  const updateChangelogText = document.getElementById('update-changelog-text');
  const updatePermissionBox = document.getElementById('update-permission-box');
  const btnOpenInstallPerm = document.getElementById('btn-open-install-perm');
  const updateProgressContainer = document.getElementById('update-progress-container');
  const updateProgressFill = document.getElementById('update-progress-fill');
  const updateProgressStatus = document.getElementById('update-progress-status');
  const updateProgressPct = document.getElementById('update-progress-pct');
  const btnCheckUpdateSettings = document.getElementById('btn-check-update-settings');
  const settingsUpdateStatusText = document.getElementById('settings-update-status-text');
  const settingsCurrentVerBadge = document.getElementById('settings-current-ver-badge');
  const updateBannerContainer = document.getElementById('update-banner-container');

  // Initialize Theme and Internationalization
  if (window.ThemeManager) {
    ThemeManager.init();
    if (settingTheme) settingTheme.value = ThemeManager.themeSetting;
  }
  if (window.I18n) {
    I18n.init();
    if (settingLang) settingLang.value = I18n.langSetting;
  }

  // Load Saved Settings into Form
  if (settingDownloadDir) settingDownloadDir.value = state.downloadDir;
  if (settingWorkers) settingWorkers.value = state.concurrentMax;
  if (valWorkers) valWorkers.textContent = state.concurrentMax;
  if (settingToken) settingToken.value = localStorage.getItem('gf_token') || '';
  if (settingNotifMode) {
    settingNotifMode.value = state.notificationMode;
  }
  if (settingAutoCategorize) {
    settingAutoCategorize.checked = !!state.autoCategorize;
    settingAutoCategorize.addEventListener('change', () => {
      state.autoCategorize = settingAutoCategorize.checked;
      localStorage.setItem('gf_auto_categorize', state.autoCategorize ? 'true' : 'false');
      showToast(state.autoCategorize ? 'Kategori Folder Otomatis: Diaktifkan' : 'Kategori Folder Otomatis: Dinonaktifkan', 'info', 2000);
    });
  }

  // ----------------------------------------------------
  // Utility Functions
  // ----------------------------------------------------
  function escapeHtml(str) {
    if (typeof str !== 'string') return String(str ?? '');
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatBytes(bytes, decimals = 1) {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  function formatSpeed(bytesPerSec) {
    if (!bytesPerSec || bytesPerSec <= 0) return '0.0 B/s';
    return `${formatBytes(bytesPerSec)}/s`;
  }

  function debounceClick(btn, fn, delay = 350) {
    if (!btn) return;
    let isBusy = false;
    btn.addEventListener('click', async (e) => {
      if (isBusy) return;
      isBusy = true;
      try {
        await fn(e);
      } finally {
        setTimeout(() => { isBusy = false; }, delay);
      }
    });
  }

  function showToast(message, type = 'info', duration = 3000) {
    let resolvedMessage = message;
    if (window.I18n && typeof message === 'string') {
      if (message.startsWith('toast.') || message.startsWith('perm.') || message.startsWith('ip.') || message.startsWith('settings.')) {
        resolvedMessage = I18n.t(message);
      }
    }
    if (typeof message === 'string' && (message.includes('429') || message.includes('Rate Limit'))) {
      type = 'error';
      duration = 8000;
    }

    // Keep max 2 toasts on screen to prevent visual clutter
    while (toastContainer.children.length >= 2) {
      toastContainer.firstElementChild.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<span class="toast-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg></span>`;
    } else if (type === 'error') {
      iconSvg = `<span class="toast-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg></span>`;
    } else {
      iconSvg = `<span class="toast-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></span>`;
    }

    toast.innerHTML = `${iconSvg}<span>${escapeHtml(resolvedMessage)}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-6px) scale(0.95)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  let headerHideTimer = null;
  function updateHeaderDownloadIndicator() {
    if (!activeDownloadStrip || !activeDownloadText) return;

    const downloading = state.queue.filter(q => q.status === 'downloading').length;
    const queued = state.queue.filter(q => q.status === 'queued').length;
    const activeOrQueued = downloading + queued;
    const completed = state.sessionBatchCompleted || 0;

    // Ensure sessionBatchTotal accurately reflects the batch or queue
    if (state.sessionBatchTotal < completed + activeOrQueued) {
      state.sessionBatchTotal = completed + activeOrQueued;
    }
    const total = state.sessionBatchTotal || activeOrQueued;

    if (headerHideTimer) {
      clearTimeout(headerHideTimer);
      headerHideTimer = null;
    }

    if (activeOrQueued > 0) {
      activeDownloadStrip.style.display = 'flex';
      const label = `Sedang Mengunduh ${completed}/${total} berkas (${downloading} aktif)`;
      activeDownloadText.textContent = label;

      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      if (activeDownloadPctBadge) activeDownloadPctBadge.textContent = `${pct}%`;
      if (activeDownloadFill) activeDownloadFill.style.width = `${pct}%`;
    } else if (completed > 0) {
      activeDownloadStrip.style.display = 'flex';
      activeDownloadText.textContent = `Semua unduhan selesai (${completed} berkas) ✓`;
      if (activeDownloadPctBadge) activeDownloadPctBadge.textContent = '100%';
      if (activeDownloadFill) activeDownloadFill.style.width = '100%';
      headerHideTimer = setTimeout(() => {
        const stillActive = state.queue.filter(q => q.status === 'downloading' || q.status === 'queued').length;
        if (stillActive === 0) {
          activeDownloadStrip.style.display = 'none';
        }
        headerHideTimer = null;
      }, 5000);
    } else {
      activeDownloadStrip.style.display = 'none';
    }
  }

  if (activeDownloadStrip) {
    activeDownloadStrip.addEventListener('click', () => {
      showDownloadsTab('queue');
    });
  }

  function getFileIcon(filename) {
    if (!filename || typeof filename !== 'string') {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;
    }
    const ext = filename.split('.').pop().toLowerCase();
    if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><line x1="1" y1="3" x2="23" y2="3"></line><path d="M10 12h4"></path></svg>`;
    }
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
    }
    if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`;
    }
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;
  }

  function updatePlatformBadge() {
    try {
      const info = ApiBridge.getPlatformInfo();
      const platformNameEl = document.getElementById('platform-name');
      if (platformNameEl) platformNameEl.textContent = info.platform;
      if (info.isAndroid) {
        state.downloadDir = 'Download/GoFile';
        if (settingDownloadDir) {
          settingDownloadDir.value = 'Penyimpanan Internal/Download/GoFile';
          settingDownloadDir.readOnly = true;
        }
        if (btnChooseFolder) {
          btnChooseFolder.style.display = 'none';
        }
      }
    } catch (err) {
      console.warn('updatePlatformBadge error:', err);
    }
  }
  window.updatePlatformBadge = updatePlatformBadge;

  // Safe async bridge initialization & auto-scan download directory
  (async () => {
    try {
      await ApiBridge.init();
    } catch (err) {
      console.warn('ApiBridge.init non-fatal warning:', err);
    }
    updatePlatformBadge();

    // Auto-check and scan download directory on startup (first install / update)
    try {
      const lastVersion = localStorage.getItem('gf_app_version');
      const isFirstRunOrUpdate = !lastVersion || lastVersion !== CURRENT_VERSION;
      localStorage.setItem('gf_app_version', CURRENT_VERSION);

      await loadStoredFiles();

      if (isFirstRunOrUpdate && state.storedFiles && state.storedFiles.length > 0) {
        showToast(`Sinkronisasi awal: ${state.storedFiles.length} file terdeteksi di folder unduhan.`, 'info', 3500);
      }
    } catch (err) {
      console.warn('Initial storage scan non-fatal error:', err);
    }

    // Check mandatory storage & battery anti-kill permissions on Android
    setTimeout(() => {
      checkPermissionsOnboarding(false);
      initRemoteConfigAndAds();
    }, 600);

    // Auto-check for updates silently in background (delayed 2.5s)
    setTimeout(() => {
      checkForAppUpdate(true);
    }, 2500);
  })();

  // ----------------------------------------------------
  // Tab Switching
  // ----------------------------------------------------
  navTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      navTabs.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetContent = document.getElementById(targetTab);
      if (targetContent) targetContent.classList.add('active');
      state.activeTab = targetTab;

      if (targetTab === 'tab-files') {
        loadStoredFiles();
      }
    });
  });

  function showDownloadsTab(subtab = 'queue') {
    const navDownloads = document.getElementById('nav-downloads-tab');
    if (navDownloads) navDownloads.click();

    const subtabBtnQueue = document.getElementById('subtab-btn-queue');
    const subtabBtnHistory = document.getElementById('subtab-btn-history');
    if (subtab === 'queue' && subtabBtnQueue) {
      subtabBtnQueue.click();
    } else if (subtab === 'history' && subtabBtnHistory) {
      subtabBtnHistory.click();
    }
  }

  openSettingsHeaderBtn.addEventListener('click', () => {
    document.getElementById('nav-settings-tab').click();
  });

  if (activeDownloadStrip) {
    activeDownloadStrip.style.cursor = 'pointer';
    activeDownloadStrip.addEventListener('click', () => {
      showDownloadsTab('queue');
    });
  }

  // Bottom Save Settings Button
  const btnSaveSettingsBottom = document.getElementById('btn-save-settings-bottom');
  if (btnSaveSettingsBottom) {
    btnSaveSettingsBottom.addEventListener('click', () => {
      btnSaveSettings.click();
    });
  }

  // ----------------------------------------------------
  // Open Sponsor & Traktir Kopi Action Listeners
  // ----------------------------------------------------
  const btnTrakteerSponsor = document.getElementById('btn-trakteer-sponsor');
  const btnGithubSponsor = document.getElementById('btn-github-sponsor');
  const TRAKTEER_URL = 'https://trakteer.id/roy1304';
  const GITHUB_REPO_URL = 'https://github.com/DidiRoyadi123/Gofile-pro';

  if (btnTrakteerSponsor) {
    debounceClick(btnTrakteerSponsor, () => {
      ApiBridge.openUrl(TRAKTEER_URL);
    });
  }

  if (btnGithubSponsor) {
    debounceClick(btnGithubSponsor, () => {
      ApiBridge.openUrl(GITHUB_REPO_URL);
    });
  }

  // ----------------------------------------------------
  // Sub-Tab Switching (Single URL vs Batch Mode inside Home)
  // ----------------------------------------------------
  const subtabBtnSingle = document.getElementById('subtab-btn-single');
  const subtabBtnBatch = document.getElementById('subtab-btn-batch');
  const subtabPanelSingle = document.getElementById('subtab-panel-single');
  const subtabPanelBatch = document.getElementById('subtab-panel-batch');

  if (subtabBtnSingle && subtabBtnBatch) {
    subtabBtnSingle.addEventListener('click', () => {
      subtabBtnSingle.classList.add('active');
      subtabBtnBatch.classList.remove('active');
      if (subtabPanelSingle) subtabPanelSingle.classList.add('active');
      if (subtabPanelBatch) subtabPanelBatch.classList.remove('active');
    });

    subtabBtnBatch.addEventListener('click', () => {
      subtabBtnBatch.classList.add('active');
      subtabBtnSingle.classList.remove('active');
      if (subtabPanelBatch) subtabPanelBatch.classList.add('active');
      if (subtabPanelSingle) subtabPanelSingle.classList.remove('active');
    });
  }

  // ----------------------------------------------------
  // Sub-Tab Switching (Downloads: Antrean vs Selesai)
  // ----------------------------------------------------
  const subtabBtnQueue = document.getElementById('subtab-btn-queue');
  const subtabBtnHistory = document.getElementById('subtab-btn-history');
  const subtabPanelQueue = document.getElementById('subtab-panel-queue');
  const subtabPanelHistory = document.getElementById('subtab-panel-history');

  if (subtabBtnQueue && subtabBtnHistory) {
    subtabBtnQueue.addEventListener('click', () => {
      subtabBtnQueue.classList.add('active');
      subtabBtnHistory.classList.remove('active');
      if (subtabPanelQueue) subtabPanelQueue.classList.add('active');
      if (subtabPanelHistory) subtabPanelHistory.classList.remove('active');
    });

    subtabBtnHistory.addEventListener('click', () => {
      subtabBtnHistory.classList.add('active');
      subtabBtnQueue.classList.remove('active');
      if (subtabPanelHistory) subtabPanelHistory.classList.add('active');
      if (subtabPanelQueue) subtabPanelQueue.classList.remove('active');
    });
  }

  // ----------------------------------------------------
  // Single Link Actions
  // ----------------------------------------------------
  if (btnPasteUrl) {
    debounceClick(btnPasteUrl, async () => {
      try {
        const text = await ApiBridge.readClipboard();
        if (text && text.trim()) {
          singleUrlInput.value = text.trim();
          showToast('toast.pasted', 'info', 1500);
        } else {
          showToast('toast.clipboard_empty', 'warning', 2000);
        }
      } catch (err) {
        console.warn('Paste URL error:', err);
        showToast('toast.clipboard_error', 'error', 2000);
      }
    });
  }

  const btnClearUrl = document.getElementById('btn-clear-url');
  if (btnClearUrl) {
    debounceClick(btnClearUrl, () => {
      singleUrlInput.value = '';
      singleUrlInput.focus();
      showToast('toast.cleared', 'info', 1500);
    });
  }

  if (singleUrlInput) {
    singleUrlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        singleUrlInput.blur();
        setKeyboardState(false);
        if (btnInspectUrl) btnInspectUrl.click();
      }
    });
  }

  if (singlePwInput) {
    singlePwInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        singlePwInput.blur();
        setKeyboardState(false);
        if (btnInspectUrl) btnInspectUrl.click();
      }
    });
  }

  const btnPasteBatch = document.getElementById('btn-paste-batch');
  const btnClearBatch = document.getElementById('btn-clear-batch');

  if (btnPasteBatch) {
    debounceClick(btnPasteBatch, async () => {
      try {
        const text = await ApiBridge.readClipboard();
        if (text && text.trim()) {
          batchUrlsInput.value = (batchUrlsInput.value ? batchUrlsInput.value + '\n' : '') + text.trim();
          const lines = batchUrlsInput.value.split('\n').filter(l => l.trim().length > 0);
          batchParsedSummary.textContent = `${lines.length} link terdeteksi`;
          showToast('Link batch berhasil ditempel.', 'info', 1500);
        } else {
          showToast('Clipboard kosong atau belum ada link yang disalin.', 'warning', 2000);
        }
      } catch (err) {
        console.warn('Paste Batch error:', err);
        showToast('Gagal membaca clipboard.', 'error', 2000);
      }
    });
  }

  if (btnClearBatch) {
    debounceClick(btnClearBatch, () => {
      batchUrlsInput.value = '';
      batchParsedSummary.textContent = '0 link terdeteksi';
      batchUrlsInput.focus();
      showToast('Semua inputan batch berhasil dihapus.', 'info', 1500);
    });
  }

  toggleSinglePwBtn.addEventListener('click', () => {
    if (singlePwInput.type === 'password') {
      singlePwInput.type = 'text';
      toggleSinglePwBtn.style.color = 'var(--cyan-400)';
    } else {
      singlePwInput.type = 'password';
      toggleSinglePwBtn.style.color = 'var(--text-muted)';
    }
  });

  // Inspect URL
  btnInspectUrl.addEventListener('click', async () => {
    if (btnInspectUrl.disabled) return;
    singleUrlInput.blur();
    singlePwInput.blur();
    setKeyboardState(false);
    const url = singleUrlInput.value.trim();
    if (!url) {
      showToast('toast.enter_url', 'error');
      return;
    }

    const password = singlePwInput.value.trim();
    btnInspectUrl.disabled = true;
    btnInspectUrl.innerHTML = `<span class="spin-ring" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:6px;"></span> Exploring...`;

    try {
      showToast('toast.connecting', 'info', 3500);

      const fetchPromise = ApiBridge.inspectContent(url, password);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Koneksi timeout (10 detik). Di Indonesia, GoFile sering diblokir ISP (IndiHome/Telkomsel). Silakan aktifkan VPN atau 1.1.1.1 (WARP) di HP/PC Anda.'));
        }, 10000);
      });

      const data = await Promise.race([fetchPromise, timeoutPromise]);
      state.inspectedData = data;

      if (!data.files || data.files.length === 0) {
        showToast('toast.empty_folder', 'error');
        return;
      }

      openInspectionModal(data);
    } catch (err) {
      const msg = err.message || String(err);
      if (msg.includes('PASSWORD')) {
        showToast('toast.password_required', 'error');
        singlePwInput.focus();
      } else if (msg.includes('429') || msg.includes('Rate Limit') || msg.includes('error-rateLimit') || msg.includes('Too Many Requests')) {
        showToast('toast.rate_limit_429', 'error', 9000);
        showIpHelperModal();
      } else {
        showToast(msg, 'error', 6000);
      }
    } finally {
      btnInspectUrl.disabled = false;
      btnInspectUrl.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        Explore & Select Files
      `;
    }
  });

  // Quick Download All
  btnQuickDownload.addEventListener('click', async () => {
    if (btnQuickDownload.disabled) return;
    singleUrlInput.blur();
    singlePwInput.blur();
    setKeyboardState(false);
    const url = singleUrlInput.value.trim();
    if (!url) {
      showToast('toast.enter_url', 'error');
      return;
    }

    const password = singlePwInput.value.trim();
    btnQuickDownload.disabled = true;
    btnQuickDownload.innerHTML = `<span class="spin-ring" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:6px;"></span> Mengambil file...`;

    try {
      showToast('toast.fetching_files', 'info', 3000);

      const fetchPromise = ApiBridge.inspectContent(url, password);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Koneksi timeout. Pastikan VPN atau 1.1.1.1 WARP aktif jika provider memblokir GoFile.'));
        }, 10000);
      });

      const data = await Promise.race([fetchPromise, timeoutPromise]);
      if (data && data.files && data.files.length > 0) {
        enqueueFiles(data.files);
        if (window.AdNetworkEngine && typeof window.AdNetworkEngine.maybeTriggerDirectLink === 'function') {
          window.AdNetworkEngine.maybeTriggerDirectLink('download_start');
        }
        showToast(window.I18n ? I18n.t('toast.queue_added', { count: data.files.length }) : `Berhasil menambahkan ${data.files.length} file ke antrean!`, 'success');
        showDownloadsTab('queue');
      } else {
        showToast('toast.no_downloadable', 'error');
      }
    } catch (err) {
      const msg = err.message || String(err);
      if (msg.includes('429') || msg.includes('Rate Limit') || msg.includes('error-rateLimit') || msg.includes('Too Many Requests')) {
        showToast('toast.rate_limit_429', 'error', 9000);
        showIpHelperModal();
      } else {
        showToast(msg, 'error', 6000);
      }
    } finally {
      btnQuickDownload.disabled = false;
      btnQuickDownload.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12l7 7 7-7"/>
        </svg>
        Download All Directly
      `;
    }
  });

  // ----------------------------------------------------
  // File Type Helpers for Filtering (Comprehensive & Robust)
  // ----------------------------------------------------
  const VIDEO_EXTS = new Set([
    'mp4', 'mkv', 'webm', 'avi', 'mov', 'flv', 'wmv', 'm4v', '3gp', '3g2',
    'ts', 'mts', 'm2ts', 'm2t', 'mpg', 'mpeg', 'vob', 'ogv', 'f4v', 'rm', 'rmvb',
    'asf', 'divx', 'h264', 'h265', 'hevc', 'x264', 'x265', 'av1', 'vp9', 'iso'
  ]);
  const PHOTO_EXTS = new Set([
    'jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg', 'heic', 'heif',
    'tiff', 'tif', 'ico', 'avif', 'raw', 'cr2', 'nef'
  ]);
  const AUDIO_EXTS = new Set([
    'mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'opus', 'alac', 'aiff'
  ]);
  const DOC_EXTS = new Set([
    'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'epub'
  ]);

  function getFileExt(filename) {
    if (!filename || typeof filename !== 'string') return '';
    try {
      filename = decodeURIComponent(filename);
    } catch (e) {}
    const clean = filename.split('?')[0].split('#')[0].trim();
    const lastDot = clean.lastIndexOf('.');
    return lastDot > 0 ? clean.substring(lastDot + 1).toLowerCase() : '';
  }

  function isVideoFile(fileOrName) {
    if (!fileOrName) return false;
    let name = '';
    let mime = '';
    let type = '';

    if (typeof fileOrName === 'string') {
      name = fileOrName;
    } else if (typeof fileOrName === 'object') {
      name = fileOrName.name || fileOrName.filename || '';
      mime = (fileOrName.mimetype || fileOrName.mime_type || fileOrName.mimeType || fileOrName.contentType || '').toLowerCase();
      type = (fileOrName.type || '').toLowerCase();
    }

    if (type === 'video' || mime.startsWith('video/') || mime.includes('video')) return true;
    const ext = getFileExt(name);
    if (VIDEO_EXTS.has(ext)) return true;
    if (mime.includes('matroska') || mime.includes('quicktime') || mime.includes('mp4') || mime.includes('webm') || mime.includes('mpegurl')) return true;
    return false;
  }

  function isPhotoFile(fileOrName) {
    if (!fileOrName) return false;
    let name = '';
    let mime = '';
    let type = '';

    if (typeof fileOrName === 'string') {
      name = fileOrName;
    } else if (typeof fileOrName === 'object') {
      name = fileOrName.name || fileOrName.filename || '';
      mime = (fileOrName.mimetype || fileOrName.mime_type || '').toLowerCase();
      type = (fileOrName.type || '').toLowerCase();
    }

    if (type === 'image' || mime.startsWith('image/')) return true;
    const ext = getFileExt(name);
    if (PHOTO_EXTS.has(ext)) return true;
    return false;
  }

  function isAudioFile(fileOrName) {
    if (!fileOrName) return false;
    let name = '';
    let mime = '';
    let type = '';

    if (typeof fileOrName === 'string') {
      name = fileOrName;
    } else if (typeof fileOrName === 'object') {
      name = fileOrName.name || fileOrName.filename || '';
      mime = (fileOrName.mimetype || fileOrName.mime_type || '').toLowerCase();
      type = (fileOrName.type || '').toLowerCase();
    }

    if (type === 'audio' || mime.startsWith('audio/')) return true;
    const ext = getFileExt(name);
    if (AUDIO_EXTS.has(ext)) return true;
    return false;
  }

  function isPlayableMedia(fileOrName) {
    return isVideoFile(fileOrName) || isPhotoFile(fileOrName) || isAudioFile(fileOrName);
  }

  function isDocOrArchiveFile(fileOrName) {
    if (!fileOrName) return false;
    const name = typeof fileOrName === 'string' ? fileOrName : (fileOrName.name || fileOrName.filename || '');
    return DOC_EXTS.has(getFileExt(name));
  }

  // ----------------------------------------------------
  // Video Watched History & Shuffle Prioritization Tracker
  // ----------------------------------------------------
  const WATCHED_STORAGE_KEY = 'gf_video_watched_history';
  function getWatchedHistory() {
    try {
      return JSON.parse(localStorage.getItem(WATCHED_STORAGE_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function getMediaFileKey(fileOrItem) {
    if (!fileOrItem) return '';
    if (typeof fileOrItem === 'string') return fileOrItem.toLowerCase().trim();
    return (fileOrItem.path || fileOrItem.fileUri || fileOrItem.name || fileOrItem.filename || fileOrItem.id || '').toLowerCase().trim();
  }

  function isVideoWatched(fileOrItem) {
    if (!isVideoFile(fileOrItem)) return false;
    const key = getMediaFileKey(fileOrItem);
    if (!key) return false;
    const history = getWatchedHistory();
    return !!(history[key] && history[key].watched);
  }

  function recordWatchProgress(fileOrItem, currentTime, duration) {
    if (!fileOrItem || !duration || isNaN(duration) || duration <= 0) return;
    const key = getMediaFileKey(fileOrItem);
    if (!key) return;
    const history = getWatchedHistory();
    const pct = Math.round((currentTime / duration) * 100);
    const prev = history[key] || {};
    // Mark as watched if played for at least 10 seconds or >= 40% duration, or already watched
    const isWatched = prev.watched || currentTime >= 10 || pct >= 40;
    history[key] = {
      name: fileOrItem.name || fileOrItem.filename || key,
      lastPlayed: Date.now(),
      currentTime: Math.round(currentTime),
      duration: Math.round(duration),
      pct: Math.max(pct, prev.pct || 0),
      watched: isWatched
    };
    try {
      localStorage.setItem(WATCHED_STORAGE_KEY, JSON.stringify(history));
    } catch (e) {}

    updateWatchedBannerUI(fileOrItem);
  }

  function updateWatchedBannerUI(fileOrItem) {
    const dot = document.getElementById('sheet-watched-dot');
    const txt = document.getElementById('sheet-watched-text');
    if (!dot || !txt) return;
    const key = getMediaFileKey(fileOrItem);
    const history = getWatchedHistory();
    const entry = history[key];
    if (entry && entry.watched) {
      dot.className = 'watched-dot watched';
      txt.textContent = `Sudah Pernah Ditonton (Terakhir: ${entry.pct || 100}% durasi)`;
    } else {
      dot.className = 'watched-dot unplayed';
      txt.textContent = 'Video Baru (Belum pernah ditonton)';
    }
  }

  function resolveSmartSubfolder(file, currentRelDir, isEnabled = state.autoCategorize) {
    if (!isEnabled) return currentRelDir || '';
    const name = (typeof file === 'string' ? file : (file?.name || file?.filename || '')).toLowerCase();
    const ext = getFileExt(name);
    const mime = (file?.mimetype || file?.mime_type || file?.mime || '').toLowerCase();

    let category = '';
    if (isVideoFile(file) || mime.startsWith('video/') || ['mp4', 'mkv', 'webm', 'mov', 'avi', 'flv', 'wmv', 'm4v', '3gp', 'ts'].includes(ext)) {
      category = 'Videos';
    } else if (isPhotoFile(file) || mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'heic', 'tiff'].includes(ext)) {
      category = 'Photos';
    } else if (isAudioFile(file) || mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'opus', 'wma', 'alac'].includes(ext)) {
      category = 'Music';
    } else if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso', 'bin', 'dmg', 'tgz'].includes(ext)) {
      category = 'Archives';
    } else if (['pdf', 'epub', 'mobi', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(ext)) {
      category = 'Documents';
    }

    if (!category) return currentRelDir || '';
    if (!currentRelDir) return category;
    if (currentRelDir === category || currentRelDir.startsWith(category + '/')) {
      return currentRelDir;
    }
    return `${category}/${currentRelDir}`;
  }

  function getFileIcon(fileOrName) {
    if (isVideoFile(fileOrName)) {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`;
    }
    if (isPhotoFile(fileOrName)) {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
    }
    if (isAudioFile(fileOrName)) {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`;
    }
    if (isDocOrArchiveFile(fileOrName)) {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><line x1="1" y1="3" x2="23" y2="3"></line><path d="M10 12h4"></path></svg>`;
    }
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;
  }

  function setActiveChip(activeBtn) {
    [btnChipAll, btnChipVideo, btnChipPhoto, btnChipAudio, btnChipNone].forEach(btn => {
      if (btn) btn.classList.toggle('active', btn === activeBtn);
    });
  }

  // ----------------------------------------------------
  // Inspection Tree Modal Logic
  // ----------------------------------------------------
  // ----------------------------------------------------
  // Inspection Tree Modal Logic (Lazy Chunked Virtual Rendering for Hundreds/Thousands of Files)
  // ----------------------------------------------------
  function getFilteredInspectedFiles() {
    if (!state.inspectedData || !state.inspectedData.files) return [];
    const files = state.inspectedData.files;
    if (state.inspectedFilter === 'video') return files.filter(f => isVideoFile(f));
    if (state.inspectedFilter === 'photo') return files.filter(f => isPhotoFile(f));
    if (state.inspectedFilter === 'audio') return files.filter(f => isAudioFile(f));
    return files;
  }

  function openInspectionModal(data) {
    state.inspectedData = data;
    state.inspectedFilter = 'all';
    state.inspectedRenderLimit = 35;
    state.selectedItemIds.clear();

    const cId = data.contentId || data.content_id || 'Files';
    const totalCount = data.totalFiles ?? data.total_files ?? (data.files ? data.files.length : 0);
    const totalBytes = data.totalSize ?? data.total_size ?? 0;
    modalFolderTitle.textContent = `Content: ${cId}`;
    modalFolderSubtitle.textContent = `${totalCount} files • Total: ${formatBytes(totalBytes)}`;

    // Select all by default
    if (data.files) {
      data.files.forEach(f => state.selectedItemIds.add(f.id));
    }

    // Calculate category counts
    const videoFiles = data.files ? data.files.filter(f => isVideoFile(f)) : [];
    const photoFiles = data.files ? data.files.filter(f => isPhotoFile(f)) : [];
    const audioFiles = data.files ? data.files.filter(f => isAudioFile(f)) : [];

    if (chipCountAll) chipCountAll.textContent = data.files ? data.files.length : 0;
    if (chipCountVideo) chipCountVideo.textContent = videoFiles.length;
    if (chipCountPhoto) chipCountPhoto.textContent = photoFiles.length;
    if (chipCountAudio) chipCountAudio.textContent = audioFiles.length;
    setActiveChip(btnChipAll);

    renderInspectedFilesList(false);
    updateModalSelectionCount();
    inspectionModal.classList.add('open');
  }

  function renderInspectedFilesList(appendOnly = false) {
    if (!modalFileList) return;

    const filtered = getFilteredInspectedFiles();
    const limit = state.inspectedRenderLimit || 35;
    const existingCount = appendOnly ? modalFileList.querySelectorAll('.tree-item').length : 0;
    const chunk = filtered.slice(existingCount, limit);

    if (!appendOnly) {
      modalFileList.innerHTML = '';
    }

    // Precompute stored files lookup in O(1)
    const storedSet = new Set();
    if (state.storedFiles && state.storedFiles.length > 0) {
      state.storedFiles.forEach(sf => {
        if (sf.name) {
          storedSet.add(`${sf.name}___${sf.size || 0}`);
          storedSet.add(`${sf.name}___0`);
        }
      });
    }

    const frag = document.createDocumentFragment();

    chunk.forEach(file => {
      const isVid = isVideoFile(file);
      const isImg = isPhotoFile(file);
      const isAud = isAudioFile(file);
      const typeBadge = isVid ? '🎬 [VIDEO]' : (isImg ? '🖼️ [FOTO]' : (isAud ? '🎵 [AUDIO]' : ''));

      const isAlreadyStored = storedSet.has(`${file.name}___${file.size || 0}`) || storedSet.has(`${file.name}___0`);
      const storedBadge = isAlreadyStored
        ? `<span style="font-size:0.68rem; padding:2px 6px; border-radius:4px; background:rgba(16,185,129,0.15); color:#10b981; font-weight:600; margin-left:6px;" title="File sudah ada di penyimpanan lokal">✓ Sudah Diunduh</span>`
        : '';

      const isChecked = state.selectedItemIds.has(file.id);

      const itemEl = document.createElement('div');
      itemEl.className = 'tree-item';
      itemEl.dataset.fileId = file.id;
      itemEl.dataset.isVid = isVid ? '1' : '0';
      itemEl.dataset.isImg = isImg ? '1' : '0';
      itemEl.dataset.isAud = isAud ? '1' : '0';
      itemEl.innerHTML = `
        <input type="checkbox" class="tree-item-cb" data-file-id="${escapeHtml(file.id)}" id="check-${escapeHtml(file.id)}" ${isChecked ? 'checked' : ''}>
        <div style="color:var(--indigo-400); display:flex; align-items:center;">
          ${getFileIcon(file)}
        </div>
        <div class="tree-item-name" title="${escapeHtml(file.name)}">
          ${escapeHtml(file.name)}
          ${typeBadge ? `<span style="font-size:0.7rem; font-weight:600; color:var(--cyan-400); margin-left:6px;">${typeBadge}</span>` : ''}
          ${storedBadge}
          ${(file.relDir || file.rel_dir) ? `<span style="font-size:0.75rem; color:var(--text-muted); display:block;">/${escapeHtml(file.relDir || file.rel_dir)}</span>` : ''}
        </div>
        <div class="tree-item-size">${formatBytes(file.size)}</div>
      `;

      frag.appendChild(itemEl);
    });

    modalFileList.appendChild(frag);

    // Update Load More Bar
    if (modalLoadMoreBar && btnModalLoadMore && modalPaginationStatus) {
      const totalFiltered = filtered.length;
      const currentRendered = Math.min(limit, totalFiltered);
      if (currentRendered < totalFiltered) {
        modalLoadMoreBar.style.display = 'block';
        btnModalLoadMore.style.display = 'block';
        const remaining = totalFiltered - currentRendered;
        btnModalLoadMore.textContent = `Muat Lebih Banyak (${remaining} file lagi)`;
        modalPaginationStatus.textContent = `Menampilkan ${currentRendered} dari ${totalFiltered} file`;
      } else {
        modalLoadMoreBar.style.display = totalFiltered > 35 ? 'block' : 'none';
        btnModalLoadMore.style.display = 'none';
        modalPaginationStatus.textContent = `Semua ${totalFiltered} file telah dimuat`;
      }
    }
  }

  // Delegated Event Listeners for modalFileList checkboxes and rows
  if (modalFileList) {
    modalFileList.addEventListener('change', (e) => {
      const cb = e.target.closest('input[type="checkbox"]');
      if (!cb) return;
      const fId = cb.getAttribute('data-file-id');
      if (fId) {
        if (cb.checked) {
          state.selectedItemIds.add(fId);
        } else {
          state.selectedItemIds.delete(fId);
        }
        updateModalSelectionCount();
      }
    });

    // Row click toggle
    modalFileList.addEventListener('click', (e) => {
      if (e.target.matches('input[type="checkbox"]')) return;
      const itemEl = e.target.closest('.tree-item');
      if (!itemEl) return;
      const cb = itemEl.querySelector('input[type="checkbox"]');
      if (cb) {
        cb.checked = !cb.checked;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }

  // Load More Button Handler
  if (btnModalLoadMore) {
    btnModalLoadMore.addEventListener('click', () => {
      state.inspectedRenderLimit = (state.inspectedRenderLimit || 35) + 35;
      renderInspectedFilesList(true);
    });
  }

  // Auto load more on scroll
  const modalBodyEl = document.querySelector('#inspection-modal .modal-body');
  if (modalBodyEl) {
    modalBodyEl.addEventListener('scroll', () => {
      if (!state.inspectedData || !state.inspectedData.files) return;
      const filtered = getFilteredInspectedFiles();
      if ((state.inspectedRenderLimit || 35) >= filtered.length) return;

      const scrollBottom = modalBodyEl.scrollHeight - modalBodyEl.scrollTop - modalBodyEl.clientHeight;
      if (scrollBottom < 120) {
        state.inspectedRenderLimit = (state.inspectedRenderLimit || 35) + 35;
        renderInspectedFilesList(true);
      }
    });
  }

  function updateModalSelectionCount() {
    const count = state.selectedItemIds.size;
    const total = state.inspectedData && state.inspectedData.files ? state.inspectedData.files.length : 0;
    let selectedBytes = 0;
    if (state.inspectedData && state.inspectedData.files) {
      const files = state.inspectedData.files;
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (state.selectedItemIds.has(f.id)) {
          selectedBytes += (f.size || 0);
        }
      }
    }

    modalSelectedSummary.textContent = `${count} dari ${total} file terpilih (${formatBytes(selectedBytes)})`;
    modalSelectAll.checked = (count === total && total > 0);

    if (btnConfirmDownloadModal) {
      const isIndo = !window.I18n || window.I18n.currentLang === 'id';
      const label = count > 0
        ? (isIndo ? `Unduh ${count} File (${formatBytes(selectedBytes)})` : `Download ${count} Files (${formatBytes(selectedBytes)})`)
        : (isIndo ? 'Unduh Terpilih' : 'Download Selected');
      btnConfirmDownloadModal.innerHTML = `
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="flex-shrink:0;">
          <path d="M12 5v14M5 12l7 7 7-7"/>
        </svg>
        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${label}</span>
      `;
    }
  }

  // Chip 1: Pilih Semua
  if (btnChipAll) {
    btnChipAll.addEventListener('click', () => {
      setActiveChip(btnChipAll);
      state.inspectedFilter = 'all';
      state.inspectedRenderLimit = 35;
      state.selectedItemIds.clear();
      if (state.inspectedData && state.inspectedData.files) {
        state.inspectedData.files.forEach(f => state.selectedItemIds.add(f.id));
      }
      renderInspectedFilesList(false);
      updateModalSelectionCount();
    });
  }

  // Chip 2: Pilih Hanya Video
  if (btnChipVideo) {
    btnChipVideo.addEventListener('click', () => {
      setActiveChip(btnChipVideo);
      state.inspectedFilter = 'video';
      state.inspectedRenderLimit = 35;
      state.selectedItemIds.clear();
      let vidCount = 0;
      if (state.inspectedData && state.inspectedData.files) {
        state.inspectedData.files.forEach(f => {
          if (isVideoFile(f)) {
            state.selectedItemIds.add(f.id);
            vidCount++;
          }
        });
      }
      renderInspectedFilesList(false);
      updateModalSelectionCount();
      if (vidCount === 0) {
        showToast('Tidak ada file video di folder ini.', 'info', 2500);
      } else {
        showToast(`Memilih ${vidCount} file video.`, 'success', 2000);
      }
    });
  }

  // Chip 3: Pilih Hanya Foto
  if (btnChipPhoto) {
    btnChipPhoto.addEventListener('click', () => {
      setActiveChip(btnChipPhoto);
      state.inspectedFilter = 'photo';
      state.inspectedRenderLimit = 35;
      state.selectedItemIds.clear();
      let imgCount = 0;
      if (state.inspectedData && state.inspectedData.files) {
        state.inspectedData.files.forEach(f => {
          if (isPhotoFile(f)) {
            state.selectedItemIds.add(f.id);
            imgCount++;
          }
        });
      }
      renderInspectedFilesList(false);
      updateModalSelectionCount();
      if (imgCount === 0) {
        showToast('Tidak ada file foto di folder ini.', 'info', 2500);
      } else {
        showToast(`Memilih ${imgCount} file foto.`, 'success', 2000);
      }
    });
  }

  // Chip: Pilih Hanya Audio
  if (btnChipAudio) {
    btnChipAudio.addEventListener('click', () => {
      setActiveChip(btnChipAudio);
      state.inspectedFilter = 'audio';
      state.inspectedRenderLimit = 35;
      state.selectedItemIds.clear();
      let audCount = 0;
      if (state.inspectedData && state.inspectedData.files) {
        state.inspectedData.files.forEach(f => {
          if (isAudioFile(f)) {
            state.selectedItemIds.add(f.id);
            audCount++;
          }
        });
      }
      renderInspectedFilesList(false);
      updateModalSelectionCount();
      if (audCount === 0) {
        showToast('Tidak ada file audio di folder ini.', 'info', 2500);
      } else {
        showToast(`Memilih ${audCount} file audio.`, 'success', 2000);
      }
    });
  }

  // Chip 4: Batal Semua
  if (btnChipNone) {
    btnChipNone.addEventListener('click', () => {
      setActiveChip(btnChipNone);
      state.selectedItemIds.clear();
      modalFileList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
      });
      updateModalSelectionCount();
    });
  }

  modalSelectAll.addEventListener('change', () => {
    const checked = modalSelectAll.checked;
    const filtered = getFilteredInspectedFiles();
    if (checked) {
      filtered.forEach(f => state.selectedItemIds.add(f.id));
      setActiveChip(btnChipAll);
    } else {
      filtered.forEach(f => state.selectedItemIds.delete(f.id));
      setActiveChip(btnChipNone);
    }
    modalFileList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.checked = checked;
    });
    updateModalSelectionCount();
  });

  function closeModal() {
    inspectionModal.classList.remove('open');
  }

  btnCloseModal.addEventListener('click', closeModal);
  btnCancelModal.addEventListener('click', closeModal);

  btnConfirmDownloadModal.addEventListener('click', () => {
    if (!state.inspectedData || state.selectedItemIds.size === 0) {
      showToast('toast.select_at_least_one', 'error');
      return;
    }

    const selectedFiles = state.inspectedData.files.filter(f => state.selectedItemIds.has(f.id));
    enqueueFiles(selectedFiles, true);
    closeModal();
    showToast(window.I18n ? I18n.t('toast.queue_added', { count: selectedFiles.length }) : `Berhasil menambahkan ${selectedFiles.length} file ke antrean!`, 'success');
    showDownloadsTab('queue');
  });

  // ----------------------------------------------------
  // Batch URLs Handling
  // ----------------------------------------------------
  batchUrlsInput.addEventListener('input', () => {
    const lines = batchUrlsInput.value.split('\n').filter(l => l.trim().length > 0);
    batchParsedSummary.textContent = `${lines.length} link(s) detected`;
  });

  btnStartBatch.addEventListener('click', async () => {
    if (btnStartBatch.disabled) return;
    batchUrlsInput.blur();
    setKeyboardState(false);
    const text = batchUrlsInput.value.trim();
    if (!text) {
      showToast('Please enter at least one link', 'error');
      return;
    }

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    showToast(`Processing ${lines.length} batch links...`, 'info');
    btnStartBatch.disabled = true;

    let addedCount = 0;
    for (const line of lines) {
      const parts = line.split(/\s+/);
      const url = parts[0];
      const password = parts.length > 1 ? parts[1] : '';

      try {
        const data = await ApiBridge.inspectContent(url, password);
        if (data && data.files) {
          enqueueFiles(data.files);
          addedCount += data.files.length;
        }
      } catch (err) {
        showToast(`Skipped ${url}: ${err.message}`, 'error');
      }
    }

    btnStartBatch.disabled = false;
    showToast(`Batch queued: ${addedCount} total files`, 'success');
    showDownloadsTab('queue');
  });

  // ----------------------------------------------------
  // Queue & Download Management
  // ----------------------------------------------------
  function enqueueFiles(files, allowAlreadyStored = false) {
    let skippedExisting = 0;
    let skippedStored = 0;
    const toEnqueue = [];

    const activeQueueIds = new Set(
      state.queue
        .filter(q => q.status === 'downloading' || q.status === 'queued')
        .map(q => q.id)
    );

    const storedSet = new Set();
    if (!allowAlreadyStored && state.storedFiles && state.storedFiles.length > 0) {
      state.storedFiles.forEach(sf => {
        if (sf.name) {
          storedSet.add(`${sf.name}___${sf.size || 0}`);
          storedSet.add(`${sf.name}___0`);
        }
      });
    }

    files.forEach(file => {
      // 1. Prevent duplicate if already in active queue
      if (activeQueueIds.has(file.id)) {
        skippedExisting++;
        return;
      }

      // 2. Anti-duplikat: periksa apakah file sudah tersimpan di memori/disk
      if (!allowAlreadyStored) {
        if (storedSet.has(`${file.name}___${file.size || 0}`) || storedSet.has(`${file.name}___0`)) {
          skippedStored++;
          return;
        }
      }

      toEnqueue.push(file);
    });

    if (toEnqueue.length === 0) {
      if (skippedStored > 0) {
        showToast(`Semua (${skippedStored}) file sudah pernah diunduh (fitur anti-duplikat aktif).`, 'info', 3500);
      } else if (skippedExisting > 0) {
        showToast('File yang dipilih sudah berada di antrean aktif.', 'info', 2500);
      }
      return;
    }

    if (skippedStored > 0) {
      showToast(`${skippedStored} file di-skip karena sudah tersimpan di penyimpanan (anti-duplikat).`, 'info', 3500);
    }

    state.sessionBatchTotal += toEnqueue.length;
    updateHeaderDownloadIndicator();

    if (queueEmptyState) queueEmptyState.style.display = 'none';
    const fragment = document.createDocumentFragment();

    toEnqueue.forEach(file => {
      const queueItem = {
        id: file.id,
        name: file.name,
        relDir: resolveSmartSubfolder(file, file.relDir || file.rel_dir || ''),
        size: file.size,
        link: file.link,
        mimetype: file.mimetype || '',
        status: 'queued', // queued | downloading | completed | paused | failed
        progress: 0,
        downloaded: 0,
        speed: 0,
        domElement: null
      };

      state.queue.push(queueItem);
      const card = createQueueCard(queueItem);
      queueItem.domElement = card;
      fragment.appendChild(card);
    });

    queueContainer.appendChild(fragment);
    reorderQueueDom();

    updateQueueCounters();
    processQueue();
  }

  function createQueueCard(item) {
    const card = document.createElement('div');
    card.className = 'queue-card';
    card.id = `qcard-${item.id}`;
    card.innerHTML = `
      <div class="queue-header">
        <div class="file-info">
          <div class="file-type-badge">${getFileIcon(item.name)}</div>
          <div class="file-names">
            <div class="file-title" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
            <div class="file-subpath">${item.relDir ? `/${escapeHtml(item.relDir)}` : 'Root'} • ${formatBytes(item.size)}</div>
          </div>
        </div>
        <div class="queue-actions">
          <span class="status-badge ${item.status || 'queued'}" id="badge-${item.id}">${item.status === 'paused' ? 'Dijeda' : (item.status === 'downloading' ? 'Downloading' : 'Queued')}</span>
          <button type="button" class="btn-card-pause-resume" id="btn-pause-resume-${item.id}" title="${item.status === 'paused' ? 'Lanjutkan unduhan' : 'Jeda unduhan'}">
            <svg id="icon-pause-resume-${item.id}" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              ${item.status === 'paused' ? '<polygon points="6 4 20 12 6 20 6 4"></polygon>' : '<rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect>'}
            </svg>
          </button>
          <button type="button" class="btn-icon" style="width:32px; height:32px;" id="btn-cancel-${item.id}" title="Remove from queue">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <div class="progress-track">
        <div class="progress-fill" id="pfill-${item.id}" style="width: ${item.progress || 0}%;"></div>
      </div>

      <div class="queue-meta-row">
        <div class="meta-stats">
          <span id="speed-${item.id}">${formatSpeed(item.speed || 0)}</span>
          <span id="bytes-${item.id}">${formatBytes(item.downloaded || 0)} / ${formatBytes(item.size)}</span>
        </div>
        <div id="pct-${item.id}" style="font-weight:600; color:var(--text-primary);">${item.progress || 0}%</div>
      </div>
    `;

    const cancelBtn = card.querySelector(`#btn-cancel-${item.id}`);
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        cancelQueueItem(item.id);
      });
    }

    const pauseResumeBtn = card.querySelector(`#btn-pause-resume-${item.id}`);
    if (pauseResumeBtn) {
      pauseResumeBtn.addEventListener('click', () => {
        togglePauseResumeItem(item.id);
      });
    }

    return card;
  }

  function renderQueueItem(item) {
    if (queueEmptyState) queueEmptyState.style.display = 'none';
    const card = createQueueCard(item);
    item.domElement = card;
    queueContainer.appendChild(card);
    reorderQueueDom();
  }

  function togglePauseResumeItem(id) {
    const item = state.queue.find(q => q.id === id);
    if (!item) return;

    if (item.status === 'downloading' || item.status === 'queued') {
      // Pause it gracefully
      item.status = 'paused';
      item.speed = 0;
      ApiBridge.pauseDownload(id);
      updateQueueItemStateUI(item);
      updateQueueCounters();
      updateGlobalMetrics();
      showToast(`Dijeda: ${item.name}`, 'info', 1500);
    } else if (item.status === 'paused' || item.status === 'failed') {
      // Resume it from existing bytes
      item.status = 'queued';
      item.speed = 0;
      updateQueueItemStateUI(item);
      updateQueueCounters();
      updateGlobalMetrics();
      processQueue();
      showToast(`Melanjutkan: ${item.name}`, 'info', 1500);
    }
  }

  function updateQueueItemStateUI(item) {
    const card = item.domElement || document.getElementById(`qcard-${item.id}`);
    if (!card) return;

    const badge = card.querySelector(`#badge-${item.id}`);
    const speedEl = card.querySelector(`#speed-${item.id}`);
    const btnPr = card.querySelector(`#btn-pause-resume-${item.id}`);
    const iconPr = card.querySelector(`#icon-pause-resume-${item.id}`);

    if (item.status === 'downloading') {
      card.classList.add('active-download');
      if (badge) { badge.className = 'status-badge downloading'; badge.textContent = 'Downloading'; }
      if (btnPr) btnPr.title = 'Jeda unduhan';
      if (iconPr) iconPr.innerHTML = `<rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect>`;
    } else if (item.status === 'paused') {
      card.classList.remove('active-download');
      if (badge) { badge.className = 'status-badge paused'; badge.textContent = 'Dijeda'; }
      if (speedEl) speedEl.textContent = '0.0 B/s';
      if (btnPr) btnPr.title = 'Lanjutkan unduhan';
      if (iconPr) iconPr.innerHTML = `<polygon points="6 4 20 12 6 20 6 4"></polygon>`;
    } else if (item.status === 'queued') {
      card.classList.remove('active-download');
      if (badge) { badge.className = 'status-badge queued'; badge.textContent = 'Queued'; }
      if (speedEl) speedEl.textContent = '0.0 B/s';
      if (btnPr) btnPr.title = 'Jeda antrean';
      if (iconPr) iconPr.innerHTML = `<rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect>`;
    } else if (item.status === 'failed') {
      card.classList.remove('active-download');
      if (badge) { badge.className = 'status-badge failed'; badge.textContent = 'Gagal'; }
      if (btnPr) btnPr.title = 'Coba lagi unduhan';
      if (iconPr) iconPr.innerHTML = `<polygon points="6 4 20 12 6 20 6 4"></polygon>`;
    }
  }

  function reorderQueueDom() {
    if (!queueContainer) return;
    const cards = Array.from(queueContainer.querySelectorAll('.queue-card'));
    if (cards.length <= 1) return;
    cards.sort((a, b) => {
      const aDownloading = a.classList.contains('active-download') ? 0 : 1;
      const bDownloading = b.classList.contains('active-download') ? 0 : 1;
      return aDownloading - bDownloading;
    });
    cards.forEach(card => queueContainer.appendChild(card));
  }

  function cancelQueueItem(id) {
    ApiBridge.cancelDownload(id);
    const idx = state.queue.findIndex(q => q.id === id);
    if (idx !== -1) {
      const item = state.queue[idx];
      item.status = 'cancelled';
      item.speed = 0;
      if (item.domElement) item.domElement.remove();
      state.queue.splice(idx, 1);
      updateQueueCounters();
      updateGlobalMetrics();
      processQueue();
    }
  }

  function updateQueueCounters() {
    const activeAndQueued = state.queue.filter(q => q.status === 'queued' || q.status === 'downloading');
    if (activeQueueCountEl) activeQueueCountEl.textContent = activeAndQueued.length;

    const subtabQueueCount = document.getElementById('subtab-queue-count');
    const subtabHistoryCount = document.getElementById('subtab-history-count');
    const storedFilesCountEl = document.getElementById('stored-files-count');
    if (subtabQueueCount) subtabQueueCount.textContent = activeAndQueued.length;
    if (subtabHistoryCount) subtabHistoryCount.textContent = state.history.length;
    if (storedFilesCountEl) storedFilesCountEl.textContent = state.storedFiles ? state.storedFiles.length : state.history.length;
    if (activeTasksEl) activeTasksEl.textContent = `${state.activeWorkersCount} / ${state.concurrentMax}`;

    // Manage Retry All button
    const failedCount = state.queue.filter(q => q.status === 'failed' || q.status === 'error').length;
    if (btnRetryAllQueue) {
      if (retryFailedCountLabel) retryFailedCountLabel.textContent = failedCount;
      if (failedCount > 0) {
        btnRetryAllQueue.classList.add('pulse-glow');
        btnRetryAllQueue.style.opacity = '1';
      } else {
        btnRetryAllQueue.classList.remove('pulse-glow');
        btnRetryAllQueue.style.opacity = '0.7';
      }
    }

    if (state.queue.length === 0 && queueEmptyState) {
      queueEmptyState.style.display = 'block';
    }
    saveQueue();
    updateHeaderDownloadIndicator();
  }

  async function processQueue() {
    const availableSlots = state.concurrentMax - state.activeWorkersCount;
    if (availableSlots <= 0) return;

    const queuedItems = state.queue.filter(q => q.status === 'queued');
    const toStart = queuedItems.slice(0, availableSlots);

    for (const item of toStart) {
      startDownloadingItem(item);
    }
  }

  async function startDownloadingItem(item) {
    if (item.status === 'paused') return;
    item.status = 'downloading';
    state.activeWorkersCount++;
    updateQueueCounters();
    updateQueueItemStateUI(item);
    reorderQueueDom();

    try {
      const res = await ApiBridge.downloadItem(item, state.downloadDir, (prog) => {
        updateItemProgress(prog);
      });

      if (item.status === 'paused' || (res && res.paused)) {
        item.status = 'paused';
        item.speed = 0;
        updateQueueItemStateUI(item);
        return;
      }

      if (res === true || (res && res.success !== false)) {
        markItemCompleted(item);
      } else {
        if (item.status !== 'paused') {
          markItemFailed(item, 'Unduhan terputus');
        }
      }
    } catch (err) {
      if (item.status !== 'paused') {
        markItemFailed(item, err.message);
      }
    } finally {
      state.activeWorkersCount = Math.max(0, state.activeWorkersCount - 1);
      updateQueueCounters();
      processQueue();
    }
  }

  function updateItemProgress(prog) {
    const item = state.queue.find(q => q.id === prog.id);
    if (item) {
      item.speed = prog.speed || 0;
      item.downloaded = prog.downloaded || 0;
      if (prog.filename && item.name !== prog.filename) {
        item.name = prog.filename;
      }
      if (prog.total && !item.size) {
        item.size = prog.total;
      }
    }

    if (prog && prog.alreadyExists && !item?.isUpdate) {
      showToast(`File "${prog.filename || item?.name}" sudah ada di memori internal (di-skip).`, 'info', 3000);
    }

    const card = document.getElementById(`qcard-${prog.id}`);
    if (card) {
      if (prog.filename) {
        const titleEl = card.querySelector('.qcard-title');
        if (titleEl && titleEl.textContent !== prog.filename) {
          titleEl.textContent = prog.filename;
        }
      }
      const pfill = card.querySelector(`#pfill-${prog.id}`);
      const speedEl = card.querySelector(`#speed-${prog.id}`);
      const bytesEl = card.querySelector(`#bytes-${prog.id}`);
      const pctEl = card.querySelector(`#pct-${prog.id}`);

      if (pfill) pfill.style.width = `${prog.progress}%`;
      if (speedEl) speedEl.textContent = formatSpeed(prog.speed);
      if (bytesEl) bytesEl.textContent = `${formatBytes(prog.downloaded)} / ${formatBytes(prog.total || item?.size || 0)}`;
      if (pctEl) pctEl.textContent = `${prog.progress}%`;
    }

    // Recalculate aggregate speed and global metrics
    updateGlobalMetrics();
  }
  window.updateItemProgress = updateItemProgress;

  function updateGlobalMetrics() {
    let aggregateSpeed = 0;
    let activeChunkBytes = 0;
    let remainingQueueSize = 0;

    state.queue.forEach(q => {
      if (q.status !== 'completed' && q.status !== 'cancelled') {
        remainingQueueSize += (q.size || 0);
      }
      if (q.status === 'downloading') {
        if (q.speed) aggregateSpeed += q.speed;
        if (q.downloaded) activeChunkBytes += q.downloaded;
      }
    });

    globalSpeedEl.textContent = formatSpeed(aggregateSpeed);

    const totalTarget = state.totalDownloadedBytes + remainingQueueSize;
    const currentDownloaded = state.totalDownloadedBytes + activeChunkBytes;
    if (totalTarget > 0) {
      totalDownloadedEl.textContent = `${formatBytes(currentDownloaded)} / ${formatBytes(totalTarget)}`;
    } else {
      totalDownloadedEl.textContent = formatBytes(currentDownloaded);
    }
  }

  function saveHistory() {
    try {
      const toSave = state.history.slice(-50).map(h => ({
        id: h.id,
        name: h.name,
        relDir: h.relDir || '',
        size: h.size,
        link: h.link,
        mimetype: h.mimetype || '',
        savedUri: h.savedUri || '',
        status: 'completed'
      }));
      localStorage.setItem('gf_history', JSON.stringify(toSave));
    } catch (e) {}
  }

  function saveQueue() {
    try {
      const toSave = state.queue.filter(q => q.status !== 'completed').map(q => ({
        id: q.id,
        name: q.name,
        relDir: q.relDir || '',
        size: q.size || 0,
        link: q.link,
        mimetype: q.mimetype || '',
        status: (q.status === 'downloading' || q.status === 'queued') ? 'paused' : q.status,
        progress: q.progress || 0,
        downloaded: q.downloaded || 0
      }));
      localStorage.setItem('gf_queue', JSON.stringify(toSave));
    } catch (e) {}
  }

  function markItemCompleted(item) {
    item.status = 'completed';
    item.speed = 0;
    state.totalDownloadedBytes += item.size;
    state.history.push(item);
    state.sessionBatchCompleted++;
    saveHistory();

    if (item.domElement) {
      item.domElement.remove();
    }

    renderHistoryItem(item);
    updateQueueCounters();
    updateGlobalMetrics();
    updateHeaderDownloadIndicator();
    loadStoredFiles();

    // Check notification preference
    const activeOrQueued = state.queue.filter(q => q.status === 'queued' || q.status === 'downloading').length;

    // Trigger celebration ad interstitial if eligible
    if (window.AdNetworkEngine && typeof window.AdNetworkEngine.maybeShowCelebration === 'function') {
      window.AdNetworkEngine.maybeShowCelebration(item, activeOrQueued === 0);
    }

    if (state.notificationMode === 'each_file') {
      showToast(`Selesai: ${item.name}`, 'success', 2000);
    } else if (state.notificationMode === 'summary_only') {
      // Discreet: Only show toast when all downloads in queue are finished
      if (activeOrQueued === 0) {
        showToast(`🎉 Semua ${state.sessionBatchCompleted} file berhasil diunduh!`, 'success', 3500);
      }
    }
  }

  function markItemFailed(item, msg) {
    item.status = 'failed';
    item.speed = 0;
    updateGlobalMetrics();

    if (typeof msg === 'string' && (msg.includes('429') || msg.includes('Rate Limit'))) {
      showIpHelperModal();
    }
    const card = item.domElement || document.getElementById(`qcard-${item.id}`);
    if (card) {
      card.classList.remove('active-download');
      const badge = card.querySelector(`#badge-${item.id}`);
      if (badge) {
        badge.className = 'status-badge failed';
        badge.textContent = 'Gagal';
      }
      const speedEl = card.querySelector(`#speed-${item.id}`);
      if (speedEl) speedEl.textContent = msg || 'Error';

      // Add single retry button on card actions if not already present
      const actionsEl = card.querySelector('.queue-actions');
      if (actionsEl && !actionsEl.querySelector(`.btn-single-retry-${item.id}`)) {
        const retryBtn = document.createElement('button');
        retryBtn.className = `btn btn-warning btn-sm btn-single-retry-${item.id}`;
        retryBtn.style.padding = '0.2rem 0.5rem';
        retryBtn.style.fontSize = '0.75rem';
        retryBtn.title = 'Coba lagi unduhan file ini';
        retryBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
          <span>Retry</span>
        `;
        retryBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          item.status = 'queued';
          item.progress = 0;
          item.downloaded = 0;
          item.speed = 0;
          badge.className = 'status-badge queued';
          badge.textContent = 'Queued';
          if (speedEl) speedEl.textContent = '0.0 B/s';
          retryBtn.remove();
          updateQueueCounters();
          processQueue();
          showToast(`Mencoba lagi unduhan: ${item.name}`, 'info', 2000);
        });
        actionsEl.insertBefore(retryBtn, actionsEl.firstChild);
      }
      reorderQueueDom();
    }
    updateQueueCounters();
    showToast(`Gagal: ${item.name}`, 'error', 3000);
  }

  function renderHistoryItem(item) {
    if (historyEmptyState) historyEmptyState.style.display = 'none';

    const card = document.createElement('div');
    card.className = 'queue-card';
    card.innerHTML = `
      <div class="queue-header">
        <div class="file-info">
          <div class="file-type-badge" style="color:var(--emerald-400);">${getFileIcon(item.name)}</div>
          <div class="file-names">
            <div class="file-title" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
            <div class="file-subpath">
              ${item.relDir ? `/${escapeHtml(item.relDir)}` : 'Root'} • ${formatBytes(item.size)}
              ${isVideoFile(item) ? (isVideoWatched(item) ? '<span class="video-watched-badge watched">✓ Ditonton</span>' : '<span class="video-watched-badge unplayed">Baru</span>') : ''}
            </div>
          </div>
        </div>
        <div class="queue-actions">
          <button class="btn btn-primary btn-sm btn-open-file" title="Buka file ini">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            Buka File
          </button>
          <button class="btn btn-secondary btn-sm btn-open-dir" title="Buka folder lokasi file">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
            Folder
          </button>
        </div>
      </div>
    `;

    const openFileBtn = card.querySelector('.btn-open-file');
    const openDirBtn = card.querySelector('.btn-open-dir');

    openFileBtn.addEventListener('click', async () => {
      const fullPath = item.relDir ? `${state.downloadDir}/${item.relDir}/${item.name}` : `${state.downloadDir}/${item.name}`;
      if (isPlayableMedia(item)) {
        await openMediaPlayer(item);
      } else {
        const opened = await ApiBridge.openFile(fullPath, item);
        if (!opened) {
          showToast(`Tidak dapat membuka: ${item.name}`, 'error', 3000);
        }
      }
    });

    openDirBtn.addEventListener('click', async () => {
      const folderPath = item.relDir ? `${state.downloadDir}/${item.relDir}` : state.downloadDir;
      const opened = await ApiBridge.openFolder(folderPath);
      if (!opened) {
        showToast(`Lokasi: ${folderPath}`, 'info', 3000);
      }
    });

    historyContainer.prepend(card);
  }

  // Start All / Resume All Queue
  if (btnStartAllQueue) {
    debounceClick(btnStartAllQueue, () => {
      if (window.AdNetworkEngine && typeof window.AdNetworkEngine.maybeTriggerDirectLink === 'function') {
        window.AdNetworkEngine.maybeTriggerDirectLink('download_start');
      }
      let resumed = 0;
      state.queue.forEach(q => {
        if (q.status === 'paused' || q.status === 'failed') {
          q.status = 'queued';
          resumed++;
          const card = q.domElement || document.getElementById(`qcard-${q.id}`);
          if (card) {
            const badge = card.querySelector(`#badge-${q.id}`);
            if (badge) {
              badge.className = 'status-badge queued';
              badge.textContent = 'Queued';
            }
            const btnSingleRetry = card.querySelector(`.btn-single-retry-${q.id}`);
            if (btnSingleRetry) btnSingleRetry.remove();
          }
        }
      });
      updateQueueCounters();
      processQueue();
      showToast(resumed > 0 ? `Melanjutkan ${resumed} unduhan...` : 'Semua unduhan aktif', 'info', 2000);
    });
  }

  // Retry All Failed Downloads
  if (btnRetryAllQueue) {
    debounceClick(btnRetryAllQueue, () => {
      let retried = 0;
      state.queue.forEach(q => {
        if (q.status === 'failed' || q.status === 'error' || q.status === 'paused') {
          q.status = 'queued';
          q.progress = 0;
          q.downloaded = 0;
          q.speed = 0;
          retried++;
          const card = q.domElement || document.getElementById(`qcard-${q.id}`);
          if (card) {
            const badge = card.querySelector(`#badge-${q.id}`);
            if (badge) {
              badge.className = 'status-badge queued';
              badge.textContent = 'Queued';
            }
            const speedEl = card.querySelector(`#speed-${q.id}`);
            if (speedEl) speedEl.textContent = '0.0 B/s';
            const btnSingleRetry = card.querySelector(`.btn-single-retry-${q.id}`);
            if (btnSingleRetry) btnSingleRetry.remove();
          }
        }
      });
      updateQueueCounters();
      processQueue();
      showToast(retried > 0 ? `Mencoba lagi ${retried} unduhan...` : 'Tidak ada unduhan tertunda atau gagal', retried > 0 ? 'success' : 'info', 2500);
    });
  }

  debounceClick(btnPauseAll, () => {
    ApiBridge.stopAll();
    state.queue.forEach(q => {
      if (q.status === 'downloading' || q.status === 'queued') {
        q.status = 'paused';
        q.speed = 0;
        updateQueueItemStateUI(q);
      }
    });
    state.activeWorkersCount = 0;
    updateQueueCounters();
    updateGlobalMetrics();
    showToast('Semua unduhan dijeda (Paused)', 'info', 2000);
  });

  async function openDownloadsDirectory() {
    const opened = await ApiBridge.openFolder(state.downloadDir);
    if (!opened) {
      showToast(`Folder unduhan: ${state.downloadDir}`, 'info', 3000);
    }
  }

  if (btnOpenFolderQueue) {
    debounceClick(btnOpenFolderQueue, openDownloadsDirectory);
  }

  if (btnOpenFolderHistory) {
    debounceClick(btnOpenFolderHistory, openDownloadsDirectory);
  }

  debounceClick(btnClearQueue, () => {
    ApiBridge.stopAll();
    state.queue.forEach(q => {
      q.status = 'cancelled';
      q.speed = 0;
      if (q.domElement) q.domElement.remove();
    });
    state.queue = [];
    state.activeWorkersCount = 0;
    localStorage.removeItem('gf_queue');
    updateQueueCounters();
    updateGlobalMetrics();
    showToast('Queue cleared', 'info');
  });

  debounceClick(btnClearHistory, () => {
    historyContainer.innerHTML = '';
    state.history = [];
    localStorage.removeItem('gf_history');
    if (historyEmptyState) historyContainer.appendChild(historyEmptyState);
    if (historyEmptyState) historyEmptyState.style.display = 'block';
    updateQueueCounters();
    showToast('History cleared', 'info');
  });

  // ----------------------------------------------------
  // Settings Management
  // ----------------------------------------------------
  settingWorkers.addEventListener('input', () => {
    valWorkers.textContent = settingWorkers.value;
  });

  debounceClick(btnChooseFolder, async () => {
    const chosen = await ApiBridge.chooseFolder();
    if (chosen) {
      settingDownloadDir.value = chosen;
      showToast(`Selected directory: ${chosen}`, 'info');
    } else {
      showToast('Native folder picker is available when running the desktop app', 'info');
    }
  });

  // Theme Toggle Listener
  if (btnThemeToggle && window.ThemeManager) {
    btnThemeToggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const nextTheme = ThemeManager.toggleTheme();
      if (settingTheme) settingTheme.value = nextTheme;
      showToast(nextTheme === 'dark' ? 'Mode Gelap Aktif 🌙' : 'Mode Terang Aktif ☀️', 'info', 1500);
    });
  }

  // Theme Dropdown Selector Listener
  if (settingTheme && window.ThemeManager) {
    settingTheme.addEventListener('change', (e) => {
      ThemeManager.applyTheme(e.target.value);
    });
  }

  // Language Dropdown Selector Listener
  if (settingLang && window.I18n) {
    settingLang.addEventListener('change', (e) => {
      I18n.setLanguage(e.target.value);
    });
  }

  // Trakteer Link Opener (Cross-Platform)
  const openTrakteer = (e) => {
    if (e) e.preventDefault();
    const trakteerUrl = 'https://trakteer.id/roy1304';
    ApiBridge.openUrl(trakteerUrl);
  };

  if (btnHeaderTrakteer) {
    btnHeaderTrakteer.addEventListener('click', openTrakteer);
  }
  document.querySelectorAll('.btn-trakteer-trigger').forEach(btn => {
    btn.addEventListener('click', openTrakteer);
  });

  btnSaveSettings.addEventListener('click', () => {
    state.downloadDir = settingDownloadDir.value.trim() || './downloads';
    state.concurrentMax = parseInt(settingWorkers.value, 10);
    const customToken = settingToken.value.trim();

    localStorage.setItem('gf_download_dir', state.downloadDir);
    localStorage.setItem('gf_workers', state.concurrentMax.toString());
    if (settingNotifMode) {
      state.notificationMode = settingNotifMode.value;
      localStorage.setItem('gf_notif_mode', state.notificationMode);
    }
    if (settingAutoCategorize) {
      state.autoCategorize = settingAutoCategorize.checked;
      localStorage.setItem('gf_auto_categorize', state.autoCategorize ? 'true' : 'false');
    }

    if (customToken) {
      localStorage.setItem('gf_token', customToken);
    } else {
      localStorage.removeItem('gf_token');
    }

    const savedMsg = window.I18n ? I18n.t('toast.settings_saved') : 'Pengaturan berhasil disimpan';
    showToast(savedMsg, 'success', 2500);
  });

  // ----------------------------------------------------
  // Kelola File (Storage Manager, Advanced Filters & Batch Deletion)
  // ----------------------------------------------------
  async function loadStoredFiles() {
    try {
      const nativeFiles = await ApiBridge.listDownloadedFiles(state.downloadDir);
      const mergedMap = new Map();

      // Update Android permission & battery status indicators
      const platInfo = ApiBridge.getPlatformInfo();
      if (platInfo.isAndroid) {
        const androidStatus = ApiBridge.androidStatus || {};
        if (storagePermissionBanner) {
          storagePermissionBanner.style.display = androidStatus.needsStoragePermission ? 'flex' : 'none';
        }
        if (storagePermStatusText) {
          storagePermStatusText.textContent = androidStatus.needsStoragePermission
            ? '⚠️ Izin belum lengkap. Aktifkan izin agar seluruh file lama di folder Download/GoFile terbaca.'
            : '✅ Izin aktif. Seluruh file di folder Download/GoFile terbaca penuh.';
        }
        if (batteryOptimizationStatusText) {
          batteryOptimizationStatusText.textContent = androidStatus.ignoringBatteryOptimizations
            ? '✅ Mode Unrestricted aktif. HP tidak akan mematikan proses download saat tidur.'
            : '⚠️ Optimasi baterai aktif. Disarankan aktifkan Unrestricted agar unduhan tidak terputus saat layar mati.';
        }
      } else {
        if (cardAndroidPower) cardAndroidPower.style.display = 'none';
        if (storagePermissionBanner) storagePermissionBanner.style.display = 'none';
      }

      // 1. History records
      state.history.forEach(h => {
        mergedMap.set(h.name, {
          name: h.name,
          size: h.size || 0,
          modified: h.completedAt || Date.now(),
          relDir: h.relDir || '',
          uri: h.savedUri || '',
          mimetype: h.mimetype || ''
        });
      });

      // 2. Physical disk / MediaStore scan
      if (Array.isArray(nativeFiles)) {
        nativeFiles.forEach(f => {
          mergedMap.set(f.name, f);
        });
      }

      state.storedFiles = Array.from(mergedMap.values());
      renderStoredFiles();
      updateQueueCounters();
    } catch (err) {
      console.warn('loadStoredFiles error:', err);
    }
  }

  function setFileFilterChip(activeBtn, filterType) {
    [chipFileAll, chipFileVideo, chipFilePhoto, chipFileAudio, chipFileOther].forEach(btn => {
      if (btn) btn.classList.toggle('active', btn === activeBtn);
    });
    state.storedFilesFilter = filterType;
    state.storedFilesRenderLimit = 35;
    renderStoredFiles();
  }

  if (chipFileAll) chipFileAll.addEventListener('click', () => setFileFilterChip(chipFileAll, 'all'));
  if (chipFileVideo) chipFileVideo.addEventListener('click', () => setFileFilterChip(chipFileVideo, 'video'));
  if (chipFilePhoto) chipFilePhoto.addEventListener('click', () => setFileFilterChip(chipFilePhoto, 'photo'));
  if (chipFileAudio) chipFileAudio.addEventListener('click', () => setFileFilterChip(chipFileAudio, 'audio'));
  if (chipFileOther) chipFileOther.addEventListener('click', () => setFileFilterChip(chipFileOther, 'other'));

  // Custom Glassmorphic Sort Dropdown Controller
  if (btnSortTrigger && customSortDropdown) {
    btnSortTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = customSortDropdown.classList.toggle('open');
      btnSortTrigger.setAttribute('aria-expanded', isOpen);
    });

    sortMenuItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const sortVal = item.getAttribute('data-value');
        state.storedFilesSort = sortVal;
        state.storedFilesRenderLimit = 35;

        sortMenuItems.forEach(mi => mi.classList.remove('active'));
        item.classList.add('active');

        const icon = item.querySelector('.sort-item-icon')?.textContent || '';
        const label = item.querySelector('.sort-item-label')?.textContent || '';
        if (sortTriggerIcon) sortTriggerIcon.textContent = icon;
        if (sortTriggerText) sortTriggerText.textContent = label;

        customSortDropdown.classList.remove('open');
        btnSortTrigger.setAttribute('aria-expanded', 'false');
        renderStoredFiles();
      });
    });

    document.addEventListener('click', (e) => {
      if (!customSortDropdown.contains(e.target)) {
        customSortDropdown.classList.remove('open');
        btnSortTrigger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  if (searchFilesInput) {
    searchFilesInput.addEventListener('input', (e) => {
      state.storedFilesSearch = e.target.value;
      state.storedFilesRenderLimit = 35;
      if (btnClearFileSearch) {
        btnClearFileSearch.style.display = state.storedFilesSearch ? 'flex' : 'none';
      }
      renderStoredFiles();
    });
  }

  if (btnClearFileSearch) {
    btnClearFileSearch.addEventListener('click', () => {
      if (searchFilesInput) searchFilesInput.value = '';
      state.storedFilesSearch = '';
      state.storedFilesRenderLimit = 35;
      btnClearFileSearch.style.display = 'none';
      renderStoredFiles();
    });
  }

  if (btnRefreshFiles) {
    btnRefreshFiles.addEventListener('click', async () => {
      btnRefreshFiles.disabled = true;
      showToast('Memindai folder penyimpanan GoFile...', 'info', 1500);
      await loadStoredFiles();
      btnRefreshFiles.disabled = false;
      showToast('Daftar file diperbarui.', 'success', 1500);
    });
  }

  if (btnOpenFolderFiles) {
    btnOpenFolderFiles.addEventListener('click', openDownloadsDirectory);
  }

  // ----------------------------------------------------
  // Local Wi-Fi File Sharing Server Controller
  // ----------------------------------------------------
  async function syncWifiShareUI() {
    try {
      const status = await ApiBridge.getWifiShareStatus();
      const isRunning = !!status.isRunning;
      const isLocal = status.isLocalNetwork !== false && status.ip && !status.ip.startsWith('127.');

      if (toggleWifiServer) {
        toggleWifiServer.checked = isRunning;
      }
      if (isRunning) {
        if (wifiServerStatusTitle) wifiServerStatusTitle.textContent = 'Server Berbagi Wi-Fi Aktif';
        if (wifiServerStatusDesc) wifiServerStatusDesc.textContent = `Aktif di port ${status.port} • Berkas siap diakses`;
        if (wifiServerDetails) wifiServerDetails.style.display = 'flex';
        if (wifiServerUrlText) wifiServerUrlText.textContent = status.url;

        // Update Network Status Badge
        if (wifiNetworkStatusBox) {
          if (isLocal) {
            wifiNetworkStatusBox.className = 'wifi-net-badge online';
            if (wifiNetDot) wifiNetDot.textContent = '🟢';
            if (wifiNetLabel) wifiNetLabel.innerHTML = `Jaringan Lokal Siap: <strong>${escapeHtml(status.ip)}</strong>`;
          } else {
            wifiNetworkStatusBox.className = 'wifi-net-badge offline';
            if (wifiNetDot) wifiNetDot.textContent = '⚠️';
            if (wifiNetLabel) wifiNetLabel.innerHTML = `<div><strong>Wi-Fi / Hotspot Belum Aktif di HP Ini</strong></div><div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">Sambungkan HP ini ke Wi-Fi atau nyalakan Hotspot Pribadi, lalu tekan tombol Segarkan.</div>`;
          }
        }

        if (wifiQrContainer && typeof window.generateQrSvg === 'function') {
          wifiQrContainer.innerHTML = window.generateQrSvg(status.url, 180);
        }
      } else {
        if (wifiServerStatusTitle) wifiServerStatusTitle.textContent = 'Server Berbagi Wi-Fi';
        if (wifiServerStatusDesc) wifiServerStatusDesc.textContent = 'Server sedang tidak aktif';
        if (wifiServerDetails) wifiServerDetails.style.display = 'none';
        if (wifiQrContainer) wifiQrContainer.innerHTML = '';
      }
    } catch (e) {
      console.warn('syncWifiShareUI error:', e);
    }
  }

  function openWifiShareModal() {
    if (wifiShareModal) {
      wifiShareModal.classList.add('active');
      syncWifiShareUI();
    }
  }

  function closeWifiShareModal() {
    if (wifiShareModal) {
      wifiShareModal.classList.remove('active');
    }
  }

  if (btnOpenWifiShare) {
    btnOpenWifiShare.addEventListener('click', openWifiShareModal);
  }

  if (btnCloseWifiShareModal) {
    btnCloseWifiShareModal.addEventListener('click', closeWifiShareModal);
  }

  if (btnCloseWifiShareBottom) {
    btnCloseWifiShareBottom.addEventListener('click', closeWifiShareModal);
  }

  if (btnRefreshWifiIp) {
    btnRefreshWifiIp.addEventListener('click', async () => {
      showToast('Menyegarkan status IP jaringan...', 'info', 1200);
      await ApiBridge.refreshWifiShareIp();
      await syncWifiShareUI();
      const status = await ApiBridge.getWifiShareStatus();
      if (status.ip && !status.ip.startsWith('127.')) {
        showToast(`IP diperbarui: ${status.ip}`, 'success', 2200);
      } else {
        showToast('Wi-Fi / Hotspot belum aktif di HP ini.', 'warning', 2500);
      }
    });
  }

  if (toggleWifiServer) {
    toggleWifiServer.addEventListener('change', async () => {
      if (toggleWifiServer.checked) {
        showToast('Memulai server berbagi berkas lokal...', 'info', 1800);
        const res = await ApiBridge.startWifiShareServer(8080);
        if (res && res.success) {
          showToast('Server Wi-Fi aktif! Pindai QR di perangkat lain.', 'success', 3000);
          await syncWifiShareUI();
        } else {
          toggleWifiServer.checked = false;
          showToast('Gagal mengaktifkan server Wi-Fi.', 'error', 3000);
        }
      } else {
        await ApiBridge.stopWifiShareServer();
        showToast('Server berbagi Wi-Fi telah dinonaktifkan.', 'info', 1800);
        await syncWifiShareUI();
      }
    });
  }

  if (btnCopyWifiUrl) {
    btnCopyWifiUrl.addEventListener('click', async () => {
      const url = wifiServerUrlText?.textContent || '';
      if (!url) return;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(url);
        } else {
          const ta = document.createElement('textarea');
          ta.value = url;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
        showToast('Tautan server berhasil disalin ke clipboard!', 'success', 2000);
      } catch (err) {
        showToast(`Tautan: ${url}`, 'info', 3000);
      }
    });
  }

  // ----------------------------------------------------
  // Mandatory System Permissions & Anti-Kill Guard (Onboarding)
  // ----------------------------------------------------
  const modalPermGuard = document.getElementById('modal-permissions-guard');
  const badgePermStorage = document.getElementById('perm-badge-storage');
  const badgePermBattery = document.getElementById('perm-badge-battery');
  const badgePermNotif = document.getElementById('perm-badge-notif');
  const btnPermGrantStorage = document.getElementById('btn-perm-grant-storage');
  const btnPermGrantBattery = document.getElementById('btn-perm-grant-battery');
  const btnPermGrantNotif = document.getElementById('btn-perm-grant-notif');
  const btnPermDismiss = document.getElementById('btn-perm-dismiss');
  const btnPermFinish = document.getElementById('btn-perm-finish');

  let permStorageGranted = false;
  let permBatteryIgnored = false;

  async function checkPermissionsOnboarding(isManual = false) {
    const isAndroid = ApiBridge.platform === 'android' || (window.Capacitor && (typeof window.Capacitor.isNativePlatform === 'function' ? window.Capacitor.isNativePlatform() : window.Capacitor.getPlatform?.() === 'android'));
    if (!isAndroid) return;

    try {
      const storageStatus = await ApiBridge.checkStoragePermissions();
      permStorageGranted = !!(storageStatus && storageStatus.granted);

      const isConfirmedManual = localStorage.getItem('gf_battery_confirmed') === 'true';
      const batteryStatus = await ApiBridge.isIgnoringBatteryOptimizations();
      permBatteryIgnored = isConfirmedManual || !!(batteryStatus && batteryStatus.ignoring);

      if (badgePermStorage) {
        if (permStorageGranted) {
          badgePermStorage.className = 'perm-badge granted';
          badgePermStorage.textContent = window.I18n ? I18n.t('perm.status_granted') : 'Sudah Aktif ✅';
          if (btnPermGrantStorage) btnPermGrantStorage.style.display = 'none';
        } else {
          badgePermStorage.className = 'perm-badge pending';
          badgePermStorage.textContent = window.I18n ? I18n.t('perm.status_pending') : 'Belum Aktif ⚠️';
          if (btnPermGrantStorage) btnPermGrantStorage.style.display = 'inline-block';
        }
      }

      const btnConfirmManual = document.getElementById('btn-perm-confirm-battery-manual');
      if (badgePermBattery) {
        if (permBatteryIgnored) {
          badgePermBattery.className = 'perm-badge granted';
          badgePermBattery.textContent = window.I18n ? I18n.t('perm.status_granted') : 'Sudah Aktif ✅';
          if (btnPermGrantBattery) btnPermGrantBattery.style.display = 'none';
          if (btnConfirmManual) btnConfirmManual.style.display = 'none';
        } else {
          badgePermBattery.className = 'perm-badge pending';
          badgePermBattery.textContent = window.I18n ? I18n.t('perm.status_pending') : 'Belum Aktif ⚠️';
          if (btnPermGrantBattery) btnPermGrantBattery.style.display = 'inline-block';
          if (btnConfirmManual) btnConfirmManual.style.display = 'inline-block';
        }
      }

      if (badgePermNotif) {
        badgePermNotif.className = 'perm-badge granted';
        badgePermNotif.textContent = window.I18n ? I18n.t('perm.status_granted') : 'Sudah Aktif ✅';
        if (btnPermGrantNotif) btnPermGrantNotif.style.display = 'none';
      }

      const allGranted = permStorageGranted && permBatteryIgnored;
      const dismissed = localStorage.getItem('gf_perm_dismissed') === 'true';

      if (!allGranted && !dismissed && modalPermGuard) {
        modalPermGuard.style.display = 'flex';
      } else if (allGranted && modalPermGuard) {
        modalPermGuard.style.display = 'none';
      }
    } catch (e) {
      console.warn('Error checking permissions:', e);
    }
  }
  window.checkPermissionsOnboarding = checkPermissionsOnboarding;

  const btnPermConfirmBatteryManual = document.getElementById('btn-perm-confirm-battery-manual');
  if (btnPermConfirmBatteryManual) {
    if (localStorage.getItem('gf_battery_confirmed') === 'true') {
      btnPermConfirmBatteryManual.style.display = 'none';
    }
    btnPermConfirmBatteryManual.addEventListener('click', async () => {
      localStorage.setItem('gf_battery_confirmed', 'true');
      if (ApiBridge.confirmBatteryOptimization) {
        await ApiBridge.confirmBatteryOptimization();
      }
      permBatteryIgnored = true;
      if (badgePermBattery) {
        badgePermBattery.className = 'perm-badge granted';
        badgePermBattery.textContent = 'Sudah Aktif (Manual) ✅';
        if (btnPermGrantBattery) btnPermGrantBattery.style.display = 'none';
      }
      btnPermConfirmBatteryManual.style.display = 'none';
      showToast('Status Antikill Baterai berhasil dikonfirmasi aktif!', 'success', 2500);
      setTimeout(checkPermissionsOnboarding, 500);
    });
  }

  if (btnPermGrantStorage) {
    btnPermGrantStorage.addEventListener('click', async () => {
      showToast(window.I18n ? I18n.t('toast.perm_storage_opening') : 'Membuka pengaturan izin akses penyimpanan...', 'info', 2000);
      await ApiBridge.requestStoragePermissions();
      setTimeout(checkPermissionsOnboarding, 1200);
    });
  }

  if (btnPermGrantBattery) {
    btnPermGrantBattery.addEventListener('click', async () => {
      showToast(window.I18n ? I18n.t('toast.perm_battery_opening') : 'Membuka pengaturan optimasi baterai (Unrestricted)...', 'info', 2000);
      await ApiBridge.requestIgnoreBatteryOptimizations();
      setTimeout(checkPermissionsOnboarding, 1200);
    });
  }

  if (btnPermGrantNotif) {
    btnPermGrantNotif.addEventListener('click', async () => {
      await ApiBridge.requestStoragePermissions();
      setTimeout(checkPermissionsOnboarding, 1200);
    });
  }

  if (btnPermDismiss) {
    btnPermDismiss.addEventListener('click', () => {
      localStorage.setItem('gf_perm_dismissed', 'true');
      if (modalPermGuard) modalPermGuard.style.display = 'none';
      showToast('toast.perm_battery_opening', 'warning', 4000);
    });
  }

  if (btnPermFinish) {
    btnPermFinish.addEventListener('click', async () => {
      await checkPermissionsOnboarding(true);
      if (modalPermGuard) modalPermGuard.style.display = 'none';
      if (permStorageGranted) {
        showToast('Izin aktif! GoFile Pro siap mengunduh tanpa henti.', 'success', 2800);
      } else {
        showToast('Mode terbatas aktif: Harap berikan izin akses penyimpanan file.', 'warning', 3000);
      }
    });
  }

  // ----------------------------------------------------
  // Token Validation in Settings
  // ----------------------------------------------------
  const btnVerifyToken = document.getElementById('btn-verify-token');
  const tokenStatusBadge = document.getElementById('token-status-badge');

  if (btnVerifyToken) {
    btnVerifyToken.addEventListener('click', async () => {
      const token = settingToken ? settingToken.value.trim() : '';
      if (!token) {
        showToast(window.I18n ? I18n.t('toast.enter_url') : 'Masukkan token akun terlebih dahulu', 'warning', 2500);
        return;
      }
      if (tokenStatusBadge) {
        tokenStatusBadge.style.display = 'inline-block';
        tokenStatusBadge.className = 'loading';
        tokenStatusBadge.textContent = window.I18n ? I18n.t('settings.token_verifying') : 'Memeriksa ke server GoFile...';
      }

      try {
        const res = await ApiBridge.verifyAccountToken(token);
        if (res && res.valid) {
          const isPrem = res.tier === 'premium';
          tokenStatusBadge.className = 'valid';
          tokenStatusBadge.textContent = isPrem
            ? (window.I18n ? I18n.t('settings.token_valid_premium') : 'Token Valid (GoFile Premium) ✅')
            : (window.I18n ? I18n.t('settings.token_valid_free') : 'Token Valid (Akun Bebas) ⚡');
          showToast(`Akun terverifikasi: ${res.email || 'GoFile Account'} (${res.tier || 'standard'})`, 'success', 3500);
        } else {
          tokenStatusBadge.className = 'invalid';
          tokenStatusBadge.textContent = window.I18n ? I18n.t('settings.token_invalid') : 'Token Tidak Valid / Kedaluwarsa ❌';
          showToast(res.message || 'Token tidak valid', 'error', 3500);
        }
      } catch (err) {
        if (tokenStatusBadge) {
          tokenStatusBadge.className = 'invalid';
          tokenStatusBadge.textContent = err.message || 'Error validasi';
        }
      }
    });
  }

  // ----------------------------------------------------
  // IP Bypass & Self-Healing Auto-Repair Engine
  // ----------------------------------------------------
  const modalIpHelper = document.getElementById('modal-ip-helper');
  const btnOpenIpHelper = document.getElementById('btn-open-ip-helper');
  const btnCloseIpHdr = document.getElementById('btn-close-ip-helper');
  const btnCloseIpOk = document.getElementById('btn-close-ip-helper-ok');
  const btnAutoHealRetry = document.getElementById('btn-auto-heal-retry');
  const btnTriggerAirplane = document.getElementById('btn-trigger-airplane-settings');
  const autoHealBanner = document.getElementById('auto-heal-banner');
  const autoHealBadge = document.getElementById('auto-heal-badge');
  const autoHealPct = document.getElementById('auto-heal-pct');
  const autoHealProgressFill = document.getElementById('auto-heal-progress-fill');
  const autoHealCarrierCard = document.getElementById('auto-heal-carrier-card');
  const autoHealSuccessBox = document.getElementById('auto-heal-success-box');

  let isAutoHealing = false;
  let networkListenerAttached = false;

  function updateStepUi(stepId, state, descText) {
    const el = document.getElementById(stepId);
    if (!el) return;
    const ind = el.querySelector('.step-indicator');
    const desc = el.querySelector('.step-desc');
    el.classList.remove('active', 'done');
    if (desc && descText) desc.textContent = descText;

    if (state === 'running') {
      el.classList.add('active');
      if (ind) {
        ind.className = 'step-indicator running';
        ind.innerHTML = '<span class="step-spinner"></span>';
      }
    } else if (state === 'done') {
      el.classList.add('done');
      if (ind) {
        ind.className = 'step-indicator success';
        ind.textContent = '✓';
      }
    } else if (state === 'failed') {
      if (ind) {
        ind.className = 'step-indicator';
        ind.style.background = 'rgba(239, 68, 68, 0.25)';
        ind.style.color = '#ef4444';
        ind.textContent = '✕';
      }
    } else {
      if (ind) {
        ind.className = 'step-indicator pending';
        ind.style.background = '';
        ind.style.color = '';
        const num = stepId.includes('socket') ? '1' : stepId.includes('token') ? '2' : stepId.includes('mirror') ? '3' : '4';
        ind.textContent = num;
      }
    }
  }

  async function runAutoHealPipeline() {
    if (isAutoHealing) return;
    isAutoHealing = true;

    // Reset UI elements
    if (autoHealBadge) {
      autoHealBadge.className = 'auto-heal-badge';
      autoHealBadge.textContent = window.I18n ? I18n.t('ip.status_running') : '🔄 Sedang Memperbaiki Otomatis...';
    }
    if (autoHealPct) autoHealPct.textContent = '10%';
    if (autoHealProgressFill) autoHealProgressFill.style.width = '10%';
    if (autoHealCarrierCard) autoHealCarrierCard.style.display = 'none';
    if (autoHealSuccessBox) autoHealSuccessBox.style.display = 'none';

    updateStepUi('step-socket', 'running', 'Mengosongkan cache soket TCP & DNS...');
    updateStepUi('step-token', 'pending', 'Menunggu...');
    updateStepUi('step-mirror', 'pending', 'Menunggu...');
    updateStepUi('step-ping', 'pending', 'Menunggu...');

    try {
      // Step 1: Purge sockets and network cache
      await ApiBridge.purgeNetworkCache();
      await new Promise(r => setTimeout(r, 600));
      updateStepUi('step-socket', 'done', 'Cache soket dan koneksi TCP berhasil direset ✓');
      if (autoHealPct) autoHealPct.textContent = '35%';
      if (autoHealProgressFill) autoHealProgressFill.style.width = '35%';

      // Step 2: Session Rotation & Token Pool Refresh
      updateStepUi('step-token', 'running', 'Mereset session token lama & meminta token baru...');
      await ApiBridge.invalidateAccountToken();
      // If token pool has healthy tokens from remoteConfig, take one
      const remoteCfg = window.remoteConfig || JSON.parse(localStorage.getItem('gofile_remote_config') || '{}');
      if (remoteCfg.tokenPool && remoteCfg.tokenPool.length > 0) {
        const healthy = remoteCfg.tokenPool.find(t => t.status === 'healthy');
        if (healthy && healthy.token) {
          localStorage.setItem('gf_token', healthy.token);
        }
      }
      await new Promise(r => setTimeout(r, 600));
      updateStepUi('step-token', 'done', 'Sesi segar diaktifkan (Token GoFile baru aktif) ✓');
      if (autoHealPct) autoHealPct.textContent = '65%';
      if (autoHealProgressFill) autoHealProgressFill.style.width = '65%';

      // Step 3: Mirror Link Re-query Preparation
      updateStepUi('step-mirror', 'running', 'Memperbarui mirror direct CDN link...');
      (state.queue || []).forEach(q => {
        if (q.status === 'failed') {
          q.status = 'queued';
        }
      });
      await new Promise(r => setTimeout(r, 500));
      updateStepUi('step-mirror', 'done', 'Mirror link siap diperbarui secara otomatis ✓');
      if (autoHealPct) autoHealPct.textContent = '80%';
      if (autoHealProgressFill) autoHealProgressFill.style.width = '80%';

      // Step 4: Health Probe to GoFile Server
      updateStepUi('step-ping', 'running', 'Mengirim probe validasi ke server GoFile...');
      const probe = await ApiBridge.probeGoFileHealth();

      if (probe.ok || probe.status === 200) {
        // Success!
        updateStepUi('step-ping', 'done', 'Server GoFile merespons 200 OK (Koneksi Normal) ✓');
        if (autoHealPct) autoHealPct.textContent = '100%';
        if (autoHealProgressFill) autoHealProgressFill.style.width = '100%';
        if (autoHealBadge) {
          autoHealBadge.className = 'auto-heal-badge success';
          autoHealBadge.textContent = window.I18n ? I18n.t('ip.status_success') : '✅ Berhasil Diperbaiki! Sesi Pulih';
        }
        if (autoHealSuccessBox) autoHealSuccessBox.style.display = 'block';

        // Auto-resume downloads
        setTimeout(() => {
          processQueue();
          showToast(window.I18n ? I18n.t('ip.status_success') : 'Koneksi Berhasil Diperbaiki!', 'success', 3000);
        }, 1200);

      } else if (probe.status === 429) {
        // Hard Carrier IP Block
        updateStepUi('step-ping', 'failed', 'Operator seluler terkena limit IP Cloudflare (429)');
        if (autoHealPct) autoHealPct.textContent = '75%';
        if (autoHealProgressFill) autoHealProgressFill.style.width = '75%';
        if (autoHealBadge) {
          autoHealBadge.className = 'auto-heal-badge warning';
          autoHealBadge.textContent = window.I18n ? I18n.t('ip.status_carrier_block') : '⚠️ Operator Seluler Terkena Blokir';
        }
        if (autoHealCarrierCard) autoHealCarrierCard.style.display = 'block';

        // Attach listener for network reconnection
        attachReconnectionListener();
      } else {
        // Generic response
        updateStepUi('step-ping', 'done', probe.message || 'Selesai');
        if (autoHealPct) autoHealPct.textContent = '100%';
        if (autoHealProgressFill) autoHealProgressFill.style.width = '100%';
        if (autoHealSuccessBox) autoHealSuccessBox.style.display = 'block';
        processQueue();
      }

    } catch (e) {
      console.warn('AutoHeal error:', e);
      updateStepUi('step-ping', 'done', 'Selesai');
    } finally {
      isAutoHealing = false;
    }
  }

  function attachReconnectionListener() {
    if (networkListenerAttached) return;
    networkListenerAttached = true;

    const onOnline = () => {
      console.log('Network online detected! Auto re-running probe test...');
      setTimeout(() => {
        runAutoHealPipeline();
      }, 1500);
    };

    window.addEventListener('online', onOnline);
    // Polling probe every 4 seconds while modal is open and carrier card is visible
    const pollId = setInterval(() => {
      if (!modalIpHelper || modalIpHelper.style.display === 'none') {
        clearInterval(pollId);
        networkListenerAttached = false;
        window.removeEventListener('online', onOnline);
        return;
      }
      if (autoHealCarrierCard && autoHealCarrierCard.style.display !== 'none' && !isAutoHealing) {
        ApiBridge.probeGoFileHealth().then(res => {
          if (res.ok || res.status === 200) {
            clearInterval(pollId);
            runAutoHealPipeline();
          }
        });
      }
    }, 4000);
  }

  function showIpHelperModal() {
    if (modalIpHelper) {
      modalIpHelper.style.display = 'flex';
      runAutoHealPipeline();
    }
  }
  function hideIpHelperModal() {
    if (modalIpHelper) modalIpHelper.style.display = 'none';
  }

  if (btnOpenIpHelper) btnOpenIpHelper.addEventListener('click', showIpHelperModal);
  if (btnCloseIpHdr) btnCloseIpHdr.addEventListener('click', hideIpHelperModal);
  if (btnCloseIpOk) btnCloseIpOk.addEventListener('click', () => {
    hideIpHelperModal();
    processQueue();
  });
  if (btnAutoHealRetry) btnAutoHealRetry.addEventListener('click', () => {
    runAutoHealPipeline();
  });
  if (btnTriggerAirplane) {
    btnTriggerAirplane.addEventListener('click', async () => {
      await ApiBridge.openAirplaneModeSettings();
      showToast('ip.airplane_desc', 'info', 4000);
    });
  }

  // ----------------------------------------------------
  // Adsterra & Monetag High-Yield Ad Engine (APK & EXE)
  // ----------------------------------------------------
  const AdNetworkEngine = {
    config: null,
    lastDirectLinkTime: 0,
    lastCelebrationTime: 0,
    activeItemForCelebration: null,

    async init() {
      try {
        const cached = localStorage.getItem('gofile_remote_config') || localStorage.getItem('gofile_admin_config');
        if (cached) {
          this.config = JSON.parse(cached);
          this.renderAll();
        }
      } catch (e) {}

      // Fetch live cloud configuration from GitHub
      await this.refreshFromCloud();

      // Periodic check every 10 minutes to sync fresh ads from GitHub without restarting
      setInterval(() => {
        this.refreshFromCloud();
      }, 10 * 60 * 1000);

      // Re-check when app regains focus / visibility
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.refreshFromCloud();
        }
      });

      this.initEventListeners();
    },

    async refreshFromCloud() {
      try {
        const latest = await ApiBridge.fetchRemoteConfig();
        if (latest) {
          this.config = latest;
          this.renderAll();
        }
      } catch (e) {}
    },

    renderAll() {
      this.renderBroadcast();
      this.renderSocialBar();
      this.renderRawBanners();
    },

    getAdsConfig() {
      return (this.config && this.config.ads) ? this.config.ads : null;
    },

    renderBroadcast() {
      const banner = document.getElementById('broadcast-banner');
      const titleEl = document.getElementById('broadcast-title');
      const msgEl = document.getElementById('broadcast-message');
      const iconEl = document.getElementById('broadcast-icon');
      const stripLegacy = document.getElementById('remote-announcement-strip');

      const ann = this.config && this.config.announcement;
      if (!ann || !ann.enabled || !ann.message) {
        if (banner) banner.style.display = 'none';
        if (stripLegacy) stripLegacy.style.display = 'none';
        return;
      }

      // Check if user previously dismissed this announcement
      const dismissedHash = localStorage.getItem('gf_dismissed_broadcast');
      const currentHash = (ann.title || '') + ':' + ann.message;
      if (dismissedHash === currentHash) {
        if (banner) banner.style.display = 'none';
        return;
      }

      if (banner) {
        banner.className = 'broadcast-banner ' + (ann.level || 'info');
        if (iconEl) iconEl.textContent = ann.level === 'urgent' ? '🚨' : (ann.level === 'warning' ? '⚠️' : '📢');
        if (titleEl) titleEl.textContent = ann.title || 'Pengumuman';
        if (msgEl) msgEl.textContent = ann.message;
        banner.style.display = 'flex';
      }
    },

    renderRawBanners() {
      const ads = this.getAdsConfig();
      const raw = ads && ads.rawBanners;

      const headerSlot = document.getElementById('ad-slot-header');
      const headerInner = document.getElementById('ad-slot-header-inner');
      const footerSlot = document.getElementById('ad-slot-footer');
      const footerInner = document.getElementById('ad-slot-footer-inner');

      if (!ads || !ads.enabled) {
        if (headerSlot) headerSlot.style.display = 'none';
        if (footerSlot) footerSlot.style.display = 'none';
        return;
      }

      this.injectAdContent(headerInner, headerSlot, raw ? raw.headerScript : '');
      this.injectAdContent(footerInner, footerSlot, raw ? raw.footerScript : '');
    },

    injectAdContent(innerEl, containerEl, code) {
      if (!innerEl || !containerEl) return;
      if (!code || !code.trim()) {
        containerEl.style.display = 'none';
        innerEl.innerHTML = '';
        return;
      }

      const cleanCode = code.trim();
      containerEl.style.display = 'flex';

      // Avoid re-injecting if same code
      if (innerEl.dataset.injectedCode === cleanCode) {
        return;
      }
      innerEl.dataset.injectedCode = cleanCode;
      innerEl.innerHTML = '';

      // Parse HTML and extract scripts
      const temp = document.createElement('div');
      temp.innerHTML = cleanCode;

      const nonScripts = [];
      const scripts = [];

      Array.from(temp.childNodes).forEach(node => {
        if (node.tagName === 'SCRIPT') {
          scripts.push(node);
        } else {
          nonScripts.push(node);
        }
      });

      nonScripts.forEach(node => {
        innerEl.appendChild(node.cloneNode(true));
      });

      // Re-create scripts as real DOM HTMLScriptElements so browser executes them
      scripts.forEach(oldScript => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach(attr => {
          newScript.setAttribute(attr.name, attr.value);
        });
        if (oldScript.innerHTML) {
          newScript.text = oldScript.innerHTML;
        }
        innerEl.appendChild(newScript);
      });
    },

    maybeTriggerDirectLink(actionType = 'download_start') {
      const ads = this.getAdsConfig();
      if (!ads || !ads.enabled || !ads.directLink || !ads.directLink.enabled) return false;

      const dl = ads.directLink;
      if (!dl.url || (!dl.url.startsWith('http://') && !dl.url.startsWith('https://'))) return false;

      if (actionType === 'download_start' && !dl.triggerOnDownload) return false;
      if (actionType === 'video_play' && !dl.triggerOnVideoPlay) return false;

      // Platform check
      const platformInfo = ApiBridge.getPlatformInfo();
      if (dl.targetPlatforms === 'android_only' && !platformInfo.isAndroid) return false;
      if (dl.targetPlatforms === 'windows_only' && !platformInfo.isWindows) return false;

      // Frequency Capping (Minutes)
      const freqMinutes = parseInt(dl.frequencyMinutes, 10) || 15;
      const freqMs = freqMinutes * 60 * 1000;
      const lastTriggered = parseInt(localStorage.getItem('gf_last_direct_link') || '0', 10);
      const now = Date.now();

      if (now - lastTriggered < freqMs) {
        return false;
      }

      localStorage.setItem('gf_last_direct_link', String(now));
      console.log(`[AdNetworkEngine] Triggering High-Yield Direct Link (${dl.provider || 'adsterra'}):`, dl.url);
      ApiBridge.openExternalUrl(dl.url);
      return true;
    },

    maybeShowCelebration(item, isBatchAll = false) {
      const ads = this.getAdsConfig();
      if (!ads || !ads.enabled || !ads.celebrationModal || !ads.celebrationModal.enabled) return;

      const cm = ads.celebrationModal;
      const freqMinutes = parseInt(cm.frequencyMinutes, 10) || 10;
      const freqMs = freqMinutes * 60 * 1000;
      const lastCelebrated = parseInt(localStorage.getItem('gf_last_celebration') || '0', 10);
      const now = Date.now();

      if (now - lastCelebrated < freqMs) {
        return;
      }

      localStorage.setItem('gf_last_celebration', String(now));
      this.activeItemForCelebration = item;

      const modal = document.getElementById('modal-download-celebration');
      const elFileName = document.getElementById('celebration-file-name');
      const elFileSize = document.getElementById('celebration-file-size');
      const elTitle = document.getElementById('celebration-ad-title');
      const elDesc = document.getElementById('celebration-ad-desc');
      const elImg = document.getElementById('celebration-banner-img');
      const elBtnText = document.getElementById('celebration-ad-btn-text');

      if (elFileName && item) elFileName.textContent = item.name || 'Berkas';
      if (elFileSize && item) elFileSize.textContent = formatBytes(item.size || 0);
      if (elTitle && (cm.sponsor || cm.title)) elTitle.textContent = cm.sponsor || cm.title;
      if (elDesc && cm.desc) elDesc.textContent = cm.desc;
      if (elImg && cm.bannerImg) elImg.src = cm.bannerImg;
      if (elBtnText && cm.actionText) elBtnText.textContent = cm.actionText;

      if (modal) modal.style.display = 'flex';
    },

    renderSocialBar() {
      const ads = this.getAdsConfig();
      const barEl = document.getElementById('social-bar-floating');
      if (!barEl) return;

      if (!ads || !ads.enabled || !ads.socialBar || !ads.socialBar.enabled) {
        barEl.style.display = 'none';
        return;
      }

      const sb = ads.socialBar;
      const dismissedUntil = parseInt(localStorage.getItem('gf_social_bar_dismissed') || '0', 10);
      if (Date.now() < dismissedUntil) {
        barEl.style.display = 'none';
        return;
      }

      const iconEl = document.getElementById('social-bar-icon');
      const textEl = document.getElementById('social-bar-text');
      const ctaEl = document.getElementById('social-bar-cta');

      if (iconEl && sb.icon) iconEl.textContent = sb.icon;
      if (textEl && sb.text) textEl.textContent = sb.text;
      if (ctaEl && sb.actionText) ctaEl.textContent = sb.actionText;

      barEl.style.display = 'block';
    },

    initEventListeners() {
      // 1. Broadcast Banner Close
      const btnCloseBroadcast = document.getElementById('btn-broadcast-close');
      if (btnCloseBroadcast) {
        btnCloseBroadcast.addEventListener('click', () => {
          const banner = document.getElementById('broadcast-banner');
          if (banner) banner.style.display = 'none';
          const ann = this.config && this.config.announcement;
          if (ann) {
            localStorage.setItem('gf_dismissed_broadcast', (ann.title || '') + ':' + (ann.message || ''));
          }
        });
      }

      // 2. Celebration Modal Listeners
      const modal = document.getElementById('modal-download-celebration');
      const btnClose = document.getElementById('btn-close-celebration');
      const btnDismiss = document.getElementById('btn-celebration-dismiss');
      const btnOpenFile = document.getElementById('btn-celebration-open-file');
      const btnAdCta = document.getElementById('btn-celebration-ad-cta');

      const hideCelebration = () => {
        if (modal) modal.style.display = 'none';
      };

      if (btnClose) btnClose.addEventListener('click', hideCelebration);
      if (btnDismiss) btnDismiss.addEventListener('click', hideCelebration);

      if (btnOpenFile) {
        btnOpenFile.addEventListener('click', () => {
          hideCelebration();
          if (this.activeItemForCelebration) {
            ApiBridge.openFile(this.activeItemForCelebration);
          }
        });
      }

      if (btnAdCta) {
        btnAdCta.addEventListener('click', () => {
          const ads = this.getAdsConfig();
          const targetUrl = (ads && ads.celebrationModal && ads.celebrationModal.actionUrl) || 'https://1.1.1.1/';
          ApiBridge.openExternalUrl(targetUrl);
        });
      }

      // 3. Social Bar Listeners
      const barEl = document.getElementById('social-bar-floating');
      const socialCta = document.getElementById('social-bar-cta');
      const socialClose = document.getElementById('social-bar-close');

      if (socialCta) {
        socialCta.addEventListener('click', () => {
          const ads = this.getAdsConfig();
          const targetUrl = (ads && ads.socialBar && ads.socialBar.actionUrl) || 'https://1.1.1.1/';
          ApiBridge.openExternalUrl(targetUrl);
        });
      }

      if (socialClose) {
        socialClose.addEventListener('click', () => {
          if (barEl) barEl.style.display = 'none';
          localStorage.setItem('gf_social_bar_dismissed', String(Date.now() + 20 * 60 * 1000));
        });
      }
    }
  };

  window.AdNetworkEngine = AdNetworkEngine;

  // ----------------------------------------------------
  // Cross-Device Queue Transfer & Migration
  // ----------------------------------------------------
  const modalQueueTransfer = document.getElementById('modal-queue-transfer');
  const btnTransferQueue = document.getElementById('btn-transfer-queue');
  const btnCloseTransferHdr = document.getElementById('btn-close-transfer-modal');
  const btnCloseTransferBtm = document.getElementById('btn-close-transfer-bottom');
  const transferExportText = document.getElementById('transfer-export-text');
  const transferImportText = document.getElementById('transfer-import-text');
  const btnCopyTransferData = document.getElementById('btn-copy-transfer-data');
  const btnImportQueue = document.getElementById('btn-import-queue');
  const btnOpenWifiShareFromTransfer = document.getElementById('btn-open-wifi-share-from-transfer');

  function openQueueTransferModal() {
    if (!modalQueueTransfer) return;
    const queuedItems = (state.queue || []).map(q => ({
      id: q.id,
      name: q.name,
      link: q.link,
      size: q.size,
      relDir: q.relDir || ''
    }));
    if (transferExportText) {
      transferExportText.value = JSON.stringify(queuedItems, null, 2);
    }
    modalQueueTransfer.style.display = 'flex';
  }

  function closeQueueTransferModal() {
    if (modalQueueTransfer) modalQueueTransfer.style.display = 'none';
  }

  if (btnTransferQueue) btnTransferQueue.addEventListener('click', openQueueTransferModal);
  if (btnCloseTransferHdr) btnCloseTransferHdr.addEventListener('click', closeQueueTransferModal);
  if (btnCloseTransferBtm) btnCloseTransferBtm.addEventListener('click', closeQueueTransferModal);

  if (btnCopyTransferData) {
    btnCopyTransferData.addEventListener('click', async () => {
      if (transferExportText && transferExportText.value) {
        try {
          await navigator.clipboard.writeText(transferExportText.value);
          showToast('toast.queue_exported', 'success', 2500);
        } catch (e) {
          transferExportText.select();
          document.execCommand('copy');
          showToast('toast.queue_exported', 'success', 2500);
        }
      }
    });
  }

  if (btnImportQueue) {
    btnImportQueue.addEventListener('click', () => {
      const raw = transferImportText ? transferImportText.value.trim() : '';
      if (!raw) return;
      try {
        let imported = [];
        if (raw.startsWith('[') || raw.startsWith('{')) {
          const parsed = JSON.parse(raw);
          imported = Array.isArray(parsed) ? parsed : [parsed];
        } else {
          const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          imported = lines.map((l, i) => ({
            id: 'imp_' + Date.now() + '_' + i,
            name: l.split('/').pop() || 'file',
            link: l,
            size: 0
          }));
        }

        let addedCount = 0;
        imported.forEach(item => {
          if (item && item.link) {
            state.queue.push({
              id: item.id || ('imp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
              name: item.name || 'file',
              link: item.link,
              size: item.size || 0,
              downloaded: 0,
              speed: 0,
              status: 'queued',
              relDir: item.relDir || ''
            });
            addedCount++;
          }
        });

        saveQueue();
        renderQueue();
        updateQueueCounters();
        closeQueueTransferModal();
        showToast(window.I18n ? I18n.t('toast.queue_imported', { count: addedCount }) : `Berhasil menambahkan ${addedCount} link antrean!`, 'success', 3000);
        processQueue();
      } catch (err) {
        showToast('Format data antrean tidak valid', 'error', 3000);
      }
    });
  }

  if (btnOpenWifiShareFromTransfer) {
    btnOpenWifiShareFromTransfer.addEventListener('click', () => {
      closeQueueTransferModal();
      const modalWifi = document.getElementById('wifi-share-modal');
      if (modalWifi) modalWifi.style.display = 'flex';
    });
  }

  // ----------------------------------------------------
  // Remote Announcement & Ad Injection System
  // ----------------------------------------------------
  async function initRemoteConfigAndAds() {
    const remoteStrip = document.getElementById('remote-announcement-strip');
    const remoteText = document.getElementById('remote-announcement-text');
    const btnCloseAnn = document.getElementById('btn-close-announcement');
    const adTop = document.getElementById('remote-ad-banner-top');
    const adTitleTop = document.getElementById('remote-ad-title-top');

    const configUrl = localStorage.getItem('gf_admin_config_url') || '';
    let config = null;

    if (configUrl) {
      try {
        const resp = await fetch(configUrl, { cache: 'no-store' });
        if (resp.ok) {
          config = await resp.json();
          localStorage.setItem('gf_cached_remote_config', JSON.stringify(config));
        }
      } catch (e) {
        console.warn('Failed to fetch remote config:', e);
      }
    }

    if (!config) {
      try {
        const cached = localStorage.getItem('gf_cached_remote_config');
        if (cached) config = JSON.parse(cached);
      } catch (e) {}
    }

    if (config) {
      if (config.announcement && config.announcement.enabled && remoteStrip && remoteText) {
        remoteText.textContent = config.announcement.message || config.announcement.title || '';
        remoteStrip.style.display = 'flex';
      }

      if (config.ads && config.ads.enabled && config.ads.banner && config.ads.banner.enabled && adTop) {
        if (adTitleTop && config.ads.banner.title) {
          adTitleTop.textContent = config.ads.banner.title;
        }
        if (config.ads.banner.targetUrl) {
          adTop.href = config.ads.banner.targetUrl;
        }
        adTop.style.display = 'flex';
      }

      if (Array.isArray(config.tokenPool) && config.tokenPool.length > 0) {
        const currentToken = localStorage.getItem('gf_token');
        if (!currentToken) {
          localStorage.setItem('gf_token', config.tokenPool[0]);
        }
      }
    }

    if (btnCloseAnn && remoteStrip) {
      btnCloseAnn.addEventListener('click', () => {
        remoteStrip.style.display = 'none';
      });
    }

    // Lightweight anonymous telemetry ping
    try {
      const telemetryUrl = config?.telemetryEndpoint || localStorage.getItem('gf_telemetry_endpoint');
      if (telemetryUrl) {
        const payload = {
          appVersion: CURRENT_VERSION,
          platform: ApiBridge.platform,
          lang: window.I18n ? I18n.currentLang : 'id',
          completedDownloads: (state.history || []).length,
          timestamp: Date.now()
        };
        fetch(telemetryUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => {});
      }
    } catch (e) {}
  }

  // ----------------------------------------------------
  // Dynamic Language Changed Listener
  // ----------------------------------------------------
  window.addEventListener('languageChanged', (e) => {
    renderQueue();
    renderHistory();
    if (state.activeTab === 'tab-files') {
      renderStoredFiles();
    }
    updateBatchSummary();
    updateGlobalMetrics();
    checkPermissionsOnboarding(false);
  });

  // Auto-refresh when app regains focus (e.g. returning from Android system settings)
  window.addEventListener('focus', () => {
    checkPermissionsOnboarding(false);
    if (state.activeTab === 'tab-files' || state.activeTab === 'tab-settings') {
      loadStoredFiles();
    }
  });

  function getFilteredStoredFiles() {
    const all = state.storedFiles || [];
    let filtered = all;

    if (state.storedFilesFilter === 'video') {
      filtered = filtered.filter(f => isVideoFile(f));
    } else if (state.storedFilesFilter === 'photo') {
      filtered = filtered.filter(f => isPhotoFile(f));
    } else if (state.storedFilesFilter === 'audio') {
      filtered = filtered.filter(f => isAudioFile(f));
    } else if (state.storedFilesFilter === 'other') {
      filtered = filtered.filter(f => !isVideoFile(f) && !isPhotoFile(f) && !isAudioFile(f));
    }

    if (state.storedFilesSearch && state.storedFilesSearch.trim()) {
      const q = state.storedFilesSearch.trim().toLowerCase();
      filtered = filtered.filter(f => f.name.toLowerCase().includes(q));
    }

    const sortMode = state.storedFilesSort || 'recent';
    if (sortMode === 'recent') {
      filtered.sort((a, b) => (b.modified || 0) - (a.modified || 0));
    } else if (sortMode === 'oldest') {
      filtered.sort((a, b) => (a.modified || 0) - (b.modified || 0));
    } else if (sortMode === 'largest') {
      filtered.sort((a, b) => (b.size || 0) - (a.size || 0));
    } else if (sortMode === 'smallest') {
      filtered.sort((a, b) => (a.size || 0) - (b.size || 0));
    } else if (sortMode === 'name_asc') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === 'name_desc') {
      filtered.sort((a, b) => b.name.localeCompare(a.name));
    }

    return filtered;
  }

  function updateBatchSelectionUI() {
    const selectedCount = state.selectedStoredFileNames.size;
    if (storedSelectedCountLabel) {
      if (selectedCount > 0) {
        storedSelectedCountLabel.textContent = `${selectedCount} dipilih`;
        storedSelectedCountLabel.style.display = 'inline-block';
      } else {
        storedSelectedCountLabel.style.display = 'none';
      }
    }

    if (btnBatchDeleteStored) {
      btnBatchDeleteStored.style.display = selectedCount > 0 ? 'inline-flex' : 'none';
      if (btnBatchDeleteText) {
        btnBatchDeleteText.textContent = `Hapus (${selectedCount})`;
      }
    }

    if (checkSelectAllStored) {
      const currentFiles = getFilteredStoredFiles();
      checkSelectAllStored.checked = currentFiles.length > 0 && currentFiles.every(f => state.selectedStoredFileNames.has(f.name));
    }
  }

  if (checkSelectAllStored) {
    checkSelectAllStored.addEventListener('change', () => {
      const checked = checkSelectAllStored.checked;
      const currentFiles = getFilteredStoredFiles();
      if (checked) {
        currentFiles.forEach(f => state.selectedStoredFileNames.add(f.name));
      } else {
        currentFiles.forEach(f => state.selectedStoredFileNames.delete(f.name));
      }
      renderStoredFiles();
    });
  }

  if (btnBatchDeleteStored) {
    btnBatchDeleteStored.addEventListener('click', async () => {
      const count = state.selectedStoredFileNames.size;
      if (count === 0) return;
      if (!confirm(`Hapus ${count} file yang dipilih dari penyimpanan perangkat? Tindakan ini tidak dapat dibatalkan.`)) return;

      btnBatchDeleteStored.disabled = true;

      // Animate and remove selected cards immediately from UI
      const cards = filesListContainer.querySelectorAll('.stored-file-card.selected');
      cards.forEach(c => {
        c.style.transition = 'all 0.22s ease';
        c.style.opacity = '0';
        c.style.transform = 'scale(0.96)';
        setTimeout(() => c.remove(), 220);
      });

      const filesToDelete = state.storedFiles.filter(f => state.selectedStoredFileNames.has(f.name));
      const fileNamesSet = new Set(state.selectedStoredFileNames);

      state.storedFiles = state.storedFiles.filter(f => !fileNamesSet.has(f.name));
      state.history = state.history.filter(h => !fileNamesSet.has(h.name));
      state.selectedStoredFileNames.clear();

      saveHistory();

      // Instant stats update
      const all = state.storedFiles || [];
      const totalCount = all.length;
      const totalBytes = all.reduce((acc, f) => acc + (f.size || 0), 0);
      if (storageTotalFilesEl) storageTotalFilesEl.textContent = `${totalCount} file`;
      if (storageTotalSizeEl) storageTotalSizeEl.textContent = formatBytes(totalBytes);
      if (storedFilesCountEl) storedFilesCountEl.textContent = totalCount;
      updateQueueCounters();
      updateBatchSelectionUI();
      btnBatchDeleteStored.disabled = false;

      if (all.length === 0 && filesEmptyState) {
        filesEmptyState.style.display = 'block';
      }

      showToast(`Berhasil menghapus ${count} file terpilih.`, 'success', 3000);

      // Asynchronous disk deletion
      for (const file of filesToDelete) {
        try {
          await ApiBridge.deleteFile(file);
        } catch (e) {
          console.warn('Batch delete error for', file.name, e);
        }
      }
    });
  }

  // Lazy Paginated Render for Stored Files (Instant 60fps load even with 10,000 files)
  function renderStoredFiles(appendOnly = false) {
    if (!filesListContainer) return;

    const all = state.storedFiles || [];
    const filtered = getFilteredStoredFiles();

    // Update filter counts
    if (chipStoredCountAll) chipStoredCountAll.textContent = all.length;
    if (chipStoredCountVideo) chipStoredCountVideo.textContent = all.filter(f => isVideoFile(f)).length;
    if (chipStoredCountPhoto) chipStoredCountPhoto.textContent = all.filter(f => isPhotoFile(f)).length;
    if (chipStoredCountAudio) chipStoredCountAudio.textContent = all.filter(f => isAudioFile(f)).length;
    if (chipStoredCountOther) chipStoredCountOther.textContent = all.filter(f => !isVideoFile(f) && !isPhotoFile(f) && !isAudioFile(f)).length;

    // Stats
    const totalCount = all.length;
    const totalBytes = all.reduce((acc, f) => acc + (f.size || 0), 0);
    if (storageTotalFilesEl) storageTotalFilesEl.textContent = `${totalCount} file`;
    if (storageTotalSizeEl) storageTotalSizeEl.textContent = formatBytes(totalBytes);
    if (storedFilesCountEl) storedFilesCountEl.textContent = totalCount;

    updateBatchSelectionUI();

    if (filtered.length === 0) {
      filesListContainer.innerHTML = '';
      if (filesEmptyState) {
        filesListContainer.appendChild(filesEmptyState);
        filesEmptyState.style.display = 'block';
      }
      if (filesLoadMoreBar) filesLoadMoreBar.style.display = 'none';
      return;
    }

    if (filesEmptyState) filesEmptyState.style.display = 'none';

    // Lazy Chunked Slice (Default 35 items per chunk for instant rendering)
    const limit = state.storedFilesRenderLimit || 35;
    const existingCards = filesListContainer.querySelectorAll('.stored-file-card');
    const startIndex = appendOnly ? existingCards.length : 0;
    const chunkToRender = filtered.slice(startIndex, limit);

    if (!appendOnly) {
      filesListContainer.innerHTML = '';
    }

    chunkToRender.forEach(file => {
      const card = createStoredFileCard(file);
      filesListContainer.appendChild(card);
    });

    // Pagination Controls
    if (filesLoadMoreBar && btnFilesLoadMore && filesPaginationStatus) {
      const totalFiltered = filtered.length;
      const currentRendered = Math.min(limit, totalFiltered);
      if (currentRendered < totalFiltered) {
        filesLoadMoreBar.style.display = 'block';
        btnFilesLoadMore.style.display = 'block';
        const remaining = totalFiltered - currentRendered;
        btnFilesLoadMore.textContent = `Muat Lebih Banyak (${remaining} lagi)`;
        filesPaginationStatus.textContent = `Menampilkan ${currentRendered} dari ${totalFiltered} file`;
      } else {
        filesLoadMoreBar.style.display = totalFiltered > 35 ? 'block' : 'none';
        btnFilesLoadMore.style.display = 'none';
        filesPaginationStatus.textContent = `Semua ${totalFiltered} file telah dimuat`;
      }
    }
  }

  // Load More Button Handler
  if (btnFilesLoadMore) {
    btnFilesLoadMore.addEventListener('click', () => {
      state.storedFilesRenderLimit = (state.storedFilesRenderLimit || 35) + 35;
      renderStoredFiles(true);
    });
  }

  function createStoredFileCard(file) {
    const card = document.createElement('div');
    const isSelected = state.selectedStoredFileNames.has(file.name);
    card.className = `stored-file-card ${isSelected ? 'selected' : ''}`;
    card.setAttribute('data-filename', file.name);

    const isVideo = isVideoFile(file);
    const isPhoto = isPhotoFile(file);
    const isAudio = isAudioFile(file);
    const iconClass = isVideo ? 'video' : (isPhoto ? 'photo' : (isAudio ? 'audio' : 'archive'));
    const iconEmoji = isVideo ? '🎬' : (isPhoto ? '🖼️' : (isAudio ? '🎵' : '📦'));
    const actionLabel = isVideo ? 'Buka' : (isPhoto ? 'Lihat' : (isAudio ? 'Putar' : 'Buka'));

    const dateStr = file.modified ? new Date(file.modified).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';
    const subpath = file.relDir ? `/${file.relDir}` : 'GoFile';

    card.innerHTML = `
      <label class="stored-checkbox-wrapper" onclick="event.stopPropagation()">
        <input type="checkbox" class="stored-item-checkbox" ${isSelected ? 'checked' : ''}>
      </label>
      <div class="stored-file-main">
        <div class="stored-file-icon ${iconClass}">${iconEmoji}</div>
        <div class="stored-file-info">
          <div class="stored-file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
          <div class="stored-file-meta">
            <span class="stored-file-size-badge">${formatBytes(file.size)}</span>
            <span>•</span>
            <span>${escapeHtml(subpath)}</span>
            ${dateStr ? `<span>•</span><span>${escapeHtml(dateStr)}</span>` : ''}
            ${isVideo ? (isVideoWatched(file) ? '<span class="video-watched-badge watched">✓ Ditonton</span>' : '<span class="video-watched-badge unplayed">Baru</span>') : ''}
          </div>
        </div>
      </div>
      <div class="stored-file-actions">
        <button type="button" class="btn-open-stored-touch" title="Buka file">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          ${actionLabel}
        </button>
        <button type="button" class="btn-delete-stored-touch" title="Hapus file ini">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
    `;

    // Checkbox listener
    const chk = card.querySelector('.stored-item-checkbox');
    chk.addEventListener('change', () => {
      if (chk.checked) {
        state.selectedStoredFileNames.add(file.name);
        card.classList.add('selected');
      } else {
        state.selectedStoredFileNames.delete(file.name);
        card.classList.remove('selected');
      }
      updateBatchSelectionUI();
    });

    // Trigger open file
    const handleOpenFile = async () => {
      const fullPath = file.path || (file.relDir ? `${state.downloadDir}/${file.relDir}/${file.name}` : `${state.downloadDir}/${file.name}`);
      if (isPlayableMedia(file)) {
        await openMediaPlayer(file);
      } else {
        const opened = await ApiBridge.openFile(fullPath, file);
        if (!opened) {
          showToast(`Membuka "${file.name}"...`, 'info', 1800);
        }
      }
    };

    // Tapping card opens file
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-delete-stored-touch') || e.target.closest('.stored-checkbox-wrapper')) return;
      handleOpenFile();
    });

    card.querySelector('.btn-open-stored-touch')?.addEventListener('click', (e) => {
      e.stopPropagation();
      handleOpenFile();
    });

    card.querySelector('.btn-delete-stored-touch')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm(`Hapus "${file.name}" dari penyimpanan perangkat? Tindakan ini tidak dapat dibatalkan.`)) return;

      // 1. Instant UI animation & removal
      card.style.transition = 'all 0.22s ease';
      card.style.opacity = '0';
      card.style.transform = 'scale(0.96)';
      setTimeout(() => card.remove(), 220);

      // 2. Immediate in-memory state & counter updates
      state.storedFiles = state.storedFiles.filter(f => f.name !== file.name);
      state.history = state.history.filter(h => h.name !== file.name);
      state.selectedStoredFileNames.delete(file.name);
      saveHistory();

      const all = state.storedFiles || [];
      const totalCount = all.length;
      const totalBytes = all.reduce((acc, f) => acc + (f.size || 0), 0);
      if (storageTotalFilesEl) storageTotalFilesEl.textContent = `${totalCount} file`;
      if (storageTotalSizeEl) storageTotalSizeEl.textContent = formatBytes(totalBytes);
      if (storedFilesCountEl) storedFilesCountEl.textContent = totalCount;
      updateQueueCounters();
      updateBatchSelectionUI();

      if (all.length === 0 && filesEmptyState) {
        filesEmptyState.style.display = 'block';
      }

      showToast(`"${file.name}" berhasil dihapus dari memori.`, 'success', 2500);

      // 3. Asynchronous native deletion
      try {
        await ApiBridge.deleteFile(file);
      } catch (err) {
        console.warn('Native delete error:', err);
      }
    });

    return card;
  }

  // Load Saved History from previous sessions
  try {
    const rawHistory = localStorage.getItem('gf_history');
    if (rawHistory) {
      const parsed = JSON.parse(rawHistory);
      if (Array.isArray(parsed) && parsed.length > 0) {
        state.history = parsed;
        parsed.forEach(item => renderHistoryItem(item));
        updateQueueCounters();
      }
    }
  } catch (e) {}

  // Load Saved Queue from previous sessions (e.g. after app update / restart)
  try {
    const rawQueue = localStorage.getItem('gf_queue');
    if (rawQueue) {
      const parsedQ = JSON.parse(rawQueue);
      if (Array.isArray(parsedQ) && parsedQ.length > 0) {
        parsedQ.forEach(file => {
          const queueItem = {
            id: file.id,
            name: file.name,
            relDir: file.relDir || '',
            size: file.size || 0,
            link: file.link,
            mimetype: file.mimetype || '',
            status: 'paused',
            progress: file.progress || 0,
            downloaded: file.downloaded || 0,
            speed: 0,
            domElement: null
          };
          state.queue.push(queueItem);
          renderQueueItem(queueItem);
          const badge = document.getElementById(`badge-${queueItem.id}`);
          if (badge) {
            badge.className = 'status-badge queued';
            badge.textContent = 'Paused';
          }
        });
        updateQueueCounters();
      }
    }
  } catch (e) {}

  window.addEventListener('beforeunload', saveQueue);
  document.addEventListener('pause', saveQueue);

  // Initial load of stored files
  loadStoredFiles();

  // ----------------------------------------------------
  // Virtual Keyboard & Mobile Footer Navigation Manager
  // ----------------------------------------------------
  let isKeyboardOpen = false;

  function isTextInputElement(el) {
    if (!el) return false;
    if (el.tagName === 'TEXTAREA') return true;
    if (el.tagName === 'INPUT') {
      const type = (el.type || 'text').toLowerCase();
      return !['checkbox', 'radio', 'button', 'submit', 'file', 'range', 'color', 'image', 'reset'].includes(type);
    }
    return el.isContentEditable === true;
  }

  let maxVvHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  let maxWinHeight = window.innerHeight;

  function setKeyboardState(open) {
    if (isKeyboardOpen === open) return;
    isKeyboardOpen = open;
    if (open) {
      document.body.classList.add('keyboard-open');
    } else {
      document.body.classList.remove('keyboard-open');
    }
  }

  // Native Android Keyboard Event Callback (called directly from MainActivity)
  window.onNativeKeyboardVisible = function(isOpen) {
    if (!isOpen) {
      if (isTextInputElement(document.activeElement)) {
        document.activeElement.blur();
      }
      setKeyboardState(false);
    } else {
      setKeyboardState(true);
    }
  };

  // 1. Instant focus/blur detection for text inputs & textareas
  document.addEventListener('focusin', (e) => {
    if (isTextInputElement(e.target)) {
      setKeyboardState(true);
    }
  });

  document.addEventListener('focusout', () => {
    setTimeout(() => {
      const isStillShrunk = window.visualViewport 
        ? (maxVvHeight - window.visualViewport.height) > 100
        : (maxWinHeight - window.innerHeight) > 100;
      if (!isStillShrunk && !isTextInputElement(document.activeElement)) {
        setKeyboardState(false);
      }
    }, 120);
  });

  // 2. Viewport height listener (accurately detects keyboard closed via soft keyboard down button)
  if (window.visualViewport) {
    const checkViewport = () => {
      const currentHeight = window.visualViewport.height;
      if (currentHeight > maxVvHeight) {
        maxVvHeight = currentHeight;
      }

      // If viewport shrank significantly, virtual keyboard is currently open
      if ((maxVvHeight - currentHeight) > 120) {
        setKeyboardState(true);
      } else if (currentHeight >= maxVvHeight - 40) {
        // Viewport returned to normal full height: keyboard was physically dismissed!
        if (isTextInputElement(document.activeElement)) {
          document.activeElement.blur();
        }
        setKeyboardState(false);
      }
    };

    window.visualViewport.addEventListener('resize', checkViewport);
  } else {
    window.addEventListener('resize', () => {
      const currentHeight = window.innerHeight;
      if (currentHeight > maxWinHeight) maxWinHeight = currentHeight;
      if ((maxWinHeight - currentHeight) > 120) {
        setKeyboardState(true);
      } else if (currentHeight >= maxWinHeight - 40) {
        if (isTextInputElement(document.activeElement)) {
          document.activeElement.blur();
        }
        setKeyboardState(false);
      }
    });
  }

  // ----------------------------------------------------
  // Hardware Back Button Controller (Android)
  // ----------------------------------------------------
  window.handleHardwareBack = function() {
    // If an input is focused when back is pressed, dismiss keyboard first
    if (document.activeElement && isTextInputElement(document.activeElement)) {
      document.activeElement.blur();
      setKeyboardState(false);
      return true;
    }

    // 1. If Video Settings / Hamburger Sheet is open, dismiss it
    const videoSettingsSheet = document.getElementById('video-settings-sheet');
    if (videoSettingsSheet && videoSettingsSheet.classList.contains('active')) {
      videoSettingsSheet.classList.remove('active');
      return true;
    }

    // 2. If Media Player Modal is open, CLOSE PLAYER & RETURN TO APP (DO NOT EXIT APP!)
    const playerModal = document.getElementById('media-player-modal');
    if (playerModal && (playerModal.classList.contains('active') || playerModal.style.display === 'flex' || playerModal.style.display === 'block')) {
      if (typeof closeMediaPlayer === 'function') {
        closeMediaPlayer();
      } else {
        playerModal.classList.remove('active');
        playerModal.style.display = 'none';
      }
      return true;
    }

    // 3. If Wi-Fi Sharing Modal is open
    const modalWifi = document.getElementById('wifi-share-modal');
    if (modalWifi && (modalWifi.classList.contains('active') || modalWifi.style.display === 'flex')) {
      modalWifi.classList.remove('active');
      modalWifi.style.display = 'none';
      return true;
    }

    // 4. If IP Auto-Heal Modal is open
    const modalIp = document.getElementById('modal-ip-helper');
    if (modalIp && (modalIp.style.display === 'flex' || modalIp.style.display === 'block')) {
      modalIp.style.display = 'none';
      return true;
    }

    // 5. If Update Modal is open
    if (updateModal && (updateModal.classList.contains('active') || updateModal.classList.contains('open'))) {
      updateModal.classList.remove('active');
      updateModal.classList.remove('open');
      return true;
    }

    // 6. If Inspection Modal is open
    if (inspectionModal && (inspectionModal.classList.contains('active') || inspectionModal.classList.contains('open'))) {
      closeModal();
      return true;
    }

    // 7. If not on Home tab, return to Home tab
    if (state.activeTab !== 'tab-home') {
      const homeTab = document.getElementById('nav-home-tab');
      if (homeTab) {
        homeTab.click();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return true;
      }
    }
    if (window._lastBackPress && (Date.now() - window._lastBackPress < 2000)) {
      return false; // Exit app on double back
    }
    window._lastBackPress = Date.now();
    showToast('Tekan sekali lagi untuk keluar', 'info', 1800);
    return true;
  };

  // ----------------------------------------------------
  // In-App Update Engine Controller
  // ----------------------------------------------------
  let activeUpdateInfo = null;

  if (settingsCurrentVerBadge) {
    settingsCurrentVerBadge.textContent = CURRENT_VERSION;
  }

  function renderUpdateBanner(info) {
    if (!updateBannerContainer || !info || !info.isUpdateAvailable) return;
    updateBannerContainer.innerHTML = `
      <div class="update-banner">
        <div class="update-banner-info">
          <div class="update-banner-icon">🚀</div>
          <div class="update-banner-text">
            <h4>Update ${escapeHtml(info.latestVersion)}</h4>
            <p>${escapeHtml(info.releaseName || 'Versi baru tersedia')}</p>
          </div>
        </div>
        <div class="update-banner-actions">
          <button type="button" class="btn-banner-view" id="btn-banner-view-update">
            Lihat
          </button>
          <button type="button" class="btn-banner-close" id="btn-banner-dismiss" title="Tutup">
            ✕
          </button>
        </div>
      </div>
    `;

    const btnView = document.getElementById('btn-banner-view-update');
    const btnDismiss = document.getElementById('btn-banner-dismiss');
    if (btnView) {
      btnView.addEventListener('click', () => showUpdateModal(info));
    }
    if (btnDismiss) {
      btnDismiss.addEventListener('click', () => {
        updateBannerContainer.innerHTML = '';
      });
    }
  }

  async function showUpdateModal(info) {
    activeUpdateInfo = info;
    if (!updateModal) return;

    if (updateNewVersionBadge) {
      updateNewVersionBadge.textContent = `Versi Baru: ${info.latestVersion}`;
    }
    if (updateCurrVersionBadge) {
      updateCurrVersionBadge.textContent = `Versi Saat Ini: ${CURRENT_VERSION}`;
    }
    if (updateChangelogText) {
      updateChangelogText.textContent = info.releaseNotes || 'Pembaruan stabilitas, performa simultaneous connection, dan perbaikan antarmuka.';
    }

    // Check Android installation permission if on Android
    const platInfo = ApiBridge.getPlatformInfo();
    if (platInfo.isAndroid && updatePermissionBox) {
      const canInstall = await ApiBridge.canRequestPackageInstalls();
      updatePermissionBox.style.display = canInstall ? 'none' : 'flex';
    } else if (updatePermissionBox) {
      updatePermissionBox.style.display = 'none';
    }

    if (updateProgressContainer) {
      updateProgressContainer.style.display = 'none';
    }
    if (btnDownloadUpdate) {
      btnDownloadUpdate.disabled = false;
      if (btnDownloadUpdateText) {
        btnDownloadUpdateText.textContent = 'Unduh & Pasang Sekarang';
      }
    }

    updateModal.classList.add('open');
    updateModal.classList.add('active');
  }

  if (btnCloseUpdateModal) {
    btnCloseUpdateModal.addEventListener('click', () => {
      if (updateModal) {
        updateModal.classList.remove('open');
        updateModal.classList.remove('active');
      }
    });
  }

  if (btnLaterUpdate) {
    btnLaterUpdate.addEventListener('click', () => {
      if (updateModal) {
        updateModal.classList.remove('open');
        updateModal.classList.remove('active');
      }
    });
  }

  if (btnOpenInstallPerm) {
    btnOpenInstallPerm.addEventListener('click', async () => {
      await ApiBridge.openInstallPermissionSettings();
      showToast('Silakan aktifkan perizinan "Izinkan dari sumber ini", lalu kembali ke aplikasi.', 'info', 4000);
    });
  }

  async function checkForAppUpdate(silent = false) {
    if (settingsUpdateStatusText) {
      settingsUpdateStatusText.textContent = 'Memeriksa pembaruan...';
    }
    if (btnCheckUpdateSettings) {
      btnCheckUpdateSettings.disabled = true;
    }

    try {
      const updateInfo = await ApiBridge.checkForUpdates(CURRENT_VERSION);
      if (updateInfo && updateInfo.isUpdateAvailable) {
        if (settingsUpdateStatusText) {
          settingsUpdateStatusText.innerHTML = `<strong style="color:var(--cyan-400);">Versi baru ${escapeHtml(updateInfo.latestVersion)} tersedia!</strong>`;
        }
        if (openSettingsHeaderBtn) {
          openSettingsHeaderBtn.classList.add('has-update-dot');
        }
        renderUpdateBanner(updateInfo);
        if (!silent) {
          showUpdateModal(updateInfo);
        } else {
          showToast(`🚀 Pembaruan GoFile Pro ${updateInfo.latestVersion} tersedia!`, 'info', 4000);
        }
      } else {
        if (settingsUpdateStatusText) {
          settingsUpdateStatusText.textContent = `Aplikasi Anda sudah versi terbaru (${CURRENT_VERSION}).`;
        }
        if (openSettingsHeaderBtn) {
          openSettingsHeaderBtn.classList.remove('has-update-dot');
        }
        if (!silent) {
          showToast(`Aplikasi Anda sudah menggunakan versi terbaru (${CURRENT_VERSION}).`, 'success', 2500);
        }
      }
    } catch (err) {
      if (settingsUpdateStatusText) {
        settingsUpdateStatusText.textContent = 'Gagal memeriksa pembaruan (cek koneksi internet).';
      }
      if (!silent) {
        showToast('Gagal memeriksa pembaruan: ' + err.message, 'error', 3000);
      }
    } finally {
      if (btnCheckUpdateSettings) {
        btnCheckUpdateSettings.disabled = false;
      }
    }
  }

  if (btnCheckUpdateSettings) {
    btnCheckUpdateSettings.addEventListener('click', () => {
      checkForAppUpdate(false);
    });
  }

  // Handle Download & In-App Installation of Update
  if (btnDownloadUpdate) {
    btnDownloadUpdate.addEventListener('click', async () => {
      if (!activeUpdateInfo || !activeUpdateInfo.asset) {
        if (activeUpdateInfo && activeUpdateInfo.releaseUrl) {
          ApiBridge.openUrl(activeUpdateInfo.releaseUrl);
        } else {
          showToast('File pembaruan tidak ditemukan di rilis GitHub.', 'error', 3000);
        }
        return;
      }

      const platInfo = ApiBridge.getPlatformInfo();
      const asset = activeUpdateInfo.asset;

      // On Android, check permission before downloading
      if (platInfo.isAndroid) {
        const canInstall = await ApiBridge.canRequestPackageInstalls();
        if (!canInstall) {
          if (updatePermissionBox) updatePermissionBox.style.display = 'flex';
          showToast('Mohon berikan izin instalasi aplikasi terlebih dahulu.', 'warning', 3500);
          await ApiBridge.openInstallPermissionSettings();
          return;
        }
      }

      btnDownloadUpdate.disabled = true;
      if (updateProgressContainer) updateProgressContainer.style.display = 'flex';
      if (updateProgressFill) updateProgressFill.style.width = '0%';
      if (updateProgressPct) updateProgressPct.textContent = '0%';
      if (updateProgressStatus) updateProgressStatus.textContent = 'Menghubungkan ke GitHub...';

      const updateItem = {
        id: 'update_' + Date.now(),
        name: asset.name,
        link: asset.downloadUrl,
        size: asset.size || 0,
        relDir: '',
        mimetype: platInfo.isAndroid ? 'application/vnd.android.package-archive' : 'application/octet-stream',
        overwrite: true,
        isUpdate: true
      };

      try {
        if (updateProgressStatus) updateProgressStatus.textContent = `Mengunduh ${asset.name}...`;

        const success = await ApiBridge.downloadItem(updateItem, state.downloadDir, (prog) => {
          if (prog && prog.progress !== undefined) {
            const p = Math.min(100, Math.round(prog.progress));
            if (updateProgressFill) updateProgressFill.style.width = `${p}%`;
            if (updateProgressPct) updateProgressPct.textContent = `${p}%`;
            if (updateProgressStatus) {
              updateProgressStatus.textContent = `Mengunduh: ${formatSpeed(prog.speed || 0)}`;
            }
          }
        });

        if (success) {
          if (updateProgressFill) updateProgressFill.style.width = '100%';
          if (updateProgressPct) updateProgressPct.textContent = '100%';
          if (updateProgressStatus) updateProgressStatus.textContent = 'Unduhan selesai! Membuka pemasang...';
          showToast('Unduhan pembaruan selesai. Memulai pemasangan...', 'success', 3000);

          setTimeout(async () => {
            const installRes = await ApiBridge.installUpdate(updateItem.savedUri || updateItem.name, updateItem.savedUri);
            if (platInfo.isAndroid && !installRes) {
              showToast('Membuka file APK di folder unduhan...', 'info', 2500);
              ApiBridge.openFile('', updateItem);
            }
          }, 600);
        } else {
          throw new Error('Gagal mengunduh file pembaruan');
        }
      } catch (err) {
        console.error('Update download error:', err);
        if (updateProgressStatus) updateProgressStatus.textContent = 'Gagal mengunduh: ' + err.message;
        showToast('Gagal mengunduh pembaruan: ' + err.message, 'error', 3500);
        btnDownloadUpdate.disabled = false;
        if (btnDownloadUpdateText) btnDownloadUpdateText.textContent = 'Coba Lagi';
      }
    });
  }

  // ==========================================================================
  // BUILT-IN UNIVERSAL MEDIA PLAYER ENGINE (Video, Audio & Photo Viewer with PiP)
  // ==========================================================================

  const mediaState = {
    currentFile: null,
    mediaType: null, // 'video' | 'audio' | 'photo'
    mediaUrl: '',
    isPlaying: false,
    zoomLevel: 1.0,
    rotateDeg: 0,
    isPipActive: false,
    playbackSpeeds: [0.5, 0.75, 1.0, 1.25, 1.5, 2.0],
    speedIndex: 2, // 1.0x
    isLooping: false,
    isSeekingVideo: false,
    playlist: [],
    playlistIndex: -1,
    autoNext: localStorage.getItem('gofile_video_autonext') !== 'false',
    shuffle: localStorage.getItem('gofile_video_shuffle') === 'true'
  };

  // Media Player DOM Elements
  const mediaPlayerModal = document.getElementById('media-player-modal');
  const mediaPlayerTitle = document.getElementById('media-player-title');
  const mediaBadgeType = document.getElementById('media-badge-type');
  const btnMediaPip = document.getElementById('btn-media-pip');
  const btnMediaMinimize = document.getElementById('btn-media-minimize');
  const btnMediaFullscreen = document.getElementById('btn-media-fullscreen');
  const btnCloseMediaModal = document.getElementById('btn-close-media-modal');

  // Modern Video Top Overlay Bar Elements
  const btnVideoBack = document.getElementById('btn-video-back');
  const btnVideoTopPip = document.getElementById('btn-video-top-pip');
  const btnVideoTopClose = document.getElementById('btn-video-top-close');
  const videoTopTitle = document.getElementById('video-top-title');
  const videoTopBadge = document.getElementById('video-top-badge');

  // ExoVideoView Inspired Video Elements
  const btnVideoAspect = document.getElementById('btn-video-aspect');
  const videoAspectTag = document.getElementById('video-aspect-tag');
  const btnVideoLock = document.getElementById('btn-video-lock');
  const iconLockOpen = document.getElementById('icon-lock-open');
  const iconLockClosed = document.getElementById('icon-lock-closed');
  const videoLockedPill = document.getElementById('video-locked-pill');
  const videoBufferedBar = document.getElementById('video-buffered-bar');

  // Video View Elements & Modern Controls
  const mediaVideoContainer = document.getElementById('media-video-container');
  const mediaVideoEl = document.getElementById('media-video-element');
  const videoControlsOverlay = document.getElementById('video-controls-overlay');
  const videoSeekBar = document.getElementById('video-seek-bar');
  const btnVideoPlayPause = document.getElementById('btn-video-play-pause');
  const iconVideoPlay = document.getElementById('icon-video-play');
  const iconVideoPause = document.getElementById('icon-video-pause');
  const btnVideoPrev = document.getElementById('btn-video-prev');
  const btnVideoNext = document.getElementById('btn-video-next');
  const videoTimeDisplay = document.getElementById('video-time-display');
  const btnVideoQuickRandom = document.getElementById('btn-video-quick-random');
  const btnVideoHamburger = document.getElementById('btn-video-hamburger');
  const btnVideoFullscreenQuick = document.getElementById('btn-video-fullscreen-quick');
  const videoWrapper = document.getElementById('video-wrapper');
  const videoBrightnessOverlay = document.getElementById('video-brightness-overlay');
  const videoHudBrightness = document.getElementById('video-hud-brightness');
  const hudBrightnessFill = document.getElementById('hud-brightness-fill');
  const hudBrightnessText = document.getElementById('hud-brightness-text');
  const videoHudVolume = document.getElementById('video-hud-volume');
  const hudVolumeFill = document.getElementById('hud-volume-fill');
  const hudVolumeText = document.getElementById('hud-volume-text');
  const hudVolumeIcon = document.getElementById('hud-volume-icon');

  // Video Settings Bottom Sheet Elements
  const videoSettingsSheet = document.getElementById('video-settings-sheet');
  const btnCloseVideoSheet = document.getElementById('btn-close-video-sheet');
  const videoSheetBackdrop = document.getElementById('video-sheet-backdrop');
  const sheetSpeedChips = document.querySelectorAll('#sheet-speed-chips .sheet-chip');
  const sheetAspectChips = document.querySelectorAll('#sheet-aspect-chips .sheet-chip');
  const sheetToggleRandom = document.getElementById('sheet-toggle-random');
  const sheetSwitchRandom = document.getElementById('sheet-switch-random');
  const sheetToggleAutoNext = document.getElementById('sheet-toggle-autonext');
  const sheetSwitchAutoNext = document.getElementById('sheet-switch-autonext');
  const sheetToggleLoop = document.getElementById('sheet-toggle-loop');
  const sheetSwitchLoop = document.getElementById('sheet-switch-loop');
  const btnSheetPip = document.getElementById('btn-sheet-pip');
  const btnSheetLock = document.getElementById('btn-sheet-lock');
  const sheetLockLabel = document.getElementById('sheet-lock-label');

  // ExoVideoView: Aspect Ratio Modes & Screen Lock State
  const aspectModes = [
    { id: 'fit', label: 'FIT', name: 'Sesuai Layar (Fit)' },
    { id: 'fill', label: 'CROP', name: 'Penuhi Layar (Crop/Zoom)' },
    { id: '16-9', label: '16:9', name: 'Rasio 16:9' },
    { id: '4-3', label: '4:3', name: 'Rasio 4:3' },
    { id: 'stretch', label: 'FULL', name: 'Regang (Stretch)' }
  ];
  let aspectIndex = 0;
  let isVideoScreenLocked = false;
  let lockedPillTimeout = null;

  function setVideoAspect(idx) {
    aspectIndex = (idx + aspectModes.length) % aspectModes.length;
    const mode = aspectModes[aspectIndex];
    if (mediaVideoEl) {
      mediaVideoEl.className = `video-aspect-${mode.id}`;
    }
    if (videoAspectTag) videoAspectTag.textContent = mode.label;
    showToast(mode.name, 'info', 1200);
  }

  function toggleVideoScreenLock() {
    isVideoScreenLocked = !isVideoScreenLocked;
    if (mediaVideoContainer) {
      mediaVideoContainer.classList.toggle('is-locked', isVideoScreenLocked);
    }
    if (iconLockOpen) iconLockOpen.style.display = isVideoScreenLocked ? 'none' : 'block';
    if (iconLockClosed) iconLockClosed.style.display = isVideoScreenLocked ? 'block' : 'none';

    if (isVideoScreenLocked) {
      showToast(I18n.t('player.locked_toast', 'Layar Terkunci (Sentuhan Dinonaktifkan)'), 'warning', 1600);
      clearTimeout(controlsHideTimeout);
    } else {
      showToast(I18n.t('player.unlocked_toast', 'Layar Terbuka'), 'success', 1200);
      resetControlsTimeout();
    }
  }

  function showLockedPill() {
    if (!isVideoScreenLocked || !videoLockedPill) return;
    videoLockedPill.classList.add('visible');
    clearTimeout(lockedPillTimeout);
    lockedPillTimeout = setTimeout(() => {
      if (videoLockedPill) videoLockedPill.classList.remove('visible');
    }, 2200);
  }

  // Swipe Brightness & Volume State & Helpers
  let currentBrightness = parseFloat(localStorage.getItem('gofile_video_brightness') || '1.0');
  if (isNaN(currentBrightness) || currentBrightness < 0.1 || currentBrightness > 1.0) currentBrightness = 1.0;

  let hudHideTimeout = null;
  function scheduleHudHide(delay = 1200) {
    clearTimeout(hudHideTimeout);
    hudHideTimeout = setTimeout(() => {
      if (videoHudBrightness) videoHudBrightness.classList.remove('visible');
      if (videoHudVolume) videoHudVolume.classList.remove('visible');
    }, delay);
  }

  function setVideoBrightness(val, showHud = false) {
    currentBrightness = Math.min(1.0, Math.max(0.1, val));
    localStorage.setItem('gofile_video_brightness', currentBrightness.toFixed(2));
    if (videoBrightnessOverlay) {
      const overlayOpacity = Math.max(0, Math.min(0.9, 1 - currentBrightness));
      videoBrightnessOverlay.style.opacity = overlayOpacity.toFixed(2);
    }
    if (showHud && videoHudBrightness) {
      const pct = Math.round(currentBrightness * 100);
      if (hudBrightnessFill) hudBrightnessFill.style.height = `${pct}%`;
      if (hudBrightnessText) hudBrightnessText.textContent = `${pct}%`;
      videoHudBrightness.classList.add('visible');
      if (videoHudVolume) videoHudVolume.classList.remove('visible');
      scheduleHudHide(1200);
    }
  }

  function setVideoVolume(val, showHud = false) {
    val = Math.min(1.0, Math.max(0.0, val));
    if (mediaVideoEl) {
      mediaVideoEl.volume = val;
      mediaVideoEl.muted = (val === 0);
    }
    if (showHud && videoHudVolume) {
      const pct = Math.round(val * 100);
      if (hudVolumeFill) hudVolumeFill.style.height = `${pct}%`;
      if (hudVolumeText) hudVolumeText.textContent = `${pct}%`;
      if (hudVolumeIcon) {
        if (val === 0) {
          hudVolumeIcon.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;
        } else if (val < 0.5) {
          hudVolumeIcon.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
        } else {
          hudVolumeIcon.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
        }
      }
      videoHudVolume.classList.add('visible');
      if (videoHudBrightness) videoHudBrightness.classList.remove('visible');
      scheduleHudHide(1200);
    }
  }

  // Modern Center Floating Controls
  const btnVideoCenterPlay = document.getElementById('btn-video-center-play');
  const centerIconPlay = document.getElementById('center-icon-play');
  const centerIconPause = document.getElementById('center-icon-pause');
  const btnVideoSkipBack10 = document.getElementById('btn-video-skip-back-10');
  const btnVideoSkipForward10 = document.getElementById('btn-video-skip-forward-10');

  // Double-Tap Skip Gesture Zones
  const videoGestureLeft = document.getElementById('video-gesture-left');
  const videoGestureRight = document.getElementById('video-gesture-right');
  const rippleLeft = document.getElementById('ripple-left');
  const rippleRight = document.getElementById('ripple-right');
  const audioVisualizerBars = document.getElementById('audio-visualizer-bars');
  const audioPlayerCard = document.querySelector('.audio-player-card');

  // Audio View Elements
  const mediaAudioContainer = document.getElementById('media-audio-container');
  const mediaAudioEl = document.getElementById('media-audio-element');
  const audioDisc = document.getElementById('audio-disc');
  const audioTrackTitle = document.getElementById('audio-track-title');
  const audioTrackMeta = document.getElementById('audio-track-meta');
  const audioSeekBar = document.getElementById('audio-seek-bar');
  const audioCurrTime = document.getElementById('audio-curr-time');
  const audioTotalTime = document.getElementById('audio-total-time');
  const btnAudioRewind = document.getElementById('btn-audio-rewind');
  const btnAudioPlayPause = document.getElementById('btn-audio-play-pause');
  const iconAudioPlay = document.getElementById('icon-audio-play');
  const iconAudioPause = document.getElementById('icon-audio-pause');
  const btnAudioForward = document.getElementById('btn-audio-forward');
  const btnAudioSpeed = document.getElementById('btn-audio-speed');
  const btnAudioLoop = document.getElementById('btn-audio-loop');

  // Photo View Elements
  const mediaPhotoContainer = document.getElementById('media-photo-container');
  const mediaPhotoEl = document.getElementById('media-photo-element');
  const btnPhotoZoomOut = document.getElementById('btn-photo-zoom-out');
  const photoZoomLevel = document.getElementById('photo-zoom-level');
  const btnPhotoZoomIn = document.getElementById('btn-photo-zoom-in');
  const btnPhotoRotate = document.getElementById('btn-photo-rotate');
  const btnPhotoReset = document.getElementById('btn-photo-reset');

  // Floating Mini Player Elements
  const mediaMiniPlayer = document.getElementById('media-mini-player');
  const miniPlayerPreview = document.getElementById('mini-player-preview');
  const miniMediaIcon = document.getElementById('mini-media-icon');
  const miniPlayerTitle = document.getElementById('mini-player-title');
  const miniPlayerStatus = document.getElementById('mini-player-status');
  const btnMiniPlayPause = document.getElementById('btn-mini-play-pause');
  const miniIconPlay = document.getElementById('mini-icon-play');
  const miniIconPause = document.getElementById('mini-icon-pause');
  const btnMiniExpand = document.getElementById('btn-mini-expand');
  const btnMiniClose = document.getElementById('btn-mini-close');

  function formatMediaTime(sec) {
    if (!sec || isNaN(sec) || sec < 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const mStr = m < 10 ? '0' + m : m;
    const sStr = s < 10 ? '0' + s : s;
    return `${mStr}:${sStr}`;
  }

  function updateMiniPlayPauseIcon() {
    if (mediaState.isPlaying) {
      if (miniIconPlay) miniIconPlay.style.display = 'none';
      if (miniIconPause) miniIconPause.style.display = 'inline-block';
    } else {
      if (miniIconPlay) miniIconPlay.style.display = 'inline-block';
      if (miniIconPause) miniIconPause.style.display = 'none';
    }
  }

  function showMiniPlayer() {
    if (!mediaMiniPlayer) return;
    const fileName = (typeof mediaState.currentFile === 'string')
      ? mediaState.currentFile
      : (mediaState.currentFile?.name || mediaState.currentFile?.filename || 'Media');
    if (miniPlayerTitle) miniPlayerTitle.textContent = fileName;
    if (miniMediaIcon) {
      miniMediaIcon.textContent = mediaState.mediaType === 'video' ? '🎬' : (mediaState.mediaType === 'audio' ? '🎵' : '🖼️');
    }
    if (miniPlayerStatus) {
      miniPlayerStatus.textContent = mediaState.mediaType === 'photo' ? 'Foto' : (mediaState.isPlaying ? 'Memutar' : 'Dijeda');
    }
    updateMiniPlayPauseIcon();
    mediaMiniPlayer.style.display = 'flex';
  }

  function hideMiniPlayer() {
    if (mediaMiniPlayer) mediaMiniPlayer.style.display = 'none';
  }

  function minimizeToMiniPlayer() {
    if (!mediaPlayerModal || !mediaPlayerModal.classList.contains('active')) return;
    mediaPlayerModal.classList.remove('active');
    showMiniPlayer();
  }

  function restoreFromMiniPlayer() {
    hideMiniPlayer();
    if (mediaPlayerModal) mediaPlayerModal.classList.add('active');
  }

  function updatePhotoTransform() {
    if (!mediaPhotoEl) return;
    mediaPhotoEl.style.transform = `scale(${mediaState.zoomLevel}) rotate(${mediaState.rotateDeg}deg)`;
    if (photoZoomLevel) photoZoomLevel.textContent = `${Math.round(mediaState.zoomLevel * 100)}%`;
  }

  function buildVideoPlaylist(currentFile) {
    const list = [];
    const seen = new Set();

    function addCandidate(f) {
      if (!f || !isVideoFile(f)) return;
      const key = (f.path || f.fileUri || f.name || f.filename || '').toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      list.push(f);
    }

    if (Array.isArray(state.storedFiles)) {
      for (const f of state.storedFiles) {
        addCandidate(f);
      }
    }

    if (Array.isArray(state.history)) {
      for (const h of state.history) {
        addCandidate(h);
      }
    }

    const curKey = (currentFile?.path || currentFile?.fileUri || currentFile?.name || currentFile?.filename || (typeof currentFile === 'string' ? currentFile : '')).toLowerCase();
    if (curKey && !seen.has(curKey) && isVideoFile(currentFile)) {
      list.unshift(currentFile);
    }

    mediaState.playlist = list;
    let idx = list.findIndex(item => {
      const k = (item.path || item.fileUri || item.name || item.filename || '').toLowerCase();
      return k === curKey;
    });
    if (idx === -1 && typeof currentFile === 'string') {
      idx = list.findIndex(item => (item.name || item.filename) === currentFile);
    }
    mediaState.playlistIndex = idx !== -1 ? idx : 0;
    updatePlaylistNavUI();
  }

  function updatePlaylistNavUI() {
    const hasMultiple = mediaState.playlist && mediaState.playlist.length > 1;
    if (btnVideoPrev) {
      btnVideoPrev.disabled = !hasMultiple;
      btnVideoPrev.style.opacity = hasMultiple ? '1' : '0.4';
    }
    if (btnVideoNext) {
      btnVideoNext.disabled = !hasMultiple;
      btnVideoNext.style.opacity = hasMultiple ? '1' : '0.4';
    }
    if (btnVideoQuickRandom) {
      btnVideoQuickRandom.classList.toggle('active', !!mediaState.shuffle);
    }
  }

  function toggleAutoplayNext() {
    mediaState.autoNext = !mediaState.autoNext;
    localStorage.setItem('gofile_video_autonext', mediaState.autoNext ? 'true' : 'false');
    updatePlaylistNavUI();
    if (sheetSwitchAutoNext) sheetSwitchAutoNext.classList.toggle('active', !!mediaState.autoNext);
    showToast(mediaState.autoNext ? 'Putar otomatis (Autoplay): AKTIF' : 'Putar otomatis (Autoplay): NONAKTIF', 'info', 1800);
  }

  function toggleVideoShuffle(forceState = null) {
    if (forceState !== null) {
      mediaState.shuffle = forceState;
    } else {
      mediaState.shuffle = !mediaState.shuffle;
    }
    localStorage.setItem('gofile_video_shuffle', mediaState.shuffle ? 'true' : 'false');
    if (btnVideoQuickRandom) {
      btnVideoQuickRandom.classList.toggle('active', mediaState.shuffle);
    }
    if (sheetSwitchRandom) {
      sheetSwitchRandom.classList.toggle('active', mediaState.shuffle);
    }
    showToast(mediaState.shuffle ? '🔀 Putar Acak: AKTIF (Memprioritaskan video yang belum pernah ditonton)' : '🔀 Putar Acak: NONAKTIF (Pemutaran Berurutan)', 'info', 2200);
  }

  async function playNextVideo(isAuto = false) {
    if (mediaState.mediaType !== 'video' || !mediaState.playlist || mediaState.playlist.length <= 1) {
      if (!isAuto) showToast('Tidak ada video berikutnya dalam daftar', 'info', 1800);
      return false;
    }

    let nextIdx = -1;
    if (mediaState.shuffle) {
      // SHUFFLE MODE: Prioritize unwatched videos!
      const candidates = mediaState.playlist.map((f, i) => ({ file: f, index: i }));
      const unwatched = candidates.filter(c => c.index !== mediaState.playlistIndex && !isVideoWatched(c.file));
      if (unwatched.length > 0) {
        const pick = unwatched[Math.floor(Math.random() * unwatched.length)];
        nextIdx = pick.index;
        showToast(`🔀 Memprioritaskan video baru: ${pick.file.name || pick.file.filename || 'Video'}`, 'info', 2200);
      } else {
        const others = candidates.filter(c => c.index !== mediaState.playlistIndex);
        const pick = others.length > 0 ? others[Math.floor(Math.random() * others.length)] : candidates[0];
        nextIdx = pick.index;
        showToast(`🔀 Putar acak: ${pick.file.name || pick.file.filename || 'Video'}`, 'info', 1800);
      }
    } else {
      nextIdx = mediaState.playlistIndex + 1;
      if (nextIdx >= mediaState.playlist.length) {
        if (isAuto) {
          showToast('Semua video dalam daftar telah selesai diputar', 'info', 2500);
          return false;
        }
        nextIdx = 0; // Wrap around on manual click
      }
      const nextFile = mediaState.playlist[nextIdx];
      if (nextFile) {
        showToast(`Memutar: ${nextFile.name || nextFile.filename || 'Video berikutnya'}`, 'info', 1800);
      }
    }

    const nextFile = mediaState.playlist[nextIdx];
    if (!nextFile) return false;
    mediaState.playlistIndex = nextIdx;
    return await openMediaPlayer(nextFile, 'video');
  }

  async function playPrevVideo() {
    if (mediaState.mediaType !== 'video' || !mediaState.playlist || mediaState.playlist.length <= 1) {
      if (mediaVideoEl && mediaVideoEl.currentTime > 0) {
        mediaVideoEl.currentTime = 0;
        return true;
      }
      showToast('Tidak ada video sebelumnya', 'info', 1800);
      return false;
    }
    // If playing > 3 seconds, rewind to start first
    if (mediaVideoEl && mediaVideoEl.currentTime > 3) {
      mediaVideoEl.currentTime = 0;
      return true;
    }
    let prevIdx = mediaState.playlistIndex - 1;
    if (prevIdx < 0) {
      prevIdx = mediaState.playlist.length - 1;
    }
    const prevFile = mediaState.playlist[prevIdx];
    if (!prevFile) return false;
    mediaState.playlistIndex = prevIdx;
    showToast(`Memutar: ${prevFile.name || prevFile.filename || 'Video sebelumnya'}`, 'info', 1800);
    return await openMediaPlayer(prevFile, 'video');
  }

  async function openMediaPlayer(fileOrItem, explicitType = null) {
    if (!fileOrItem) return false;
    const fileName = (typeof fileOrItem === 'string') ? fileOrItem : (fileOrItem.name || fileOrItem.filename || 'Media');

    let type = explicitType;
    if (!type) {
      if (isVideoFile(fileOrItem)) type = 'video';
      else if (isAudioFile(fileOrItem)) type = 'audio';
      else if (isPhotoFile(fileOrItem)) type = 'photo';
      else return false;
    }

    // Resolve native streamable URL (Android loopback streaming server or Windows file:// URI)
    const mediaUrl = await ApiBridge.getMediaUrl(fileOrItem);
    if (!mediaUrl) {
      showToast(`Gagal menyiapkan pemutar untuk: ${fileName}`, 'error', 3000);
      return false;
    }

    mediaState.currentFile = fileOrItem;
    mediaState.mediaType = type;
    mediaState.mediaUrl = mediaUrl;
    mediaState.speedIndex = 2; // 1x default

    if (mediaPlayerTitle) mediaPlayerTitle.textContent = fileName;
    if (videoTopTitle) videoTopTitle.textContent = fileName;
    const fileExt = fileName.includes('.') ? fileName.split('.').pop() : type;
    if (videoTopBadge) videoTopBadge.textContent = fileExt.toUpperCase();

    if (mediaBadgeType) {
      mediaBadgeType.textContent = type.toUpperCase();
      mediaBadgeType.className = `media-type-badge ${type}`;
    }

    hideMiniPlayer();
    resetControlsTimeout();

    // Reset all views
    if (mediaVideoContainer) mediaVideoContainer.style.display = 'none';
    if (mediaAudioContainer) mediaAudioContainer.style.display = 'none';
    if (mediaPhotoContainer) mediaPhotoContainer.style.display = 'none';

    // Stop current media
    if (mediaVideoEl) {
      mediaVideoEl.pause();
      mediaVideoEl.removeAttribute('src');
      mediaVideoEl.load();
    }
    if (mediaAudioEl) {
      mediaAudioEl.pause();
      mediaAudioEl.removeAttribute('src');
      mediaAudioEl.load();
    }
    if (audioDisc) audioDisc.classList.remove('playing');

    if (type === 'video') {
      buildVideoPlaylist(fileOrItem);
      updateWatchedBannerUI(fileOrItem);
      if (btnVideoQuickRandom) {
        btnVideoQuickRandom.classList.toggle('active', !!mediaState.shuffle);
      }
      if (mediaVideoContainer) {
        mediaVideoContainer.style.display = 'flex';
        mediaVideoContainer.classList.remove('is-locked');
      }
      isVideoScreenLocked = false;
      if (iconLockOpen) iconLockOpen.style.display = 'block';
      if (iconLockClosed) iconLockClosed.style.display = 'none';
      if (videoBufferedBar) videoBufferedBar.style.width = '0%';
      aspectIndex = 0;
      if (mediaVideoEl) {
        mediaVideoEl.className = 'video-aspect-fit';
        mediaVideoEl.loop = false;
      }
      if (videoAspectTag) videoAspectTag.textContent = 'FIT';

      setVideoBrightness(currentBrightness, false);
      if (btnMediaPip) btnMediaPip.style.display = 'inline-flex';
      if (mediaVideoEl) {
        mediaVideoEl.src = mediaUrl;
        mediaVideoEl.playbackRate = mediaState.playbackSpeeds[mediaState.speedIndex];
        mediaVideoEl.load();
        mediaVideoEl.play().catch(e => console.log('Video autoplay:', e));
      }
    } else {
      ApiBridge.setVideoPlaybackState(false);
      if (type === 'audio') {
        if (mediaAudioContainer) mediaAudioContainer.style.display = 'flex';
        if (btnMediaPip) btnMediaPip.style.display = 'none'; // PiP not for audio
        if (audioTrackTitle) audioTrackTitle.textContent = fileName;
        if (audioTrackMeta) {
          const sizeStr = (typeof fileOrItem === 'object' && fileOrItem.size) ? ` • ${formatBytes(fileOrItem.size)}` : '';
          audioTrackMeta.textContent = `Musik / Suara${sizeStr}`;
        }
        if (mediaAudioEl) {
          mediaAudioEl.src = mediaUrl;
          mediaAudioEl.playbackRate = mediaState.playbackSpeeds[mediaState.speedIndex];
          if (btnAudioSpeed) btnAudioSpeed.textContent = `${mediaState.playbackSpeeds[mediaState.speedIndex]}x`;
          mediaAudioEl.load();
          mediaAudioEl.play().catch(e => console.log('Audio autoplay:', e));
        }
      } else if (type === 'photo') {
        if (mediaPhotoContainer) mediaPhotoContainer.style.display = 'flex';
        if (btnMediaPip) btnMediaPip.style.display = 'none'; // PiP not for photo
        mediaState.zoomLevel = 1.0;
        mediaState.rotateDeg = 0;
        updatePhotoTransform();
        if (mediaPhotoEl) mediaPhotoEl.src = mediaUrl;
      }
    }

    if (mediaPlayerModal) mediaPlayerModal.classList.add('active');
    return true;
  }

  function closeMediaPlayer() {
    clearTimeout(controlsHideTimeout);
    closeVideoSettingsSheet();
    isVideoScreenLocked = false;
    if (mediaVideoContainer) {
      mediaVideoContainer.classList.remove('controls-hidden');
      mediaVideoContainer.classList.remove('is-locked');
    }
    if (videoLockedPill) videoLockedPill.classList.remove('visible');
    if (audioPlayerCard) audioPlayerCard.classList.remove('playing');
    if (mediaVideoEl) {
      mediaVideoEl.pause();
      mediaVideoEl.removeAttribute('src');
      mediaVideoEl.load();
    }
    if (mediaAudioEl) {
      mediaAudioEl.pause();
      mediaAudioEl.removeAttribute('src');
      mediaAudioEl.load();
    }
    if (audioDisc) audioDisc.classList.remove('playing');
    if (mediaPlayerModal) mediaPlayerModal.classList.remove('active');
    document.body.classList.remove('pip-mode');
    document.documentElement.classList.remove('pip-mode');
    ApiBridge.setVideoPlaybackState(false);
    hideMiniPlayer();
  }

  async function triggerPictureInPicture() {
    if (mediaState.mediaType !== 'video') {
      showToast('Mode Mengambang (PiP) hanya untuk pemutaran Video', 'info', 2000);
      return;
    }
    const w = mediaVideoEl?.videoWidth || 16;
    const h = mediaVideoEl?.videoHeight || 9;

    // 1. Android Native Picture-in-Picture
    const nativeSuccess = await ApiBridge.enterPip(w, h);
    if (nativeSuccess) return;

    // 2. Desktop HTML5 Picture-in-Picture
    if (document.pictureInPictureEnabled && mediaVideoEl?.requestPictureInPicture) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await mediaVideoEl.requestPictureInPicture();
        }
        return;
      } catch (e) {
        console.warn('HTML5 PiP failed:', e);
      }
    }

    // 3. Fallback to in-app floating mini player
    minimizeToMiniPlayer();
    showToast('Memutar di jendela mengambang mini aplikasi', 'info', 2500);
  }

  function toggleMediaFullscreen() {
    if (mediaState.mediaType === 'video' && mediaVideoEl) {
      if (!document.fullscreenElement) {
        if (mediaVideoContainer?.requestFullscreen) {
          mediaVideoContainer.requestFullscreen();
        } else if (mediaVideoEl.requestFullscreen) {
          mediaVideoEl.requestFullscreen();
        } else if (mediaVideoEl.webkitEnterFullscreen) {
          mediaVideoEl.webkitEnterFullscreen();
        }
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
      }
    } else if (mediaPlayerModal) {
      if (!document.fullscreenElement) {
        if (mediaPlayerModal.requestFullscreen) mediaPlayerModal.requestFullscreen();
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
      }
    }
  }

  // Hook Android MainActivity callback when PiP mode changes
  window.onPipModeChanged = function(isInPip) {
    console.log('[GoFile Pro] Native PiP Mode Changed:', isInPip);
    mediaState.isPipActive = isInPip;
    if (isInPip) {
      document.body.classList.add('pip-mode');
      document.documentElement.classList.add('pip-mode');
      if (mediaPlayerModal) mediaPlayerModal.classList.add('active');
    } else {
      document.body.classList.remove('pip-mode');
      document.documentElement.classList.remove('pip-mode');
    }
  };

  // Modern Video Auto-Hide Engine & Tactile Controls
  let controlsHideTimeout = null;

  function resetControlsTimeout() {
    if (!mediaVideoContainer || isVideoScreenLocked) return;
    mediaVideoContainer.classList.remove('controls-hidden');
    clearTimeout(controlsHideTimeout);

    if (mediaState.isPlaying && mediaState.mediaType === 'video') {
      controlsHideTimeout = setTimeout(() => {
        if (mediaState.isPlaying && mediaState.mediaType === 'video' && !isVideoScreenLocked) {
          mediaVideoContainer.classList.add('controls-hidden');
        }
      }, 3000);
    }
  }

  function toggleControlsVisibility() {
    if (!mediaVideoContainer || isVideoScreenLocked) return;
    if (mediaVideoContainer.classList.contains('controls-hidden')) {
      resetControlsTimeout();
    } else {
      clearTimeout(controlsHideTimeout);
      mediaVideoContainer.classList.add('controls-hidden');
    }
  }

  function updateVideoPlayPauseIcons(isPlaying) {
    if (isPlaying) {
      if (iconVideoPlay) iconVideoPlay.style.display = 'none';
      if (iconVideoPause) iconVideoPause.style.display = 'inline-block';
      if (centerIconPlay) centerIconPlay.style.display = 'none';
      if (centerIconPause) centerIconPause.style.display = 'inline-block';
    } else {
      if (iconVideoPlay) iconVideoPlay.style.display = 'inline-block';
      if (iconVideoPause) iconVideoPause.style.display = 'none';
      if (centerIconPlay) centerIconPlay.style.display = 'inline-block';
      if (centerIconPause) centerIconPause.style.display = 'none';
    }
  }

  function showGestureRipple(el) {
    if (!el) return;
    el.classList.remove('ripple-active');
    void el.offsetWidth;
    el.classList.add('ripple-active');
    setTimeout(() => {
      el.classList.remove('ripple-active');
    }, 700);
  }

  // Video Events
  if (mediaVideoEl) {
    mediaVideoEl.addEventListener('play', () => {
      mediaState.isPlaying = true;
      updateVideoPlayPauseIcons(true);
      if (miniPlayerStatus) miniPlayerStatus.textContent = 'Memutar video';
      updateMiniPlayPauseIcon();
      const w = mediaVideoEl.videoWidth || 16;
      const h = mediaVideoEl.videoHeight || 9;
      ApiBridge.setVideoPlaybackState(true, w, h);
      resetControlsTimeout();
    });

    mediaVideoEl.addEventListener('loadedmetadata', () => {
      const w = mediaVideoEl.videoWidth || 16;
      const h = mediaVideoEl.videoHeight || 9;
      if (mediaState.isPlaying) {
        ApiBridge.setVideoPlaybackState(true, w, h);
      }
    });

    mediaVideoEl.addEventListener('progress', () => {
      if (mediaVideoEl.duration > 0 && mediaVideoEl.buffered && mediaVideoEl.buffered.length > 0) {
        try {
          const bufferedEnd = mediaVideoEl.buffered.end(mediaVideoEl.buffered.length - 1);
          const pct = Math.min(100, Math.max(0, (bufferedEnd / mediaVideoEl.duration) * 100));
          if (videoBufferedBar) videoBufferedBar.style.width = `${pct}%`;
        } catch (ignored) {}
      }
    });

    mediaVideoEl.addEventListener('pause', () => {
      mediaState.isPlaying = false;
      updateVideoPlayPauseIcons(false);
      if (miniPlayerStatus) miniPlayerStatus.textContent = 'Dijeda';
      updateMiniPlayPauseIcon();
      ApiBridge.setVideoPlaybackState(false);
      resetControlsTimeout();
    });

    mediaVideoEl.addEventListener('ended', async () => {
      mediaState.isPlaying = false;
      updateVideoPlayPauseIcons(false);
      if (miniPlayerStatus) miniPlayerStatus.textContent = 'Selesai';
      updateMiniPlayPauseIcon();
      ApiBridge.setVideoPlaybackState(false);
      resetControlsTimeout();

      // Record 100% completed watch
      if (mediaState.currentFile && mediaVideoEl.duration) {
        recordWatchProgress(mediaState.currentFile, mediaVideoEl.duration, mediaVideoEl.duration);
      }

      if (mediaVideoEl.loop) {
        mediaVideoEl.currentTime = 0;
        mediaVideoEl.play().catch(e => console.warn(e));
        return;
      }

      if (mediaState.autoNext && mediaState.playlist && mediaState.playlist.length > 1) {
        const played = await playNextVideo(true);
        if (played) return;
      }
    });

    mediaVideoEl.addEventListener('timeupdate', () => {
      if (!mediaState.isSeekingVideo && mediaVideoEl.duration) {
        const pct = (mediaVideoEl.currentTime / mediaVideoEl.duration) * 100;
        if (videoSeekBar) videoSeekBar.value = pct;
        if (videoTimeDisplay) {
          videoTimeDisplay.textContent = `${formatMediaTime(mediaVideoEl.currentTime)} / ${formatMediaTime(mediaVideoEl.duration)}`;
        }
        // Record watch progress throttled
        if (mediaState.currentFile && mediaVideoEl.currentTime >= 5) {
          recordWatchProgress(mediaState.currentFile, mediaVideoEl.currentTime, mediaVideoEl.duration);
        }
      }
    });
  }

  if (videoSeekBar && mediaVideoEl) {
    videoSeekBar.addEventListener('input', () => {
      mediaState.isSeekingVideo = true;
      if (mediaVideoEl.duration) {
        const targetSec = (videoSeekBar.value / 100) * mediaVideoEl.duration;
        if (videoTimeDisplay) {
          videoTimeDisplay.textContent = `${formatMediaTime(targetSec)} / ${formatMediaTime(mediaVideoEl.duration)}`;
        }
      }
      resetControlsTimeout();
    });
    videoSeekBar.addEventListener('change', () => {
      mediaState.isSeekingVideo = false;
      if (mediaVideoEl.duration) {
        mediaVideoEl.currentTime = (videoSeekBar.value / 100) * mediaVideoEl.duration;
      }
      resetControlsTimeout();
    });
  }

  if (btnVideoPlayPause && mediaVideoEl) {
    btnVideoPlayPause.addEventListener('click', () => {
      if (mediaVideoEl.paused) mediaVideoEl.play();
      else mediaVideoEl.pause();
      resetControlsTimeout();
    });
  }

  // Center Tactile Buttons
  if (btnVideoCenterPlay && mediaVideoEl) {
    btnVideoCenterPlay.addEventListener('click', (e) => {
      e.stopPropagation();
      if (mediaVideoEl.paused) mediaVideoEl.play();
      else mediaVideoEl.pause();
      resetControlsTimeout();
    });
  }

  if (btnVideoSkipBack10 && mediaVideoEl) {
    btnVideoSkipBack10.addEventListener('click', (e) => {
      e.stopPropagation();
      mediaVideoEl.currentTime = Math.max(0, mediaVideoEl.currentTime - 10);
      showGestureRipple(rippleLeft);
      resetControlsTimeout();
    });
  }

  if (btnVideoSkipForward10 && mediaVideoEl) {
    btnVideoSkipForward10.addEventListener('click', (e) => {
      e.stopPropagation();
      if (mediaVideoEl.duration) {
        mediaVideoEl.currentTime = Math.min(mediaVideoEl.duration, mediaVideoEl.currentTime + 10);
        showGestureRipple(rippleRight);
      }
      resetControlsTimeout();
    });
  }

  // Top Bar Overlay Controls
  if (btnVideoBack) btnVideoBack.addEventListener('click', closeMediaPlayer);
  if (btnVideoTopClose) btnVideoTopClose.addEventListener('click', closeMediaPlayer);
  if (btnVideoTopPip) btnVideoTopPip.addEventListener('click', triggerPictureInPicture);
  if (btnVideoAspect) {
    btnVideoAspect.addEventListener('click', (e) => {
      e.stopPropagation();
      setVideoAspect(aspectIndex + 1);
      resetControlsTimeout();
    });
  }
  if (btnVideoLock) {
    btnVideoLock.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleVideoScreenLock();
    });
  }
  if (videoLockedPill) {
    videoLockedPill.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleVideoScreenLock();
    });
  }

  // Vertical Swipe Gesture Engine (Left: Brightness, Right: Volume) with Disambiguation
  let touchSwipeState = {
    startX: 0,
    startY: 0,
    isSwiping: false,
    isLeftSide: true,
    startBrightness: 1.0,
    startVolume: 1.0,
    suppressUntil: 0
  };

  if (videoWrapper) {
    videoWrapper.addEventListener('touchstart', (e) => {
      if (isVideoScreenLocked) {
        showLockedPill();
        return;
      }
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const rect = videoWrapper.getBoundingClientRect();
      touchSwipeState.startX = touch.clientX;
      touchSwipeState.startY = touch.clientY;
      touchSwipeState.isSwiping = false;
      touchSwipeState.isLeftSide = (touch.clientX < (rect.left + rect.width / 2));
      touchSwipeState.startBrightness = currentBrightness;
      touchSwipeState.startVolume = mediaVideoEl ? (mediaVideoEl.muted ? 0 : mediaVideoEl.volume) : 1.0;
    }, { passive: true });

    videoWrapper.addEventListener('touchmove', (e) => {
      if (isVideoScreenLocked || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const rect = videoWrapper.getBoundingClientRect();
      const dx = touch.clientX - touchSwipeState.startX;
      const dy = touch.clientY - touchSwipeState.startY;

      if (!touchSwipeState.isSwiping) {
        if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx) * 1.25) {
          touchSwipeState.isSwiping = true;
          lastTapLeft = 0;
          lastTapRight = 0;
        }
      }

      if (touchSwipeState.isSwiping) {
        if (e.cancelable) e.preventDefault();
        const deltaRatio = -dy / (rect.height * 0.55);
        if (touchSwipeState.isLeftSide) {
          const newB = Math.min(1.0, Math.max(0.1, touchSwipeState.startBrightness + deltaRatio));
          setVideoBrightness(newB, true);
        } else {
          const newV = Math.min(1.0, Math.max(0.0, touchSwipeState.startVolume + deltaRatio));
          setVideoVolume(newV, true);
        }
      }
    }, { passive: false });

    const handleTouchEnd = (e) => {
      if (touchSwipeState.isSwiping) {
        touchSwipeState.isSwiping = false;
        touchSwipeState.suppressUntil = Date.now() + 450;
        scheduleHudHide(1200);
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
      }
    };

    videoWrapper.addEventListener('touchend', handleTouchEnd);
    videoWrapper.addEventListener('touchcancel', handleTouchEnd);
  }

  // Double-tap & Single-tap Gesture Zones
  let lastTapLeft = 0;
  let lastTapRight = 0;

  if (videoGestureLeft) {
    videoGestureLeft.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isVideoScreenLocked) {
        showLockedPill();
        return;
      }
      if (Date.now() < touchSwipeState.suppressUntil) return;
      const now = Date.now();
      if (now - lastTapLeft < 300) {
        if (mediaVideoEl) {
          mediaVideoEl.currentTime = Math.max(0, mediaVideoEl.currentTime - 10);
          showGestureRipple(rippleLeft);
        }
        lastTapLeft = 0;
        resetControlsTimeout();
      } else {
        lastTapLeft = now;
        setTimeout(() => {
          if (lastTapLeft === now) {
            toggleControlsVisibility();
          }
        }, 310);
      }
    });
  }

  if (videoGestureRight) {
    videoGestureRight.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isVideoScreenLocked) {
        showLockedPill();
        return;
      }
      if (Date.now() < touchSwipeState.suppressUntil) return;
      const now = Date.now();
      if (now - lastTapRight < 300) {
        if (mediaVideoEl && mediaVideoEl.duration) {
          mediaVideoEl.currentTime = Math.min(mediaVideoEl.duration, mediaVideoEl.currentTime + 10);
          showGestureRipple(rippleRight);
        }
        lastTapRight = 0;
        resetControlsTimeout();
      } else {
        lastTapRight = now;
        setTimeout(() => {
          if (lastTapRight === now) {
            toggleControlsVisibility();
          }
        }, 310);
      }
    });
  }

  if (mediaVideoContainer) {
    mediaVideoContainer.addEventListener('mousemove', () => {
      if (!isVideoScreenLocked) resetControlsTimeout();
    });
    mediaVideoContainer.addEventListener('touchstart', () => {
      if (!isVideoScreenLocked) resetControlsTimeout();
    }, { passive: true });
  }

  if (btnVideoPrev) {
    btnVideoPrev.addEventListener('click', () => playPrevVideo());
  }

  if (btnVideoNext) {
    btnVideoNext.addEventListener('click', () => playNextVideo(false));
  }

  if (btnVideoQuickRandom) {
    btnVideoQuickRandom.classList.toggle('active', !!mediaState.shuffle);
    btnVideoQuickRandom.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleVideoShuffle();
      resetControlsTimeout();
    });
  }

  function openVideoSettingsSheet() {
    if (!videoSettingsSheet) return;
    updateWatchedBannerUI(mediaState.currentFile);
    if (sheetSwitchRandom) sheetSwitchRandom.classList.toggle('active', !!mediaState.shuffle);
    if (sheetSwitchAutoNext) sheetSwitchAutoNext.classList.toggle('active', !!mediaState.autoNext);
    if (sheetSwitchLoop) sheetSwitchLoop.classList.toggle('active', !!mediaVideoEl?.loop);
    if (sheetLockLabel) sheetLockLabel.textContent = isVideoScreenLocked ? 'Buka Kunci Layar' : 'Kunci Sentuhan Layar';

    const curSpeed = mediaVideoEl ? mediaVideoEl.playbackRate : 1.0;
    sheetSpeedChips.forEach(chip => {
      const spd = parseFloat(chip.getAttribute('data-speed'));
      chip.classList.toggle('active', Math.abs(spd - curSpeed) < 0.05);
    });

    const curAspect = aspectModes[aspectIndex]?.id || 'fit';
    sheetAspectChips.forEach(chip => {
      chip.classList.toggle('active', chip.getAttribute('data-aspect') === curAspect);
    });

    videoSettingsSheet.classList.add('active');
  }

  function closeVideoSettingsSheet() {
    if (videoSettingsSheet) videoSettingsSheet.classList.remove('active');
  }

  if (btnVideoHamburger) {
    btnVideoHamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      openVideoSettingsSheet();
    });
  }

  if (btnCloseVideoSheet) {
    btnCloseVideoSheet.addEventListener('click', (e) => {
      e.stopPropagation();
      closeVideoSettingsSheet();
    });
  }

  if (videoSheetBackdrop) {
    videoSheetBackdrop.addEventListener('click', (e) => {
      e.stopPropagation();
      closeVideoSettingsSheet();
    });
  }

  sheetSpeedChips.forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      const spd = parseFloat(chip.getAttribute('data-speed'));
      if (mediaVideoEl && !isNaN(spd)) {
        mediaVideoEl.playbackRate = spd;
        sheetSpeedChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        showToast(`Kecepatan putar: ${spd}x`, 'info', 1200);
      }
    });
  });

  sheetAspectChips.forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      const aspId = chip.getAttribute('data-aspect');
      const idx = aspectModes.findIndex(m => m.id === aspId);
      if (idx !== -1) {
        setVideoAspect(idx);
        sheetAspectChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      }
    });
  });

  if (sheetToggleRandom) {
    sheetToggleRandom.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleVideoShuffle();
    });
  }

  if (sheetToggleAutoNext) {
    sheetToggleAutoNext.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleAutoplayNext();
    });
  }

  if (sheetToggleLoop && mediaVideoEl) {
    sheetToggleLoop.addEventListener('click', (e) => {
      e.stopPropagation();
      mediaVideoEl.loop = !mediaVideoEl.loop;
      if (sheetSwitchLoop) sheetSwitchLoop.classList.toggle('active', mediaVideoEl.loop);
      showToast(mediaVideoEl.loop ? '🔁 Putar berulang (Loop): AKTIF' : '🔁 Putar berulang (Loop): NONAKTIF', 'info', 1500);
    });
  }

  if (btnSheetPip) {
    btnSheetPip.addEventListener('click', (e) => {
      e.stopPropagation();
      closeVideoSettingsSheet();
      triggerPictureInPicture();
    });
  }

  if (btnSheetLock) {
    btnSheetLock.addEventListener('click', (e) => {
      e.stopPropagation();
      closeVideoSettingsSheet();
      toggleVideoScreenLock();
    });
  }

  if (btnVideoFullscreenQuick) btnVideoFullscreenQuick.addEventListener('click', toggleMediaFullscreen);

  // Keyboard navigation for video player and media modal
  document.addEventListener('keydown', (e) => {
    if (!mediaPlayerModal || !mediaPlayerModal.classList.contains('active')) return;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

    if (mediaState.mediaType === 'video') {
      if (e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        playNextVideo(false);
      } else if (e.key === 'ArrowLeft' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        playPrevVideo();
      } else if (e.key === ' ' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        if (mediaVideoEl) {
          if (mediaVideoEl.paused) mediaVideoEl.play();
          else mediaVideoEl.pause();
        }
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleMediaFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        if (mediaVideoEl) mediaVideoEl.muted = !mediaVideoEl.muted;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeMediaPlayer();
      }
    } else if (mediaState.mediaType === 'audio') {
      if (e.key === ' ' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        if (mediaAudioEl) {
          if (mediaAudioEl.paused) mediaAudioEl.play();
          else mediaAudioEl.pause();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeMediaPlayer();
      }
    } else if (mediaState.mediaType === 'photo') {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMediaPlayer();
      }
    }
  });

  // Audio Events
  if (mediaAudioEl) {
    mediaAudioEl.addEventListener('play', () => {
      mediaState.isPlaying = true;
      if (audioDisc) audioDisc.classList.add('playing');
      if (audioPlayerCard) audioPlayerCard.classList.add('playing');
      if (iconAudioPlay) iconAudioPlay.style.display = 'none';
      if (iconAudioPause) iconAudioPause.style.display = 'inline-block';
      if (miniPlayerStatus) miniPlayerStatus.textContent = 'Memutar musik';
      updateMiniPlayPauseIcon();
    });

    mediaAudioEl.addEventListener('pause', () => {
      mediaState.isPlaying = false;
      if (audioDisc) audioDisc.classList.remove('playing');
      if (audioPlayerCard) audioPlayerCard.classList.remove('playing');
      if (iconAudioPlay) iconAudioPlay.style.display = 'inline-block';
      if (iconAudioPause) iconAudioPause.style.display = 'none';
      if (miniPlayerStatus) miniPlayerStatus.textContent = 'Dijeda';
      updateMiniPlayPauseIcon();
    });

    mediaAudioEl.addEventListener('ended', () => {
      if (mediaState.isLooping) {
        mediaAudioEl.currentTime = 0;
        mediaAudioEl.play();
      } else {
        mediaState.isPlaying = false;
        if (audioDisc) audioDisc.classList.remove('playing');
        if (audioPlayerCard) audioPlayerCard.classList.remove('playing');
        if (iconAudioPlay) iconAudioPlay.style.display = 'inline-block';
        if (iconAudioPause) iconAudioPause.style.display = 'none';
        if (miniPlayerStatus) miniPlayerStatus.textContent = 'Selesai';
        updateMiniPlayPauseIcon();
      }
    });

    mediaAudioEl.addEventListener('timeupdate', () => {
      if (mediaAudioEl.duration) {
        const pct = (mediaAudioEl.currentTime / mediaAudioEl.duration) * 100;
        if (audioSeekBar) audioSeekBar.value = pct;
        if (audioCurrTime) audioCurrTime.textContent = formatMediaTime(mediaAudioEl.currentTime);
        if (audioTotalTime) audioTotalTime.textContent = formatMediaTime(mediaAudioEl.duration);
      }
    });
  }

  if (audioSeekBar && mediaAudioEl) {
    audioSeekBar.addEventListener('input', () => {
      if (mediaAudioEl.duration) {
        const targetSec = (audioSeekBar.value / 100) * mediaAudioEl.duration;
        if (audioCurrTime) audioCurrTime.textContent = formatMediaTime(targetSec);
      }
    });
    audioSeekBar.addEventListener('change', () => {
      if (mediaAudioEl.duration) {
        mediaAudioEl.currentTime = (audioSeekBar.value / 100) * mediaAudioEl.duration;
      }
    });
  }

  if (btnAudioPlayPause && mediaAudioEl) {
    btnAudioPlayPause.addEventListener('click', () => {
      if (mediaAudioEl.paused) mediaAudioEl.play();
      else mediaAudioEl.pause();
    });
  }

  if (btnAudioRewind && mediaAudioEl) {
    btnAudioRewind.addEventListener('click', () => {
      mediaAudioEl.currentTime = Math.max(0, mediaAudioEl.currentTime - 10);
    });
  }

  if (btnAudioForward && mediaAudioEl) {
    btnAudioForward.addEventListener('click', () => {
      if (mediaAudioEl.duration) {
        mediaAudioEl.currentTime = Math.min(mediaAudioEl.duration, mediaAudioEl.currentTime + 10);
      }
    });
  }

  if (btnAudioSpeed && mediaAudioEl) {
    btnAudioSpeed.addEventListener('click', () => {
      mediaState.speedIndex = (mediaState.speedIndex + 1) % mediaState.playbackSpeeds.length;
      const spd = mediaState.playbackSpeeds[mediaState.speedIndex];
      mediaAudioEl.playbackRate = spd;
      btnAudioSpeed.textContent = `${spd}x`;
      showToast(`Kecepatan putar: ${spd}x`, 'info', 1200);
    });
  }

  if (btnAudioLoop) {
    btnAudioLoop.addEventListener('click', () => {
      mediaState.isLooping = !mediaState.isLooping;
      btnAudioLoop.classList.toggle('active', mediaState.isLooping);
      showToast(mediaState.isLooping ? 'Pengulangan aktif (Loop)' : 'Pengulangan nonaktif', 'info', 1400);
    });
  }

  // Photo Viewer Actions
  if (btnPhotoZoomIn) {
    btnPhotoZoomIn.addEventListener('click', () => {
      mediaState.zoomLevel = Math.min(mediaState.zoomLevel + 0.25, 4.0);
      updatePhotoTransform();
    });
  }

  if (btnPhotoZoomOut) {
    btnPhotoZoomOut.addEventListener('click', () => {
      mediaState.zoomLevel = Math.max(mediaState.zoomLevel - 0.25, 0.5);
      updatePhotoTransform();
    });
  }

  if (btnPhotoRotate) {
    btnPhotoRotate.addEventListener('click', () => {
      mediaState.rotateDeg = (mediaState.rotateDeg + 90) % 360;
      updatePhotoTransform();
    });
  }

  if (btnPhotoReset) {
    btnPhotoReset.addEventListener('click', () => {
      mediaState.zoomLevel = 1.0;
      mediaState.rotateDeg = 0;
      updatePhotoTransform();
    });
  }

  // Header and Modal Control Actions
  if (btnMediaPip) btnMediaPip.addEventListener('click', triggerPictureInPicture);
  if (btnMediaMinimize) btnMediaMinimize.addEventListener('click', minimizeToMiniPlayer);
  if (btnMediaFullscreen) btnMediaFullscreen.addEventListener('click', toggleMediaFullscreen);
  if (btnCloseMediaModal) btnCloseMediaModal.addEventListener('click', closeMediaPlayer);

  // Floating Mini-Player Actions
  if (btnMiniPlayPause) {
    btnMiniPlayPause.addEventListener('click', (e) => {
      e.stopPropagation();
      if (mediaState.mediaType === 'video' && mediaVideoEl) {
        if (mediaVideoEl.paused) mediaVideoEl.play();
        else mediaVideoEl.pause();
      } else if (mediaState.mediaType === 'audio' && mediaAudioEl) {
        if (mediaAudioEl.paused) mediaAudioEl.play();
        else mediaAudioEl.pause();
      }
    });
  }

  if (btnMiniExpand) {
    btnMiniExpand.addEventListener('click', (e) => {
      e.stopPropagation();
      restoreFromMiniPlayer();
    });
  }

  if (mediaMiniPlayer) {
    mediaMiniPlayer.addEventListener('click', (e) => {
      if (e.target.closest('.btn-mini-action')) return;
      restoreFromMiniPlayer();
    });
  }

  if (btnMiniClose) {
    btnMiniClose.addEventListener('click', (e) => {
      e.stopPropagation();
      closeMediaPlayer();
    });
  }

  // Android Hardware Backbutton handler
  document.addEventListener('backbutton', (e) => {
    if (mediaPlayerModal && mediaPlayerModal.classList.contains('active')) {
      e.preventDefault();
      closeMediaPlayer();
    }
  });

  // ----------------------------------------------------
  // Automatic Clipboard GoFile Link Detector Engine
  // ----------------------------------------------------
  const GOFILE_CLIP_REGEX = /https?:\/\/(?:www\.)?gofile\.io\/d\/([a-zA-Z0-9_-]+)/i;
  let lastDetectedClipUrl = '';
  let clipBannerDismissTimeout = null;
  const dismissedClipUrls = new Set(JSON.parse(sessionStorage.getItem('gf_dismissed_clip_urls') || '[]'));

  async function checkClipboardForGoFile() {
    if (mediaPlayerModal && mediaPlayerModal.classList.contains('active')) return;
    if (!window.ApiBridge || typeof window.ApiBridge.readClipboard !== 'function') return;

    try {
      const text = await ApiBridge.readClipboard();
      if (!text || typeof text !== 'string') return;
      const trimmed = text.trim();
      const match = trimmed.match(GOFILE_CLIP_REGEX);
      if (!match) return;

      const detectedUrl = match[0];
      if (detectedUrl === lastDetectedClipUrl) return;
      if (dismissedClipUrls.has(detectedUrl)) return;
      if (singleUrlInput && singleUrlInput.value.trim() === detectedUrl) return;

      lastDetectedClipUrl = detectedUrl;
      showClipboardBanner(detectedUrl);
    } catch (err) {
      // Non-fatal
    }
  }

  function showClipboardBanner(url) {
    if (!clipboardDetectBanner) return;
    if (clipboardBannerUrl) {
      clipboardBannerUrl.textContent = url;
      clipboardBannerUrl.title = url;
    }
    clipboardDetectBanner.style.display = 'block';
    clearTimeout(clipBannerDismissTimeout);
    clipBannerDismissTimeout = setTimeout(() => {
      hideClipboardBanner();
    }, 12000);
  }

  function hideClipboardBanner() {
    clearTimeout(clipBannerDismissTimeout);
    if (clipboardDetectBanner) {
      clipboardDetectBanner.style.display = 'none';
    }
  }

  if (btnClipboardExplore) {
    btnClipboardExplore.addEventListener('click', () => {
      const url = lastDetectedClipUrl || clipboardBannerUrl?.textContent || '';
      hideClipboardBanner();
      if (url) {
        dismissedClipUrls.add(url);
        try { sessionStorage.setItem('gf_dismissed_clip_urls', JSON.stringify([...dismissedClipUrls])); } catch (e) {}
        if (singleUrlInput) {
          singleUrlInput.value = url;
          singleUrlInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const homeTabBtn = document.querySelector('[data-tab="home"]');
        if (homeTabBtn) homeTabBtn.click();
        if (btnInspectUrl) {
          setTimeout(() => btnInspectUrl.click(), 100);
        }
      }
    });
  }

  if (btnClipboardDismiss) {
    btnClipboardDismiss.addEventListener('click', () => {
      const url = lastDetectedClipUrl || clipboardBannerUrl?.textContent || '';
      if (url) {
        dismissedClipUrls.add(url);
        try { sessionStorage.setItem('gf_dismissed_clip_urls', JSON.stringify([...dismissedClipUrls])); } catch (e) {}
      }
      hideClipboardBanner();
    });
  }

  window.addEventListener('focus', () => setTimeout(checkClipboardForGoFile, 600));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      setTimeout(checkClipboardForGoFile, 600);
    }
  });
  setTimeout(checkClipboardForGoFile, 1200);

  // Initialize AdNetworkEngine for Monetization
  if (window.AdNetworkEngine && typeof window.AdNetworkEngine.init === 'function') {
    window.AdNetworkEngine.init();
  }

  // Expose openMediaPlayer globally
  window.openMediaPlayer = openMediaPlayer;
});

