const App = {
  state: {
    files: [],
    openFiles: [],
    activeFile: null,
    apiKeys: {}
  },

  init() {
    this.loadState();
    this.initDarkMode();
    Files.init();
    Editor.init();
    Models.init();
    Modals.init();
    this.updateCounts();
  },

  loadState() {
    try {
      const saved = localStorage.getItem('modelfield-state');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.state.files = parsed.files || [];
        this.state.apiKeys = parsed.apiKeys || {};
      }
    } catch (e) {
      console.warn('Failed to load state:', e);
    }
  },

  saveState() {
    try {
      localStorage.setItem('modelfield-state', JSON.stringify({
        files: this.state.files,
        apiKeys: this.state.apiKeys
      }));
    } catch (e) {
      console.warn('Failed to save state:', e);
    }
  },

  initDarkMode() {
    const saved = localStorage.getItem('modelfield-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (saved === 'dark' || (!saved && prefersDark)) {
      document.documentElement.classList.add('dark');
    }

    this.updateThemeIcon();

    document.getElementById('btn-theme')?.addEventListener('click', () => {
      document.documentElement.classList.toggle('dark');
      const isDark = document.documentElement.classList.contains('dark');
      localStorage.setItem('modelfield-theme', isDark ? 'dark' : 'light');
      this.updateThemeIcon();
    });
  },

  updateThemeIcon() {
    const isDark = document.documentElement.classList.contains('dark');
    const btn = document.getElementById('btn-theme');
    if (!btn) return;
    btn.innerHTML = isDark
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  },

  updateCounts() {
    const filesCount = document.getElementById('files-count');
    const runningCount = document.getElementById('running-count');
    const finishedCount = document.getElementById('finished-count');

    if (filesCount) filesCount.textContent = this.state.files.length;
    if (runningCount) runningCount.textContent = Models.running.filter(r => r.status === 'running').length;
    if (finishedCount) finishedCount.textContent = Models.running.filter(r => r.status === 'finished').length;
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
