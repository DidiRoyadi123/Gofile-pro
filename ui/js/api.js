/**
 * GoFile Pro Universal API Bridge
 * Seamlessly abstracts PyWebView (Windows), Capacitor Native Downloader (Android), and Web Browser
 */

const ApiBridge = {
  clientEngine: null,
  platform: 'web',

  _globalListenerAttached: false,

  async init() {
    try {
      if (window.GoFileClientEngine) {
        this.clientEngine = new window.GoFileClientEngine();
      }
    } catch (e) {
      console.warn('Could not instantiate GoFileClientEngine:', e);
    }

    this.detectPlatform();

    if (this.platform === 'android' && !this._globalListenerAttached) {
      const androidPlugin = this.getAndroidPlugin();
      if (androidPlugin && typeof androidPlugin.addListener === 'function') {
        try {
          androidPlugin.addListener('downloadProgress', (prog) => {
            if (window.updateItemProgress && typeof window.updateItemProgress === 'function') {
              window.updateItemProgress(prog);
            }
          });
          this._globalListenerAttached = true;
        } catch (e) {
          console.warn('Failed to attach global downloadProgress listener:', e);
        }
      }
    }

    return this.platform;
  },

  detectPlatform() {
    if (window.pywebview && window.pywebview.api) {
      this.platform = 'windows';
    } else if (
      (window.Capacitor && (typeof window.Capacitor.isNativePlatform === 'function' ? window.Capacitor.isNativePlatform() : window.Capacitor.getPlatform?.() === 'android')) ||
      window.androidBridge ||
      window.Capacitor?.Plugins?.AndroidDownloader
    ) {
      this.platform = 'android';
    } else {
      this.platform = 'web';
    }
    return this.platform;
  },

  getAndroidPlugin() {
    if (window.Capacitor?.Plugins?.AndroidDownloader) {
      return window.Capacitor.Plugins.AndroidDownloader;
    }
    if (window.Capacitor && typeof window.Capacitor.nativePromise === 'function') {
      return {
        downloadFile: (options) => window.Capacitor.nativePromise('AndroidDownloader', 'downloadFile', options),
        openFile: (options) => window.Capacitor.nativePromise('AndroidDownloader', 'openFile', options),
        openFolder: (options) => window.Capacitor.nativePromise('AndroidDownloader', 'openFolder', options || {}),
        cancelDownload: (options) => window.Capacitor.nativePromise('AndroidDownloader', 'cancelDownload', options),
        stopAll: () => window.Capacitor.nativePromise('AndroidDownloader', 'stopAll', {}),
        inspectContent: (options) => window.Capacitor.nativePromise('AndroidDownloader', 'inspectContent', options),
        checkFileExists: (options) => window.Capacitor.nativePromise('AndroidDownloader', 'checkFileExists', options),
        listDownloadedFiles: () => window.Capacitor.nativePromise('AndroidDownloader', 'listDownloadedFiles', {}),
        deleteFile: (options) => window.Capacitor.nativePromise('AndroidDownloader', 'deleteFile', options),
        openUrl: (options) => window.Capacitor.nativePromise('AndroidDownloader', 'openUrl', options),
        readClipboard: () => window.Capacitor.nativePromise('AndroidDownloader', 'readClipboard', {}),
        canRequestPackageInstalls: () => window.Capacitor.nativePromise('AndroidDownloader', 'canRequestPackageInstalls', {}),
        openInstallPermissionSettings: () => window.Capacitor.nativePromise('AndroidDownloader', 'openInstallPermissionSettings', {}),
        installApk: (options) => window.Capacitor.nativePromise('AndroidDownloader', 'installApk', options),
        getMediaStreamUrl: (options) => window.Capacitor.nativePromise('AndroidDownloader', 'getMediaStreamUrl', options),
        setVideoPlaybackState: (options) => window.Capacitor.nativePromise('AndroidDownloader', 'setVideoPlaybackState', options),
        enterPip: (options) => window.Capacitor.nativePromise('AndroidDownloader', 'enterPip', options),
        exitApp: () => window.Capacitor.nativePromise('AndroidDownloader', 'exitApp', {}),
        addListener: (eventName, callback) => {
          if (typeof window.Capacitor.addListener === 'function') {
            return window.Capacitor.addListener('AndroidDownloader', eventName, callback);
          }
          return { remove: () => {} };
        }
      };
    }
    return null;
  },

  getPlatformInfo() {
    this.detectPlatform();
    const isWindows = this.platform === 'windows';
    const isAndroid = this.platform === 'android';
    return {
      platform: isWindows ? 'Windows Native' : isAndroid ? 'Android APK' : 'Web Browser',
      isWindows,
      isAndroid,
      isWeb: !isWindows && !isAndroid
    };
  },

  async inspectContent(url, password = '') {
    this.detectPlatform();

    // 1. Windows Native (PyWebView Python API) - bypasses CORS completely
    if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.inspect_content === 'function') {
      return await window.pywebview.api.inspect_content(url, password);
    }

    // 2. Android Native (Capacitor Java Plugin) - bypasses CORS completely
    const androidPlugin = this.getAndroidPlugin();
    if (androidPlugin && typeof androidPlugin.inspectContent === 'function') {
      const token = localStorage.getItem('gf_token') || '';
      const res = await androidPlugin.inspectContent({ url, password, token });
      if (res && res.token) {
        localStorage.setItem('gf_token', res.token);
      }
      return res;
    }

    // 3. Web Browser Fallback (pure client engine)
    if (this.clientEngine) {
      return await this.clientEngine.inspectContent(url, password);
    }
    throw new Error('Tidak ada mesin penjelajah konten yang tersedia');
  },

  async downloadItem(item, downloadDir, onProgress) {
    this.detectPlatform();

    // 1. Windows Native (PyWebView Python API)
    if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.download_file === 'function') {
      const res = await window.pywebview.api.download_file(item, downloadDir);
      if (res) {
        item.savedUri = `${downloadDir}/${item.name}`;
      }
      return res;
    }

    // 2. Android Native (Capacitor Java Plugin)
    const androidPlugin = this.getAndroidPlugin();
    if (androidPlugin && typeof androidPlugin.downloadFile === 'function') {
      let token = localStorage.getItem('gf_token') || '';
      const res = await androidPlugin.downloadFile({
        id: item.id,
        url: item.link,
        filename: item.name,
        token: token || '',
        relDir: item.relDir || item.rel_dir || '',
        mimetype: item.mimetype || '',
        size: item.size || 0,
        md5: item.md5 || '',
        overwrite: !!(item.overwrite || item.isUpdate),
        isUpdate: !!item.isUpdate
      });

      if (res && res.filename) {
        item.name = res.filename;
      }
      if (res && res.uri) {
        item.savedUri = res.uri;
      }
      return true;
    }

    // 3. Web Browser Fallback
    if (this.clientEngine) {
      return await this.clientEngine.downloadFile(item, onProgress);
    }
    throw new Error('Tidak ada mesin pengunduh yang aktif');
  },

  downloadFile(item, downloadDir, onProgress) {
    return this.downloadItem(item, downloadDir, onProgress);
  },

  async checkFileExists(filename, relDir = '', size = 0) {
    this.detectPlatform();
    if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.check_file_exists === 'function') {
      try {
        return await window.pywebview.api.check_file_exists(filename, relDir, size);
      } catch (e) {
        return false;
      }
    }
    const androidPlugin = this.getAndroidPlugin();
    if (androidPlugin && typeof androidPlugin.checkFileExists === 'function') {
      try {
        const res = await androidPlugin.checkFileExists({ filename, relDir, size });
        return res && res.exists === true;
      } catch (e) {
        return false;
      }
    }
    return false;
  },

  async chooseFolder() {
    if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.choose_folder === 'function') {
      return await window.pywebview.api.choose_folder();
    }
    return null;
  },

  async openFolder(folderPath) {
    if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.open_folder === 'function') {
      return await window.pywebview.api.open_folder(folderPath);
    }

    const androidPlugin = this.getAndroidPlugin();
    if (androidPlugin && typeof androidPlugin.openFolder === 'function') {
      try {
        const res = await androidPlugin.openFolder();
        return res && res.success;
      } catch (e) {
        console.warn('Android openFolder error:', e);
        return false;
      }
    }

    return false;
  },

  async openFile(filePath, item = null) {
    if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.open_file === 'function') {
      return await window.pywebview.api.open_file(filePath);
    }

    const androidPlugin = this.getAndroidPlugin();
    if (androidPlugin && typeof androidPlugin.openFile === 'function') {
      try {
        const uri = (item && (item.savedUri || item.uri)) || '';
        const filename = (item && item.name) || (filePath ? filePath.split('/').pop() : '');
        const mimetype = (item && item.mimetype) || '';

        const res = await androidPlugin.openFile({
          uri,
          filename,
          mimetype
        });
        return res && res.success;
      } catch (e) {
        console.warn('Android openFile error:', e);
        return false;
      }
    }

    return false;
  },

  async openUrl(url) {
    if (!url) return false;
    this.detectPlatform();

    if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.open_url === 'function') {
      try {
        return await window.pywebview.api.open_url(url);
      } catch (e) {
        console.warn('PyWebView open_url error:', e);
      }
    }

    const androidPlugin = this.getAndroidPlugin();
    if (androidPlugin && typeof androidPlugin.openUrl === 'function') {
      try {
        const res = await androidPlugin.openUrl({ url });
        return res && res.success;
      } catch (e) {
        console.warn('Android openUrl error:', e);
      }
    }

    try {
      window.open(url, '_blank', 'noopener,noreferrer');
      return true;
    } catch (e) {
      window.location.href = url;
      return true;
    }
  },

  cancelDownload(id) {
    if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.cancel_download === 'function') {
      try {
        window.pywebview.api.cancel_download(id);
      } catch (ignored) {}
    }

    const androidPlugin = this.getAndroidPlugin();
    if (androidPlugin && typeof androidPlugin.cancelDownload === 'function') {
      try {
        androidPlugin.cancelDownload({ id });
      } catch (ignored) {}
    }

    if (this.clientEngine) {
      try {
        this.clientEngine.cancelDownload(id);
      } catch (ignored) {}
    }
  },

  stopAll() {
    if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.stop_all === 'function') {
      try {
        window.pywebview.api.stop_all();
      } catch (ignored) {}
    }

    const androidPlugin = this.getAndroidPlugin();
    if (androidPlugin && typeof androidPlugin.stopAll === 'function') {
      try {
        androidPlugin.stopAll();
      } catch (ignored) {}
    }

    if (this.clientEngine) {
      try {
        this.clientEngine.stopAll();
      } catch (ignored) {}
    }
  },

  async listDownloadedFiles(downloadDir = './downloads') {
    if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.list_downloaded_files === 'function') {
      try {
        return await window.pywebview.api.list_downloaded_files(downloadDir);
      } catch (e) {
        console.warn('Desktop list_downloaded_files error:', e);
        return [];
      }
    }

    const androidPlugin = this.getAndroidPlugin();
    if (androidPlugin && typeof androidPlugin.listDownloadedFiles === 'function') {
      try {
        const res = await androidPlugin.listDownloadedFiles();
        if (res) {
          this.androidStatus = {
            needsStoragePermission: !!res.needsStoragePermission,
            isAndroid11Plus: !!res.isAndroid11Plus,
            ignoringBatteryOptimizations: !!res.ignoringBatteryOptimizations
          };
        }
        return (res && res.files) || [];
      } catch (e) {
        console.warn('Android listDownloadedFiles error:', e);
        return [];
      }
    }

    return [];
  },

  async checkStoragePermissions() {
    const androidPlugin = this.getAndroidPlugin();
    if (androidPlugin && typeof androidPlugin.checkStoragePermissions === 'function') {
      try {
        return await androidPlugin.checkStoragePermissions();
      } catch (e) {
        return { granted: false };
      }
    }
    return { granted: true };
  },

  async requestStoragePermissions() {
    const androidPlugin = this.getAndroidPlugin();
    if (androidPlugin && typeof androidPlugin.requestStoragePermissions === 'function') {
      try {
        return await androidPlugin.requestStoragePermissions();
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
    return { success: true };
  },

  async isIgnoringBatteryOptimizations() {
    const androidPlugin = this.getAndroidPlugin();
    if (androidPlugin && typeof androidPlugin.isIgnoringBatteryOptimizations === 'function') {
      try {
        const res = await androidPlugin.isIgnoringBatteryOptimizations();
        return res && res.ignoring;
      } catch (e) {
        return true;
      }
    }
    return true;
  },

  async requestIgnoreBatteryOptimizations() {
    const androidPlugin = this.getAndroidPlugin();
    if (androidPlugin && typeof androidPlugin.requestIgnoreBatteryOptimizations === 'function') {
      try {
        return await androidPlugin.requestIgnoreBatteryOptimizations();
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
    return { success: true };
  },

  async deleteFile(item) {
    if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.delete_file === 'function') {
      try {
        const targetPath = item.path || (item.relDir ? `${item.relDir}/${item.name}` : item.name);
        return await window.pywebview.api.delete_file(targetPath);
      } catch (e) {
        console.warn('Desktop delete_file error:', e);
        return false;
      }
    }

    const androidPlugin = this.getAndroidPlugin();
    if (androidPlugin && typeof androidPlugin.deleteFile === 'function') {
      try {
        const res = await androidPlugin.deleteFile({
          uri: item.uri || item.savedUri || '',
          filename: item.name || '',
          relDir: item.relDir || ''
        });
        return res && res.success;
      } catch (e) {
        console.warn('Android deleteFile error:', e);
        return false;
      }
    }

    return false;
  },

  async readClipboard() {
    const androidPlugin = this.getAndroidPlugin();
    if (androidPlugin && typeof androidPlugin.readClipboard === 'function') {
      try {
        const res = await androidPlugin.readClipboard();
        if (res && typeof res.text === 'string' && res.text) {
          return res.text;
        }
      } catch (e) {
        console.warn('Android readClipboard error:', e);
      }
    }

    if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.read_clipboard === 'function') {
      try {
        const text = await window.pywebview.api.read_clipboard();
        if (text) return text;
      } catch (e) {
        console.warn('PyWebView read_clipboard error:', e);
      }
    }

    if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
      try {
        const text = await navigator.clipboard.readText();
        if (text) return text;
      } catch (e) {
        console.warn('navigator.clipboard error:', e);
      }
    }

    return '';
  },

  // ----------------------------------------------------
  // In-App Update Engine (Bilingual, Cross-Platform)
  // ----------------------------------------------------
  async checkForUpdates(currentVersion) {
    try {
      const repoUrl = 'https://api.github.com/repos/DidiRoyadi123/Gofile-pro/releases/latest';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8500);

      const resp = await fetch(repoUrl, {
        headers: { 'Accept': 'application/vnd.github.v3+json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!resp.ok) {
        throw new Error(`GitHub API HTTP ${resp.status}`);
      }

      const release = await resp.json();
      const latestTag = (release.tag_name || '').trim();
      const cleanCurrent = (currentVersion || '').replace(/^v/, '').trim();
      const cleanLatest = latestTag.replace(/^v/, '').trim();

      const isUpdateAvailable = this._compareVersions(cleanLatest, cleanCurrent) > 0;

      this.detectPlatform();
      const assets = release.assets || [];
      let matchedAsset = null;

      if (this.platform === 'android') {
        matchedAsset = assets.find(a => a.name.toLowerCase().endsWith('.apk'));
      } else if (this.platform === 'windows') {
        matchedAsset = assets.find(a => a.name.toLowerCase().endsWith('.exe'));
      }
      if (!matchedAsset && assets.length > 0) {
        matchedAsset = assets[0];
      }

      return {
        isUpdateAvailable,
        currentVersion,
        latestVersion: latestTag,
        releaseName: release.name || latestTag,
        releaseNotes: release.body || '',
        releaseUrl: release.html_url || 'https://github.com/DidiRoyadi123/Gofile-pro/releases/latest',
        publishedAt: release.published_at,
        asset: matchedAsset ? {
          name: matchedAsset.name,
          downloadUrl: matchedAsset.browser_download_url,
          size: matchedAsset.size
        } : null
      };
    } catch (e) {
      console.warn('Check update error:', e);
      return {
        isUpdateAvailable: false,
        error: e.message
      };
    }
  },

  _compareVersions(v1, v2) {
    if (!v1 || !v2) return 0;
    const parts1 = v1.split('.').map(n => parseInt(n, 10) || 0);
    const parts2 = v2.split('.').map(n => parseInt(n, 10) || 0);
    const len = Math.max(parts1.length, parts2.length);
    for (let i = 0; i < len; i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  },

  async canRequestPackageInstalls() {
    this.detectPlatform();
    if (this.platform === 'android') {
      const androidPlugin = this.getAndroidPlugin();
      if (androidPlugin && typeof androidPlugin.canRequestPackageInstalls === 'function') {
        try {
          const res = await androidPlugin.canRequestPackageInstalls();
          return res && res.canInstall !== false;
        } catch (e) {
          return true;
        }
      }
    }
    return true;
  },

  async openInstallPermissionSettings() {
    this.detectPlatform();
    if (this.platform === 'android') {
      const androidPlugin = this.getAndroidPlugin();
      if (androidPlugin && typeof androidPlugin.openInstallPermissionSettings === 'function') {
        return await androidPlugin.openInstallPermissionSettings();
      }
    }
    return false;
  },

  async installUpdate(filePath, uri = '') {
    this.detectPlatform();
    if (this.platform === 'android') {
      const androidPlugin = this.getAndroidPlugin();
      if (androidPlugin && typeof androidPlugin.installApk === 'function') {
        return await androidPlugin.installApk({ filePath, uri });
      }
    } else if (this.platform === 'windows') {
      if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.install_update === 'function') {
        const fullPath = (filePath && (filePath.includes('/') || filePath.includes('\\'))) ? filePath : `./downloads/${filePath}`;
        return await window.pywebview.api.install_update(fullPath);
      }
    } else {
      if (filePath && filePath.startsWith('http')) {
        window.open(filePath, '_blank');
        return true;
      }
    }
    return false;
  },

  async getMediaUrl(file) {
    this.detectPlatform();
    const filePath = (typeof file === 'string') ? file : (file.path || file.filePath || file.name || '');
    const fileUri = (typeof file === 'object' && file.uri) ? file.uri : '';

    if (this.platform === 'android') {
      const androidPlugin = this.getAndroidPlugin();
      if (androidPlugin && typeof androidPlugin.getMediaStreamUrl === 'function') {
        try {
          const res = await androidPlugin.getMediaStreamUrl({ uri: fileUri, filePath: filePath });
          if (res && res.url) return res.url;
        } catch (e) {
          console.warn('Android getMediaStreamUrl error:', e);
        }
      }
    } else if (this.platform === 'windows') {
      if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.get_media_url === 'function') {
        try {
          const res = await window.pywebview.api.get_media_url(filePath);
          if (res) return res;
        } catch (e) {
          console.warn('Windows get_media_url error:', e);
        }
      }
    }

    if (fileUri && (fileUri.startsWith('http://') || fileUri.startsWith('https://') || fileUri.startsWith('blob:'))) {
      return fileUri;
    }
    if (typeof file === 'object' && file.link) {
      return file.link;
    }
    return fileUri || filePath;
  },

  async setVideoPlaybackState(isPlaying, width = 16, height = 9) {
    this.detectPlatform();
    if (this.platform === 'android') {
      const androidPlugin = this.getAndroidPlugin();
      if (androidPlugin && typeof androidPlugin.setVideoPlaybackState === 'function') {
        try {
          return await androidPlugin.setVideoPlaybackState({
            playing: !!isPlaying,
            isPlaying: !!isPlaying,
            width: Math.max(1, Math.round(width || 16)),
            height: Math.max(1, Math.round(height || 9))
          });
        } catch (e) {
          console.warn('setVideoPlaybackState error:', e);
        }
      }
    }
    return false;
  },

  async enterPip(width = 16, height = 9) {
    this.detectPlatform();
    if (this.platform === 'android') {
      const androidPlugin = this.getAndroidPlugin();
      if (androidPlugin && typeof androidPlugin.enterPip === 'function') {
        try {
          const res = await androidPlugin.enterPip({
            width: Math.max(1, Math.round(width || 16)),
            height: Math.max(1, Math.round(height || 9))
          });
          return res && res.pip;
        } catch (e) {
          console.warn('enterPip error:', e);
        }
      }
    }
    return false;
  }
};

window.ApiBridge = ApiBridge;

window.addEventListener('pywebviewready', () => {
  ApiBridge.detectPlatform();
  console.log('PyWebView is ready, platform set to:', ApiBridge.platform);
  if (typeof window.updatePlatformBadge === 'function') {
    window.updatePlatformBadge();
  }
});

document.addEventListener('deviceready', () => {
  ApiBridge.detectPlatform();
  console.log('Device is ready, platform set to:', ApiBridge.platform);
  if (typeof window.updatePlatformBadge === 'function') {
    window.updatePlatformBadge();
  }
});
