// ChatUI — chat rendering/interaction for runs. Mixes into Models via
// Object.assign so call sites keep using Models.* unchanged.
// Depends on globals: ProviderBase, API, Modals, FileExplorer, TextTools.
Object.assign(Models, {

  openChat(run) {
    run.lastAccessed = new Date().toISOString();
    this.currentRun = run;

    if (run.transcript && run.transcript.length > 0) {
      this.chatHistory = run.transcript.map(m => ({ ...m }));
    } else if (run.result) {
      this.chatHistory = [
        { role: 'user', content: run.prompt || '' },
        { role: 'assistant', content: run.result }
      ].filter(m => m.content);
      run.transcript = this.chatHistory.map(m => ({ ...m }));
    } else {
      this.chatHistory = [];
    }

    const title = document.getElementById('chat-title');
    const subtitle = document.getElementById('chat-subtitle');
    const metricsInline = document.getElementById('chat-metrics-inline');
    const messages = document.getElementById('chat-messages');
    const input = document.getElementById('chat-input');

    const displayName = this.getDisplayName(run.model);
    if (title) title.textContent = run.title || displayName;
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
      const displayName = this.getDisplayName(run.model);
      const transcript = run.transcript && run.transcript.length > 0
        ? run.transcript
        : (run.result ? [{ role: 'assistant', content: run.result }] : []);
      if (transcript.length > 0) {
        this._renderTranscript(messages, transcript, displayName);
      } else {
        messages.innerHTML = '';
      }
    }
    if (input) {
      input.value = '';
      input.disabled = false;
      input.classList.remove('chat-input-disabled');
    }

    this._initContextToggle();
    this._updateContextBar();
    Modals.open('modal-chat');
  },

  async sendChatMessage() {
    const input = document.getElementById('chat-input');
    const messages = document.getElementById('chat-messages');

    if (!input || !messages) return;

    const text = input.value.trim();
    if (!text) return;

    const userMsg = document.createElement('div');
    userMsg.className = 'chat-msg';
    userMsg.innerHTML = `<div class="chat-msg-author">You</div>${ProviderBase.escapeHtml(text)}`;
    messages.appendChild(userMsg);

    input.value = '';
    input.disabled = true;
    input.classList.add('chat-input-disabled');

    const currentRun = Models.currentRun;
    const aiName = currentRun ? Models.getDisplayName(currentRun.model) : 'AI';

    Models._showChatLoading(messages, aiName);
    const btnStop = document.getElementById('btn-stop-chat');
    if (btnStop) btnStop.style.display = '';

    const abortController = new AbortController();
    Models._currentAbortController = abortController;

    messages.scrollTop = messages.scrollHeight;

    try {
      Models.chatHistory.push({ role: 'user', content: text });

      const result = await API.sendChat(currentRun.model, Models.chatHistory, text, currentRun.context || [], (toolEvent) => {
        Models._renderToolEvent(messages, toolEvent);
      }, abortController.signal);

      Models._removeChatLoading();
      Models._currentAbortController = null;
      if (btnStop) btnStop.style.display = 'none';

      Models.chatHistory.push({ role: 'assistant', content: result.content });
      Models._syncTranscript();

      const aiMsg = document.createElement('div');
      aiMsg.className = 'chat-msg';
      let metricsHtml = '';
      if (result.metrics) {
        metricsHtml = `<div class="chat-msg-metrics">
          <span>${Models.formatTokens(result.metrics.inputTokens)} in · ${Models.formatTokens(result.metrics.outputTokens)} out</span>
          <span>·</span>
          <span>${Models.formatDuration(result.metrics.duration)}</span>
          <span>·</span>
          <span>${Models.formatCost(result.metrics.cost)}</span>
        </div>`;
      }
      aiMsg.innerHTML = `<div class="chat-msg-author">${aiName}</div>${ProviderBase.formatMarkdown(result.content)}${metricsHtml}`;
      messages.appendChild(aiMsg);

      messages.scrollTop = messages.scrollHeight;
      Models._updateContextBar();
    } catch (error) {
      Models._removeChatLoading();
      Models._currentAbortController = null;
      if (btnStop) btnStop.style.display = 'none';

      if (error.name === 'AbortError') {
        const cancelMsg = document.createElement('div');
        cancelMsg.className = 'chat-msg chat-msg-error';
        cancelMsg.innerHTML = `<div class="chat-msg-author">Stopped</div>Request cancelled by user.`;
        messages.appendChild(cancelMsg);
      } else {
        const errMsg = document.createElement('div');
        errMsg.className = 'chat-msg chat-msg-error';
        errMsg.innerHTML = `<div class="chat-msg-author">Error</div>${ProviderBase.escapeHtml(error.message)}`;
        messages.appendChild(errMsg);
      }

      messages.scrollTop = messages.scrollHeight;
    } finally {
      input.disabled = false;
      input.classList.remove('chat-input-disabled');
      input.focus();
    }
  },

  // Edit title/tags of the run currently open in the chat modal.
  async _editRunMeta() {
    const run = this.currentRun;
    if (!run) return;

    const title = await Modals.prompt('Run title', run.title || '', null);
    if (title === null) return;
    const tagsInput = await Modals.prompt(
      'Tags (comma separated)',
      (run.tags || []).join(', '),
      null
    );
    if (tagsInput === null) return;

    run.title = title.trim();
    run.tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

    const record = App.state.runHistory.find(r => r.id === run.id);
    if (record) {
      record.title = run.title;
      record.tags = run.tags;
      App.saveRunHistory();
    }

    // Keep the sidebar's copy of this run in sync (history replay creates
    // a separate object from the one stored in this.running).
    const runningEntry = this.running.find(r => r.id === run.id);
    if (runningEntry) {
      runningEntry.title = run.title;
      runningEntry.tags = run.tags;
    }

    this._updateChatHeaderMeta(run);
    // Sidebar cards prefer run titles over model names — keep them in sync.
    this.render();
    if (document.getElementById('modal-history')?.classList.contains('active')) {
      const query = document.getElementById('history-search')?.value.toLowerCase().trim() || '';
      this.renderHistory(query);
    }
  },

  _updateChatHeaderMeta(run) {
    const titleEl = document.getElementById('chat-title');
    if (titleEl && run.title) titleEl.textContent = run.title;
  },

  // Mirrors the plain user/assistant conversation into currentRun.transcript
  // and keeps the stored history record in sync so reopening (now or after
  // an app restart) shows every message exchanged.
  _syncTranscript() {
    const run = this.currentRun;
    if (!run) return;
    run.transcript = this.chatHistory
      .filter(m => !m.toolCallId && !m.toolCalls)
      .map(m => ({ role: m.role, content: m.content }));

    const record = App.state.runHistory.find(r => r.id === run.id);
    if (record) {
      record.messages = run.transcript;
      App.saveRunHistory();
    }
  },

  _showChatLoading(container, modelName) {
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'chat-msg chat-msg-loading';
    el.id = 'chat-loading';
    el.innerHTML = `
      <div class="chat-spinner"></div>
      <span>${modelName} is thinking...</span>
    `;
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
  },

  _removeChatLoading() {
    document.getElementById('chat-loading')?.remove();
    document.getElementById('chat-tool-status')?.remove();
  },

  // Single in-place status line for tool activity:
  //   (spinner) Reading ./index.html   → updates per call → removed when done.
  // Errors persist as a compact line instead of one block per call.
  _renderToolEvent(container, event) {
    if (!container) return;

    let el = document.getElementById('chat-tool-status');
    if (!el || !container.contains(el)) {
      el = document.createElement('div');
      el.className = 'chat-msg chat-tool-statusline';
      el.id = 'chat-tool-status';
      container.appendChild(el);
    }

    if (event.type === 'call') {
      const verbs = { read_file: 'Reading', write_file: 'Writing', list_dir: 'Listing' };
      const verb = verbs[event.name] || 'Running';
      const target = event.arguments?.path ?? event.arguments?.directory ?? '';
      el.classList.remove('chat-tool-statusline-error');
      el.innerHTML = `
        <div class="chat-spinner"></div>
        <span class="chat-tool-statusline-text">${verb} <code>${ProviderBase.escapeHtml(String(target))}</code></span>
      `;
      container.scrollTop = container.scrollHeight;
    } else {
      const isError = typeof event.result === 'string' && event.result.startsWith('Error');
      const verbs = { read_file: 'Read', write_file: 'Wrote', list_dir: 'Listed' };
      const verb = verbs[event.name] || 'Ran';
      const target = event.arguments?.path ?? event.arguments?.directory ?? '';
      el.classList.toggle('chat-tool-statusline-error', isError);
      el.innerHTML = isError
        ? `<span class="chat-tool-statusline-text">${verb} <code>${ProviderBase.escapeHtml(String(target))}</code> — ${ProviderBase.escapeHtml(event.result.slice(0, 120))}</span>`
        : `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span class="chat-tool-statusline-text">${verb} <code>${ProviderBase.escapeHtml(String(target))}</code></span>
        `;
    }
  },

  _updateContextBar() {
    const run = this.currentRun;
    if (!run) return;

    const basePrompt = API.buildSystemPrompt([]);
    const systemTokens = this._estimateTokens(basePrompt);

    let contextTokens = 0;
    for (const item of (run.context || [])) {
      contextTokens += this._estimateTokens(item.content || '');
    }

    let historyTokens = 0;
    for (const msg of this.chatHistory) {
      historyTokens += this._estimateTokens(msg.content || '');
    }

    const totalTokens = systemTokens + contextTokens + historyTokens;
    const maxTokens = 128000;
    const pct = Math.min((totalTokens / maxTokens) * 100, 100);

    const tokensEl = document.getElementById('chat-context-tokens');
    const fillEl = document.getElementById('chat-context-bar-fill');
    const sysEl = document.getElementById('ctx-system-tokens');
    const ctxEl = document.getElementById('ctx-context-tokens');
    const histEl = document.getElementById('ctx-history-tokens');
    const maxEl = document.getElementById('ctx-max-tokens');

    if (tokensEl) tokensEl.textContent = `${this.formatTokens(totalTokens)} / ${this.formatTokens(maxTokens)} tokens`;
    if (fillEl) {
      fillEl.style.width = pct + '%';
      fillEl.className = 'chat-context-bar-fill';
      if (pct > 80) fillEl.classList.add('danger');
      else if (pct > 50) fillEl.classList.add('warning');
    }
    if (sysEl) sysEl.textContent = this.formatTokens(systemTokens);
    if (ctxEl) ctxEl.textContent = this.formatTokens(contextTokens);
    if (histEl) histEl.textContent = this.formatTokens(historyTokens);
    if (maxEl) maxEl.textContent = this.formatTokens(maxTokens);
  },

  _initContextToggle() {
    const toggle = document.getElementById('chat-context-toggle');
    const details = document.getElementById('chat-context-details');
    if (toggle && details) {
      // onclick assignment (not addEventListener): openChat runs on every
      // reopen and stacking listeners would toggle open+closed instantly.
      toggle.onclick = () => {
        const isOpen = details.style.display !== 'none';
        details.style.display = isOpen ? 'none' : '';
        toggle.classList.toggle('open', !isOpen);
      };
    }
  },

  _renderTranscript(container, transcript, aiName) {
    if (!container) return;
    container.innerHTML = transcript.map(msg => {
      const author = msg.role === 'user' ? 'You' : aiName;
      const body = msg.role === 'user'
        ? ProviderBase.escapeHtml(msg.content)
        : ProviderBase.formatMarkdown(msg.content);
      return `<div class="chat-msg"><div class="chat-msg-author">${author}</div>${body}</div>`;
    }).join('');
    container.scrollTop = container.scrollHeight;
  },

  _updateChatMetrics(run) {
    const metricsInline = document.getElementById('chat-metrics-inline');
    if (!metricsInline || !run.metrics) return;

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
  }

});
