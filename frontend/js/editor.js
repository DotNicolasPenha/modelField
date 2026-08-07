const Editor = {
  init() {
    // nothing to init, render is called when file opens
  },

  render() {
    const area = document.getElementById('editor-area');
    if (!area) return;

    if (!App.state.currentProject) {
      area.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          <p>No project open</p>
          <button class="btn btn-primary" id="btn-new-project-empty">Create new project</button>
        </div>
      `;
      document.getElementById('btn-new-project-empty')?.addEventListener('click', () => {
        Modals.open('modal-new-project');
      });
      return;
    }

    if (!App.state.activeFile) {
      const project = App.getCurrentProject();
      area.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <p>No file open</p>
          <button class="btn btn-primary" id="btn-new-file-empty">Create new file</button>
        </div>
      `;
      document.getElementById('btn-new-file-empty')?.addEventListener('click', () => {
        Modals.open('modal-new-file');
      });
      return;
    }

    const file = App.state.files.find(f => f.id === App.state.activeFile);
    if (!file) return;

    const project = App.getCurrentProject();
    const lineCount = (file.content || '').split('\n').length;
    const lines = Array.from({ length: Math.max(lineCount, 20) }, (_, i) => i + 1);

    area.innerHTML = `
      <div class="editor-toolbar">
        <div class="editor-toolbar-left">
          <span class="editor-toolbar-project">${project ? project.name : ''}</span>
          <span class="editor-toolbar-separator">/</span>
          <span>${file.name}.md</span>
        </div>
        <div class="editor-toolbar-right">
          <button class="btn btn-primary" id="btn-run" style="height: 32px; font-size: 13px; padding: 0 12px;">
            Run on
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
      </div>
      <div class="editor-content">
        <div class="editor-line-numbers" id="line-numbers">${lines.map(n => `<div>${n}</div>`).join('')}</div>
        <textarea class="editor-textarea" id="editor-textarea" spellcheck="false">${this.escapeHtml(file.content || '')}</textarea>
      </div>
      <div class="editor-status">
        <div class="editor-status-left">
          <span>Markdown</span>
          <span id="cursor-pos">Ln 1, Col 1</span>
        </div>
        <div class="editor-status-right">
          <span id="line-count">${lineCount} lines</span>
        </div>
      </div>
    `;

    const textarea = document.getElementById('editor-textarea');
    const lineNumbers = document.getElementById('line-numbers');
    const cursorPos = document.getElementById('cursor-pos');

    textarea?.addEventListener('input', () => {
      file.content = textarea.value;
      file.modified = new Date().toISOString();
      App.saveState();
      this.updateLineNumbers(textarea, lineNumbers);
      this.updateLineCount(textarea);
    });

    textarea?.addEventListener('scroll', () => {
      if (lineNumbers) lineNumbers.scrollTop = textarea.scrollTop;
    });

    textarea?.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 2;
        textarea.dispatchEvent(new Event('input'));
      }
    });

    textarea?.addEventListener('click', () => this.updateCursorPos(textarea, cursorPos));
    textarea?.addEventListener('keyup', () => this.updateCursorPos(textarea, cursorPos));

    document.getElementById('btn-run')?.addEventListener('click', () => {
      Models.showRunModal();
    });

    textarea?.focus();
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  updateLineNumbers(textarea, lineNumbers) {
    if (!textarea || !lineNumbers) return;
    const lines = textarea.value.split('\n').length;
    const nums = Array.from({ length: Math.max(lines, 20) }, (_, i) => i + 1);
    lineNumbers.innerHTML = nums.map(n => `<div>${n}</div>`).join('');
  },

  updateLineCount(textarea) {
    const el = document.getElementById('line-count');
    if (el && textarea) {
      el.textContent = `${textarea.value.split('\n').length} lines`;
    }
  },

  updateCursorPos(textarea, el) {
    if (!textarea || !el) return;
    const text = textarea.value.substring(0, textarea.selectionStart);
    const lines = text.split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    el.textContent = `Ln ${line}, Col ${col}`;
  }
};
