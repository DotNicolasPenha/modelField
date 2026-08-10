const FileBrowser = {
  filter: 'all',
  expandedDirs: new Set(),

  icons: {
    file: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>',
    folder: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
    folderOpen: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
    spec: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    chevron: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>',
    plus: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    open: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
    trash: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    restore: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>'
  },

  init() {
    document.getElementById('file-browser-filter-all')?.addEventListener('click', () => this.setFilter('all'));
    document.getElementById('file-browser-filter-md')?.addEventListener('click', () => this.setFilter('md'));
    document.getElementById('file-browser-filter-specs')?.addEventListener('click', () => this.setFilter('specs'));
    document.getElementById('file-browser-filter-trash')?.addEventListener('click', () => this.setFilter('trash'));
  },

  setFilter(filter) {
    this.filter = filter;
    this.expandedDirs.clear();
    document.getElementById('file-browser-filter-all')?.classList.toggle('active', filter === 'all');
    document.getElementById('file-browser-filter-md')?.classList.toggle('active', filter === 'md');
    document.getElementById('file-browser-filter-specs')?.classList.toggle('active', filter === 'specs');
    document.getElementById('file-browser-filter-trash')?.classList.toggle('active', filter === 'trash');
    this.render();
  },

  toggleDir(path) {
    if (this.expandedDirs.has(path)) {
      this.expandedDirs.delete(path);
    } else {
      this.expandedDirs.add(path);
    }
    this.render();
  },

  hasMdDescendant(entry) {
    if (!entry.isDir) return entry.name.endsWith('.md');
    if (!entry.children) return false;
    return entry.children.some(child => this.hasMdDescendant(child));
  },

  isSpecFile(entry) {
    if (entry.isDir || !entry.name.endsWith('.md')) return false;
    const specName = entry.name.replace('.md', '');
    return (App.state.files || []).some(f => f.name === specName && !f.trashed);
  },

  getRelativePath(fullPath) {
    const project = App.getCurrentProject();
    if (!project || !project.path) return fullPath;
    if (fullPath.startsWith(project.path)) {
      return fullPath.substring(project.path.length).replace(/^\//, '');
    }
    return fullPath;
  },

  async openInEditor(entry) {
    if (entry.isDir) return;

    const isSpec = entry.name.endsWith('.md');
    if (isSpec) {
      const specName = entry.name.replace('.md', '');
      const file = App.state.files.find(f => f.name === specName && !f.trashed);
      if (file) {
        Files.openFile(file.id);
        return;
      }
    }

    let content = '';
    if (App.isWails) {
      try {
        content = await window.go.main.App.ReadFileContent(entry.path);
      } catch (e) {
        Notifications.show('Erro ao ler arquivo');
        return;
      }
    } else {
      Search.showFilePreview(entry);
      return;
    }

    const diskFile = {
      id: 'disk://' + entry.path,
      projectId: App.state.currentProject,
      name: entry.name,
      content: content,
      created: entry.modified,
      modified: entry.modified,
      trashed: false,
      isDiskFile: true,
      diskPath: entry.path
    };

    App.state.diskCache[diskFile.id] = diskFile;

    Files.openFile(diskFile.id);
  },

  addToContext(entry) {
    if (entry.isDir) {
      FileExplorer.selectFile(entry.path);
      Notifications.show(`Pasta "${entry.name}" adicionada ao contexto`);
      return;
    }
    const isSpec = entry.name.endsWith('.md');
    if (isSpec) {
      const specName = entry.name.replace('.md', '');
      const file = App.state.files.find(f => f.name === specName && !f.trashed);
      if (file) {
        FileExplorer.selectSpec(file.id);
        Notifications.show(`${entry.name} adicionado ao contexto`);
        return;
      }
    }
    FileExplorer.selectFile(entry.path);
    Notifications.show(`${entry.name} adicionado ao contexto`);
  },

  async trashSpec(fileId) {
    const file = App.state.files.find(f => f.id === fileId);
    if (!file) return;

    const confirmed = await Modals.confirm(`Deletar spec "${file.name}.md"? Ela será movida para a lixeira.`);
    if (confirmed) {
      Files.deleteFile(fileId);
    }
  },

  restoreSpec(fileId) {
    Files.restoreFile(fileId);
  },

  getVirtualSpecs(entries) {
    const diskPaths = new Set();
    const collectPaths = (items) => {
      items.forEach(e => {
        if (!e.isDir && e.name.endsWith('.md')) diskPaths.add(e.name);
        if (e.children) collectPaths(e.children);
      });
    };
    collectPaths(entries);

    const virtualSpecs = [];
    (App.state.files || []).forEach(f => {
      if (f.trashed || f.isDiskFile) return;
      const mdName = f.name + '.md';
      if (!diskPaths.has(mdName)) {
        virtualSpecs.push({
          name: mdName,
          path: 'virtual://' + f.id,
          isDir: false,
          size: (f.content || '').length,
          modified: f.modified,
          virtualSpecId: f.id
        });
      }
    });
    return virtualSpecs;
  },

  renderTrashView() {
    const trashed = App.getTrashedFiles();
    if (trashed.length === 0) {
      return '<div class="checklist-empty">Lixeira vazia</div>';
    }

    const iconTrash = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';

    let html = `<div class="trash-header">
      <button class="trash-empty-btn" id="trash-empty-all" title="Deletar tudo permanentemente">${iconTrash} Limpar lixeira</button>
    </div>`;

    trashed.forEach(f => {
      const actions = `<div class="file-browser-item-actions">
        <button class="file-browser-item-action" data-action="restore" title="Restaurar" data-file-id="${f.id}">${this.icons.restore}</button>
        <button class="file-browser-item-action file-browser-item-action-danger" data-action="permanent-delete" title="Deletar permanentemente" data-file-id="${f.id}">${iconTrash}</button>
      </div>`;
      html += `<div class="file-browser-item file-browser-item-trashed" data-trash-id="${f.id}" data-is-dir="false" style="padding-left: 24px;">
        <span class="file-browser-spacer"></span>
        <span class="file-browser-item-icon">${this.icons.spec}</span>
        <span class="file-browser-item-name">${f.name}.md</span>
        ${actions}
      </div>`;
    });
    return html;
  },

  renderEntries(entries, depth) {
    let html = '';
    entries.forEach(entry => {
      if (this.filter === 'md') {
        if (!entry.isDir && !entry.name.endsWith('.md')) return;
        if (entry.isDir && !this.hasMdDescendant(entry)) return;
      }
      if (this.filter === 'specs') {
        if (!entry.isDir) return;
        if (!this.hasMdDescendant(entry)) return;
      }

      const isExpanded = this.expandedDirs.has(entry.path);
      const isSpec = this.isSpecFile(entry);
      const isMd = entry.name.endsWith('.md');
      const icon = entry.isDir
        ? (isExpanded ? this.icons.folderOpen : this.icons.folder)
        : (isSpec ? this.icons.spec : this.icons.file);
      const chevron = entry.isDir
        ? `<span class="file-browser-chevron ${isExpanded ? 'expanded' : ''}">${this.icons.chevron}</span>`
        : '<span class="file-browser-spacer"></span>';
      const indent = depth * 16;

      let actions = '';
      if (entry.isDir) {
        actions = `<div class="file-browser-item-actions">
          <button class="file-browser-item-action" data-action="add-context" title="Adicionar ao contexto">${this.icons.plus}</button>
        </div>`;
      } else if (isSpec) {
        actions = `<div class="file-browser-item-actions">
          <button class="file-browser-item-action" data-action="open-editor" title="Abrir no editor">${this.icons.open}</button>
          <button class="file-browser-item-action" data-action="add-context" title="Adicionar ao contexto">${this.icons.plus}</button>
          <button class="file-browser-item-action file-browser-item-action-danger" data-action="trash-spec" title="Deletar">${this.icons.trash}</button>
        </div>`;
      } else {
        actions = `<div class="file-browser-item-actions">
          <button class="file-browser-item-action" data-action="open-editor" title="Abrir no editor">${this.icons.open}</button>
          <button class="file-browser-item-action" data-action="add-context" title="Adicionar ao contexto">${this.icons.plus}</button>
        </div>`;
      }

      const pathAttr = entry.virtualSpecId ? `data-virtual-spec="${entry.virtualSpecId}"` : `data-path="${entry.path}"`;

      html += `<div class="file-browser-item" ${pathAttr} data-is-dir="${entry.isDir}" data-is-spec="${isSpec}" style="padding-left: ${indent + 8}px;">
        ${chevron}
        <span class="file-browser-item-icon">${icon}</span>
        <span class="file-browser-item-name">${entry.name}</span>
        ${actions}
      </div>`;

      if (entry.isDir && isExpanded && entry.children) {
        html += this.renderEntries(entry.children, depth + 1);
      }
    });
    return html;
  },

  render() {
    const list = document.getElementById('file-browser-list');
    if (!list) return;

    if (this.filter === 'trash') {
      list.innerHTML = this.renderTrashView();
      this.bindTrashActions(list);
      return;
    }

    const tree = App.state.dirTree || [];
    if (tree.length === 0) {
      list.innerHTML = '<div class="checklist-empty">No project files</div>';
      return;
    }

    let entriesHtml = this.renderEntries(tree, 0);

    if (this.filter === 'specs') {
      const virtualSpecs = this.getVirtualSpecs(tree);
      virtualSpecs.forEach(vs => {
        const actions = `<div class="file-browser-item-actions">
          <button class="file-browser-item-action" data-action="open-editor" title="Abrir no editor">${this.icons.open}</button>
          <button class="file-browser-item-action" data-action="add-context" title="Adicionar ao contexto">${this.icons.plus}</button>
          <button class="file-browser-item-action file-browser-item-action-danger" data-action="trash-spec" title="Deletar">${this.icons.trash}</button>
        </div>`;
        entriesHtml += `<div class="file-browser-item" data-virtual-spec="${vs.virtualSpecId}" data-is-dir="false" data-is-spec="true" style="padding-left: 24px;">
          <span class="file-browser-spacer"></span>
          <span class="file-browser-item-icon">${this.icons.spec}</span>
          <span class="file-browser-item-name">${vs.name}</span>
          ${actions}
        </div>`;
      });
    }

    if (!entriesHtml) {
      list.innerHTML = '<div class="checklist-empty">No files found</div>';
      return;
    }

    list.innerHTML = entriesHtml;

    list.querySelectorAll('.file-browser-item').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.file-browser-item-action')) return;
        e.stopPropagation();
        const isDir = el.dataset.isDir === 'true';
        const virtualSpecId = el.dataset.virtualSpec;
        const path = el.dataset.path;

        if (virtualSpecId) {
          Files.openFile(virtualSpecId);
          return;
        }
        if (isDir) {
          this.toggleDir(path);
        } else {
          const entry = this.findEntry(App.state.dirTree, path);
          if (entry) this.openInEditor(entry);
        }
      });
    });

    list.querySelectorAll('.file-browser-item-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = btn.closest('.file-browser-item');
        const action = btn.dataset.action;
        const virtualSpecId = item.dataset.virtualSpec;
        const path = item.dataset.path;

        if (virtualSpecId) {
          if (action === 'open-editor') {
            Files.openFile(virtualSpecId);
          } else if (action === 'add-context') {
            FileExplorer.selectSpec(virtualSpecId);
            const file = App.state.files.find(f => f.id === virtualSpecId);
            Notifications.show(`${file?.name || 'spec'}.md adicionado ao contexto`);
          } else if (action === 'trash-spec') {
            this.trashSpec(virtualSpecId);
          }
          return;
        }

        const entry = this.findEntry(App.state.dirTree, path);
        if (!entry) return;

        if (action === 'open-editor') {
          this.openInEditor(entry);
        } else if (action === 'add-context') {
          this.addToContext(entry);
        } else if (action === 'trash-spec') {
          const specName = entry.name.replace('.md', '');
          const file = App.state.files.find(f => f.name === specName && !f.trashed);
          if (file) this.trashSpec(file.id);
        }
      });
    });
  },

  bindTrashActions(list) {
    list.querySelectorAll('.file-browser-item-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const fileId = btn.dataset.fileId;

        if (action === 'restore' && fileId) {
          this.restoreSpec(fileId);
        } else if (action === 'permanent-delete' && fileId) {
          Files.permanentDelete(fileId);
        }
      });
    });

    const emptyBtn = list.querySelector('#trash-empty-all');
    if (emptyBtn) {
      emptyBtn.addEventListener('click', () => Files.emptyTrash());
    }
  },

  findEntry(entries, path) {
    for (const entry of entries) {
      if (entry.path === path) return entry;
      if (entry.isDir && entry.children) {
        const found = this.findEntry(entry.children, path);
        if (found) return found;
      }
    }
    return null;
  }
};
