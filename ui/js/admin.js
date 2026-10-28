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
    ads: [
      {
        id: 'ad_1',
        title: 'Cloudflare WARP 1.1.1.1',
        sponsor: 'Bypass Sensor & Blokir ISP',
        desc: 'Gunakan WARP gratis untuk bebas download GoFile tanpa blokir IndiHome/Telkomsel!',
        btnText: 'Pasang Gratis ⚡',
        targetUrl: 'https://1.1.1.1/',
        placement: 'top_header',
        active: true
      },
      {
        id: 'ad_2',
        title: 'Traktir Kopi Developer',
        sponsor: 'DidiRoyadi123 Official',
        desc: 'GoFile Pro selalu gratis & tanpa iklan mengganggu. Traktir kopi untuk server!',
        btnText: 'Traktir Kopi ☕',
        targetUrl: 'https://trakteer.id/didiroyadi',
        placement: 'bottom_sheet',
        active: true
      }
    ],
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

  // Render Telemetry
  function renderTelemetry() {
    const elActive = document.getElementById('stat-active-devices');
    const elDownloads = document.getElementById('stat-downloads');
    const elBandwidth = document.getElementById('stat-bandwidth');
    const elSuccess = document.getElementById('stat-success');

    if (elActive) elActive.textContent = defaultAnalytics.activeDevices.toLocaleString('id-ID');
    if (elDownloads) elDownloads.textContent = defaultAnalytics.todayDownloads.toLocaleString('id-ID');
    if (elBandwidth) elBandwidth.textContent = `${defaultAnalytics.todayBandwidthTB.toFixed(1)} TB`;
    if (elSuccess) elSuccess.textContent = `${defaultAnalytics.successRate}%`;

    // Render OS
    const osContainer = document.getElementById('dist-os');
    if (osContainer) {
      osContainer.innerHTML = defaultAnalytics.osDistribution.map(item => `
        <div class="dist-item">
          <div class="dist-meta"><span>${item.name}</span><span>${item.pct}%</span></div>
          <div class="dist-bar-track"><div class="dist-bar-fill" style="width: ${item.pct}%;"></div></div>
        </div>
      `).join('');
    }

    // Render ISP
    const ispContainer = document.getElementById('dist-isp');
    if (ispContainer) {
      ispContainer.innerHTML = defaultAnalytics.ispDistribution.map(item => `
        <div class="dist-item">
          <div class="dist-meta"><span>${item.name}</span><span>${item.pct}%</span></div>
          <div class="dist-bar-track"><div class="dist-bar-fill" style="width: ${item.pct}%; background: linear-gradient(90deg, #10b981, #6366f1);"></div></div>
        </div>
      `).join('');
    }
  }

  // Real-time Event Stream Simulation
  const eventFeed = document.getElementById('event-feed');
  const eventTypes = [
    { tag: 'DOWNLOAD_START', text: 'Perangkat Android 14 memulai unduhan 4.2 GB via 8 threads' },
    { tag: 'RATE_LIMIT_429', text: 'IP IndiHome terkena limit 429 -> Berhasil auto-retry backoff' },
    { tag: 'WIFI_STREAM', text: 'Streaming video MP4 via Wi-Fi Share ke browser Safari iPhone' },
    { tag: 'QUEUE_MIGRATE', text: 'Impor antrean unduhan 18 berkas dari HP lain via QR Code' },
    { tag: 'DOWNLOAD_DONE', text: 'Unduhan 12.8 GB selesai tersimpan ke /Download/GoFile' }
  ];

  function addEventLog(tag, text) {
    if (!eventFeed) return;
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const row = document.createElement('div');
    row.className = 'event-row';
    row.innerHTML = `<span class="event-time">${timeStr}</span><span class="event-tag">[${tag}]</span><span>${text}</span>`;
    eventFeed.prepend(row);
    if (eventFeed.children.length > 30) {
      eventFeed.removeChild(eventFeed.lastChild);
    }
  }

  setInterval(() => {
    const ev = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    addEventLog(ev.tag, ev.text);
    defaultAnalytics.todayDownloads += Math.floor(Math.random() * 3) + 1;
    const elDownloads = document.getElementById('stat-downloads');
    if (elDownloads) elDownloads.textContent = defaultAnalytics.todayDownloads.toLocaleString('id-ID');
  }, 4500);

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
  renderTelemetry();
  renderTokenTable();
  updateConfigOutput();
  addEventLog('SYSTEM_BOOT', 'GoFile Pro Admin v2.4.0 Engine siap.');

})();
