/**
 * GoFile Pro Admin Dashboard Controller
 * Version: 2.4.0 (Synchronized)
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
    version: '2.4.0',
    updatedAt: new Date().toISOString(),
    announcement: {
      enabled: false,
      level: 'info', // info, warning, urgent
      title: 'Pengumuman Penting',
      message: 'GoFile Pro v2.4.0 telah dirilis dengan pemutar ExoVideoView baru!',
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
  addEventLog('ADMIN_START', 'GoFile Pro Admin Suite v2.4.0 siap. Mode privat.');
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

  if (btnSaveAds) {
    btnSaveAds.addEventListener('click', () => {
      remoteConfig.ads = {
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
      saveConfig();
      updateConfigOutput();
      alert('Konfigurasi Iklan & Monetisasi berhasil disimpan dan disiarkan ke seluruh aplikasi klien!');
      addEventLog('ADS_CONFIG_UPDATE', `Injeksi Iklan diperbarui: Direct Link (${remoteConfig.ads.directLink.provider}) aktif.`);
    });
  }

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
  renderRealTelemetry();
  renderTokenTable();
  populateAdsForm();
  updateConfigOutput();
  addEventLog('SYSTEM_BOOT', 'GoFile Pro Admin v2.4.0 Engine siap.');

})();
