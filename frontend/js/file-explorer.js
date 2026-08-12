const FileExplorer = {
  expandedDirs: new Set(),

  icons: {
    spec: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    file: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>',
    folder: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>'
  },

  renderContext() {
    const panel = document.getElementById('context-items');
    const countEl = document.getElementById('context-count');
    if (!panel) return;

    const specs = App.state.selectedSpecs || [];
    const files = App.state.selectedFiles || [];
    const total = specs.length + files.length;

    if (countEl) countEl.textContent = total ? total : '';

    if (total === 0) {
      panel.innerHTML = '<div class="checklist-empty">No context selected</div>';
      return;
    }

    let html = '';
    specs.forEach(id => {
      const file = App.state.files.find(f => f.id === id);
      if (!file || file.trashed) return;
      html += `<div class="context-item" data-type="spec" data-id="${file.id}">
        <span class="context-item-icon">${this.icons.spec}</span>
        <span class="context-item-name">${file.name}.md</span>
        <span class="context-item-badge">spec</span>
        <button class="context-item-remove" data-type="spec" data-id="${file.id}">×</button>
      </div>`;
    });

    files.forEach(path => {
      const name = path.split('/').pop();
      html += `<div class="context-item" data-type="file" data-path="${path}">
        <span class="context-item-icon">${this.icons.file}</span>
        <span class="context-item-name">${name}</span>
        <span class="context-item-badge">file</span>
        <button class="context-item-remove" data-type="file" data-path="${path}">×</button>
      </div>`;
    });

    panel.innerHTML = html;

    panel.querySelectorAll('.context-item-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = btn.dataset.type;
        if (type === 'spec') this.deselectSpec(btn.dataset.id);
        else this.deselectFile(btn.dataset.path);
      });
    });
  },

  selectSpec(fileId) {
    if (!App.state.selectedSpecs) App.state.selectedSpecs = [];
    if (!App.state.selectedSpecs.includes(fileId)) {
      App.state.selectedSpecs.push(fileId);
      this.renderContext();
      App.saveContext();
    }
  },

  deselectSpec(fileId) {
    App.state.selectedSpecs = (App.state.selectedSpecs || []).filter(id => id !== fileId);
    this.renderContext();
    App.saveContext();
  },

  selectFile(path) {
    if (!App.state.selectedFiles) App.state.selectedFiles = [];
    if (!App.state.selectedFiles.includes(path)) {
      App.state.selectedFiles.push(path);
      this.renderContext();
      App.saveContext();
    }
  },

  deselectFile(path) {
    App.state.selectedFiles = (App.state.selectedFiles || []).filter(p => p !== path);
    this.renderContext();
    App.saveContext();
  },

  clearAll() {
    App.state.selectedSpecs = [];
    App.state.selectedFiles = [];
    this.renderContext();
    App.saveContext();
    Notifications.show('Context cleared');
  },

  getContext() {
    const specs = (App.state.selectedSpecs || []).map(id => {
      const f = App.state.files.find(f => f.id === id);
      return f && !f.trashed ? { name: f.name + '.md', content: f.content, type: 'spec' } : null;
    }).filter(Boolean);

    const files = (App.state.selectedFiles || []).map(path => {
      const name = path.split('/').pop();
      let content = '';
      const diskFileId = 'disk://' + path;
      const diskFile = App.state.diskCache && App.state.diskCache[diskFileId];
      if (diskFile) {
        content = diskFile.content || '';
      }
      return { name, path, content, type: 'file' };
    });

    return [...specs, ...files];
  }
};
