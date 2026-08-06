const Files = {
  init() {
    document.getElementById('btn-new-file')?.addEventListener('click', () => {
      Modals.open('modal-new-file');
    });

    document.getElementById('btn-new-file-empty')?.addEventListener('click', () => {
      Modals.open('modal-new-file');
    });

    document.getElementById('btn-create-file')?.addEventListener('click', () => {
      this.createNew();
    });

    document.getElementById('input-file-name')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.createNew();
    });

    document.getElementById('btn-files-count')?.addEventListener('click', (e) => {
      this.showFilesDropdown(e);
    });

    this.renderTabs();
  },

  createNew() {
    const nameInput = document.getElementById('input-file-name');
    const templateSelect = document.getElementById('select-template');

    let name = nameInput?.value.trim() || 'untitled';
    const template = templateSelect?.value || 'blank';

    name = name.replace(/\.md$/, '');
    name = name.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-').toLowerCase();
    if (!name) name = 'untitled';

    let finalName = name;
    let counter = 1;
    while (App.state.files.some(f => f.name === finalName)) {
      finalName = `${name}-${counter}`;
      counter++;
    }

    const file = {
      id: Date.now().toString(),
      name: finalName,
      content: Templates[template] || '',
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    };

    App.state.files.push(file);
    App.saveState();

    nameInput.value = '';
    templateSelect.value = 'blank';
    Modals.close('modal-new-file');

    this.openFile(file.id);
    App.updateCounts();
    Notifications.show(`File "${finalName}.md" created`);
  },

  openFile(fileId) {
    const file = App.state.files.find(f => f.id === fileId);
    if (!file) return;

    if (!App.state.openFiles.includes(fileId)) {
      App.state.openFiles.push(fileId);
    }

    App.state.activeFile = fileId;
    Editor.render();
    this.renderTabs();
  },

  closeFile(fileId) {
    App.state.openFiles = App.state.openFiles.filter(id => id !== fileId);

    if (App.state.activeFile === fileId) {
      App.state.activeFile = App.state.openFiles[App.state.openFiles.length - 1] || null;
    }

    Editor.render();
    this.renderTabs();
  },

  renameFile(fileId) {
    const file = App.state.files.find(f => f.id === fileId);
    if (!file) return;

    const newName = prompt('Rename file:', file.name);
    if (newName && newName.trim()) {
      file.name = newName.trim().replace(/\.md$/, '').replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-').toLowerCase();
      file.modified = new Date().toISOString();
      App.saveState();
      this.renderTabs();
    }
  },

  duplicateFile(fileId) {
    const file = App.state.files.find(f => f.id === fileId);
    if (!file) return;

    const newFile = {
      id: Date.now().toString(),
      name: `${file.name}-copy`,
      content: file.content,
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    };

    App.state.files.push(newFile);
    App.saveState();
    this.openFile(newFile.id);
    App.updateCounts();
    Notifications.show(`File "${newFile.name}.md" duplicated`);
  },

  deleteFile(fileId) {
    const file = App.state.files.find(f => f.id === fileId);
    if (!file) return;

    App.state.files = App.state.files.filter(f => f.id !== fileId);
    this.closeFile(fileId);
    App.saveState();
    App.updateCounts();
    Notifications.show(`File "${file.name}.md" deleted`);
  },

  renderTabs() {
    const tabsEl = document.getElementById('tabs');
    if (!tabsEl) return;

    tabsEl.innerHTML = '';

    App.state.openFiles.forEach(fileId => {
      const file = App.state.files.find(f => f.id === fileId);
      if (!file) return;

      const tab = document.createElement('div');
      tab.className = `tab ${fileId === App.state.activeFile ? 'active' : ''}`;
      tab.innerHTML = `
        <span class="tab-name">${file.name}.md</span>
        <button class="tab-close">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      `;

      tab.addEventListener('click', (e) => {
        if (!e.target.closest('.tab-close')) {
          this.openFile(fileId);
        }
      });

      tab.querySelector('.tab-close')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeFile(fileId);
      });

      tab.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.showContextMenu(e, fileId);
      });

      tabsEl.appendChild(tab);
    });
  },

  showContextMenu(e, fileId) {
    const menu = document.getElementById('context-menu');
    if (!menu) return;

    menu.innerHTML = `
      <div class="context-menu-item" data-action="rename">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        Rename
      </div>
      <div class="context-menu-item" data-action="duplicate">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Duplicate
      </div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item danger" data-action="delete">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        Delete
      </div>
    `;

    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    menu.classList.add('active');

    const closeMenu = (ev) => {
      if (!menu.contains(ev.target)) {
        menu.classList.remove('active');
        document.removeEventListener('click', closeMenu);
      }
    };

    setTimeout(() => document.addEventListener('click', closeMenu), 10);

    menu.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.dataset.action;
        if (action === 'rename') this.renameFile(fileId);
        if (action === 'duplicate') this.duplicateFile(fileId);
        if (action === 'delete') this.deleteFile(fileId);
        menu.classList.remove('active');
      });
    });
  },

  showFilesDropdown(e) {
    const dropdown = document.getElementById('dropdown-files');
    const overlay = document.getElementById('dropdown-overlay');
    const list = document.getElementById('dropdown-files-list');
    if (!dropdown || !overlay || !list) return;

    if (App.state.files.length === 0) {
      list.innerHTML = '<div class="dropdown-empty">No files yet</div>';
    } else {
      list.innerHTML = App.state.files.map(f => `
        <div class="dropdown-item" data-file-id="${f.id}">
          <span class="dropdown-item-name">${f.name}.md</span>
        </div>
      `).join('');

      list.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
          this.openFile(item.dataset.fileId);
          this.hideDropdowns();
        });
      });
    }

    const rect = e.currentTarget.getBoundingClientRect();
    dropdown.style.left = rect.left + 'px';
    dropdown.style.top = rect.bottom + 4 + 'px';
    dropdown.classList.add('active');
    overlay.classList.add('active');

    overlay.onclick = () => this.hideDropdowns();
  },

  hideDropdowns() {
    document.getElementById('dropdown-files')?.classList.remove('active');
    document.getElementById('dropdown-models')?.classList.remove('active');
    document.getElementById('dropdown-overlay')?.classList.remove('active');
  }
};
