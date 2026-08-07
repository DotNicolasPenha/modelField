const Projects = {
  selectedDir: '',

  init() {
    document.getElementById('btn-project')?.addEventListener('click', (e) => {
      this.showDropdown(e);
    });

    document.getElementById('btn-select-directory')?.addEventListener('click', () => {
      this.selectDirectory();
    });

    document.getElementById('btn-create-project')?.addEventListener('click', () => {
      this.createProject();
    });

    document.getElementById('input-project-name')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.createProject();
    });

    this.updateDisplay();
  },

  updateDisplay() {
    const nameEl = document.getElementById('project-name');
    const project = App.getCurrentProject();
    if (nameEl) {
      nameEl.textContent = project ? project.name : 'No project';
    }
  },

  showDropdown(e) {
    const dropdown = document.getElementById('dropdown-projects');
    const overlay = document.getElementById('dropdown-overlay');
    const list = document.getElementById('dropdown-projects-list');
    if (!dropdown || !overlay || !list) return;

    if (App.state.projects.length === 0) {
      list.innerHTML = '<div class="dropdown-empty">No projects yet</div>';
    } else {
      list.innerHTML = App.state.projects.map(p => `
        <div class="dropdown-item ${p.id === App.state.currentProject ? 'active' : ''}" data-project-id="${p.id}">
          <span class="dropdown-item-name">${p.name}</span>
          <span class="dropdown-item-status">${p.path}</span>
          <div class="dropdown-item-actions">
            <button class="dropdown-item-action" data-action="rename" title="Rename">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="dropdown-item-action danger" data-action="delete" title="Delete">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
      `).join('');

      list.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if (e.target.closest('.dropdown-item-action')) return;
          this.switchProject(item.dataset.projectId);
          Files.hideDropdowns();
        });

        item.querySelector('[data-action="rename"]')?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.renameProject(item.dataset.projectId);
        });

        item.querySelector('[data-action="delete"]')?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteProjectWithConfirm(item.dataset.projectId);
        });
      });
    }

    const newBtn = document.createElement('div');
    newBtn.className = 'dropdown-item dropdown-item-new';
    newBtn.innerHTML = '<span class="dropdown-item-name">+ New Project</span>';
    newBtn.addEventListener('click', () => {
      Files.hideDropdowns();
      Modals.open('modal-new-project');
    });
    list.appendChild(newBtn);

    const rect = e.currentTarget.getBoundingClientRect();
    dropdown.style.left = rect.left + 'px';
    dropdown.style.top = rect.bottom + 4 + 'px';
    dropdown.classList.add('active');
    overlay.classList.add('active');

    overlay.onclick = () => Files.hideDropdowns();
  },

  async selectDirectory() {
    if (App.isWails) {
      const dir = await window.go.main.App.SelectDirectory();
      if (dir) {
        this.selectedDir = dir;
        const pathEl = document.getElementById('project-dir-path');
        if (pathEl) pathEl.textContent = dir;
      }
    } else {
      const dir = prompt('Enter directory path:');
      if (dir) {
        this.selectedDir = dir;
        const pathEl = document.getElementById('project-dir-path');
        if (pathEl) pathEl.textContent = dir;
      }
    }
  },

  async createProject() {
    const nameInput = document.getElementById('input-project-name');
    let name = nameInput?.value.trim() || 'untitled';
    name = name.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-').toLowerCase();
    if (!name) name = 'untitled';

    if (!this.selectedDir) {
      Notifications.show('Please select a directory');
      return;
    }

    const project = {
      id: Date.now().toString(),
      name: name,
      path: this.selectedDir,
      created: new Date().toISOString()
    };

    App.state.projects.push(project);
    await App.saveProjects();

    this.selectedDir = '';
    nameInput.value = '';
    document.getElementById('project-dir-path').textContent = 'No directory selected';
    Modals.close('modal-new-project');

    this.switchProject(project.id);
    Notifications.show(`Project "${name}" created`);
  },

  async switchProject(projectId) {
    App.state.currentProject = projectId;
    App.state.openFiles = [];
    App.state.activeFile = null;
    await App.saveCurrentProject();

    this.updateDisplay();
    Files.renderTabs();
    Editor.render();
    App.updateCounts();
  },

  async deleteProject(projectId) {
    const project = App.state.projects.find(p => p.id === projectId);
    if (!project) return;

    App.state.projects = App.state.projects.filter(p => p.id !== projectId);
    App.state.files = App.state.files.filter(f => f.projectId !== projectId);

    if (App.state.currentProject === projectId) {
      App.state.currentProject = App.state.projects[0]?.id || null;
      App.state.openFiles = [];
      App.state.activeFile = null;
      await App.saveCurrentProject();
    }

    await App.saveProjects();
    await App.saveState();

    this.updateDisplay();
    Files.renderTabs();
    Editor.render();
    App.updateCounts();
    Notifications.show(`Project "${project.name}" deleted`);
  },

  async deleteProjectWithConfirm(projectId) {
    const project = App.state.projects.find(p => p.id === projectId);
    if (!project) return;
    const confirmed = await Modals.confirm(`Delete project "${project.name}"? This will remove all its files.`);
    if (confirmed) {
      this.deleteProject(projectId);
      Files.hideDropdowns();
    }
  },

  async renameProject(projectId) {
    const project = App.state.projects.find(p => p.id === projectId);
    if (!project) return;

    const newName = await Modals.prompt('Rename project:', project.name, (val) => {
      if (!val) return 'Name cannot be empty';
      if (/[^a-zA-Z0-9-_ ]/.test(val)) return 'Only letters, numbers, hyphens and underscores';
      return null;
    });
    if (newName) {
      project.name = newName.replace(/\s+/g, '-').toLowerCase();
      await App.saveProjects();
      this.updateDisplay();
      Files.hideDropdowns();
      Notifications.show(`Project renamed to "${project.name}"`);
    }
  }
};
