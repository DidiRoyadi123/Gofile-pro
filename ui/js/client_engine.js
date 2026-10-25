/**
 * GoFile Pro Client-Side Engine
 * Implements the complete GoFile protocol in standard JavaScript
 * Compatible with modern Web Browsers, Android WebView, and Capacitor
 */

class GoFileClientEngine {
  constructor(options = {}) {
    this.userAgent = options.userAgent || navigator.userAgent || 'Mozilla/5.0';
    this.accountToken = options.accountToken || localStorage.getItem('gf_token') || '';
    this.timeout = options.timeout || 15000;
    this.retries = options.retries || 5;
    this.chunkSize = options.chunkSize || 2097152;
    this.stopRequested = false;
  }

  /**
   * Calculates SHA-256 hash using native Web Crypto API
   */
  async sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generates dynamic X-Website-Token required by GoFile API
   */
  async generateWebsiteToken(accountToken = '', windowOffset = 0) {
    const timeSlot = Math.floor(Date.now() / 1000 / 14400) + windowOffset;
    const raw = `${this.userAgent}::en-US::${accountToken}::${timeSlot}::12af056dacea0b`;
    return await this.sha256(raw);
  }

  /**
   * Helper to perform fetch with strict timeout using AbortController
   */
  async fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return response;
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error('Koneksi timeout (server GoFile tidak merespons dalam 8 detik). Pastikan VPN / 1.1.1.1 WARP aktif.');
      }
      throw err;
    }
  }

  /**
   * Ensures an account token is available, creating guest token if none exists
   */
  async ensureAccountToken() {
    if (this.accountToken) {
      return this.accountToken;
    }

    const wt = await this.generateWebsiteToken('');
    let res;
    try {
      res = await this.fetchWithTimeout('https://api.gofile.io/accounts', {
        method: 'POST',
        headers: {
          'X-Website-Token': wt,
          'X-BL': 'en-US',
          'Origin': 'https://gofile.io',
          'Referer': 'https://gofile.io/',
        }
      }, 8000);
    } catch (e) {
      throw new Error(`Gagal menghubungi server GoFile: ${e.message}`);
    }

    if (!res.ok) {
      throw new Error(`Failed to create guest account (HTTP ${res.status})`);
    }

    const data = await res.json();
    if (data.status === 'ok' && data.data && data.data.token) {
      this.accountToken = data.data.token;
      localStorage.setItem('gf_token', this.accountToken);
      return this.accountToken;
    }

    throw new Error('Invalid account response from GoFile API');
  }

  /**
   * Parses content ID from URL or ID string
   */
  parseContentId(urlOrId) {
    if (!urlOrId) return '';
    const clean = urlOrId.trim().split('#')[0].split('?')[0].replace(/\/+$/, '');
    const parts = clean.split('/');
    return parts[parts.length - 1];
  }

  guessMimeType(filename) {
    if (!filename) return 'application/octet-stream';
    const clean = filename.split('?')[0].split('#')[0].trim().toLowerCase();
    const ext = clean.substring(clean.lastIndexOf('.') + 1);
    const map = {
      'mp4': 'video/mp4', 'm4v': 'video/mp4', 'mkv': 'video/x-matroska',
      'webm': 'video/webm', 'avi': 'video/x-msvideo', 'mov': 'video/quicktime',
      'flv': 'video/x-flv', 'wmv': 'video/x-ms-wmv', '3gp': 'video/3gpp',
      'ts': 'video/mp2t', 'mts': 'video/mp2t', 'm2ts': 'video/mp2t',
      'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
      'webp': 'image/webp', 'gif': 'image/gif', 'svg': 'image/svg+xml',
      'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'flac': 'audio/flac', 'aac': 'audio/aac',
      'zip': 'application/zip', 'rar': 'application/x-rar-compressed', '7z': 'application/x-7z-compressed',
      'pdf': 'application/pdf'
    };
    return map[ext] || 'application/octet-stream';
  }

  /**
   * Inspects a GoFile link and returns full content tree and files list
   */
  async inspectContent(urlOrId, password = '') {
    await this.ensureAccountToken();
    const contentId = this.parseContentId(urlOrId);
    let hashedPassword = '';
    if (password) {
      hashedPassword = await this.sha256(password);
    }

    const files = [];
    let totalSize = 0;

    const traverse = async (parentDir, cid) => {
      let apiUrl = `https://api.gofile.io/contents/${cid}?contentFilter=&page=1&pageSize=1000&sortField=createTime&sortDirection=-1`;
      if (hashedPassword) {
        apiUrl += `&password=${hashedPassword}`;
      }

      const offsets = [0, -1, 1];
      let json = null;
      let lastErr = '';

      for (const offset of offsets) {
        const wt = await this.generateWebsiteToken(this.accountToken, offset);
        try {
          const res = await this.fetchWithTimeout(apiUrl, {
            headers: {
              'Authorization': `Bearer ${this.accountToken}`,
              'X-Website-Token': wt,
              'X-BL': 'en-US',
              'Origin': 'https://gofile.io',
              'Referer': 'https://gofile.io/'
            }
          }, 8000);

          if (!res.ok) {
            lastErr = `HTTP ${res.status}`;
            continue;
          }

          const parsed = await res.json();
          if (parsed.status === 'ok') {
            json = parsed;
            break;
          } else if (parsed.status === 'error-notPremium') {
            lastErr = parsed.status;
            continue;
          } else {
            throw new Error(`GoFile returned: ${parsed.status}`);
          }
        } catch (err) {
          lastErr = err.message;
        }
      }

      if (!json) {
        throw new Error(`Failed to fetch GoFile content (${lastErr})`);
      }

      const data = json.data;
      if (data.password && data.passwordStatus !== 'passwordOk') {
        throw new Error('PASSWORD_REQUIRED');
      }

      if (data.type !== 'folder') {
        const rawMime = data.mimetype || data.mimeType || '';
        const effectiveMime = (rawMime && rawMime !== 'application/octet-stream') ? rawMime : this.guessMimeType(data.name || '');
        const fileObj = {
          id: data.id || cid,
          name: data.name || `file_${cid}`,
          relDir: parentDir,
          size: data.size || 0,
          link: data.link,
          mimetype: effectiveMime,
          md5: data.md5 || ''
        };
        totalSize += fileObj.size;
        files.push(fileObj);
        return;
      }

      const folderName = data.name || cid;
      const currentDir = parentDir ? `${parentDir}/${folderName}` : folderName;

      const children = data.children ? Object.values(data.children) : [];
      for (const child of children) {
        if (child.type === 'folder') {
          await traverse(currentDir, child.id);
        } else {
          const rawChildMime = child.mimetype || child.mimeType || '';
          const effectiveChildMime = (rawChildMime && rawChildMime !== 'application/octet-stream') ? rawChildMime : this.guessMimeType(child.name || '');
          const fileObj = {
            id: child.id,
            name: child.name,
            relDir: currentDir,
            size: child.size || 0,
            link: child.link,
            mimetype: effectiveChildMime,
            md5: child.md5 || ''
          };
          totalSize += fileObj.size;
          files.push(fileObj);
        }
      }
    };

    await traverse('', contentId);

    return {
      contentId,
      url: urlOrId,
      totalFiles: files.length,
      totalSize,
      files
    };
  }

  /**
   * Downloads a file streamingly with progress callback (in-browser or Capacitor)
   */
  async downloadFile(item, onProgress) {
    this.stopRequested = false;
    const url = item.link;

    try {
      // Trigger browser/mobile download
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.accountToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : item.size;
      let loaded = 0;
      const startTime = performance.now();

      const reader = response.body.getReader();
      const chunks = [];

      while (true) {
        if (this.stopRequested) {
          reader.cancel();
          throw new Error('Download cancelled');
        }

        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        loaded += value.length;

        const now = performance.now();
        const elapsedSec = (now - startTime) / 1000;
        const speed = elapsedSec > 0 ? (loaded / elapsedSec) : 0;
        const pct = total > 0 ? (loaded / total) * 100 : 0;

        if (onProgress) {
          onProgress({
            id: item.id,
            filename: item.name,
            status: 'downloading',
            progress: Math.min(100, Math.round(pct * 10) / 10),
            downloaded: loaded,
            total,
            speed
          });
        }
      }

      const blob = new Blob(chunks, { type: item.mimetype || 'application/octet-stream' });
      const downloadUrl = URL.createObjectURL(blob);

      // Trigger automatic save to device
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 30000);

      if (onProgress) {
        onProgress({
          id: item.id,
          filename: item.name,
          status: 'completed',
          progress: 100,
          downloaded: total,
          total,
          speed: 0
        });
      }
      return true;
    } catch (err) {
      if (onProgress) {
        onProgress({
          id: item.id,
          filename: item.name,
          status: 'failed',
          message: err.message
        });
      }
      return false;
    }
  }

  stopAll() {
    this.stopRequested = true;
  }
}

window.GoFileClientEngine = GoFileClientEngine;
