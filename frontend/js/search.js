const Search = {
  debounceTimer: null,
  selectedIndex: -1,
  results: [],
  currentPreviewEntry: null,

  init() {
    const input = document.getElementById('search-input');
    if (!input) return;

    input.addEventListener('input', () => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.onInput(input.value), 150);
    });

    input.addEventListener('keydown', (e) => this.onKeydown(e));

    input.addEventListener('focus', () => {
      this.onInput(input.value);
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-wrapper') && !e.target.closest('.search-results')) this.close();
    });

    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        input.focus();
        input.select();
      }
      if (e.key === 'Escape' && document.activeElement === input) {
        this.close();
        input.blur();
      }
    });
  },

  onInput(query) {
    query = query.trim().toLowerCase();

    this.results = [];
    this.searchActions(query);

    if (!query) {
      this.selectedIndex = -1;
      this.renderResults();
      return;
    }

    this.searchFiles(query);
    this.searchFolders(query);
    this.searchModels(query);
    this.searchChecklist(query);
    this.searchHistory(query);

    if (this.results.length === 0) { this.close(); return; }
    this.selectedIndex = -1;
    this.renderResults();
  },

  _actions: [
    { id: 'new-file', name: 'New file' },
    { id: 'run-on', name: 'Run on models' },
    { id: 'settings', name: 'Open settings' },
    { id: 'clear-context', name: 'Clear context' },
    { id: 'history', name: 'View run history' }
  ],

  searchActions(q) {
    this._actions.forEach(a => {
      if (!q || a.name.toLowerCase().includes(q)) {
        this.results.push({ type: 'action', name: a.name, item: a });
      }
    });
  },

  searchFiles(q) {
    const projectFileNames = new Set((App.state.files || []).filter(f => !f.trashed).map(f => f.name + '.md'));

    (App.state.files || []).forEach(f => {
      if (f.trashed) return;
      if (f.name.toLowerCase().includes(q) || (f.content || '').toLowerCase().includes(q)) {
        this.results.push({ type: 'file', name: f.name + '.md', item: f, stateFile: true });
      }
    });

    const walk = (entries) => {
      (entries || []).forEach(e => {
        if (!e.isDir && e.name.toLowerCase().includes(q)) {
          if (!projectFileNames.has(e.name)) {
            this.results.push({ type: 'file', name: e.name, item: e, path: e.path });
          }
        }
        if (e.isDir) walk(e.children);
      });
    };
    walk(App.state.dirTree || []);
  },

  searchFolders(q) {
    const walk = (entries) => {
      (entries || []).forEach(e => {
        if (e.isDir && e.name.toLowerCase().includes(q)) {
          this.results.push({ type: 'folder', name: e.name, item: e, path: e.path });
        }
        if (e.isDir) walk(e.children);
      });
    };
    walk(App.state.dirTree || []);
  },

  searchModels(q) {
    const allProviders = ProviderBase.getAll();
    Object.entries(allProviders).forEach(([name, provider]) => {
      const models = ProviderBase.getModels(name);
      models.forEach(m => {
        if (m.name.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q)) {
          this.results.push({ type: 'model', name: m.name, item: m });
        }
      });
    });
  },

  searchChecklist(q) {
    const project = App.getCurrentProject();
    if (!project || !project.checklist) return;
    project.checklist.forEach(item => {
      if (item.text.toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q)) {
        this.results.push({ type: 'task', name: item.text, item: item });
      }
    });
  },

  searchHistory(q) {
    (App.state.runHistory || []).forEach(r => {
      const name = (r.alias || r.modelName || '').toLowerCase();
      const spec = (r.specNames || []).join(' ').toLowerCase();
      if (name.includes(q) || spec.includes(q)) {
        this.results.push({ type: 'history', name: `${r.specNames?.[0] || 'spec'} → ${r.alias || r.modelName}`, item: r });
      }
    });
  },

  renderResults() {
    const dropdown = document.getElementById('search-results');
    if (!dropdown) return;

    const grouped = {};
    const order = ['action', 'file', 'folder', 'model', 'task', 'history'];
    const labels = { action: 'Actions', file: 'Files', folder: 'Folders', model: 'Models', task: 'Tasks', history: 'History' };
    const icons = {
      file: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>',
      folder: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
      model: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
      task: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      history: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
    };

    const btnOpen = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
    const btnContext = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';

    this.results.forEach((r, i) => {
      if (!grouped[r.type]) grouped[r.type] = [];
      grouped[r.type].push({ ...r, globalIndex: i });
    });

    let html = '';
    order.forEach(type => {
      if (!grouped[type] || grouped[type].length === 0) return;
      html += `<div class="search-category"><span class="search-category-label">${labels[type]}</span>`;
      grouped[type].forEach(r => {
        let pathHtml = '';
        let actionsHtml = '';

        if (r.type === 'file') {
          if (r.stateFile) {
            const project = App.getCurrentProject();
            pathHtml = `<span class="search-item-path">${project ? project.name : 'Project'}</span>`;
          } else if (r.path) {
            const project = App.getCurrentProject();
            let relPath = r.path;
            if (project?.path && r.path.startsWith(project.path)) {
              relPath = r.path.substring(project.path.length).replace(/^\//, '');
            }
            pathHtml = `<span class="search-item-path">${relPath}</span>`;
          }
          actionsHtml = `<button class="search-item-btn" data-action="open-editor" data-index="${r.globalIndex}" title="Abrir no editor">${btnOpen}</button><button class="search-item-btn" data-action="add-context" data-index="${r.globalIndex}" title="Adicionar ao contexto">${btnContext}</button>`;
        } else if (r.type === 'folder') {
          if (r.path) {
            const project = App.getCurrentProject();
            let relPath = r.path;
            if (project?.path && r.path.startsWith(project.path)) {
              relPath = r.path.substring(project.path.length).replace(/^\//, '');
            }
            pathHtml = `<span class="search-item-path">${relPath}</span>`;
          }
          actionsHtml = `<button class="search-item-btn" data-action="add-context" data-index="${r.globalIndex}" title="Adicionar ao contexto">${btnContext}</button>`;
        } else if (r.type === 'model') {
          pathHtml = `<span class="search-item-path">${r.item.provider}</span>`;
          actionsHtml = `<button class="search-item-btn" data-action="select-model" data-index="${r.globalIndex}" title="Selecionar modelo">${btnContext}</button>`;
        } else if (r.type === 'task') {
          actionsHtml = `<button class="search-item-btn" data-action="add-context" data-index="${r.globalIndex}" title="Adicionar ao contexto">${btnContext}</button>`;
        } else if (r.type === 'history') {
          actionsHtml = `<button class="search-item-btn" data-action="re-run" data-index="${r.globalIndex}" title="Reabrir">${btnOpen}</button>`;
        }

        html += `<div class="search-item" data-index="${r.globalIndex}" data-type="${r.type}">${icons[r.type]}<div class="search-item-text"><span class="search-item-name">${r.name}</span>${pathHtml}</div><div class="search-item-actions">${actionsHtml}</div></div>`;
      });
      html += '</div>';
    });

    dropdown.innerHTML = html;
    dropdown.classList.add('active');

    dropdown.querySelectorAll('.search-item').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.search-item-btn')) return;
        const idx = parseInt(el.dataset.index);
        this.openItem(this.results[idx]);
      });
    });

    dropdown.querySelectorAll('.search-item-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index);
        const result = this.results[idx];
        const action = btn.dataset.action;
        if (!result) return;

        if (action === 'open-editor') {
          this.openItem(result);
        } else if (action === 'add-context') {
          this.addToContext(result);
        } else if (action === 'select-model') {
          if (result.item) {
            Models.startRun(result.item);
            Notifications.show(`${result.item.name} selected`);
          }
        } else if (action === 're-run') {
          this.openItem(result);
        }
      });
    });
  },

  onKeydown(e) {
    const dropdown = document.getElementById('search-results');
    if (!dropdown || !dropdown.classList.contains('active')) return;

    const items = dropdown.querySelectorAll('.search-item');
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selectedIndex = Math.min(this.selectedIndex + 1, items.length - 1);
      this.highlightItem(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
      this.highlightItem(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (this.selectedIndex >= 0 && this.results[this.selectedIndex]) {
        this.openItem(this.results[this.selectedIndex]);
      }
    }
  },

  highlightItem(items) {
    items.forEach((el, i) => {
      el.classList.toggle('selected', i === this.selectedIndex);
    });
    if (items[this.selectedIndex]) {
      items[this.selectedIndex].scrollIntoView({ block: 'nearest' });
    }
  },

  openItem(result) {
    if (!result) return;
    this.close();

    switch (result.type) {
      case 'action': {
        const id = result.item.id;
        if (id === 'new-file') {
          Modals.open('modal-new-file');
          setTimeout(() => document.getElementById('input-file-name')?.focus(), 100);
        } else if (id === 'run-on') {
          Models.showRunModal();
        } else if (id === 'settings') {
          Modals.openSettings();
        } else if (id === 'clear-context') {
          FileExplorer.clearAll();
        } else if (id === 'history') {
          Models.showHistory();
        }
        break;
      }
      case 'file':
        if (result.stateFile && result.item.id) {
          Files.openFile(result.item.id);
        } else {
          this.showFilePreview(result.item);
        }
        break;
      case 'folder':
        this.showFolderPreview(result.item);
        break;
      case 'model':
        this.showModelInfo(result.item);
        break;
      case 'task':
        Modals.open('modal-run');
        setTimeout(() => {
          const input = document.getElementById('chat-input') || document.getElementById('prompt-input');
          if (input) {
            const text = result.item.text + (result.item.description ? '\n\n' + result.item.description : '');
            input.value = text;
          }
        }, 200);
        break;
      case 'history':
        Models.openHistoryChat(result.item);
        break;
    }
  },

  addToContext(result) {
    if (result.type === 'folder') {
      FileExplorer.selectFolder(result.item.path);
      Notifications.show(`${result.item.name} folder added to context`);
    } else if (result.type === 'file' && result.stateFile) {
      FileExplorer.selectSpec(result.item.id);
      Notifications.show(`${result.item.name}.md added to context`);
    } else if (result.type === 'file') {
      FileExplorer.selectFile(result.item.path);
      Notifications.show(`${result.item.name} added to context`);
    }
  },

  async showFilePreview(fileEntry) {
    this.currentPreviewEntry = fileEntry;
    let content, info;
    if (App.isWails) {
      [content, info] = await Promise.all([
        window.go.main.App.ReadFileContent(fileEntry.path),
        window.go.main.App.GetFileInfo(fileEntry.path)
      ]);
    } else {
      content = '(local preview not available)';
      info = { name: fileEntry.name, path: fileEntry.path, size: fileEntry.size, modified: fileEntry.modified };
    }

    document.getElementById('file-preview-name').textContent = info.name;
    document.getElementById('file-preview-path').textContent = info.path;
    document.getElementById('file-preview-size').textContent = Search.formatSize(info.size);
    document.getElementById('file-preview-date').textContent = new Date(info.modified).toLocaleDateString();
    document.getElementById('file-preview-content').textContent = content;

    const btnContext = document.getElementById('btn-file-preview-context');
    const btnEditor = document.getElementById('btn-file-preview-editor');

    if (btnContext) {
      btnContext.onclick = () => {
        const isSpec = fileEntry.name.endsWith('.md');
        if (isSpec) {
          const file = App.state.files.find(f => f.name === fileEntry.name.replace('.md', ''));
          if (file) {
            FileExplorer.selectSpec(file.id);
            Notifications.show(`${fileEntry.name} added to context`);
            Modals.close('modal-file-preview');
            return;
          }
        }
        FileExplorer.selectFile(fileEntry.path);
        Notifications.show(`${fileEntry.name} added to context`);
        Modals.close('modal-file-preview');
      };
    }

    if (btnEditor) {
      const isSpec = fileEntry.name.endsWith('.md');
      if (isSpec) {
        const file = App.state.files.find(f => f.name === fileEntry.name.replace('.md', ''));
        if (file) {
          btnEditor.style.display = '';
          btnEditor.onclick = () => {
            Files.openFile(file.id);
            Modals.close('modal-file-preview');
          };
        } else {
          btnEditor.style.display = 'none';
        }
      } else {
        btnEditor.style.display = 'none';
      }
    }

    Modals.open('modal-file-preview');
  },

  async showFolderPreview(folderEntry) {
    this.currentPreviewEntry = folderEntry;
    const info = App.isWails
      ? await window.go.main.App.GetFileInfo(folderEntry.path)
      : { name: folderEntry.name, path: folderEntry.path, items: (folderEntry.children || []).length, modified: new Date().toISOString() };

    document.getElementById('folder-preview-name').textContent = info.name;
    document.getElementById('folder-preview-path').textContent = info.path;
    document.getElementById('folder-preview-items').textContent = (info.items || 0) + ' items';
    document.getElementById('folder-preview-date').textContent = new Date(info.modified).toLocaleDateString();

    const list = document.getElementById('folder-preview-list');
    if (list) {
      const children = folderEntry.children || [];
      const fileIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>';
      const folderIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';
      list.innerHTML = children.length === 0
        ? '<div class="search-empty">Empty folder</div>'
        : children.map(c => `<div class="folder-preview-item">${c.isDir ? folderIcon : fileIcon} ${c.name}</div>`).join('');
    }

    const btnContext = document.getElementById('btn-folder-preview-context');
    if (btnContext) {
      btnContext.onclick = () => {
        FileExplorer.selectFolder(folderEntry.path);
        Notifications.show(`${folderEntry.name} folder added to context`);
        Modals.close('modal-folder-preview');
      };
    }

    Modals.open('modal-folder-preview');
  },

  showModelInfo(model) {
    document.getElementById('model-info-name').textContent = model.name;
    document.getElementById('model-info-provider').textContent = model.provider;
    document.getElementById('model-info-desc').textContent = model.description || '';
    document.getElementById('model-info-id').textContent = model.id;

    const history = (App.state.runHistory || []).filter(r => r.modelId === model.id);
    const list = document.getElementById('model-info-history');
    if (list) {
      list.innerHTML = history.length === 0
        ? '<div class="search-empty">No runs yet</div>'
        : history.slice(0, 10).map(r => `
            <div class="model-info-history-item">
              <span>${r.specNames?.[0] || r.specName || 'spec'}</span>
              <span class="model-info-history-time">${Models.timeAgo(r.finished || r.started)}</span>
            </div>
          `).join('');
    }

    Modals.open('modal-model-info');
  },

  close() {
    document.getElementById('search-results')?.classList.remove('active');
    document.getElementById('dropdown-overlay')?.classList.remove('active');
    const input = document.getElementById('search-input');
    if (input) input.value = '';
    this.selectedIndex = -1;
  },

  formatSize(bytes) {
    if (!bytes) return '0 B';
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return bytes + ' B';
  }
};
