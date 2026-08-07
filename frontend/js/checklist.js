const Checklist = {
  expandedId: null,

  init() {
    document.getElementById('checklist-add-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.value.trim()) {
        this.addItem(e.target.value.trim());
        e.target.value = '';
      }
    });
  },

  getProjectChecklist() {
    const project = App.getCurrentProject();
    return project?.checklist || [];
  },

  render() {
    const panel = document.getElementById('checklist-items');
    const countEl = document.getElementById('checklist-count');
    if (!panel) return;

    const items = this.getProjectChecklist();
    const checked = items.filter(i => i.checked).length;

    if (countEl) countEl.textContent = items.length ? `${checked}/${items.length}` : '';

    if (items.length === 0) {
      panel.innerHTML = '<div class="checklist-empty">No items yet</div>';
      return;
    }

    panel.innerHTML = items.map(item => {
      const el = document.createElement('div');
      el.className = `checklist-item ${item.checked ? 'checked' : ''} ${item.id === this.expandedId ? 'expanded' : ''}`;
      el.dataset.id = item.id;
      el.innerHTML = `
        <div class="checklist-item-row">
          <label class="checklist-checkbox">
            <input type="checkbox" ${item.checked ? 'checked' : ''}>
            <span class="checklist-checkmark"></span>
          </label>
          <span class="checklist-item-text" title="Click to edit">${item.text}</span>
          <button class="checklist-item-expand" title="Expand">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <button class="checklist-item-delete" title="Delete">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="checklist-item-desc-area">
          <textarea class="checklist-item-desc" placeholder="Add description...">${item.description || ''}</textarea>
        </div>
      `;
      return el;
    });

    panel.innerHTML = '';
    items.forEach(item => {
      const el = document.createElement('div');
      el.className = `checklist-item ${item.checked ? 'checked' : ''} ${item.id === this.expandedId ? 'expanded' : ''}`;
      el.dataset.id = item.id;
      el.innerHTML = `
        <div class="checklist-item-row">
          <label class="checklist-checkbox">
            <input type="checkbox" ${item.checked ? 'checked' : ''}>
            <span class="checklist-checkmark"></span>
          </label>
          <span class="checklist-item-text" title="Click to edit">${item.text}</span>
          <button class="checklist-item-expand" title="Expand">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <button class="checklist-item-delete" title="Delete">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="checklist-item-desc-area">
          <textarea class="checklist-item-desc" placeholder="Add description...">${item.description || ''}</textarea>
        </div>
      `;

      el.querySelector('.checklist-checkbox input')?.addEventListener('change', (e) => {
        e.stopPropagation();
        this.toggleItem(item.id);
      });

      const textEl = el.querySelector('.checklist-item-text');
      textEl?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.startEditText(el, item.id);
      });

      el.querySelector('.checklist-item-expand')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleExpand(item.id);
      });

      el.querySelector('.checklist-item-delete')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteItem(item.id);
      });

      el.querySelector('.checklist-item-desc')?.addEventListener('input', (e) => {
        this.updateDescription(item.id, e.target.value);
      });

      panel.appendChild(el);
    });
  },

  addItem(text) {
    const project = App.getCurrentProject();
    if (!project) return;
    if (!project.checklist) project.checklist = [];
    const newItem = {
      id: Date.now().toString(),
      text,
      description: '',
      checked: false
    };
    project.checklist.push(newItem);
    App.saveProjects();
    this.render();
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-id="${newItem.id}"]`);
      if (el) {
        el.classList.add('entering');
        el.addEventListener('animationend', () => el.classList.remove('entering'), { once: true });
      }
    });
  },

  toggleItem(id) {
    const project = App.getCurrentProject();
    if (!project?.checklist) return;
    const item = project.checklist.find(i => i.id === id);
    if (item) {
      item.checked = !item.checked;
      App.saveProjects();
      this.render();
    }
  },

  deleteItem(id) {
    const project = App.getCurrentProject();
    if (!project?.checklist) return;
    const el = document.querySelector(`[data-id="${id}"]`);
    if (el) {
      el.classList.add('exiting');
      el.addEventListener('animationend', () => {
        project.checklist = project.checklist.filter(i => i.id !== id);
        App.saveProjects();
        this.render();
      }, { once: true });
    } else {
      project.checklist = project.checklist.filter(i => i.id !== id);
      App.saveProjects();
      this.render();
    }
  },

  toggleExpand(id) {
    this.expandedId = this.expandedId === id ? null : id;
    this.render();
  },

  startEditText(el, id) {
    const textEl = el.querySelector('.checklist-item-text');
    if (!textEl) return;
    const project = App.getCurrentProject();
    const item = project?.checklist?.find(i => i.id === id);
    if (!item) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'checklist-item-text-input';
    input.value = item.text;
    textEl.replaceWith(input);
    input.focus();
    input.select();

    const save = () => {
      const val = input.value.trim();
      if (val) {
        item.text = val;
        App.saveProjects();
      }
      this.render();
    };

    input.addEventListener('blur', save);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') save();
      if (e.key === 'Escape') this.render();
    });
  },

  updateDescription(id, description) {
    const project = App.getCurrentProject();
    const item = project?.checklist?.find(i => i.id === id);
    if (item) {
      item.description = description;
      App.saveProjects();
    }
  }
};
