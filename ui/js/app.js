/**
 * GoFile Pro Downloader - Core UI Controller
 */

document.addEventListener('DOMContentLoaded', () => {
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
    selectedItemIds: new Set()
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
  const btnOpenFolderQueue = document.getElementById('btn-open-folder-queue');
  const btnOpenFolderHistory = document.getElementById('btn-open-folder-history');
  const btnClearQueue = document.getElementById('btn-clear-queue');
  const btnClearHistory = document.getElementById('btn-clear-history');

  // Header Live Indicator
  const headerDownloadIndicator = document.getElementById('header-download-indicator');
  const headerDownloadText = document.getElementById('header-download-text');

  // Settings Elements
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
  const btnChipNone = document.getElementById('btn-chip-none');
  const chipCountAll = document.getElementById('chip-count-all');
  const chipCountVideo = document.getElementById('chip-count-video');
  const chipCountPhoto = document.getElementById('chip-count-photo');

  // Load Saved Settings into Form
  settingDownloadDir.value = state.downloadDir;
  settingWorkers.value = state.concurrentMax;
  valWorkers.textContent = state.concurrentMax;
  settingToken.value = localStorage.getItem('gf_token') || '';
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

  function updateHeaderDownloadIndicator() {
    if (!headerDownloadIndicator || !headerDownloadText) return;

    const activeOrQueued = state.queue.filter(q => q.status === 'downloading' || q.status === 'queued').length;
    if (activeOrQueued > 0) {
      headerDownloadIndicator.classList.add('active');
      headerDownloadText.textContent = `Unduh (${state.sessionBatchCompleted}/${state.sessionBatchTotal})`;
    } else if (state.sessionBatchTotal > 0 && state.sessionBatchCompleted > 0) {
      headerDownloadIndicator.classList.add('active');
      headerDownloadText.textContent = 'Selesai ✓';
      setTimeout(() => {
        const stillActive = state.queue.filter(q => q.status === 'downloading' || q.status === 'queued').length;
        if (stillActive === 0) {
          headerDownloadIndicator.classList.remove('active');
          state.sessionBatchTotal = 0;
          state.sessionBatchCompleted = 0;
        }
      }, 4000);
    } else {
      headerDownloadIndicator.classList.remove('active');
    }
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
      const CURRENT_VERSION = '2.0.0';
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
    btnPasteUrl.addEventListener('click', async () => {
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
    btnClearUrl.addEventListener('click', () => {
      singleUrlInput.value = '';
      singleUrlInput.focus();
      showToast('Input link berhasil dibersihkan.', 'info', 1500);
    });
  }

  const btnPasteBatch = document.getElementById('btn-paste-batch');
  const btnClearBatch = document.getElementById('btn-clear-batch');

  if (btnPasteBatch) {
    btnPasteBatch.addEventListener('click', async () => {
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
    btnClearBatch.addEventListener('click', () => {
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
  // File Type Helpers for Filtering
  // ----------------------------------------------------
  const VIDEO_EXTS = new Set(['mp4', 'mkv', 'webm', 'avi', 'mov', 'flv', 'wmv', 'm4v', '3gp', 'ts', 'mpg', 'mpeg']);
  const PHOTO_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg', 'heic', 'heif', 'tiff', 'ico', 'avif']);

  function getFileExt(filename) {
    if (!filename) return '';
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(lastDot + 1).toLowerCase() : '';
  }

  function isVideoFile(filename) {
    return VIDEO_EXTS.has(getFileExt(filename));
  }

  function isPhotoFile(filename) {
    return PHOTO_EXTS.has(getFileExt(filename));
  }

  function setActiveChip(activeBtn) {
    [btnChipAll, btnChipVideo, btnChipPhoto, btnChipNone].forEach(btn => {
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
    const videoFiles = data.files.filter(f => isVideoFile(f.name));
    const photoFiles = data.files.filter(f => isPhotoFile(f.name));

    if (chipCountAll) chipCountAll.textContent = data.files.length;
    if (chipCountVideo) chipCountVideo.textContent = videoFiles.length;
    if (chipCountPhoto) chipCountPhoto.textContent = photoFiles.length;
    setActiveChip(btnChipAll);

    data.files.forEach(file => {
      state.selectedItemIds.add(file.id);

      const isVid = isVideoFile(file.name);
      const isImg = isPhotoFile(file.name);
      const typeBadge = isVid ? '🎬 [VIDEO]' : isImg ? '🖼️ [FOTO]' : '';

      const itemEl = document.createElement('div');
      itemEl.className = 'tree-item';
      itemEl.dataset.fileId = file.id;
      itemEl.dataset.isVid = isVid ? '1' : '0';
      itemEl.dataset.isImg = isImg ? '1' : '0';
      itemEl.innerHTML = `
        <input type="checkbox" id="check-${escapeHtml(file.id)}" checked>
        <div style="color:var(--indigo-400); display:flex; align-items:center;">
          ${getFileIcon(file.name)}
        </div>
        <div class="tree-item-name" title="${escapeHtml(file.name)}">
          ${escapeHtml(file.name)}
          ${typeBadge ? `<span style="font-size:0.7rem; font-weight:600; color:var(--cyan-400); margin-left:6px;">${typeBadge}</span>` : ''}
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
      btnConfirmDownloadModal.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12l7 7 7-7"/>
        </svg>
        Download ${count > 0 ? `${count} File (${formatBytes(selectedBytes)})` : 'Selected'}
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
          const isVid = isVideoFile(f.name);
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
          const isImg = isPhotoFile(f.name);
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
    enqueueFiles(selectedFiles);
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
  function enqueueFiles(files) {
    let skippedExisting = 0;
    const toEnqueue = [];

    files.forEach(file => {
      // 1. Prevent duplicate in active queue
      if (state.queue.some(q => q.id === file.id && q.status !== 'failed')) {
        return;
      }

      // 2. Skip file if already completed / in history or present in local storage
      const alreadyCompleted = state.history.some(h => 
        h.id === file.id || (h.name === file.name && h.size > 0 && file.size > 0 && h.size === file.size)
      ) || (state.storedFiles && state.storedFiles.some(s => 
        s.name === file.name && s.size > 0 && file.size > 0 && s.size === file.size
      ));

      if (alreadyCompleted) {
        skippedExisting++;
        return;
      }

      toEnqueue.push(file);
    });

    if (skippedExisting > 0) {
      showToast(`${skippedExisting} file dilewati karena sudah pernah selesai diunduh.`, 'info', 4000);
    }

    if (toEnqueue.length === 0) {
      if (skippedExisting > 0) {
        showToast('Semua file dalam daftar sudah pernah diunduh sebelumnya!', 'success', 3500);
      }
      return;
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

    if (state.queue.length === 0 && queueEmptyState) {
      queueEmptyState.style.display = 'block';
    }
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
    const card = item.domElement;
    if (card) {
      card.classList.remove('active-download');
      const badge = card.querySelector(`#badge-${item.id}`);
      if (badge) {
        badge.className = 'status-badge failed';
        badge.textContent = 'Gagal';
      }
      const speedEl = card.querySelector(`#speed-${item.id}`);
      if (speedEl) speedEl.textContent = msg || 'Error';
      reorderQueueDom();
    }
    // Failure notifications are always helpful but kept discreet
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
    btnStartAllQueue.addEventListener('click', () => {
      let resumed = 0;
      state.queue.forEach(q => {
        if (q.status === 'paused' || q.status === 'failed') {
          q.status = 'queued';
          resumed++;
          const badge = document.getElementById(`badge-${q.id}`);
          if (badge) {
            badge.className = 'status-badge queued';
            badge.textContent = 'Queued';
          }
        }
      });
      updateQueueCounters();
      processQueue();
      showToast(resumed > 0 ? `Melanjutkan ${resumed} unduhan...` : 'Semua unduhan aktif', 'info', 2000);
    });
  }

  btnPauseAll.addEventListener('click', () => {
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
    btnOpenFolderQueue.addEventListener('click', openDownloadsDirectory);
  }

  if (btnOpenFolderHistory) {
    btnOpenFolderHistory.addEventListener('click', openDownloadsDirectory);
  }

  btnClearQueue.addEventListener('click', () => {
    ApiBridge.stopAll();
    state.queue.forEach(q => {
      q.status = 'cancelled';
      q.speed = 0;
      if (q.domElement) q.domElement.remove();
    });
    state.queue = [];
    state.activeWorkersCount = 0;
    updateQueueCounters();
    updateGlobalMetrics();
    showToast('Queue cleared', 'info');
  });

  btnClearHistory.addEventListener('click', () => {
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

  btnChooseFolder.addEventListener('click', async () => {
    const chosen = await ApiBridge.chooseFolder();
    if (chosen) {
      settingDownloadDir.value = chosen;
      showToast(`Selected directory: ${chosen}`, 'info');
    } else {
      showToast('Native folder picker is available when running the desktop app', 'info');
    }
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
      document.getElementById('account-tier-text').textContent = 'Account VIP';
    } else {
      localStorage.removeItem('gf_token');
      document.getElementById('account-tier-text').textContent = 'Guest Session';
    }

    showToast('Pengaturan berhasil disimpan', 'success', 2500);
  });

  // ----------------------------------------------------
  // Kelola File (Storage Manager & Duplicate Prevention Hub)
  // ----------------------------------------------------
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
  const chipFileOther = document.getElementById('chip-file-other');
  const chipStoredCountAll = document.getElementById('chip-stored-count-all');
  const chipStoredCountVideo = document.getElementById('chip-stored-count-video');
  const chipStoredCountPhoto = document.getElementById('chip-stored-count-photo');
  const chipStoredCountOther = document.getElementById('chip-stored-count-other');
  const btnClearFileSearch = document.getElementById('btn-clear-file-search');

  state.storedFiles = [];
  state.storedFilesFilter = 'all';
  state.storedFilesSearch = '';

  async function loadStoredFiles() {
    try {
      const nativeFiles = await ApiBridge.listDownloadedFiles(state.downloadDir);
      const mergedMap = new Map();

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
    [chipFileAll, chipFileVideo, chipFilePhoto, chipFileOther].forEach(btn => {
      if (btn) btn.classList.toggle('active', btn === activeBtn);
    });
    state.storedFilesFilter = filterType;
    renderStoredFiles();
  }

  if (chipFileAll) chipFileAll.addEventListener('click', () => setFileFilterChip(chipFileAll, 'all'));
  if (chipFileVideo) chipFileVideo.addEventListener('click', () => setFileFilterChip(chipFileVideo, 'video'));
  if (chipFilePhoto) chipFilePhoto.addEventListener('click', () => setFileFilterChip(chipFilePhoto, 'photo'));
  if (chipFileOther) chipFileOther.addEventListener('click', () => setFileFilterChip(chipFileOther, 'other'));

  if (searchFilesInput) {
    searchFilesInput.addEventListener('input', (e) => {
      state.storedFilesSearch = e.target.value;
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

  function renderStoredFiles() {
    if (!filesListContainer) return;

    const all = state.storedFiles || [];

    // Update filter counts
    if (chipStoredCountAll) chipStoredCountAll.textContent = all.length;
    if (chipStoredCountVideo) chipStoredCountVideo.textContent = all.filter(f => isVideoFile(f.name)).length;
    if (chipStoredCountPhoto) chipStoredCountPhoto.textContent = all.filter(f => isPhotoFile(f.name)).length;
    if (chipStoredCountOther) chipStoredCountOther.textContent = all.filter(f => !isVideoFile(f.name) && !isPhotoFile(f.name)).length;

    let filtered = all;

    // Filter by type
    if (state.storedFilesFilter === 'video') {
      filtered = filtered.filter(f => isVideoFile(f.name));
    } else if (state.storedFilesFilter === 'photo') {
      filtered = filtered.filter(f => isPhotoFile(f.name));
    } else if (state.storedFilesFilter === 'other') {
      filtered = filtered.filter(f => !isVideoFile(f.name) && !isPhotoFile(f.name));
    }

    // Filter by search
    if (state.storedFilesSearch.trim()) {
      const q = state.storedFilesSearch.trim().toLowerCase();
      filtered = filtered.filter(f => f.name.toLowerCase().includes(q));
    }

    // Sort by recent
    filtered.sort((a, b) => (b.modified || 0) - (a.modified || 0));

    // Stats
    const totalCount = all.length;
    const totalBytes = all.reduce((acc, f) => acc + (f.size || 0), 0);
    if (storageTotalFilesEl) storageTotalFilesEl.textContent = `${totalCount} file`;
    if (storageTotalSizeEl) storageTotalSizeEl.textContent = formatBytes(totalBytes);
    if (storedFilesCountEl) storedFilesCountEl.textContent = totalCount;

    filesListContainer.innerHTML = '';

    if (filtered.length === 0) {
      if (filesEmptyState) {
        filesListContainer.appendChild(filesEmptyState);
        filesEmptyState.style.display = 'block';
      }
      return;
    }

    if (filesEmptyState) filesEmptyState.style.display = 'none';

    filtered.forEach(file => {
      const card = document.createElement('div');
      card.className = 'stored-file-card';
      const isVideo = isVideoFile(file.name);
      const isPhoto = isPhotoFile(file.name);
      const iconClass = isVideo ? 'video' : (isPhoto ? 'photo' : 'archive');
      const iconEmoji = isVideo ? '🎬' : (isPhoto ? '🖼️' : '📦');
      const actionLabel = isVideo ? 'Buka' : (isPhoto ? 'Lihat' : 'Buka');

      const dateStr = file.modified ? new Date(file.modified).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';
      const subpath = file.relDir ? `/${file.relDir}` : 'GoFile';

      card.innerHTML = `
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
          <button type="button" class="btn-delete-stored-touch" title="Hapus file dari memori">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      `;

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
        if (e.target.closest('.btn-delete-stored-touch')) return;
        handleOpenFile();
      });

      card.querySelector('.btn-open-stored-touch')?.addEventListener('click', (e) => {
        e.stopPropagation();
        handleOpenFile();
      });

      card.querySelector('.btn-delete-stored-touch')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm(`Hapus "${file.name}" dari penyimpanan perangkat?`)) return;

        await ApiBridge.deleteFile(file);
        state.storedFiles = state.storedFiles.filter(f => f.name !== file.name);
        state.history = state.history.filter(h => h.name !== file.name);
        saveHistory();
        renderStoredFiles();
        updateQueueCounters();
        showToast(`"${file.name}" dihapus dari memori.`, 'success', 2500);
      });

      filesListContainer.appendChild(card);
    });
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

  // Initial load of stored files
  loadStoredFiles();
});
