const Models = {
  data: {
    openai: [
      { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', description: 'Most capable model, multimodal' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', description: 'Fast and affordable' },
      { id: 'o1-preview', name: 'o1-preview', provider: 'OpenAI', description: 'Advanced reasoning' }
    ],
    claude: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'Anthropic', description: 'Balanced speed and quality' },
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', provider: 'Anthropic', description: 'Most capable model' },
      { id: 'claude-haiku-3-5', name: 'Claude 3.5 Haiku', provider: 'Anthropic', description: 'Ultra fast' }
    ],
    gemini: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', description: 'Premium model' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', description: 'Fast and efficient' }
    ],
    openrouter: [
      { id: 'meta-llama/llama-4-maverick', name: 'Llama 4 Maverick', provider: 'Meta via OpenRouter', description: 'Open source model' },
      { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek via OpenRouter', description: 'Advanced reasoning' }
    ]
  },

  running: [],
  timeInterval: null,

  init() {
    document.getElementById('btn-running-count')?.addEventListener('click', (e) => {
      this.showModelsDropdown(e, 'running');
    });

    document.getElementById('btn-finished-count')?.addEventListener('click', (e) => {
      this.showModelsDropdown(e, 'finished');
    });

    this.timeInterval = setInterval(() => this.updateTimes(), 30000);
    this.render();
  },

  getAvailableModels() {
    const available = [];
    const keys = App.state.apiKeys;

    if (keys.openai) this.data.openai.forEach(m => available.push(m));
    if (keys.anthropic) this.data.claude.forEach(m => available.push(m));
    if (keys.google) this.data.gemini.forEach(m => available.push(m));
    if (keys.openrouter) this.data.openrouter.forEach(m => available.push(m));

    return available;
  },

  timeAgo(dateString) {
    const now = Date.now();
    const then = new Date(dateString).getTime();
    const diff = now - then;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours >= 24) {
      const date = new Date(dateString);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const day = date.getDate();
      const h = String(date.getHours()).padStart(2, '0');
      const m = String(date.getMinutes()).padStart(2, '0');
      return `${month} ${day}, ${h}:${m}`;
    }

    if (minutes >= 60) return `${hours}h ago`;
    if (seconds >= 60) return `${minutes}m ago`;
    return 'just now';
  },

  updateTimes() {
    document.querySelectorAll('.model-time').forEach(el => {
      const dateStr = el.dataset.time;
      if (dateStr) el.textContent = this.timeAgo(dateStr);
    });
  },

  showRunModal() {
    const body = document.getElementById('modal-run-body');
    if (!body) return;

    const models = this.getAvailableModels();

    if (models.length === 0) {
      body.innerHTML = '<p class="text-muted">Configure an API key in Settings to use models.</p>';
    } else {
      body.innerHTML = `
        <input type="text" class="input run-search" id="model-search" placeholder="Search models...">
        <div class="run-models-list" id="run-models-list">
          ${models.map(m => `
            <div class="model-item" data-model-id="${m.id}">
              <div class="model-info">
                <div class="model-name">${m.name}</div>
                <div class="model-detail">${m.provider} - ${m.description}</div>
              </div>
              <button class="btn btn-primary" style="height: 32px; font-size: 12px; padding: 0 12px;">Run</button>
            </div>
          `).join('')}
        </div>
      `;

      const searchInput = document.getElementById('model-search');
      const modelsList = document.getElementById('run-models-list');

      searchInput?.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();
        modelsList.querySelectorAll('.model-item').forEach(item => {
          const name = item.querySelector('.model-name')?.textContent.toLowerCase() || '';
          const detail = item.querySelector('.model-detail')?.textContent.toLowerCase() || '';
          const match = name.includes(query) || detail.includes(query);
          item.style.display = match ? '' : 'none';
        });
      });

      modelsList.querySelectorAll('.model-item').forEach(item => {
        item.querySelector('.btn')?.addEventListener('click', (e) => {
          e.stopPropagation();
          const modelId = item.dataset.modelId;
          const model = models.find(m => m.id === modelId);
          if (model) this.startRun(model);
        });
      });
    }

    Modals.open('modal-run');
  },

  startRun(model) {
    Modals.close('modal-run');

    const file = App.state.files.find(f => f.id === App.state.activeFile);
    const specName = file ? file.name : 'spec';

    const run = {
      id: Date.now().toString(),
      model: model,
      spec: specName,
      status: 'running',
      started: new Date().toISOString(),
      finished: null,
      lastAccessed: null,
      result: null
    };

    this.running.push(run);
    this.render();
    App.updateCounts();
    Notifications.show(`Running ${model.name} on ${specName}.md`);

    const delay = 2000 + Math.random() * 3000;
    setTimeout(() => this.finishRun(run.id), delay);
  },

  finishRun(runId) {
    const run = this.running.find(r => r.id === runId);
    if (!run) return;

    run.status = 'finished';
    run.finished = new Date().toISOString();
    run.result = this.generateMockResult(run);

    this.render();
    App.updateCounts();
    Notifications.show(`${run.model.name} finished processing ${run.spec}.md`);
  },

  removeRun(runId) {
    const run = this.running.find(r => r.id === runId);
    if (!run || run.status === 'running') return;

    this.running = this.running.filter(r => r.id !== runId);
    this.render();
    App.updateCounts();
    Notifications.show(`${run.model.name} removed from list`);
  },

  generateMockResult(run) {
    return `# Analysis of ${run.spec}.md

## Summary
The specification has been analyzed by ${run.model.name}.

## Observations
- The structure follows standard practices
- Consider adding more detailed error handling
- Response formats are well defined

## Recommendations
1. Add version control for the API
2. Include rate limiting specifications
3. Consider adding webhook support

## Code Review
The specification is clear and well-organized. Minor improvements suggested for completeness.`;
  },

  render() {
    const list = document.getElementById('models-list');
    if (!list) return;

    if (this.running.length === 0) {
      list.innerHTML = '<div class="models-empty">No models running</div>';
      return;
    }

    list.innerHTML = this.running.map(run => {
      const timeSource = run.status === 'finished' ? (run.finished || run.started) : run.started;
      const timeText = this.timeAgo(timeSource);

      return `
        <div class="model-item" data-run-id="${run.id}">
          <div class="model-info">
            <div class="model-name">${run.model.name}</div>
            <div class="model-detail">${run.spec}.md</div>
          </div>
          <span class="model-time" data-time="${timeSource}">${timeText}</span>
          <span class="model-status ${run.status}">${run.status}</span>
          ${run.status === 'finished' ? `
            <button class="model-open">Open</button>
            <button class="model-close" title="Remove">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          ` : ''}
        </div>
      `;
    }).join('');

    list.querySelectorAll('.model-open').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const runId = btn.closest('.model-item').dataset.runId;
        const run = this.running.find(r => r.id === runId);
        if (run) this.openChat(run);
      });
    });

    list.querySelectorAll('.model-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const runId = btn.closest('.model-item').dataset.runId;
        this.removeRun(runId);
      });
    });

    list.querySelectorAll('.model-item').forEach(item => {
      item.addEventListener('click', () => {
        const runId = item.dataset.runId;
        const run = this.running.find(r => r.id === runId);
        if (run && run.status === 'finished') {
          this.openChat(run);
        }
      });
    });
  },

  showModelsDropdown(e, filter) {
    const dropdown = document.getElementById('dropdown-models');
    const overlay = document.getElementById('dropdown-overlay');
    const list = document.getElementById('dropdown-models-list');
    if (!dropdown || !overlay || !list) return;

    const filtered = this.running.filter(r => r.status === filter);

    if (filtered.length === 0) {
      list.innerHTML = `<div class="dropdown-empty">No ${filter} models</div>`;
    } else {
      list.innerHTML = filtered.map(run => {
        const timeSource = run.status === 'finished' ? (run.finished || run.started) : run.started;
        const timeText = this.timeAgo(timeSource);
        return `
          <div class="dropdown-item" data-run-id="${run.id}">
            <span class="dropdown-item-name">${run.model.name}</span>
            <span class="dropdown-item-status">${timeText}</span>
          </div>
        `;
      }).join('');

      list.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
          const runId = item.dataset.runId;
          const run = this.running.find(r => r.id === runId);
          if (run && run.status === 'finished') {
            this.openChat(run);
          }
          Files.hideDropdowns();
        });
      });
    }

    const rect = e.currentTarget.getBoundingClientRect();
    dropdown.style.left = rect.left + 'px';
    dropdown.style.top = rect.bottom + 4 + 'px';
    dropdown.classList.add('active');
    overlay.classList.add('active');

    overlay.onclick = () => Files.hideDropdowns();
  },

  openChat(run) {
    run.lastAccessed = new Date().toISOString();

    const title = document.getElementById('chat-title');
    const messages = document.getElementById('chat-messages');
    const input = document.getElementById('chat-input');

    if (title) title.textContent = `${run.model.name} - ${run.spec}.md`;
    if (messages) {
      messages.innerHTML = `
        <div class="chat-msg">
          <strong>${run.model.name}</strong>
          ${run.result}
        </div>
      `;
    }
    if (input) input.value = '';

    Modals.open('modal-chat');
  }
};
