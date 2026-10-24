/**
 * GoFile Pro Universal API Bridge
 * Seamlessly abstracts PyWebView (Windows), Capacitor Native Downloader (Android), and Web Browser
 */

const ApiBridge = {
  clientEngine: null,
  platform: 'web',

  async init() {
    try {
      if (window.GoFileClientEngine) {
        this.clientEngine = new window.GoFileClientEngine();
      }
    } catch (e) {
      console.warn('Could not instantiate GoFileClientEngine:', e);
    }

    this.detectPlatform();
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
        readClipboard: () => window.Capacitor.nativePromise('AndroidDownloader', 'readClipboard', {}),
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
      return await window.pywebview.api.download_file(item, downloadDir);
    }

    // 2. Android Native (Capacitor Java Plugin)
    const androidPlugin = this.getAndroidPlugin();
    if (androidPlugin && typeof androidPlugin.downloadFile === 'function') {
      let progressSub = null;
      try {
        if (typeof androidPlugin.addListener === 'function') {
          progressSub = await androidPlugin.addListener('downloadProgress', (prog) => {
            if (prog && prog.id === item.id) {
              if (onProgress) onProgress(prog);
            }
          });
        }

        let token = localStorage.getItem('gf_token') || '';
        const res = await androidPlugin.downloadFile({
          id: item.id,
          url: item.link,
          filename: item.name,
          token: token || '',
          relDir: item.relDir || item.rel_dir || '',
          mimetype: item.mimetype || '',
          size: item.size || 0,
          md5: item.md5 || ''
        });

        if (res && res.filename) {
          item.name = res.filename;
        }
        if (res && res.uri) {
          item.savedUri = res.uri;
        }
        return true;
      } finally {
        if (progressSub && typeof progressSub.remove === 'function') {
          try {
            progressSub.remove();
          } catch (ignored) {}
        }
      }
    }

    // 3. Web Browser Fallback
    if (this.clientEngine) {
      return await this.clientEngine.downloadFile(item, onProgress);
    }
    throw new Error('Tidak ada mesin pengunduh yang aktif');
  },

  async checkFileExists(filename, relDir = '') {
    this.detectPlatform();
    const androidPlugin = this.getAndroidPlugin();
    if (androidPlugin && typeof androidPlugin.checkFileExists === 'function') {
      try {
        const res = await androidPlugin.checkFileExists({ filename, relDir });
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
        const uri = (item && item.savedUri) || '';
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
        return (res && res.files) || [];
      } catch (e) {
        console.warn('Android listDownloadedFiles error:', e);
        return [];
      }
    }

    return [];
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
