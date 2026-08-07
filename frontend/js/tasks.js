const Tasks = {
  selectedTaskId: null,
  activeFilter: 'all',

  init() {
    document.getElementById('btn-tasks-count')?.addEventListener('click', () => {
      this.showTasks();
    });

    document.getElementById('btn-new-task')?.addEventListener('click', () => {
      this.createTask();
    });

    document.getElementById('tasks-search')?.addEventListener('input', (e) => {
      this.renderList(e.target.value);
    });

    document.getElementById('tasks-tabs')?.addEventListener('click', (e) => {
      const tab = e.target.closest('.tasks-tab');
      if (!tab) return;
      this.activeFilter = tab.dataset.phase;
      document.querySelectorAll('.tasks-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      this.renderList();
    });
  },

  showTasks() {
    if (!App.state.currentProject) {
      Notifications.show('Select a project first');
      return;
    }
    this.selectedTaskId = null;
    this.activeFilter = 'all';
    this.render();
    Modals.open('modal-tasks');
  },

  render() {
    this.renderProgress();
    this.renderList();
    this.renderDetail();
    this.renderStats();

    document.querySelectorAll('.tasks-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.phase === this.activeFilter);
    });
    document.getElementById('tasks-search').value = '';
  },

  renderProgress() {
    const tasks = App.getProjectTasks();
    const total = tasks.length;
    const done = tasks.filter(t => t.phase === 'done').length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    const fill = document.getElementById('tasks-progress-fill');
    const text = document.getElementById('tasks-progress-text');
    if (fill) fill.style.width = pct + '%';
    if (text) text.textContent = total > 0 ? `${done}/${total}` : '';
  },

  renderList(query = '') {
    const list = document.getElementById('tasks-list');
    if (!list) return;

    let tasks = App.getProjectTasks();

    if (this.activeFilter !== 'all') {
      tasks = tasks.filter(t => t.phase === this.activeFilter);
    }

    if (query) {
      const q = query.toLowerCase();
      tasks = tasks.filter(t => t.title.toLowerCase().includes(q));
    }

    if (tasks.length === 0) {
      list.innerHTML = '<div class="tasks-empty">No tasks</div>';
      return;
    }

    list.innerHTML = '';
    tasks.forEach(task => {
      const el = document.createElement('div');
      el.className = `task-item ${task.phase === 'done' ? 'task-done' : ''} ${task.id === this.selectedTaskId ? 'active' : ''}`;
      el.dataset.taskId = task.id;

      const checkProgress = this.getCheckProgress(task);
      const specBadge = task.linkedSpec ? this.getSpecBadge(task.linkedSpec) : '';

      el.innerHTML = `
        <label class="task-checkbox">
          <input type="checkbox" ${task.phase === 'done' ? 'checked' : ''}>
          <span class="task-checkmark"></span>
        </label>
        <div class="task-info">
          <div class="task-title">${task.title}</div>
          <div class="task-meta">
            <span class="task-priority ${task.priority}"></span>
            ${specBadge}
            ${checkProgress}
          </div>
        </div>
      `;

      el.querySelector('input[type="checkbox"]')?.addEventListener('change', (e) => {
        e.stopPropagation();
        this.togglePhase(task.id);
      });

      el.addEventListener('click', () => {
        this.selectTask(task.id);
      });

      list.appendChild(el);
    });
  },

  getCheckProgress(task) {
    if (!task.checklist || task.checklist.length === 0) return '';
    const checked = task.checklist.filter(c => c.checked).length;
    return `<span class="task-checklist-progress">${checked}/${task.checklist.length}</span>`;
  },

  getSpecBadge(specId) {
    const file = App.state.files.find(f => f.id === specId);
    if (!file) return '';
    return `<span class="task-spec-badge" data-spec-id="${specId}">${file.name}.md</span>`;
  },

  selectTask(taskId) {
    this.selectedTaskId = taskId;
    this.renderList(document.getElementById('tasks-search')?.value || '');
    this.renderDetail();
  },

  renderDetail() {
    const right = document.getElementById('tasks-right');
    if (!right) return;

    if (!this.selectedTaskId) {
      right.innerHTML = '<div class="tasks-empty-detail"><p>Select a task</p></div>';
      return;
    }

    const task = App.state.tasks.find(t => t.id === this.selectedTaskId);
    if (!task) {
      right.innerHTML = '<div class="tasks-empty-detail"><p>Task not found</p></div>';
      return;
    }

    const projectFiles = App.getProjectFiles();
    const phases = ['planning', 'implementation', 'testing', 'done'];
    const priorities = ['low', 'medium', 'high'];

    right.innerHTML = `
      <div class="tasks-detail">
        <div class="tasks-detail-header">
          <input type="text" class="tasks-detail-title" id="detail-title" value="${task.title}">
          <div class="tasks-detail-row">
            <span class="tasks-detail-label">Phase</span>
            <div class="tasks-detail-value">
              <select class="input" id="detail-phase">
                ${phases.map(p => `<option value="${p}" ${task.phase === p ? 'selected' : ''}>${p.charAt(0).toUpperCase() + p.slice(1)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="tasks-detail-row">
            <span class="tasks-detail-label">Priority</span>
            <div class="tasks-detail-value">
              <select class="input" id="detail-priority">
                ${priorities.map(p => `<option value="${p}" ${task.priority === p ? 'selected' : ''}>${p.charAt(0).toUpperCase() + p.slice(1)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="tasks-detail-row">
            <span class="tasks-detail-label">Spec</span>
            <div class="tasks-detail-value">
              <select class="input" id="detail-spec">
                <option value="">None</option>
                ${projectFiles.map(f => `<option value="${f.id}" ${task.linkedSpec === f.id ? 'selected' : ''}>${f.name}.md</option>`).join('')}
              </select>
            </div>
          </div>
        </div>
        <textarea class="tasks-detail-desc" id="detail-desc" placeholder="Description...">${task.description || ''}</textarea>
        <div class="tasks-checklist">
          <div class="tasks-checklist-header">Checklist</div>
          ${(task.checklist || []).map(item => `
            <div class="tasks-checklist-item ${item.checked ? 'checked' : ''}" data-check-id="${item.id}">
              <input type="checkbox" ${item.checked ? 'checked' : ''}>
              <input type="text" value="${item.text}" placeholder="Item...">
            </div>
          `).join('')}
          <div class="tasks-checklist-add">
            <input type="text" id="checklist-add-input" placeholder="+ Add item">
          </div>
        </div>
        <div class="tasks-detail-actions">
          <button class="btn btn-primary" id="btn-save-task" style="height: 30px; font-size: 12px;">Save</button>
          <button class="btn btn-secondary" id="btn-delete-task" style="height: 30px; font-size: 12px;">Delete</button>
        </div>
      </div>
    `;

    this.bindDetailEvents(task);
  },

  bindDetailEvents(task) {
    document.getElementById('btn-save-task')?.addEventListener('click', () => {
      this.saveTask(task.id);
    });

    document.getElementById('btn-delete-task')?.addEventListener('click', () => {
      this.deleteTask(task.id);
    });

    document.querySelectorAll('.tasks-checklist-item input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        const itemId = cb.closest('.tasks-checklist-item').dataset.checkId;
        this.toggleCheckItem(task.id, itemId);
      });
    });

    document.querySelectorAll('.tasks-checklist-item input[type="text"]').forEach(input => {
      input.addEventListener('change', () => {
        const itemId = input.closest('.tasks-checklist-item').dataset.checkId;
        this.updateCheckItem(task.id, itemId, input.value);
      });
    });

    document.getElementById('checklist-add-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const input = e.target;
        const text = input.value.trim();
        if (text) {
          this.addCheckItem(task.id, text);
          input.value = '';
        }
      }
    });

    document.querySelector('.task-spec-badge')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const specId = e.target.dataset.specId;
      if (specId) Files.openFile(specId);
    });
  },

  renderStats() {
    const stats = document.getElementById('tasks-stats');
    if (!stats) return;

    const tasks = App.getProjectTasks();
    const planning = tasks.filter(t => t.phase === 'planning').length;
    const implementation = tasks.filter(t => t.phase === 'implementation').length;
    const testing = tasks.filter(t => t.phase === 'testing').length;
    const done = tasks.filter(t => t.phase === 'done').length;

    stats.innerHTML = `
      <span>Planning ${planning}</span>
      <span>Implementation ${implementation}</span>
      <span>Testing ${testing}</span>
      <span>Done ${done}</span>
    `;
  },

  async createTask() {
    if (!App.state.currentProject) {
      Notifications.show('Select a project first');
      return;
    }

    const task = {
      id: Date.now().toString(),
      projectId: App.state.currentProject,
      title: 'New task',
      description: '',
      phase: 'planning',
      priority: 'medium',
      linkedSpec: '',
      checklist: [],
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    };

    App.state.tasks.push(task);
    await App.saveTasks();
    this.selectedTaskId = task.id;
    this.render();
    App.updateCounts();
    Notifications.show('Task created');
  },

  async saveTask(taskId) {
    const task = App.state.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.title = document.getElementById('detail-title')?.value.trim() || task.title;
    task.phase = document.getElementById('detail-phase')?.value || task.phase;
    task.priority = document.getElementById('detail-priority')?.value || task.priority;
    task.linkedSpec = document.getElementById('detail-spec')?.value || '';
    task.description = document.getElementById('detail-desc')?.value || '';
    task.modified = new Date().toISOString();

    await App.saveTasks();
    this.render();
    App.updateCounts();
    Notifications.show('Task saved');
  },

  async deleteTask(taskId) {
    App.state.tasks = App.state.tasks.filter(t => t.id !== taskId);
    this.selectedTaskId = null;
    await App.saveTasks();
    this.render();
    App.updateCounts();
    Notifications.show('Task deleted');
  },

  async togglePhase(taskId) {
    const task = App.state.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.phase = task.phase === 'done' ? 'planning' : 'done';
    task.modified = new Date().toISOString();
    await App.saveTasks();
    this.render();
    App.updateCounts();
  },

  async toggleCheckItem(taskId, itemId) {
    const task = App.state.tasks.find(t => t.id === taskId);
    if (!task || !task.checklist) return;

    const item = task.checklist.find(c => c.id === itemId);
    if (item) {
      item.checked = !item.checked;
      task.modified = new Date().toISOString();
      await App.saveTasks();
      this.renderDetail();
      this.renderList(document.getElementById('tasks-search')?.value || '');
    }
  },

  async updateCheckItem(taskId, itemId, text) {
    const task = App.state.tasks.find(t => t.id === taskId);
    if (!task || !task.checklist) return;

    const item = task.checklist.find(c => c.id === itemId);
    if (item) {
      item.text = text;
      task.modified = new Date().toISOString();
      await App.saveTasks();
    }
  },

  async addCheckItem(taskId, text) {
    const task = App.state.tasks.find(t => t.id === taskId);
    if (!task) return;

    if (!task.checklist) task.checklist = [];
    task.checklist.push({
      id: Date.now().toString(),
      text: text,
      checked: false
    });
    task.modified = new Date().toISOString();
    await App.saveTasks();
    this.renderDetail();
    this.renderList(document.getElementById('tasks-search')?.value || '');
  },

  timeAgo(dateString) {
    const now = Date.now();
    const then = new Date(dateString).getTime();
    const diff = now - then;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours >= 24) return `${Math.floor(hours / 24)}d ago`;
    if (hours >= 1) return `${hours}h ago`;
    if (minutes >= 1) return `${minutes}m ago`;
    return 'just now';
  }
};
