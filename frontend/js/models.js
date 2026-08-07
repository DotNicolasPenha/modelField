const Models = {
  data: {
    openai: [
      { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', description: 'Most capable model, multimodal', costPerInputToken: 0.000005, costPerOutputToken: 0.000015 },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', description: 'Fast and affordable', costPerInputToken: 0.00000015, costPerOutputToken: 0.0000006 },
      { id: 'o1-preview', name: 'o1-preview', provider: 'OpenAI', description: 'Advanced reasoning', costPerInputToken: 0.000015, costPerOutputToken: 0.00006 }
    ],
    claude: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'Anthropic', description: 'Balanced speed and quality', costPerInputToken: 0.000003, costPerOutputToken: 0.000015 },
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', provider: 'Anthropic', description: 'Most capable model', costPerInputToken: 0.000015, costPerOutputToken: 0.000075 },
      { id: 'claude-haiku-3-5', name: 'Claude 3.5 Haiku', provider: 'Anthropic', description: 'Ultra fast', costPerInputToken: 0.0000008, costPerOutputToken: 0.000004 }
    ],
    gemini: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', description: 'Premium model', costPerInputToken: 0.00000125, costPerOutputToken: 0.00001 },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', description: 'Fast and efficient', costPerInputToken: 0.000000075, costPerOutputToken: 0.0000003 }
    ],
    openrouter: [
      { id: 'meta-llama/llama-4-maverick', name: 'Llama 4 Maverick', provider: 'Meta via OpenRouter', description: 'Open source model', costPerInputToken: 0.0000002, costPerOutputToken: 0.0000002 },
      { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek via OpenRouter', description: 'Advanced reasoning', costPerInputToken: 0.00000055, costPerOutputToken: 0.0000022 }
    ]
  },

  running: [],
  timeInterval: null,
  currentRun: null,

  getAlias(modelId) {
    return App.state.modelAliases.find(a => a.modelId === modelId);
  },

  getDisplayName(model) {
    const alias = this.getAlias(model.id);
    return alias ? alias.customName : model.name;
  },

  init() {
    document.getElementById('btn-running-count')?.addEventListener('click', (e) => {
      this.showModelsDropdown(e, 'running');
    });

    document.getElementById('btn-finished-count')?.addEventListener('click', (e) => {
      this.showModelsDropdown(e, 'finished');
    });

    document.getElementById('btn-start-run')?.addEventListener('click', () => {
      this.confirmStartRun();
    });

    document.getElementById('btn-history')?.addEventListener('click', () => {
      this.showHistory();
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

  formatTokens(tokens) {
    if (tokens >= 1000) {
      return (tokens / 1000).toFixed(1) + 'k';
    }
    return tokens.toString();
  },

  formatCost(cost) {
    if (cost >= 0.01) {
      return '$' + cost.toFixed(3);
    }
    if (cost >= 0.001) {
      return '$' + cost.toFixed(4);
    }
    return '$' + cost.toFixed(5);
  },

  formatDuration(seconds) {
    if (seconds < 1) {
      return Math.round(seconds * 1000) + 'ms';
    }
    return seconds.toFixed(1) + 's';
  },

  formatSize(bytes) {
    if (bytes >= 1024) {
      return (bytes / 1024).toFixed(1) + ' KB';
    }
    return bytes + ' B';
  },

  generateMetrics(model) {
    const inputTokens = 800 + Math.floor(Math.random() * 1200);
    const outputTokens = 500 + Math.floor(Math.random() * 1000);
    const duration = 1 + Math.random() * 5;
    const cost = (inputTokens * model.costPerInputToken) + (outputTokens * model.costPerOutputToken);
    const resultSize = 1500 + Math.floor(Math.random() * 2000);

    return {
      inputTokens,
      outputTokens,
      duration,
      cost,
      resultSize
    };
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
    this.pendingRunModel = model;

    const alias = this.getAlias(model.id);
    document.getElementById('config-model-name').textContent = model.name;
    document.getElementById('config-model-provider').textContent = model.provider;
    document.getElementById('config-spec-name').textContent = this.getCurrentSpecName() + '.md';
    document.getElementById('input-run-alias').value = alias ? alias.customName : '';

    Modals.close('modal-run');
    Modals.open('modal-run-config');
  },

  confirmStartRun() {
    const model = this.pendingRunModel;
    if (!model) return;

    const aliasInput = document.getElementById('input-run-alias');
    const aliasValue = aliasInput ? aliasInput.value.trim() : '';

    if (aliasValue) {
      const existing = App.state.modelAliases.findIndex(a => a.modelId === model.id);
      if (existing >= 0) {
        App.state.modelAliases[existing].customName = aliasValue;
      } else {
        App.state.modelAliases.push({ modelId: model.id, customName: aliasValue });
      }
      App.saveModelAliases();
    } else {
      const existing = App.state.modelAliases.findIndex(a => a.modelId === model.id);
      if (existing >= 0) {
        App.state.modelAliases.splice(existing, 1);
        App.saveModelAliases();
      }
    }

    Modals.close('modal-run-config');
    this.executeRun(model);
  },

  getCurrentSpecName() {
    const file = App.state.files.find(f => f.id === App.state.activeFile);
    return file ? file.name : 'spec';
  },

  executeRun(model) {
    const specName = this.getCurrentSpecName();

    const run = {
      id: Date.now().toString(),
      model: model,
      spec: specName,
      status: 'running',
      started: new Date().toISOString(),
      finished: null,
      lastAccessed: null,
      result: null,
      metrics: null
    };

    this.running.push(run);
    this.render();
    App.updateCounts();
    Notifications.show(`Running ${this.getDisplayName(model)} on ${specName}.md`);

    const delay = 2000 + Math.random() * 3000;
    setTimeout(() => this.finishRun(run.id), delay);
  },

  finishRun(runId) {
    const run = this.running.find(r => r.id === runId);
    if (!run) return;

    run.status = 'finished';
    run.finished = new Date().toISOString();
    run.result = this.generateMockResult(run);
    run.metrics = this.generateMetrics(run.model);

    const alias = this.getAlias(run.model.id);
    const record = {
      id: run.id,
      modelId: run.model.id,
      modelName: run.model.name,
      alias: alias ? alias.customName : '',
      specName: run.spec,
      status: 'finished',
      started: run.started,
      finished: run.finished,
      result: run.result,
      inputTokens: run.metrics.inputTokens,
      outputTokens: run.metrics.outputTokens,
      duration: run.metrics.duration,
      cost: run.metrics.cost,
      resultSize: run.metrics.resultSize
    };
    App.state.runHistory.unshift(record);
    App.saveRunHistory();

    this.render();
    App.updateCounts();
    Notifications.show(`${this.getDisplayName(run.model)} finished processing ${run.spec}.md`);
  },

  removeRun(runId) {
    const run = this.running.find(r => r.id === runId);
    if (!run || run.status === 'running') return;

    this.running = this.running.filter(r => r.id !== runId);
    this.render();
    App.updateCounts();
    Notifications.show(`${this.getDisplayName(run.model)} removed from list`);
  },

  generateMockResult(run) {
    const displayName = this.getDisplayName(run.model);
    return `# Analysis of ${run.spec}.md

## Summary
The specification has been analyzed by ${displayName}.

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

  renderMetrics(metrics) {
    if (!metrics) return '';

    return `
      <div class="model-metrics">
        <span class="model-metric">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
          ${this.formatTokens(metrics.inputTokens + metrics.outputTokens)}
        </span>
        <span class="model-metric">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${this.formatDuration(metrics.duration)}
        </span>
        <span class="model-metric">
          ${this.formatCost(metrics.cost)}
        </span>
      </div>
    `;
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
      const alias = this.getAlias(run.model.id);

      return `
        <div class="model-item" data-run-id="${run.id}">
          <div class="model-info">
            <div class="model-name">${alias ? alias.customName : run.model.name}</div>
            <div class="model-alias">${run.model.name}</div>
            <div class="model-detail">${run.spec}.md</div>
          </div>
          <span class="model-time" data-time="${timeSource}">${timeText}</span>
          <span class="model-status ${run.status}">${run.status}</span>
          <div class="model-actions">
            ${run.status === 'finished' ? `
              <button class="model-open">Open</button>
              <button class="model-close" title="Remove">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            ` : ''}
          </div>
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
        const metricsText = run.metrics
          ? `${this.formatTokens(run.metrics.inputTokens + run.metrics.outputTokens)} tokens · ${this.formatDuration(run.metrics.duration)}`
          : '';
        const alias = this.getAlias(run.model.id);
        return `
          <div class="dropdown-item" data-run-id="${run.id}">
            <div class="dropdown-item-names">
              <span class="dropdown-item-name">${alias ? alias.customName : run.model.name}</span>
              <span class="dropdown-item-alias">${run.model.name}</span>
            </div>
            <span class="dropdown-item-status">${metricsText || timeText}</span>
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
    this.currentRun = run;

    const title = document.getElementById('chat-title');
    const subtitle = document.getElementById('chat-subtitle');
    const metricsInline = document.getElementById('chat-metrics-inline');
    const messages = document.getElementById('chat-messages');
    const input = document.getElementById('chat-input');

    const displayName = this.getDisplayName(run.model);
    if (title) title.textContent = displayName;
    if (subtitle) subtitle.textContent = run.model.name;

    if (metricsInline) {
      if (run.metrics) {
        metricsInline.innerHTML = `
          <span class="chat-metric-item">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
            ${this.formatTokens(run.metrics.inputTokens)} in · ${this.formatTokens(run.metrics.outputTokens)} out
          </span>
          <span class="chat-metric-item">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${this.formatDuration(run.metrics.duration)}
          </span>
          <span class="chat-metric-item">
            ${this.formatCost(run.metrics.cost)}
          </span>
          <span class="chat-metric-item">
            ${this.formatSize(run.metrics.resultSize)}
          </span>
        `;
      } else {
        metricsInline.innerHTML = '';
      }
    }

    if (messages) {
      messages.innerHTML = `
        <div class="chat-msg">
          <strong>${displayName}</strong>
          ${run.result}
        </div>
      `;
    }
    if (input) input.value = '';

    Modals.open('modal-chat');
  },

  showHistory() {
    const list = document.getElementById('history-list');
    const searchInput = document.getElementById('history-search');
    if (!list) return;

    this.renderHistory();

    if (searchInput) {
      searchInput.value = '';
      searchInput.addEventListener('input', () => {
        this.renderHistory(searchInput.value.toLowerCase().trim());
      });
    }

    Modals.open('modal-history');
  },

  renderHistory(query = '') {
    const list = document.getElementById('history-list');
    if (!list) return;

    let history = App.state.runHistory;

    if (query) {
      history = history.filter(r => {
        const name = (r.alias || r.modelName).toLowerCase();
        const spec = r.specName.toLowerCase();
        return name.includes(query) || spec.includes(query);
      });
    }

    if (history.length === 0) {
      list.innerHTML = '<div class="history-empty">No run history</div>';
      return;
    }

    list.innerHTML = history.map(record => {
      const displayName = record.alias || record.modelName;
      const timeText = this.timeAgo(record.finished || record.started);
      return `
        <div class="history-item" data-record-id="${record.id}">
          <div class="history-item-info">
            <div class="history-item-name">${displayName}</div>
            <div class="history-item-alias">${record.modelName}</div>
            <div class="history-item-spec">${record.specName}.md</div>
          </div>
          <div class="history-item-metrics">
            <span>${this.formatTokens(record.inputTokens + record.outputTokens)}</span>
            <span>${this.formatDuration(record.duration)}</span>
            <span>${this.formatCost(record.cost)}</span>
          </div>
          <span class="history-item-time">${timeText}</span>
          <button class="history-item-delete" title="Delete">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.history-item-delete')) return;
        const recordId = item.dataset.recordId;
        const record = App.state.runHistory.find(r => r.id === recordId);
        if (record) this.openHistoryChat(record);
      });
    });

    list.querySelectorAll('.history-item-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const recordId = btn.closest('.history-item').dataset.recordId;
        this.deleteHistoryRecord(recordId);
      });
    });
  },

  deleteHistoryRecord(recordId) {
    App.state.runHistory = App.state.runHistory.filter(r => r.id !== recordId);
    App.saveRunHistory();
    this.renderHistory();
    Notifications.show('History record deleted');
  },

  openHistoryChat(record) {
    const displayName = record.alias || record.modelName;

    const title = document.getElementById('chat-title');
    const subtitle = document.getElementById('chat-subtitle');
    const metricsInline = document.getElementById('chat-metrics-inline');
    const messages = document.getElementById('chat-messages');
    const input = document.getElementById('chat-input');

    this.currentRun = {
      model: { id: record.modelId, name: record.modelName },
      result: record.result,
      metrics: {
        inputTokens: record.inputTokens,
        outputTokens: record.outputTokens,
        duration: record.duration,
        cost: record.cost,
        resultSize: record.resultSize
      }
    };

    if (title) title.textContent = displayName;
    if (subtitle) subtitle.textContent = record.modelName;

    if (metricsInline) {
      metricsInline.innerHTML = `
        <span class="chat-metric-item">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
          ${this.formatTokens(record.inputTokens)} in · ${this.formatTokens(record.outputTokens)} out
        </span>
        <span class="chat-metric-item">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${this.formatDuration(record.duration)}
        </span>
        <span class="chat-metric-item">
          ${this.formatCost(record.cost)}
        </span>
        <span class="chat-metric-item">
          ${this.formatSize(record.resultSize)}
        </span>
      `;
    }

    if (messages) {
      messages.innerHTML = `
        <div class="chat-msg">
          <strong>${displayName}</strong>
          ${record.result}
        </div>
      `;
    }
    if (input) input.value = '';

    Modals.close('modal-history');
    Modals.open('modal-chat');
  }
};
