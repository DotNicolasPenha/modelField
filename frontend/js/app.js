const App = {
  state: {
    projects: [],
    currentProject: null,
    files: [],
    openFiles: [],
    activeFile: null,
    apiKeys: {},
    modelAliases: [],
    runHistory: []
  },

  isWails: typeof window.go !== 'undefined',

  async init() {
    await this.loadState();
    this.initDarkMode();
    Projects.init();
    Files.init();
    Editor.init();
    Models.init();
    Modals.init();
    Checklist.init();
    Checklist.render();
    this.updateCounts();
  },

  _saveLocal() {
    try {
      localStorage.setItem('modelfield-state', JSON.stringify({
        projects: this.state.projects,
        currentProject: this.state.currentProject,
        files: this.state.files,
        apiKeys: this.state.apiKeys,
        modelAliases: this.state.modelAliases,
        runHistory: this.state.runHistory
      }));
    } catch (e) {
      console.warn('Failed to save state:', e);
    }
  },

  async loadState() {
    if (this.isWails) {
      try {
        this.state.projects = await window.go.main.App.GetProjects() || [];
        this.state.apiKeys = await window.go.main.App.GetAPIKeys() || {};
        this.state.files = await window.go.main.App.GetFiles() || [];
        this.state.modelAliases = await window.go.main.App.GetModelAliases() || [];
        this.state.runHistory = await window.go.main.App.GetRunHistory() || [];
        const saved = localStorage.getItem('modelfield-currentProject');
        if (saved) this.state.currentProject = saved;
      } catch (e) {
        console.warn('Failed to load state from Go:', e);
      }
    } else {
      try {
        const saved = localStorage.getItem('modelfield-state');
        if (saved) {
          const parsed = JSON.parse(saved);
          this.state.projects = parsed.projects || [];
          this.state.currentProject = parsed.currentProject || null;
          this.state.files = parsed.files || [];
          this.state.apiKeys = parsed.apiKeys || {};
          this.state.modelAliases = parsed.modelAliases || [];
          this.state.runHistory = parsed.runHistory || [];
        }
      } catch (e) {
        console.warn('Failed to load state:', e);
      }
    }
  },

  async saveState() {
    if (this.isWails) {
      try {
        await window.go.main.App.SaveFiles(this.state.files);
      } catch (e) {
        console.warn('Failed to save files to Go:', e);
      }
    } else {
      this._saveLocal();
    }
  },

  async saveProjects() {
    if (this.isWails) {
      try {
        for (const p of this.state.projects) {
          await window.go.main.App.SaveProject(p);
        }
      } catch (e) {
        console.warn('Failed to save projects to Go:', e);
      }
    } else {
      this._saveLocal();
    }
  },

  async saveCurrentProject() {
    if (this.isWails) {
      localStorage.setItem('modelfield-currentProject', this.state.currentProject || '');
    } else {
      this._saveLocal();
    }
  },

  async saveAPIKeys() {
    if (this.isWails) {
      try {
        await window.go.main.App.SaveAPIKeys(this.state.apiKeys);
      } catch (e) {
        console.warn('Failed to save API keys to Go:', e);
      }
    } else {
      this._saveLocal();
    }
  },

  async saveModelAliases() {
    if (this.isWails) {
      try {
        await window.go.main.App.SaveModelAliases(this.state.modelAliases);
      } catch (e) {
        console.warn('Failed to save model aliases to Go:', e);
      }
    } else {
      this._saveLocal();
    }
  },

  async saveRunHistory() {
    if (this.isWails) {
      try {
        await window.go.main.App.SaveRunHistory(this.state.runHistory);
      } catch (e) {
        console.warn('Failed to save run history to Go:', e);
      }
    } else {
      this._saveLocal();
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

    const projectFiles = this.getProjectFiles();
    if (filesCount) filesCount.textContent = projectFiles.length;
    if (runningCount) runningCount.textContent = Models.running.filter(r => r.status === 'running').length;
    if (finishedCount) finishedCount.textContent = Models.running.filter(r => r.status === 'finished').length;
  },

  getProjectFiles() {
    if (!this.state.currentProject) return [];
    return this.state.files.filter(f => f.projectId === this.state.currentProject);
  },

  getCurrentProject() {
    return this.state.projects.find(p => p.id === this.state.currentProject) || null;
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
