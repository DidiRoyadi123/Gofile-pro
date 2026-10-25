/**
 * GoFile Pro Downloader - Core UI Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const CURRENT_VERSION = 'v2.2.5';

  // State Management
  const state = {
    activeTab: 'tab-home',
    queue: [],         // Active / Queued items
    history: [],       // Completed items
    concurrentMax: parseInt(localStorage.getItem('gf_workers') || '5', 10),
    downloadDir: localStorage.getItem('gf_download_dir') || './downloads',
    notificationMode: localStorage.getItem('gf_notif_mode') || 'summary_only',
    sessionBatchTotal: 0,
    sessionBatchCompleted: 0,
    activeWorkersCount: 0,
    totalDownloadedBytes: 0,
    inspectedData: null,
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
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const openSettingsHeaderBtn = document.getElementById('open-settings-header-btn');

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

    toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
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
          showToast('Link berhasil ditempel.', 'info', 1500);
        } else {
          showToast('Clipboard kosong atau belum ada link yang disalin.', 'warning', 2000);
        }
      } catch (err) {
        console.warn('Paste URL error:', err);
        showToast('Gagal membaca clipboard.', 'error', 2000);
      }
    });
  }

  const btnClearUrl = document.getElementById('btn-clear-url');
  if (btnClearUrl) {
    debounceClick(btnClearUrl, () => {
      singleUrlInput.value = '';
      singleUrlInput.focus();
      showToast('Input link berhasil dibersihkan.', 'info', 1500);
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
      showToast('Masukkan link GoFile atau Content ID terlebih dahulu', 'error');
      return;
    }

    const password = singlePwInput.value.trim();
    btnInspectUrl.disabled = true;
    btnInspectUrl.innerHTML = `<span class="spin-ring" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:6px;"></span> Exploring...`;

    try {
      showToast('Menghubungi server GoFile... (Pastikan VPN/WARP aktif jika diblokir ISP)', 'info', 3500);

      const fetchPromise = ApiBridge.inspectContent(url, password);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Koneksi timeout (10 detik). Di Indonesia, GoFile sering diblokir ISP (IndiHome/Telkomsel). Silakan aktifkan VPN atau 1.1.1.1 (WARP) di HP/PC Anda.'));
        }, 10000);
      });

      const data = await Promise.race([fetchPromise, timeoutPromise]);
      state.inspectedData = data;

      if (!data.files || data.files.length === 0) {
        showToast('Tidak ada file ditemukan dalam folder ini', 'error');
        return;
      }

      openInspectionModal(data);
    } catch (err) {
      const msg = err.message || String(err);
      if (msg.includes('PASSWORD')) {
        showToast('Link ini memerlukan password!', 'error');
        singlePwInput.focus();
      } else if (msg.includes('429') || msg.includes('Rate Limit') || msg.includes('error-rateLimit') || msg.includes('Too Many Requests')) {
        showToast('IP Anda dibatasi sementara oleh GoFile (HTTP 429: Rate Limit). Aktifkan Mode Pesawat di HP selama 3 detik lalu matikan lagi untuk ganti IP baru!', 'error', 9000);
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
      showToast('Masukkan link GoFile atau Content ID terlebih dahulu', 'error');
      return;
    }

    const password = singlePwInput.value.trim();
    btnQuickDownload.disabled = true;
    btnQuickDownload.innerHTML = `<span class="spin-ring" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:6px;"></span> Mengambil file...`;

    try {
      showToast('Mengambil daftar semua file...', 'info', 3000);

      const fetchPromise = ApiBridge.inspectContent(url, password);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Koneksi timeout. Pastikan VPN atau 1.1.1.1 WARP aktif jika provider memblokir GoFile.'));
        }, 10000);
      });

      const data = await Promise.race([fetchPromise, timeoutPromise]);
      if (data && data.files && data.files.length > 0) {
        enqueueFiles(data.files);
        showToast(`Berhasil menambahkan ${data.files.length} file ke antrean!`, 'success');
        showDownloadsTab('queue');
      } else {
        showToast('Tidak ada file yang dapat diunduh.', 'error');
      }
    } catch (err) {
      const msg = err.message || String(err);
      if (msg.includes('429') || msg.includes('Rate Limit') || msg.includes('error-rateLimit') || msg.includes('Too Many Requests')) {
        showToast('IP Anda dibatasi sementara oleh GoFile (HTTP 429: Rate Limit). Aktifkan Mode Pesawat di HP selama 3 detik lalu matikan lagi untuk ganti IP baru!', 'error', 9000);
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

  function isDocOrArchiveFile(fileOrName) {
    if (!fileOrName) return false;
    const name = typeof fileOrName === 'string' ? fileOrName : (fileOrName.name || fileOrName.filename || '');
    return DOC_EXTS.has(getFileExt(name));
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
  function openInspectionModal(data) {
    const cId = data.contentId || data.content_id || 'Files';
    const totalCount = data.totalFiles ?? data.total_files ?? (data.files ? data.files.length : 0);
    const totalBytes = data.totalSize ?? data.total_size ?? 0;
    modalFolderTitle.textContent = `Content: ${cId}`;
    modalFolderSubtitle.textContent = `${totalCount} files • Total: ${formatBytes(totalBytes)}`;
    modalFileList.innerHTML = '';
    state.selectedItemIds.clear();

    // Calculate category counts
    const videoFiles = data.files.filter(f => isVideoFile(f));
    const photoFiles = data.files.filter(f => isPhotoFile(f));
    const audioFiles = data.files.filter(f => isAudioFile(f));

    if (chipCountAll) chipCountAll.textContent = data.files.length;
    if (chipCountVideo) chipCountVideo.textContent = videoFiles.length;
    if (chipCountPhoto) chipCountPhoto.textContent = photoFiles.length;
    if (chipCountAudio) chipCountAudio.textContent = audioFiles.length;
    setActiveChip(btnChipAll);

    data.files.forEach(file => {
      state.selectedItemIds.add(file.id);

      const isVid = isVideoFile(file);
      const isImg = isPhotoFile(file);
      const isAud = isAudioFile(file);
      const typeBadge = isVid ? '🎬 [VIDEO]' : (isImg ? '🖼️ [FOTO]' : (isAud ? '🎵 [AUDIO]' : ''));

      const isAlreadyStored = state.storedFiles && state.storedFiles.some(sf => {
        if (sf.name !== file.name) return false;
        if (file.size && sf.size) return sf.size === file.size;
        return true;
      });
      const storedBadge = isAlreadyStored
        ? `<span style="font-size:0.68rem; padding:2px 6px; border-radius:4px; background:rgba(16,185,129,0.15); color:#10b981; font-weight:600; margin-left:6px;" title="File sudah ada di penyimpanan lokal">✓ Sudah Diunduh</span>`
        : '';

      const itemEl = document.createElement('div');
      itemEl.className = 'tree-item';
      itemEl.dataset.fileId = file.id;
      itemEl.dataset.isVid = isVid ? '1' : '0';
      itemEl.dataset.isImg = isImg ? '1' : '0';
      itemEl.dataset.isAud = isAud ? '1' : '0';
      itemEl.innerHTML = `
        <input type="checkbox" id="check-${escapeHtml(file.id)}" checked>
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

      const cb = itemEl.querySelector('input[type="checkbox"]');
      cb.addEventListener('change', () => {
        if (cb.checked) {
          state.selectedItemIds.add(file.id);
        } else {
          state.selectedItemIds.delete(file.id);
        }
        updateModalSelectionCount();
      });

      modalFileList.appendChild(itemEl);
    });

    modalSelectAll.checked = true;
    updateModalSelectionCount();
    inspectionModal.classList.add('open');
  }

  function updateModalSelectionCount() {
    const count = state.selectedItemIds.size;
    const total = state.inspectedData ? state.inspectedData.files.length : 0;
    let selectedBytes = 0;
    if (state.inspectedData && state.inspectedData.files) {
      state.inspectedData.files.forEach(f => {
        if (state.selectedItemIds.has(f.id)) {
          selectedBytes += (f.size || 0);
        }
      });
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
      state.selectedItemIds.clear();
      if (state.inspectedData && state.inspectedData.files) {
        state.inspectedData.files.forEach(f => {
          state.selectedItemIds.add(f.id);
          const cb = document.getElementById(`check-${f.id}`);
          if (cb) cb.checked = true;
        });
      }
      updateModalSelectionCount();
    });
  }

  // Chip 2: Pilih Hanya Video
  if (btnChipVideo) {
    btnChipVideo.addEventListener('click', () => {
      setActiveChip(btnChipVideo);
      state.selectedItemIds.clear();
      let vidCount = 0;
      if (state.inspectedData && state.inspectedData.files) {
        state.inspectedData.files.forEach(f => {
          const isVid = isVideoFile(f);
          const cb = document.getElementById(`check-${f.id}`);
          if (cb) cb.checked = isVid;
          if (isVid) {
            state.selectedItemIds.add(f.id);
            vidCount++;
          }
        });
      }
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
      state.selectedItemIds.clear();
      let imgCount = 0;
      if (state.inspectedData && state.inspectedData.files) {
        state.inspectedData.files.forEach(f => {
          const isImg = isPhotoFile(f);
          const cb = document.getElementById(`check-${f.id}`);
          if (cb) cb.checked = isImg;
          if (isImg) {
            state.selectedItemIds.add(f.id);
            imgCount++;
          }
        });
      }
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
      state.selectedItemIds.clear();
      let audCount = 0;
      if (state.inspectedData && state.inspectedData.files) {
        state.inspectedData.files.forEach(f => {
          const isAud = isAudioFile(f);
          const cb = document.getElementById(`check-${f.id}`);
          if (cb) cb.checked = isAud;
          if (isAud) {
            state.selectedItemIds.add(f.id);
            audCount++;
          }
        });
      }
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
    const checkboxes = modalFileList.querySelectorAll('input[type="checkbox"]');
    state.selectedItemIds.clear();
    checkboxes.forEach(cb => {
      cb.checked = checked;
      if (checked) {
        const id = cb.id.replace('check-', '');
        state.selectedItemIds.add(id);
      }
    });
    if (checked) {
      setActiveChip(btnChipAll);
    } else {
      setActiveChip(btnChipNone);
    }
    updateModalSelectionCount();
  });

  function closeModal() {
    inspectionModal.classList.remove('open');
  }

  btnCloseModal.addEventListener('click', closeModal);
  btnCancelModal.addEventListener('click', closeModal);

  btnConfirmDownloadModal.addEventListener('click', () => {
    if (!state.inspectedData || state.selectedItemIds.size === 0) {
      showToast('Pilih setidaknya 1 file untuk diunduh', 'error');
      return;
    }

    const selectedFiles = state.inspectedData.files.filter(f => state.selectedItemIds.has(f.id));
    enqueueFiles(selectedFiles, true);
    closeModal();
    showToast(`Berhasil menambahkan ${selectedFiles.length} file ke antrean!`, 'success');
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

    files.forEach(file => {
      // 1. Prevent duplicate if already in active queue
      if (state.queue.some(q => q.id === file.id && (q.status === 'downloading' || q.status === 'queued'))) {
        skippedExisting++;
        return;
      }

      // 2. Anti-duplikat: periksa apakah file sudah tersimpan di memori/disk
      if (!allowAlreadyStored) {
        const alreadyStored = state.storedFiles && state.storedFiles.some(sf => {
          if (sf.name !== file.name) return false;
          if (file.size && sf.size) return sf.size === file.size;
          return true;
        });

        if (alreadyStored) {
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

    toEnqueue.forEach(file => {
      const queueItem = {
        id: file.id,
        name: file.name,
        relDir: file.relDir || file.rel_dir || '',
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
      renderQueueItem(queueItem);
    });

    updateQueueCounters();
    processQueue();
  }

  function renderQueueItem(item) {
    if (queueEmptyState) queueEmptyState.style.display = 'none';

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
          <span class="status-badge queued" id="badge-${item.id}">Queued</span>
          <button class="btn-icon" style="width:32px; height:32px;" id="btn-cancel-${item.id}" title="Remove from queue">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <div class="progress-track">
        <div class="progress-fill" id="pfill-${item.id}" style="width: 0%;"></div>
      </div>

      <div class="queue-meta-row">
        <div class="meta-stats">
          <span id="speed-${item.id}">0.0 B/s</span>
          <span id="bytes-${item.id}">0 B / ${formatBytes(item.size)}</span>
        </div>
        <div id="pct-${item.id}" style="font-weight:600; color:var(--text-primary);">0%</div>
      </div>
    `;

    const cancelBtn = card.querySelector(`#btn-cancel-${item.id}`);
    cancelBtn.addEventListener('click', () => {
      cancelQueueItem(item.id);
    });

    item.domElement = card;
    queueContainer.appendChild(card);
    reorderQueueDom();
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
    item.status = 'downloading';
    state.activeWorkersCount++;
    updateQueueCounters();

    const card = item.domElement;
    if (card) {
      card.classList.add('active-download');
      const badge = card.querySelector(`#badge-${item.id}`);
      if (badge) {
        badge.className = 'status-badge downloading';
        badge.textContent = 'Downloading';
      }
      reorderQueueDom();
    }

    try {
      const success = await ApiBridge.downloadItem(item, state.downloadDir, (prog) => {
        updateItemProgress(prog);
      });

      if (success) {
        markItemCompleted(item);
      } else {
        markItemFailed(item, 'Download incomplete or interrupted');
      }
    } catch (err) {
      markItemFailed(item, err.message);
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

    if (prog && prog.alreadyExists) {
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
            <div class="file-subpath">${item.relDir ? `/${escapeHtml(item.relDir)}` : 'Root'} • ${formatBytes(item.size)}</div>
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
      const opened = await ApiBridge.openFile(fullPath, item);
      if (!opened) {
        showToast(`Tidak dapat membuka: ${item.name}`, 'error', 3000);
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
        const badge = document.getElementById(`badge-${q.id}`);
        if (badge) {
          badge.className = 'status-badge queued';
          badge.textContent = 'Paused';
        }
      }
    });
    state.activeWorkersCount = 0;
    updateQueueCounters();
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

  // Android Storage Permission & Battery Optimization Actions
  if (btnRequestStoragePerm) {
    btnRequestStoragePerm.addEventListener('click', async () => {
      showToast('Membuka pengaturan izin akses penyimpanan...', 'info', 2000);
      await ApiBridge.requestStoragePermissions();
      setTimeout(loadStoredFiles, 1200);
    });
  }

  if (btnSettingsStoragePerm) {
    btnSettingsStoragePerm.addEventListener('click', async () => {
      showToast('Membuka pengaturan izin akses file...', 'info', 2000);
      await ApiBridge.requestStoragePermissions();
      setTimeout(loadStoredFiles, 1200);
    });
  }

  if (btnRequestBatteryOpt) {
    btnRequestBatteryOpt.addEventListener('click', async () => {
      showToast('Membuka pengaturan optimasi baterai (Unrestricted)...', 'info', 2000);
      await ApiBridge.requestIgnoreBatteryOptimizations();
      setTimeout(loadStoredFiles, 1200);
    });
  }

  // Auto-refresh when app regains focus (e.g. returning from Android system settings)
  window.addEventListener('focus', () => {
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
      const opened = await ApiBridge.openFile(fullPath, file);
      if (!opened) {
        showToast(`Membuka "${file.name}"...`, 'info', 1800);
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

    if (updateModal && (updateModal.classList.contains('active') || updateModal.classList.contains('open'))) {
      updateModal.classList.remove('active');
      updateModal.classList.remove('open');
      return true;
    }
    if (inspectionModal && (inspectionModal.classList.contains('active') || inspectionModal.classList.contains('open'))) {
      closeModal();
      return true;
    }
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
        mimetype: platInfo.isAndroid ? 'application/vnd.android.package-archive' : 'application/octet-stream'
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
});
