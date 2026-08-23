// ChatUI — chat rendering/interaction for runs. Mixes into Models via
// Object.assign so call sites keep using Models.* unchanged.
// Depends on globals: ProviderBase, API, Modals, FileExplorer, TextTools.
Object.assign(Models, {

  openChat(run) {
    run.lastAccessed = new Date().toISOString();
    this.currentRun = run;

    if (run.result && !run.chatHistory) {
      this.chatHistory = [
        { role: 'assistant', content: run.result }
      ];
    } else if (!run.chatHistory) {
      this.chatHistory = [];
    } else {
      this.chatHistory = [...run.chatHistory];
    }

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
      if (run.result) {
        messages.innerHTML = `
          <div class="chat-msg">
            <div class="chat-msg-author">${displayName}</div>
            ${ProviderBase.formatMarkdown(run.result)}
          </div>
        `;
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
  },

  _renderToolEvent(container, event) {
    if (!container) return;
    if (event.type === 'call') {
      const el = document.createElement('div');
      el.className = 'chat-tool-call';
      el.innerHTML = `
        <div class="chat-tool-header">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
          <span class="chat-tool-name">${ProviderBase.escapeHtml(event.name)}</span>
          <span class="chat-tool-status">executing...</span>
        </div>
        <div class="chat-tool-args">${ProviderBase.escapeHtml(JSON.stringify(event.arguments, null, 2))}</div>
      `;
      container.appendChild(el);
      container.scrollTop = container.scrollHeight;
    } else if (event.type === 'result') {
      const existing = container.querySelectorAll('.chat-tool-call');
      const lastTool = existing[existing.length - 1];
      if (lastTool) {
        const statusEl = lastTool.querySelector('.chat-tool-status');
        if (statusEl) {
          const isError = event.result && event.result.startsWith && event.result.startsWith('Error');
          statusEl.textContent = isError ? 'error' : 'done';
          statusEl.classList.add(isError ? 'chat-tool-error' : 'chat-tool-success');
        }
      }
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
      toggle.addEventListener('click', () => {
        const isOpen = details.style.display !== 'none';
        details.style.display = isOpen ? 'none' : '';
        toggle.classList.toggle('open', !isOpen);
      });
    }
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
