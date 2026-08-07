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
        </div>
      `).join('');

      list.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
          this.switchProject(item.dataset.projectId);
          Files.hideDropdowns();
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
    Tasks.render();
    App.updateCounts();
  },

  async deleteProject(projectId) {
    const project = App.state.projects.find(p => p.id === projectId);
    if (!project) return;

    App.state.projects = App.state.projects.filter(p => p.id !== projectId);
    App.state.files = App.state.files.filter(f => f.projectId !== projectId);
    App.state.tasks = App.state.tasks.filter(t => t.projectId !== projectId);

    if (App.state.currentProject === projectId) {
      App.state.currentProject = App.state.projects[0]?.id || null;
      App.state.openFiles = [];
      App.state.activeFile = null;
      await App.saveCurrentProject();
    }

    await App.saveProjects();
    await App.saveState();
    await App.saveTasks();

    this.updateDisplay();
    Files.renderTabs();
    Editor.render();
    Tasks.render();
    App.updateCounts();
    Notifications.show(`Project "${project.name}" deleted`);
  }
};
