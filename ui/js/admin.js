/**
 * GoFile Pro Admin Dashboard Controller
 * Version: 2.4.1 (Synchronized)
 */

(function () {
  'use strict';

  // Default Mock Telemetry & Analytics State
  const defaultAnalytics = {
    activeDevices: 1428,
    todayDownloads: 14892,
    todayBandwidthTB: 48.6,
    successRate: 99.4,
    osDistribution: [
      { name: 'Android 14 (HyperOS / OneUI 6)', pct: 42 },
      { name: 'Android 13', pct: 35 },
      { name: 'Android 12 & Lower', pct: 15 },
      { name: 'Windows Desktop', pct: 8 }
    ],
    ispDistribution: [
      { name: 'Telkomsel Mobile', pct: 38 },
      { name: 'IndiHome Fiber', pct: 29 },
      { name: 'XL Axiata', pct: 18 },
      { name: 'Indosat / Tri', pct: 11 },
      { name: 'Biznet / Lainnya', pct: 4 }
    ],
    ipBlocksMitigated: 142
  };

  // Remote Config State
  let remoteConfig = {
    version: '2.4.1',
    updatedAt: new Date().toISOString(),
    announcement: {
      enabled: false,
      level: 'info', // info, warning, urgent
      title: 'Pengumuman Penting',
      message: 'GoFile Pro v2.4.1 telah dirilis dengan Serverless GitHub Ad Engine & Pemutar ExoVideoView!',
      actionUrl: ''
    },
    ads: {
      enabled: true,
      directLink: {
        enabled: true,
        provider: 'adsterra',
        url: 'https://www.profitablecpmrate.com/example_smartlink',
        frequencyMinutes: 15,
        triggerOnDownload: true,
        triggerOnVideoPlay: false,
        targetPlatforms: 'all'
      },
      celebrationModal: {
        enabled: true,
        provider: 'monetag',
        title: 'Cloudflare WARP 1.1.1.1',
        sponsor: 'Sponsor GoFile Pro',
        desc: 'Bypass pembatasan jaringan & nikmati kecepatan download penuh tanpa batas kuota ISP!',
        bannerImg: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
        actionText: 'Pasang Gratis ⚡',
        actionUrl: 'https://1.1.1.1/',
        frequencyMinutes: 10
      },
      socialBar: {
        enabled: true,
        icon: '⚡',
        text: 'Bypass Limit ISP: Aktifkan WARP 1.1.1.1 untuk unduhan maksimal',
        actionText: 'Coba',
        actionUrl: 'https://1.1.1.1/',
        frequencyMinutes: 30
      },
      rawBanners: {
        headerScript: '',
        footerScript: ''
      }
    },
    tokenPool: [
      { token: 'guest_rotator_alpha', tier: 'standard', status: 'healthy', lastChecked: 'Baru saja' },
      { token: 'prem_vault_fast_01', tier: 'premium', status: 'healthy', lastChecked: '5 menit lalu' }
    ]
  };

  // Load persisted config if available
  try {
    const saved = localStorage.getItem('gofile_admin_config');
    if (saved) {
      remoteConfig = Object.assign(remoteConfig, JSON.parse(saved));
    }
  } catch (e) {
    console.warn('Load config error:', e);
  }

  function saveConfig() {
    remoteConfig.updatedAt = new Date().toISOString();
    localStorage.setItem('gofile_admin_config', JSON.stringify(remoteConfig));
    // Also save to client's remote config cache so local client mode receives it immediately
    localStorage.setItem('gofile_remote_config', JSON.stringify(remoteConfig));
  }

  // ====================================================
  // Strict GitHub Owner Authentication Gate (@didiroyadi123)
  // ====================================================
  const REQUIRED_OWNER = 'didiroyadi123';
  const REQUIRED_REPO = 'DidiRoyadi123/Gofile-pro';

  const adminAuthOverlay = document.getElementById('admin-auth-overlay');
  const authTokenInput = document.getElementById('auth-token-input');
  const btnToggleAuthToken = document.getElementById('btn-toggle-auth-token');
  const btnVerifyOwner = document.getElementById('btn-verify-owner');
  const btnVerifyOwnerText = document.getElementById('btn-verify-owner-text');
  const authErrorBox = document.getElementById('auth-error-box');
  const adminOwnerBadge = document.getElementById('admin-owner-badge');
  const btnAdminLogout = document.getElementById('btn-admin-logout');

  function checkAuthStatus() {
    const authUser = (localStorage.getItem('gf_admin_auth_user') || '').trim().toLowerCase();
    const savedToken = (localStorage.getItem('gf_admin_gh_token') || '').trim();

    if (authUser === REQUIRED_OWNER.toLowerCase() && savedToken) {
      if (adminAuthOverlay) adminAuthOverlay.style.display = 'none';
      if (adminOwnerBadge) adminOwnerBadge.style.display = 'inline-flex';
      if (btnAdminLogout) btnAdminLogout.style.display = 'inline-flex';
      const ghTok = document.getElementById('gh-token');
      if (ghTok && !ghTok.value) ghTok.value = savedToken;
      return true;
    } else {
      if (adminAuthOverlay) adminAuthOverlay.style.display = 'flex';
      if (adminOwnerBadge) adminOwnerBadge.style.display = 'none';
      if (btnAdminLogout) btnAdminLogout.style.display = 'none';
      return false;
    }
  }

  function showAuthError(msg) {
    if (authErrorBox) {
      authErrorBox.textContent = msg;
      authErrorBox.style.display = 'block';
    }
  }

  function hideAuthError() {
    if (authErrorBox) {
      authErrorBox.style.display = 'none';
      authErrorBox.textContent = '';
    }
  }

  async function verifyGitHubOwner(token) {
    const cleanToken = (token || '').trim();
    if (!cleanToken) {
      showAuthError('Harap masukkan Personal Access Token (PAT) GitHub.');
      return false;
    }

    hideAuthError();
    if (btnVerifyOwner) btnVerifyOwner.disabled = true;
    if (btnVerifyOwnerText) btnVerifyOwnerText.textContent = '⏳ Memverifikasi Pemilik...';

    try {
      // 1. Check user login
      const userResp = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'GoFilePro-Admin'
        }
      });

      if (!userResp.ok) {
        if (userResp.status === 401) {
          throw new Error('Token GitHub tidak valid atau telah kedaluwarsa.');
        }
        throw new Error(`Gagal menghubungi GitHub API (HTTP ${userResp.status}).`);
      }

      const userData = await userResp.json();
      const login = (userData.login || '').trim().toLowerCase();

      // 2. Strict Check: Must match didiroyadi123!
      if (login !== REQUIRED_OWNER.toLowerCase()) {
        throw new Error(`AKSES DITOLAK! Akun Anda (@${userData.login}) BUKAN pemilik repositori (@${REQUIRED_OWNER}). Anda tidak diizinkan menyuntikkan iklan atau mengakses kontrol admin.`);
      }

      // 3. Check push permissions on repo
      const repoResp = await fetch(`https://api.github.com/repos/${REQUIRED_REPO}`, {
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'GoFilePro-Admin'
        }
      });

      if (repoResp.ok) {
        const repoData = await repoResp.json();
        const hasPermissions = repoData.permissions && (repoData.permissions.push || repoData.permissions.admin);
        const isOwner = repoData.owner && repoData.owner.login && repoData.owner.login.toLowerCase() === REQUIRED_OWNER.toLowerCase();
        if (!hasPermissions && !isOwner) {
          throw new Error(`Token valid untuk @${userData.login}, namun tidak memiliki izin push/write ke ${REQUIRED_REPO}. Pastikan mencentang scope 'repo'.`);
        }
      }

      // Success!
      localStorage.setItem('gf_admin_auth_user', REQUIRED_OWNER);
      localStorage.setItem('gf_admin_gh_token', cleanToken);
      localStorage.setItem('gf_is_admin', 'true');
      const ghTok = document.getElementById('gh-token');
      if (ghTok) ghTok.value = cleanToken;

      checkAuthStatus();
      addEventLog('AUTH_SUCCESS', `Pemilik repositori @${REQUIRED_OWNER} terverifikasi.`);
      alert(`🎉 Selamat Datang, @${REQUIRED_OWNER}!\n\nIdentitas Anda sebagai pemilik repositori resmi terverifikasi. Seluruh kontrol admin, analitik real-time, dan injeksi iklan telah aktif.`);
      return true;
    } catch (err) {
      showAuthError(err.message || 'Verifikasi gagal.');
      return false;
    } finally {
      if (btnVerifyOwner) btnVerifyOwner.disabled = false;
      if (btnVerifyOwnerText) btnVerifyOwnerText.textContent = '🔓 Verifikasi & Buka Admin Suite';
    }
  }

  if (btnVerifyOwner) {
    btnVerifyOwner.addEventListener('click', () => {
      const val = authTokenInput ? authTokenInput.value : '';
      verifyGitHubOwner(val);
    });
  }

  if (authTokenInput) {
    authTokenInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = authTokenInput.value;
        verifyGitHubOwner(val);
      }
    });
  }

  if (btnToggleAuthToken && authTokenInput) {
    btnToggleAuthToken.addEventListener('click', () => {
      authTokenInput.type = authTokenInput.type === 'password' ? 'text' : 'password';
      btnToggleAuthToken.textContent = authTokenInput.type === 'password' ? '👁️ Lihat' : '🔒 Sembunyikan';
    });
  }

  if (btnAdminLogout) {
    btnAdminLogout.addEventListener('click', () => {
      if (confirm('Kunci Dashboard dan keluar dari sesi Admin @didiroyadi123?')) {
        localStorage.removeItem('gf_admin_auth_user');
        localStorage.removeItem('gf_admin_gh_token');
        if (authTokenInput) authTokenInput.value = '';
        checkAuthStatus();
      }
    });
  }

  // DOM Elements
  const tabButtons = document.querySelectorAll('.admin-nav-tab');
  const sections = document.querySelectorAll('.admin-section');

  // Tab Switching
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(btn.getAttribute('data-target'));
      if (target) target.classList.add('active');
    });
  });

  // Real Analytics & Telemetry Controller
  async function renderRealTelemetry() {
    const elServerStatus = document.getElementById('stat-server-status');
    const elServerLatency = document.getElementById('stat-server-latency');
    const elDownloads = document.getElementById('stat-downloads');
    const elBandwidth = document.getElementById('stat-bandwidth');
    const elSuccess = document.getElementById('stat-success');

    // 1. Calculate Real Downloads & Bandwidth from Local Storage
    let realDownloadsCount = 0;
    let realTotalBytes = 0;
    try {
      const historyStr = localStorage.getItem('gf_history') || '[]';
      const history = JSON.parse(historyStr);
      if (Array.isArray(history)) {
        realDownloadsCount += history.length;
        realTotalBytes += history.reduce((acc, h) => acc + (h.size || 0), 0);
      }
    } catch (e) {}

    const mitigations = parseInt(localStorage.getItem('gf_auto_heal_count') || localStorage.getItem('gf_429_mitigated_count') || '0', 10);

    if (elDownloads) elDownloads.textContent = realDownloadsCount.toLocaleString('id-ID');
    if (elBandwidth) elBandwidth.textContent = formatBytes(realTotalBytes);
    if (elSuccess) elSuccess.textContent = mitigations > 0 ? `${mitigations} Teratasi` : '0 (Sehat)';

    // 2. Real Client System & Specs Telemetry
    const osContainer = document.getElementById('dist-os');
    if (osContainer) {
      const isAndroid = /android/i.test(navigator.userAgent);
      const isWindows = /windows/i.test(navigator.userAgent);
      const osName = isAndroid ? 'Android OS (Mobile Native)' : (isWindows ? 'Windows Desktop' : 'Web / Desktop Host');
      const mem = navigator.deviceMemory ? `${navigator.deviceMemory} GB RAM` : 'Standar';
      const cores = navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} Cores` : 'Multi-thread';
      const conn = navigator.connection ? (navigator.connection.effectiveType?.toUpperCase() || 'Online') : (navigator.onLine ? 'Online' : 'Offline');
      const scr = `${window.screen.width}x${window.screen.height} (${window.devicePixelRatio || 1}x DPR)`;

      osContainer.innerHTML = `
        <div class="dist-item" style="margin-bottom:0.6rem;">
          <div class="dist-meta"><span>Sistem Operasi</span><strong style="color:#38bdf8;">${osName}</strong></div>
        </div>
        <div class="dist-item" style="margin-bottom:0.6rem;">
          <div class="dist-meta"><span>Resolusi Layar</span><strong>${scr}</strong></div>
        </div>
        <div class="dist-item" style="margin-bottom:0.6rem;">
          <div class="dist-meta"><span>Thread CPU & RAM</span><strong>${cores} • ${mem}</strong></div>
        </div>
        <div class="dist-item">
          <div class="dist-meta"><span>Status Jaringan</span><span style="color:#10b981;font-weight:700;">🟢 ${conn}</span></div>
        </div>
      `;
    }

    // 3. Real Server Health Probe
    const ispContainer = document.getElementById('dist-isp');
    const startT = performance.now();
    try {
      const resp = await fetch('https://api.gofile.io/servers/getServer', { cache: 'no-store' });
      const latency = Math.round(performance.now() - startT);
      const data = await resp.json();

      if (resp.ok && data.status === 'ok') {
        const srv = data.data?.server || 'api.gofile.io';
        if (elServerStatus) {
          elServerStatus.textContent = 'ONLINE (Aktif)';
          elServerStatus.style.color = '#10b981';
        }
        if (elServerLatency) elServerLatency.textContent = `Latency: ${latency} ms • Node: ${srv}`;

        if (ispContainer) {
          ispContainer.innerHTML = `
            <div class="dist-item" style="margin-bottom:0.6rem;">
              <div class="dist-meta"><span>Node GoFile Terpilih</span><strong style="color:#10b981;">${srv}.gofile.io</strong></div>
            </div>
            <div class="dist-item" style="margin-bottom:0.6rem;">
              <div class="dist-meta"><span>Response Latency</span><strong style="color:#06b6d4;">${latency} ms</strong></div>
            </div>
            <div class="dist-item" style="margin-bottom:0.6rem;">
              <div class="dist-meta"><span>Enkripsi & Protokol</span><strong>HTTPS • TLS 1.3</strong></div>
            </div>
            <div class="dist-item">
              <div class="dist-meta"><span>Proteksi Limit 429</span><span style="color:#10b981;font-weight:700;">✅ Standby Aktif</span></div>
            </div>
          `;
        }
        addEventLog('SERVER_PROBE_OK', `Probe GoFile server: ${srv} (${latency} ms)`);
      } else {
        throw new Error('Server returned non-ok status');
      }
    } catch (err) {
      const latency = Math.round(performance.now() - startT);
      if (elServerStatus) {
        elServerStatus.textContent = 'RATE LIMITED / SLOW';
        elServerStatus.style.color = '#f59e0b';
      }
      if (elServerLatency) elServerLatency.textContent = `Latency: ${latency} ms • Menggunakan fallback`;
      if (ispContainer) {
        ispContainer.innerHTML = `
          <div class="dist-item">
            <div class="dist-meta"><span style="color:#f59e0b;">Probe GoFile: Menunggu respons API</span></div>
          </div>
        `;
      }
    }
  }

  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0.0 MB';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Real-time Event Feed
  const eventFeed = document.getElementById('event-feed');
  function addEventLog(tag, text) {
    if (!eventFeed) return;
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const row = document.createElement('div');
    row.className = 'event-row';
    row.innerHTML = `<span class="event-time">${timeStr}</span><span class="event-tag">[${tag}]</span><span>${text}</span>`;
    eventFeed.prepend(row);
    if (eventFeed.children.length > 25) {
      eventFeed.removeChild(eventFeed.lastChild);
    }
  }

  // Initial event logs reflecting real session start
  addEventLog('ADMIN_START', 'GoFile Pro Admin Suite v2.4.1 siap. Mode privat.');
  addEventLog('REMOTE_CONFIG_LOAD', 'Konfigurasi iklan dan pool token berhasil disinkronkan.');

  // Wire Refresh Telemetry Button
  const btnRefreshTelemetry = document.getElementById('btn-refresh-telemetry');
  if (btnRefreshTelemetry) {
    btnRefreshTelemetry.addEventListener('click', async () => {
      btnRefreshTelemetry.disabled = true;
      btnRefreshTelemetry.innerHTML = '<span>⏳ Memeriksa...</span>';
      await renderRealTelemetry();
      btnRefreshTelemetry.disabled = false;
      btnRefreshTelemetry.innerHTML = '<span>🔄 Segarkan Telemetri</span>';
      alert('Telemetri real-time berhasil diperbarui!');
    });
  }

  // Announcement Controller
  const annEnabled = document.getElementById('ann-enabled');
  const annLevel = document.getElementById('ann-level');
  const annTitle = document.getElementById('ann-title');
  const annMessage = document.getElementById('ann-message');
  const btnSaveAnn = document.getElementById('btn-save-announcement');

  if (annEnabled) annEnabled.checked = remoteConfig.announcement.enabled;
  if (annLevel) annLevel.value = remoteConfig.announcement.level;
  if (annTitle) annTitle.value = remoteConfig.announcement.title;
  if (annMessage) annMessage.value = remoteConfig.announcement.message;

  if (btnSaveAnn) {
    btnSaveAnn.addEventListener('click', () => {
      remoteConfig.announcement = {
        enabled: annEnabled ? annEnabled.checked : false,
        level: annLevel ? annLevel.value : 'info',
        title: annTitle ? annTitle.value.trim() : '',
        message: annMessage ? annMessage.value.trim() : ''
      };
      saveConfig();
      alert('Pengumuman berhasil disimpan dan disiarkan ke klien!');
      addEventLog('ANNOUNCEMENT_UPDATE', `Pengumuman diperbarui: ${remoteConfig.announcement.title}`);
    });
  }

  // Adsterra & Monetag Ad Engine Controller
  const adMasterEnabled = document.getElementById('ad-master-enabled');
  const adDirectEnabled = document.getElementById('ad-direct-enabled');
  const adDirectProvider = document.getElementById('ad-direct-provider');
  const adDirectUrl = document.getElementById('ad-direct-url');
  const adDirectFreq = document.getElementById('ad-direct-freq');
  const adDirectPlatform = document.getElementById('ad-direct-platform');
  const adDirectOnDownload = document.getElementById('ad-direct-on-download');
  const adDirectOnVideo = document.getElementById('ad-direct-on-video');

  const adCelebEnabled = document.getElementById('ad-celeb-enabled');
  const adCelebTitle = document.getElementById('ad-celeb-title');
  const adCelebBtnText = document.getElementById('ad-celeb-btn-text');
  const adCelebDesc = document.getElementById('ad-celeb-desc');
  const adCelebBanner = document.getElementById('ad-celeb-banner');
  const adCelebUrl = document.getElementById('ad-celeb-url');

  const adSocialEnabled = document.getElementById('ad-social-enabled');
  const adSocialIcon = document.getElementById('ad-social-icon');
  const adSocialText = document.getElementById('ad-social-text');
  const adSocialBtn = document.getElementById('ad-social-btn');
  const adSocialUrl = document.getElementById('ad-social-url');

  const adRawHeader = document.getElementById('ad-raw-header');
  const adRawFooter = document.getElementById('ad-raw-footer');
  const btnSaveAds = document.getElementById('btn-save-ads');

  function populateAdsForm() {
    const ads = remoteConfig.ads || {};
    if (adMasterEnabled) adMasterEnabled.checked = ads.enabled !== false;

    const dl = ads.directLink || {};
    if (adDirectEnabled) adDirectEnabled.checked = dl.enabled !== false;
    if (adDirectProvider && dl.provider) adDirectProvider.value = dl.provider;
    if (adDirectUrl && dl.url) adDirectUrl.value = dl.url;
    if (adDirectFreq && dl.frequencyMinutes) adDirectFreq.value = dl.frequencyMinutes;
    if (adDirectPlatform && dl.targetPlatforms) adDirectPlatform.value = dl.targetPlatforms;
    if (adDirectOnDownload) adDirectOnDownload.checked = dl.triggerOnDownload !== false;
    if (adDirectOnVideo) adDirectOnVideo.checked = !!dl.triggerOnVideoPlay;

    const cm = ads.celebrationModal || {};
    if (adCelebEnabled) adCelebEnabled.checked = cm.enabled !== false;
    if (adCelebTitle && cm.title) adCelebTitle.value = cm.title;
    if (adCelebBtnText && cm.actionText) adCelebBtnText.value = cm.actionText;
    if (adCelebDesc && cm.desc) adCelebDesc.value = cm.desc;
    if (adCelebBanner && cm.bannerImg) adCelebBanner.value = cm.bannerImg;
    if (adCelebUrl && cm.actionUrl) adCelebUrl.value = cm.actionUrl;

    const sb = ads.socialBar || {};
    if (adSocialEnabled) adSocialEnabled.checked = sb.enabled !== false;
    if (adSocialIcon && sb.icon) adSocialIcon.value = sb.icon;
    if (adSocialText && sb.text) adSocialText.value = sb.text;
    if (adSocialBtn && sb.actionText) adSocialBtn.value = sb.actionText;
    if (adSocialUrl && sb.actionUrl) adSocialUrl.value = sb.actionUrl;

    const rb = ads.rawBanners || {};
    if (adRawHeader && rb.headerScript) adRawHeader.value = rb.headerScript;
    if (adRawFooter && rb.footerScript) adRawFooter.value = rb.footerScript;
  }

  function collectAdsFromForm() {
    return {
      enabled: adMasterEnabled ? adMasterEnabled.checked : true,
      directLink: {
        enabled: adDirectEnabled ? adDirectEnabled.checked : true,
        provider: adDirectProvider ? adDirectProvider.value : 'adsterra',
        url: adDirectUrl ? adDirectUrl.value.trim() : '',
        frequencyMinutes: adDirectFreq ? parseInt(adDirectFreq.value, 10) || 15 : 15,
        triggerOnDownload: adDirectOnDownload ? adDirectOnDownload.checked : true,
        triggerOnVideoPlay: adDirectOnVideo ? adDirectOnVideo.checked : false,
        targetPlatforms: adDirectPlatform ? adDirectPlatform.value : 'all'
      },
      celebrationModal: {
        enabled: adCelebEnabled ? adCelebEnabled.checked : true,
        provider: 'monetag',
        title: adCelebTitle ? adCelebTitle.value.trim() : 'Cloudflare WARP 1.1.1.1',
        sponsor: 'Sponsor GoFile Pro',
        desc: adCelebDesc ? adCelebDesc.value.trim() : '',
        bannerImg: adCelebBanner ? adCelebBanner.value.trim() : '',
        actionText: adCelebBtnText ? adCelebBtnText.value.trim() : 'Pasang Gratis ⚡',
        actionUrl: adCelebUrl ? adCelebUrl.value.trim() : 'https://1.1.1.1/',
        frequencyMinutes: 10
      },
      socialBar: {
        enabled: adSocialEnabled ? adSocialEnabled.checked : true,
        icon: adSocialIcon ? adSocialIcon.value.trim() : '⚡',
        text: adSocialText ? adSocialText.value.trim() : '',
        actionText: adSocialBtn ? adSocialBtn.value.trim() : 'Coba',
        actionUrl: adSocialUrl ? adSocialUrl.value.trim() : 'https://1.1.1.1/',
        frequencyMinutes: 30
      },
      rawBanners: {
        headerScript: adRawHeader ? adRawHeader.value.trim() : '',
        footerScript: adRawFooter ? adRawFooter.value.trim() : ''
      }
    };
  }

  function collectAnnouncementFromForm() {
    return {
      enabled: annEnabled ? annEnabled.checked : false,
      level: annLevel ? annLevel.value : 'info',
      title: annTitle ? annTitle.value.trim() : '',
      message: annMessage ? annMessage.value.trim() : ''
    };
  }

  if (btnSaveAds) {
    btnSaveAds.addEventListener('click', () => {
      remoteConfig.ads = collectAdsFromForm();
      saveConfig();
      updateConfigOutput();
      alert('Konfigurasi Iklan & Monetisasi berhasil disimpan secara lokal!');
      addEventLog('ADS_CONFIG_LOCAL', `Iklan disimpan secara lokal.`);
    });
  }

  // ----------------------------------------------------
  // GitHub Cloud Serverless Synchronizer (Zero Hosting)
  // ----------------------------------------------------
  const ghRepoInput = document.getElementById('gh-repo');
  const ghBranchInput = document.getElementById('gh-branch');
  const ghPathInput = document.getElementById('gh-path');
  const ghTokenInput = document.getElementById('gh-token');
  const btnToggleGhToken = document.getElementById('btn-toggle-gh-token');
  const btnGhTest = document.getElementById('btn-gh-test');
  const btnGhPull = document.getElementById('btn-gh-pull');
  const btnGhPublish = document.getElementById('btn-gh-publish');
  const btnPublishAdsGh = document.getElementById('btn-publish-ads-github');
  const btnPublishAnnGh = document.getElementById('btn-publish-ann-github');
  const ghSyncPill = document.getElementById('github-sync-pill');
  const ghStatusBox = document.getElementById('gh-status-box');
  const ghStatusMsg = document.getElementById('gh-status-msg');
  const ghStatusMeta = document.getElementById('gh-status-meta');

  function loadGitHubSettings() {
    if (ghRepoInput) ghRepoInput.value = localStorage.getItem('gf_admin_gh_repo') || 'DidiRoyadi123/Gofile-pro';
    if (ghBranchInput) ghBranchInput.value = localStorage.getItem('gf_admin_gh_branch') || 'main';
    if (ghPathInput) ghPathInput.value = localStorage.getItem('gf_admin_gh_path') || 'remote_config.json';
    const storedToken = localStorage.getItem('gf_admin_gh_token') || '';
    if (ghTokenInput) ghTokenInput.value = storedToken;

    if (storedToken && ghSyncPill) {
      ghSyncPill.textContent = 'Token Tersimpan';
      ghSyncPill.style.color = '#38bdf8';
      ghSyncPill.style.borderColor = 'rgba(56,189,248,0.4)';
    }
  }

  function saveGitHubSettings() {
    if (ghRepoInput) localStorage.setItem('gf_admin_gh_repo', ghRepoInput.value.trim());
    if (ghBranchInput) localStorage.setItem('gf_admin_gh_branch', ghBranchInput.value.trim());
    if (ghPathInput) localStorage.setItem('gf_admin_gh_path', ghPathInput.value.trim());
    if (ghTokenInput) localStorage.setItem('gf_admin_gh_token', ghTokenInput.value.trim());
  }

  if (btnToggleGhToken && ghTokenInput) {
    btnToggleGhToken.addEventListener('click', () => {
      ghTokenInput.type = ghTokenInput.type === 'password' ? 'text' : 'password';
      btnToggleGhToken.textContent = ghTokenInput.type === 'password' ? '👁️ Lihat' : '🔒 Sembunyikan';
    });
  }

  function showGitHubStatus(msg, meta = '', isSuccess = true) {
    if (!ghStatusBox) return;
    ghStatusBox.style.display = 'block';
    if (ghStatusMsg) {
      ghStatusMsg.textContent = msg;
      ghStatusMsg.style.color = isSuccess ? '#10b981' : '#f87171';
    }
    if (ghStatusMeta) ghStatusMeta.textContent = meta;
  }

  async function testGitHubConnection() {
    saveGitHubSettings();
    const repo = (ghRepoInput ? ghRepoInput.value.trim() : '') || 'DidiRoyadi123/Gofile-pro';
    const branch = (ghBranchInput ? ghBranchInput.value.trim() : '') || 'main';
    const path = (ghPathInput ? ghPathInput.value.trim() : '') || 'remote_config.json';
    const token = (ghTokenInput ? ghTokenInput.value.trim() : '') || '';

    showGitHubStatus('Menghubungi GitHub API...', 'Menguji koneksi ke ' + repo, true);

    const headers = {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'GoFilePro-Admin'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const resp = await fetch(`https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}&t=${Date.now()}`, { headers });
      if (resp.ok) {
        const data = await resp.json();
        const shortSha = (data.sha || '').substring(0, 8);
        showGitHubStatus(`Koneksi GitHub Terverifikasi! 🟢`, `Repositori: ${repo} | Branch: ${branch} | File SHA: ${shortSha}`, true);
        if (ghSyncPill) {
          ghSyncPill.textContent = 'Terhubung 🟢';
          ghSyncPill.style.color = '#10b981';
          ghSyncPill.style.borderColor = 'rgba(16,185,129,0.4)';
        }
        addEventLog('GITHUB_TEST_OK', `Koneksi GitHub terverifikasi ke ${repo}`);
        return true;
      } else if (resp.status === 401) {
        showGitHubStatus('Autentikasi Gagal (HTTP 401) ❌', 'Token GitHub tidak valid atau kedaluwarsa. Silakan periksa kembali Token PAT Anda.', false);
        return false;
      } else if (resp.status === 404) {
        showGitHubStatus('Berkas/Repositori Tidak Ditemukan (HTTP 404) ⚠️', `Periksa nama repositori (${repo}) dan path file (${path}).`, false);
        return false;
      } else {
        showGitHubStatus(`Respons GitHub: HTTP ${resp.status}`, resp.statusText, false);
        return false;
      }
    } catch (e) {
      showGitHubStatus('Gagal Terhubung ke GitHub ❌', e.message || 'Periksa koneksi internet Anda.', false);
      return false;
    }
  }

  async function pullFromGitHub() {
    const authUser = (localStorage.getItem('gf_admin_auth_user') || '').trim().toLowerCase();
    if (authUser !== REQUIRED_OWNER.toLowerCase()) {
      checkAuthStatus();
      alert(`AKSES DITOLAK: Anda wajib login dan terverifikasi sebagai pemilik repositori (@${REQUIRED_OWNER})!`);
      return;
    }

    saveGitHubSettings();
    const repo = (ghRepoInput ? ghRepoInput.value.trim() : '') || 'DidiRoyadi123/Gofile-pro';
    const branch = (ghBranchInput ? ghBranchInput.value.trim() : '') || 'main';
    const path = (ghPathInput ? ghPathInput.value.trim() : '') || 'remote_config.json';
    const token = (ghTokenInput ? ghTokenInput.value.trim() : '') || '';

    showGitHubStatus('Mengunduh konfigurasi dari GitHub...', '', true);

    const headers = {
      'Accept': 'application/vnd.github.raw+json',
      'User-Agent': 'GoFilePro-Admin'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const resp = await fetch(`https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}&t=${Date.now()}`, { headers });
      if (resp.ok) {
        const pulledConfig = await resp.json();
        if (pulledConfig) {
          remoteConfig = pulledConfig;
          saveConfig();
          populateAdsForm();
          if (annEnabled && remoteConfig.announcement) annEnabled.checked = remoteConfig.announcement.enabled;
          if (annLevel && remoteConfig.announcement) annLevel.value = remoteConfig.announcement.level;
          if (annTitle && remoteConfig.announcement) annTitle.value = remoteConfig.announcement.title;
          if (annMessage && remoteConfig.announcement) annMessage.value = remoteConfig.announcement.message;
          renderTokenTable();
          updateConfigOutput();
          showGitHubStatus('Konfigurasi Berhasil Ditarik dari GitHub! 🟢', `Versi: ${remoteConfig.version || 'v2.4.1'} | Updated: ${remoteConfig.updatedAt || 'N/A'}`, true);
          addEventLog('GITHUB_PULL_OK', `Konfigurasi berhasil disinkronkan dari GitHub.`);
          alert('Konfigurasi remote_config.json berhasil ditarik dari GitHub dan diterapkan ke form admin!');
        }
      } else {
        throw new Error(`HTTP ${resp.status}`);
      }
    } catch (e) {
      showGitHubStatus('Gagal Menarik dari GitHub ❌', e.message, false);
      alert('Gagal menarik konfigurasi dari GitHub: ' + e.message);
    }
  }

  async function publishToGitHub() {
    const authUser = (localStorage.getItem('gf_admin_auth_user') || '').trim().toLowerCase();
    if (authUser !== REQUIRED_OWNER.toLowerCase()) {
      checkAuthStatus();
      alert(`AKSES DITOLAK: Anda wajib login dan terverifikasi sebagai pemilik resmi repositori (@${REQUIRED_OWNER}) untuk menyiarkan atau menyuntikkan iklan!`);
      return;
    }

    saveGitHubSettings();
    const repo = (ghRepoInput ? ghRepoInput.value.trim() : '') || 'DidiRoyadi123/Gofile-pro';
    const branch = (ghBranchInput ? ghBranchInput.value.trim() : '') || 'main';
    const path = (ghPathInput ? ghPathInput.value.trim() : '') || 'remote_config.json';
    const token = (ghTokenInput ? ghTokenInput.value.trim() : '') || '';

    if (!token) {
      alert('Token GitHub (PAT) diperlukan untuk mempublikasikan ke repositori!\n\nSilakan isi kolom Token GitHub di tab "☁️ GitHub Serverless Endpoint" (lihat panduan 1 menit di bawah form).');
      // Switch tab to GitHub
      const tabGhBtn = document.querySelector('[data-target="tab-github"]');
      if (tabGhBtn) tabGhBtn.click();
      if (ghTokenInput) ghTokenInput.focus();
      return;
    }

    // 1. Collect latest data from forms
    remoteConfig.ads = collectAdsFromForm();
    remoteConfig.announcement = collectAnnouncementFromForm();
    remoteConfig.updatedAt = new Date().toISOString();
    remoteConfig.version = '2.4.1';

    saveConfig();
    updateConfigOutput();

    showGitHubStatus('1/3 Menghubungi GitHub API...', 'Mengambil SHA berkas terkini...', true);

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'GoFilePro-Admin',
      'Content-Type': 'application/json'
    };

    try {
      // Step A: Get current file SHA
      const getResp = await fetch(`https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}&t=${Date.now()}`, { headers });
      let existingSha = null;
      if (getResp.ok) {
        const existingData = await getResp.json();
        existingSha = existingData.sha;
      }

      showGitHubStatus('2/3 Mengenkode Konfigurasi...', 'Mempersiapkan commit...', true);

      // Step B: Encode JSON to Base64 (supporting UTF-8 characters)
      const jsonContent = JSON.stringify(remoteConfig, null, 2);
      const base64Content = btoa(unescape(encodeURIComponent(jsonContent)));

      showGitHubStatus('3/3 Melakukan Commit ke GitHub...', `Mengirim ke branch ${branch}...`, true);

      // Step C: Commit via PUT
      const putBody = {
        message: 'chore(ads): update remote_config.json via GoFile Pro Admin APK',
        content: base64Content,
        branch: branch
      };
      if (existingSha) {
        putBody.sha = existingSha;
      }

      const putResp = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(putBody)
      });

      if (putResp.ok) {
        const putResult = await putResp.json();
        const commitSha = (putResult.commit?.sha || '').substring(0, 8);
        showGitHubStatus('BERHASIL DIPUBLIKASIKAN KE GITHUB! 🟢', `Commit: ${commitSha} | Seluruh user APK & EXE otomatis menerima pembaruan ini secara live!`, true);
        if (ghSyncPill) {
          ghSyncPill.textContent = 'Tersinkron 🟢';
          ghSyncPill.style.color = '#10b981';
          ghSyncPill.style.borderColor = 'rgba(16,185,129,0.4)';
        }
        addEventLog('GITHUB_PUBLISH_OK', `Konfigurasi iklan berhasil dipublikasikan ke GitHub (Commit ${commitSha}).`);
        alert('🎉 BERHASIL DIPUBLIKASIKAN KE SERVER GITHUB!\n\nKonfigurasi iklan dan pengumuman terbaru telah aktif di repositori GitHub.\nSemua aplikasi klien pengguna (Android APK & Windows EXE) akan otomatis membaca data ini secara realtime tanpa perlu sewa server!');
      } else {
        const errJson = await putResp.json().catch(() => ({}));
        throw new Error(errJson.message || `HTTP ${putResp.status}`);
      }
    } catch (err) {
      showGitHubStatus('Gagal Mempublikasikan ke GitHub ❌', err.message, false);
      alert('Gagal mempublikasikan ke GitHub: ' + err.message);
    }
  }

  if (btnGhTest) btnGhTest.addEventListener('click', testGitHubConnection);
  if (btnGhPull) btnGhPull.addEventListener('click', pullFromGitHub);
  if (btnGhPublish) btnGhPublish.addEventListener('click', publishToGitHub);
  if (btnPublishAdsGh) btnPublishAdsGh.addEventListener('click', publishToGitHub);
  if (btnPublishAnnGh) btnPublishAnnGh.addEventListener('click', publishToGitHub);

  loadGitHubSettings();

  // Token Hub Table
  function renderTokenTable() {
    const tbody = document.getElementById('token-tbody');
    if (!tbody) return;
    tbody.innerHTML = remoteConfig.tokenPool.map((item, idx) => {
      const masked = item.token.length > 8 ? `${item.token.substring(0, 4)}...${item.token.substring(item.token.length - 4)}` : item.token;
      const badgeClass = item.status === 'healthy' ? 'healthy' : (item.status === 'limited' ? 'limited' : 'dead');
      const badgeText = item.status === 'healthy' ? 'Aktif Sehat ✅' : (item.status === 'limited' ? 'Rate Limit 429 ⚠️' : 'Invalid/Mati ❌');
      return `
        <tr>
          <td><code>${masked}</code></td>
          <td><strong>${item.tier.toUpperCase()}</strong></td>
          <td><span class="token-badge ${badgeClass}">${badgeText}</span></td>
          <td>${item.lastChecked}</td>
          <td><button class="btn-admin btn-admin-secondary" style="padding:2px 8px;font-size:0.75rem;" onclick="removeToken(${idx})">Hapus</button></td>
        </tr>
      `;
    }).join('');
  }

  window.removeToken = function (idx) {
    remoteConfig.tokenPool.splice(idx, 1);
    saveConfig();
    renderTokenTable();
  };

  const btnAddToken = document.getElementById('btn-add-token');
  const inputNewToken = document.getElementById('input-new-token');
  if (btnAddToken && inputNewToken) {
    btnAddToken.addEventListener('click', async () => {
      const val = inputNewToken.value.trim();
      if (!val) return;
      inputNewToken.value = '';
      const newTokenItem = {
        token: val,
        tier: 'checking...',
        status: 'healthy',
        lastChecked: 'Memeriksa...'
      };
      remoteConfig.tokenPool.push(newTokenItem);
      renderTokenTable();

      // Verify with GoFile API
      try {
        const resp = await fetch('https://api.gofile.io/accounts/getAccountDetails', {
          headers: {
            'Authorization': `Bearer ${val}`,
            'Cookie': `accountToken=${val}`
          }
        });
        if (resp.ok) {
          const res = await resp.json();
          if (res.status === 'ok') {
            newTokenItem.tier = res.data?.tier || 'standard';
            newTokenItem.status = 'healthy';
            newTokenItem.lastChecked = 'Baru saja';
          } else {
            newTokenItem.tier = 'invalid';
            newTokenItem.status = 'dead';
            newTokenItem.lastChecked = 'Gagal validasi';
          }
        } else if (resp.status === 429) {
          newTokenItem.tier = 'standard';
          newTokenItem.status = 'limited';
          newTokenItem.lastChecked = 'Rate limit 429';
        } else {
          newTokenItem.tier = 'invalid';
          newTokenItem.status = 'dead';
          newTokenItem.lastChecked = `HTTP ${resp.status}`;
        }
      } catch (e) {
        newTokenItem.tier = 'standard';
        newTokenItem.status = 'healthy';
        newTokenItem.lastChecked = 'Tersimpan (Offline)';
      }
      saveConfig();
      renderTokenTable();
      addEventLog('TOKEN_ADDED', `Token baru ditambahkan ke pool.`);
    });
  }

  // Export Remote Config JSON
  const btnExportConfig = document.getElementById('btn-export-config');
  const configOutput = document.getElementById('config-json-output');

  function updateConfigOutput() {
    if (configOutput) {
      configOutput.value = JSON.stringify(remoteConfig, null, 2);
    }
  }

  if (btnExportConfig) {
    btnExportConfig.addEventListener('click', () => {
      saveConfig();
      updateConfigOutput();
      if (navigator.clipboard) {
        navigator.clipboard.writeText(JSON.stringify(remoteConfig, null, 2));
        alert('Konfigurasi remote_config.json berhasil disalin ke clipboard!\nAnda dapat menempelkannya ke GitHub Gist, Cloudflare Worker, atau file hosting.');
      }
    });
  }

  // Initialize
  checkAuthStatus();
  renderRealTelemetry();
  renderTokenTable();
  populateAdsForm();
  updateConfigOutput();
  addEventLog('SYSTEM_BOOT', 'GoFile Pro Admin v2.4.1 Engine siap.');

})();
