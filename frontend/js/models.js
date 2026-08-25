const Models = {
  running: [],
  timeInterval: null,
  currentRun: null,
  chatHistory: [],

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

    document.getElementById('btn-start-run')?.addEventListener('click', (e) => {
      // Causality anchor: the execution panel will animate in from the
      // spot where "Start Run" was clicked.
      const rect = e.currentTarget.getBoundingClientRect();
      this._runOrigin = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
      this.confirmStartRun();
    });

    document.getElementById('btn-history')?.addEventListener('click', () => {
      this.showHistory();
    });

    document.getElementById('btn-context-run')?.addEventListener('click', () => {
      this.showRunModal();
    });

    document.getElementById('btn-send-chat')?.addEventListener('click', () => {
      this.sendChatMessage();
    });

    document.getElementById('btn-stop-chat')?.addEventListener('click', () => {
      if (this._currentAbortController) {
        this._currentAbortController.abort();
      }
    });

    document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.sendChatMessage();
    });

    document.getElementById('btn-edit-chat-meta')?.addEventListener('click', () => {
      this._editRunMeta();
    });

    this.timeInterval = setInterval(() => this.updateTimes(), 30000);
    this._restoreRunningFromHistory();
    this.render();
    this.updateUsageSummary();
    this._fetchModelsOnStartup();
  },

  // The running list is in-memory; after an app restart, repopulate it
  // from persisted history so the side section doesn't come up empty.
  _restoreRunningFromHistory() {
    if (this.running.length > 0) return;
    const MAX_RESTORED = 15;
    this.running = (App.state.runHistory || []).slice(0, MAX_RESTORED).map(r => ({
      id: r.id,
      model: { id: r.modelId, name: r.modelName },
      context: this._contextFromRecord(r),
      spec: r.specName || '',
      specNames: r.specNames || [],
      filePaths: r.filePaths || [],
      prompt: r.prompt || '',
      title: r.title || '',
      tags: r.tags || [],
      status: r.status === 'running' ? 'error' : (r.status || 'finished'),
      started: r.started,
      finished: r.finished,
      lastAccessed: null,
      result: r.result,
      metrics: {
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        duration: r.duration,
        cost: r.cost,
        resultSize: r.resultSize,
        toolCalls: r.toolCalls,
        iterations: r.iterations
      },
      transcript: r.messages || undefined
    }));
  },

  async _fetchModelsOnStartup() {
    const keys = App.state.apiKeys;
    const hasAnyKey = Object.values(keys).some(k => k);
    if (!hasAnyKey) return;
    try {
      const results = await API.fetchAllModels();
      const fetched = Object.values(results).filter(r => r.fromApi).length;
      if (fetched > 0) {
        console.info(`Model catalog updated (${fetched} provider(s) refreshed)`);
        this.render();
        if (document.getElementById('modal-run')?.classList.contains('active')) {
          this.showRunModal();
        }
      }
    } catch (e) {
      console.warn('Failed to fetch models on startup:', e);
    }
  },

  getAvailableModels() {
    const available = [];
    const keys = App.state.apiKeys;
    const allProviders = ProviderBase.getAll();

    for (const [name, provider] of Object.entries(allProviders)) {
      if (keys[provider.apiKeyField]) {
        const models = ProviderBase.getModels(name);
        models.forEach(m => available.push(m));
      }
    }

    return available;
  },

  getModelsByProvider() {
    const keys = App.state.apiKeys;
    const allProviders = ProviderBase.getAll();
    const groups = [];

    for (const [name, provider] of Object.entries(allProviders)) {
      const hasKey = !!keys[provider.apiKeyField];
      const models = hasKey ? ProviderBase.getModels(name) : [];
      groups.push({
        name: name,
        displayName: provider.displayName,
        hasKey: hasKey,
        models: models
      });
    }

    return groups;
  },

  updateUsageSummary() {
    const el = document.getElementById('usage-summary');
    if (!el) return;
    const today = new Date().toDateString();
    const todays = (App.state.runHistory || []).filter(r =>
      r.status === 'finished' && r.started && new Date(r.started).toDateString() === today
    );
    if (todays.length === 0) {
      el.textContent = '';
      return;
    }
    const tokens = todays.reduce((sum, r) => sum + (r.inputTokens || 0) + (r.outputTokens || 0), 0);
    const cost = todays.reduce((sum, r) => sum + (r.cost || 0), 0);
    el.textContent = `${this.formatTokens(tokens)} · ${this.formatCost(cost)} today`;
    el.title = `${todays.length} run(s) today`;
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

  updateTimes() {
    document.querySelectorAll('.model-time').forEach(el => {
      const dateStr = el.dataset.time;
      if (dateStr) el.textContent = this.timeAgo(dateStr);
    });
  },

  _createEl(tag, className, attrs = {}) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'style') Object.assign(el.style, v);
      else el.setAttribute(k, v);
    }
    return el;
  },

  _createModelItem(model, providerName) {
    const item = this._createEl('div', 'model-item', { 'data-model-id': model.id });
    const info = this._createEl('div', 'model-info');
    const alias = this.getAlias(model.id);
    const nameEl = this._createEl('div', 'model-name');
    nameEl.textContent = alias?.customName || model.name;
    if (alias?.customName) nameEl.title = model.name;
    info.appendChild(nameEl);

    if (alias && alias.tags && alias.tags.length > 0) {
      const tagsEl = this._createEl('div', 'model-tags');
      for (const tag of alias.tags) {
        tagsEl.appendChild(this._createEl('span', 'history-item-tag', { text: tag }));
      }
      info.appendChild(tagsEl);
    }

    const desc = (model.description || providerName).substring(0, 50);
    info.appendChild(this._createEl('div', 'model-detail model-detail-truncated', { text: desc }));
    item.appendChild(info);

    const editBtn = this._createEl('button', 'model-item-edit');
    editBtn.title = 'Title & tags';
    editBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
    editBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await this.editModelAlias(model);
      this.showRunModal();
    });
    item.appendChild(editBtn);

    const btn = this._createEl('button', 'btn btn-primary', { text: 'Run' });
    Object.assign(btn.style, { height: '32px', fontSize: '12px', padding: '0 12px' });
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const allModels = this.getAvailableModels();
      const recents = (App.state.recentModels || []).map(rm => ({
        id: rm.id, name: rm.name, provider: rm.provider, description: rm.provider || ''
      }));
      const allAvailable = [...recents, ...allModels];
      const found = allAvailable.find(m => m.id === model.id);
      if (found) this.startRun(found);
    });
    item.appendChild(btn);
    return item;
  },

  async editModelAlias(model) {
    const existing = this.getAlias(model.id);
    const name = await Modals.prompt(
      `Display name for ${model.name}`,
      existing?.customName || '',
      null
    );
    if (name === null) return;

    const tagsInput = await Modals.prompt(
      'Tags (comma separated)',
      (existing?.tags || []).join(', '),
      null
    );
    if (tagsInput === null) return;

    const customName = name.trim();
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

    if (!customName && (!existing || tags.length === 0)) {
      App.state.modelAliases = App.state.modelAliases.filter(a => a.modelId !== model.id);
    } else if (existing) {
      existing.customName = customName;
      existing.tags = tags;
    } else {
      App.state.modelAliases.push({ modelId: model.id, customName, tags });
    }

    await App.saveModelAliases();
    Notifications.show(customName ? `Alias saved for ${model.name}` : `Alias removed for ${model.name}`);

    // Refresh every surface that renders model names: the running list
    // (sidebar), open history list and any active dropdowns.
    this.render();
    if (document.getElementById('modal-history')?.classList.contains('active')) {
      const query = document.getElementById('history-search')?.value.toLowerCase().trim() || '';
      this.renderHistory(query);
    }
    document.querySelectorAll('.dropdown-menu.active .dropdown-item').forEach(item => {
      const aliasNow = this.getAlias(model.id);
      const nameEl = item.querySelector('.dropdown-item-name');
      if (nameEl && item.dataset.modelId === model.id && aliasNow) {
        nameEl.textContent = aliasNow.customName || model.name;
      }
    });
  },

  _createProviderGroup(group) {
    const panel = this._createEl('div', 'provider-group run-tab-panel', { 'data-tab': group.name });
    const header = this._createEl('div', 'provider-group-header');
    header.appendChild(this._createEl('span', null, { text: group.displayName }));
    header.appendChild(this._createEl('span', 'provider-key-status valid', { text: `${group.models.length} models` }));
    panel.appendChild(header);
    for (const m of group.models) {
      panel.appendChild(this._createModelItem(m, group.displayName));
    }
    return panel;
  },

  _createRecentsGroup(recents) {
    const panel = this._createEl('div', 'provider-group run-tab-panel', { 'data-tab': 'recents' });
    const header = this._createEl('div', 'provider-group-header');
    header.appendChild(this._createEl('span', null, { text: 'Recently Used' }));
    panel.appendChild(header);
    for (const rm of recents) {
      panel.appendChild(this._createModelItem({ id: rm.id, name: rm.name, description: rm.provider || '' }, rm.provider));
    }
    return panel;
  },

  showRunModal() {
    FileExplorer.closePopover?.();
    const body = document.getElementById('modal-run-body');
    if (!body) return;
    body.innerHTML = '';

    const groups = this.getModelsByProvider();
    const hasAnyModels = groups.some(g => g.models.length > 0);

    // Drop pruned/dead models from recents (both render and storage).
    const availableIds = new Set(this.getAvailableModels().map(m => m.id));
    const recents = (App.state.recentModels || []).filter(rm => availableIds.has(rm.id));
    if (recents.length !== (App.state.recentModels || []).length) {
      App.state.recentModels = recents;
      App.saveRecentModels?.();
    }

    if (!hasAnyModels && recents.length === 0) {
      body.appendChild(this._createEl('p', 'text-muted', { text: 'Configure an API key in Settings to use models.' }));
      Modals.open('modal-run');
      return;
    }

    const activeGroups = groups.filter(g => g.hasKey && g.models.length > 0);
    const tabs = [];
    if (recents.length > 0) tabs.push({ id: 'recents', label: 'Recents' });
    activeGroups.forEach(g => tabs.push({ id: g.name, label: g.displayName }));

    if (tabs.length > 1) {
      const tabsBar = this._createEl('div', 'run-tabs');
      tabs.forEach((tab, i) => {
        const btn = this._createEl('button', `run-tab${i === 0 ? ' active' : ''}`, { text: tab.label });
        btn.dataset.tab = tab.id;
        btn.addEventListener('click', () => {
          tabsBar.querySelectorAll('.run-tab').forEach(t => t.classList.remove('active'));
          btn.classList.add('active');
          body.querySelectorAll('.run-tab-panel').forEach(panel => {
            panel.classList.toggle('is-hidden', panel.dataset.tab !== tab.id);
          });
        });
        tabsBar.appendChild(btn);
      });
      body.appendChild(tabsBar);
    }

    const searchInput = this._createEl('input', 'input run-search', {
      type: 'text', placeholder: 'Search models...', id: 'model-search'
    });
    body.appendChild(searchInput);

    const modelsList = this._createEl('div', 'run-models-list', { id: 'run-models-list' });

    if (recents.length > 0) {
      modelsList.appendChild(this._createRecentsGroup(recents));
    }

    for (const group of activeGroups) {
      modelsList.appendChild(this._createProviderGroup(group));
    }

    body.appendChild(modelsList);

    const activeTabId = tabs[0]?.id;
    if (activeTabId) {
      body.querySelectorAll('.run-tab-panel').forEach(panel => {
        panel.classList.toggle('is-hidden', panel.dataset.tab !== activeTabId);
      });
    }

    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase().trim();
      const activeTab = body.querySelector('.run-tab.active')?.dataset.tab;
      body.querySelectorAll('.run-tab-panel').forEach(panel => {
        if (activeTab && panel.dataset.tab !== activeTab) {
          panel.classList.add('is-hidden');
          return;
        }
        let hasVisible = false;
        panel.querySelectorAll('.model-item').forEach(item => {
          const name = item.querySelector('.model-name')?.textContent.toLowerCase() || '';
          const detail = item.querySelector('.model-detail')?.textContent.toLowerCase() || '';
          const match = !query || name.includes(query) || detail.includes(query);
          item.classList.toggle('is-hidden', !match);
          if (match) hasVisible = true;
        });
        panel.classList.toggle('is-hidden', !hasVisible);
      });
    });

    Modals.open('modal-run');
  },

  startRun(model) {
    this.pendingRunModel = model;
    App.addRecentModel(model);

    const alias = this.getAlias(model.id);
    document.getElementById('config-model-name').textContent = model.name;
    document.getElementById('config-model-provider').textContent = model.provider;

    const contextList = document.getElementById('run-context-list');
    const context = FileExplorer.getContext();
    if (contextList) {
      if (context.length === 0) {
        contextList.innerHTML = '<div class="text-muted" style="font-size: 12px;">No context selected. Select files from the sidebar.</div>';
      } else {
        const icons = {
          spec: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
          file: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>',
          folder: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>'
        };
        contextList.innerHTML = context.map(c =>
          `<div class="run-context-item"><span class="run-context-item-icon">${icons[c.type] || icons.file}</span> ${c.name}${c.type === 'folder' ? '/' : ''} <span class="run-context-badge">${c.type}</span></div>`
        ).join('');
      }
    }

    const promptInput = document.getElementById('input-run-prompt');
    if (promptInput) promptInput.value = '';

    const errorEl = document.getElementById('run-validation-error');
    if (errorEl) errorEl.textContent = '';

    Modals.close('modal-run');
    Modals.open('modal-run-config');
  },

  confirmStartRun() {
    const model = this.pendingRunModel;
    if (!model) return;

    const context = FileExplorer.getContext();
    const promptInput = document.getElementById('input-run-prompt');
    const prompt = promptInput ? promptInput.value.trim() : '';
    const errorEl = document.getElementById('run-validation-error');

    if (!prompt) {
      if (errorEl) errorEl.textContent = 'Write a prompt';
      return;
    }

    if (errorEl) errorEl.textContent = '';

    Modals.close('modal-run-config');
    this.executeRun(model, context, prompt);
  },

  getCurrentSpecName() {
    const file = App.state.files.find(f => f.id === App.state.activeFile);
    return file ? file.name : 'untitled';
  },

  async executeRun(model, context, prompt) {
    const fileContextNames = context.filter(c => c.type !== 'folder').map(c => c.name.replace(/\.md$/, ''));
    const folderCount = context.filter(c => c.type === 'folder').length;
    const filePaths = context.filter(c => c.type === 'file').map(c => c.path);

    const run = {
      id: Date.now().toString(),
      model: model,
      context: context,
      spec: fileContextNames[0] || '',
      specNames: fileContextNames,
      filePaths: filePaths,
      prompt: prompt,
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
    Notifications.show(context.length > 0
      ? `Running ${this.getDisplayName(model)} on ${fileContextNames.join(', ')}${folderCount > 0 ? ` + ${folderCount} folder${folderCount > 1 ? 's' : ''}` : ''}`
      : `Running ${this.getDisplayName(model)}`);

    requestAnimationFrame(() => {
      const el = document.querySelector(`.model-item[data-run-id="${run.id}"]`);
      if (el) {
        el.classList.add('entering');
        el.addEventListener('animationend', () => el.classList.remove('entering'), { once: true });
      }
    });

    this.openChat(run);
    const messagesEl = document.getElementById('chat-messages');
    this._showChatLoading(messagesEl, this.getDisplayName(model));

    const abortController = new AbortController();
    this._currentAbortController = abortController;
    const btnStop = document.getElementById('btn-stop-chat');
    if (btnStop) btnStop.classList.remove('is-hidden');

    try {
      const result = await API.sendRun(model, context, prompt, (toolEvent) => {
        this._renderToolEvent(messagesEl, toolEvent);
      }, abortController.signal);
      this._removeChatLoading();

      run.status = 'finished';
      run.finished = new Date().toISOString();
      run.result = result.content;
      run.metrics = result.metrics;
      run.toolHistory = result.toolHistory;

      this.chatHistory = [
        { role: 'user', content: prompt }
      ];
      if (result.toolHistory && result.toolHistory.length > 0) {
        this.chatHistory.push({
          role: 'assistant',
          content: result.content,
          toolCalls: result.toolHistory.map(th => ({
            id: th.toolCallId,
            name: th.toolName,
            arguments: th.arguments
          }))
        });
        for (const th of result.toolHistory) {
          this.chatHistory.push({ toolCallId: th.toolCallId, toolName: th.toolName, content: th.result });
        }
      } else {
        this.chatHistory.push({ role: 'assistant', content: result.content });
      }

      run.transcript = [
        { role: 'user', content: prompt },
        { role: 'assistant', content: result.content }
      ];

      this._finishRun(run);
    } catch (error) {
      this._removeChatLoading();
      this._currentAbortController = null;
      const btnStop = document.getElementById('btn-stop-chat');
      if (btnStop) btnStop.classList.add('is-hidden');

      if (error.name === 'AbortError') {
        run.status = 'cancelled';
        run.finished = new Date().toISOString();
        run.result = 'Cancelled by user';

        const messagesEl = document.getElementById('chat-messages');
        if (messagesEl) {
          const cancelEl = document.createElement('div');
          cancelEl.className = 'chat-msg chat-msg-error';
          cancelEl.innerHTML = `<div class="chat-msg-author">Stopped</div>Request cancelled by user.`;
          messagesEl.appendChild(cancelEl);
          messagesEl.scrollTop = messagesEl.scrollHeight;
        }
      } else {
        run.status = 'error';
        run.finished = new Date().toISOString();
        run.result = `Error: ${error.message}`;
        run.metrics = null;

        const messagesEl = document.getElementById('chat-messages');
        if (messagesEl) {
          const errorEl = document.createElement('div');
          errorEl.className = 'chat-msg chat-msg-error';
          errorEl.innerHTML = `<div class="chat-msg-author">Error</div>${ProviderBase.escapeHtml(error.message)}`;
          messagesEl.appendChild(errorEl);
          messagesEl.scrollTop = messagesEl.scrollHeight;
        }
      }

      this.render();
      App.updateCounts();
    }
  },

  _describeRunContext(run) {
    const names = (run.specNames || []).filter(Boolean);
    const folders = (run.context || []).filter(c => c.type === 'folder').map(c => c.name + '/');
    const parts = [...names, ...folders];
    return parts.length > 0 ? parts.join(', ') : 'prompt';
  },

  // Context descriptors small enough to persist in history: spec contents
  // are re-resolved from App.state.files on replay.
  _lightContext(context) {
    return (context || []).map(c => ({
      type: c.type,
      name: c.name,
      path: c.path || undefined
    }));
  },

  _contextFromRecord(record) {
    return (record.context || []).map(c => {
      if (c.type !== 'spec') return { ...c };
      const file = App.state.files.find(f => f.name + '.md' === c.name && !f.trashed);
      return file ? { name: c.name, content: file.content, type: 'spec' } : null;
    }).filter(Boolean);
  },

  _finishRun(run) {
    const alias = this.getAlias(run.model.id);
    const record = {
      id: run.id,
      modelId: run.model.id,
      modelName: run.model.name,
      alias: alias ? alias.customName : '',
      title: run.title || '',
      tags: run.tags || [],
      specName: run.spec,
      specNames: run.specNames || [run.spec],
      filePaths: run.filePaths || [],
      prompt: run.prompt || '',
      status: 'finished',
      started: run.started,
      finished: run.finished,
      result: run.result,
      messages: run.transcript || [
        { role: 'user', content: run.prompt || '' },
        { role: 'assistant', content: run.result }
      ],
      context: this._lightContext(run.context),
      inputTokens: run.metrics?.inputTokens || 0,
      outputTokens: run.metrics?.outputTokens || 0,
      duration: run.metrics?.duration || 0,
      cost: run.metrics?.cost || 0,
      resultSize: run.metrics?.resultSize || 0,
      toolCalls: run.metrics?.toolCalls || 0,
      iterations: run.metrics?.iterations || 1
    };
    App.state.runHistory.unshift(record);
    App.saveRunHistory();

    this.render();
    App.updateCounts();
    this.updateUsageSummary();
    Notifications.show(`${this.getDisplayName(run.model)} finished processing ${this._describeRunContext(run)}`);

    const messagesEl = document.getElementById('chat-messages');
    if (messagesEl) {
      const aiMsg = document.createElement('div');
      aiMsg.className = 'chat-msg';
      let metricsHtml = '';
      if (run.metrics) {
        metricsHtml = `<div class="chat-msg-metrics">
          <span>${this.formatTokens(run.metrics.inputTokens)} in · ${this.formatTokens(run.metrics.outputTokens)} out</span>
          <span>·</span>
          <span>${this.formatDuration(run.metrics.duration)}</span>
          <span>·</span>
          <span>${this.formatCost(run.metrics.cost)}</span>
        </div>`;
      }
      aiMsg.innerHTML = `<div class="chat-msg-author">${this.getDisplayName(run.model)}</div>${ProviderBase.formatMarkdown(run.result)}${metricsHtml}`;
      messagesEl.appendChild(aiMsg);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    this._updateChatMetrics(run);

    requestAnimationFrame(() => {
      const el = document.querySelector(`.model-item[data-run-id="${run.id}"] .model-status`);
      if (el) {
        el.classList.add('status-changed');
        el.addEventListener('animationend', () => el.classList.remove('status-changed'), { once: true });
      }
    });
  },

  _estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  },

  removeRun(runId) {
    const run = this.running.find(r => r.id === runId);
    if (!run || run.status === 'running') return;

    const el = document.querySelector(`.model-item[data-run-id="${runId}"]`);
    if (el) {
      el.classList.add('exiting');
      el.addEventListener('animationend', () => {
        this.running = this.running.filter(r => r.id !== runId);
        this.render();
        App.updateCounts();
        Notifications.show(`${this.getDisplayName(run.model)} removed from list`);
      }, { once: true });
    } else {
      this.running = this.running.filter(r => r.id !== runId);
      this.render();
      App.updateCounts();
      Notifications.show(`${this.getDisplayName(run.model)} removed from list`);
    }
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
      const statusClass = run.status === 'error' ? 'error' : run.status;

      return `
        <div class="model-item" data-run-id="${run.id}">
          <div class="model-info">
            <div class="model-name">${run.title || (alias ? alias.customName : run.model.name)}</div>
            <div class="model-alias">${run.model.name}</div>
            <div class="model-detail">${run.spec ? run.spec + '.md' : 'prompt run'}</div>
          </div>
          <span class="model-time" data-time="${timeSource}">${timeText}</span>
          <span class="model-status ${statusClass}">${run.status}</span>
          <div class="model-actions">
            ${run.status === 'finished' || run.status === 'error' ? `
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
        if (run && (run.status === 'finished' || run.status === 'error')) {
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
          if (run && (run.status === 'finished' || run.status === 'error')) {
            this.openChat(run);
          }
          Files.hideDropdowns();
        });
      });
    }

    const rect = e.currentTarget.getBoundingClientRect();
    Modals.positionPopover(dropdown, rect.left, rect.bottom, 4);
    dropdown.classList.add('active');
    overlay.classList.add('active');

    overlay.onclick = () => Files.hideDropdowns();
  },

};
