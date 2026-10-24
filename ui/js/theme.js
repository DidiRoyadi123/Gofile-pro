/**
 * GoFile Pro Downloader - Theme Manager (Dark & Light Mode)
 * Provides seamless theme switching, system auto-detection, and local persistence.
 */

const ThemeManager = {
  themeSetting: 'auto', // 'auto' | 'dark' | 'light'
  activeTheme: 'dark',

  init() {
    const saved = localStorage.getItem('gf_theme') || 'auto';
    this.themeSetting = saved;
    this.applyTheme(saved);

    // Watch for system theme changes if in 'auto' mode
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => {
        if (this.themeSetting === 'auto') {
          this.applyTheme('auto');
        }
      };
      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', listener);
      } else if (typeof mediaQuery.addListener === 'function') {
        mediaQuery.addListener(listener);
      }
    }
  },

  resolveTheme(setting) {
    if (setting === 'dark' || setting === 'light') {
      return setting;
    }
    // Auto mode: check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  },

  applyTheme(setting) {
    this.themeSetting = setting;
    localStorage.setItem('gf_theme', setting);
    const resolved = this.resolveTheme(setting);
    this.activeTheme = resolved;

    document.documentElement.setAttribute('data-theme', resolved);

    // Update Header Toggle Icon
    const darkIcon = document.querySelector('.theme-icon-dark');
    const lightIcon = document.querySelector('.theme-icon-light');
    if (darkIcon && lightIcon) {
      if (resolved === 'dark') {
        darkIcon.style.display = 'block';
        lightIcon.style.display = 'none';
      } else {
        darkIcon.style.display = 'none';
        lightIcon.style.display = 'block';
      }
    }

    // Update Settings Radio / Select if available
    const settingSelect = document.getElementById('setting-theme');
    if (settingSelect && settingSelect.value !== setting) {
      settingSelect.value = setting;
    }
  },

  toggleTheme() {
    // If currently dark, switch to light; if currently light, switch to dark
    const nextTheme = this.activeTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(nextTheme);
  }
};

window.ThemeManager = ThemeManager;
