// HistoryUI — run history list and replay. Mixes into Models via
// Object.assign so call sites keep using Models.* unchanged.
Object.assign(Models, {

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
        const ctx = (r.specName || '').toLowerCase();
        return name.includes(query) || ctx.includes(query);
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
            <div class="history-item-spec">${record.specName ? record.specName + '.md' : 'prompt run'}</div>
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

    this.chatHistory = [
      { role: 'assistant', content: record.result }
    ];

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
          <div class="chat-msg-author">${displayName}</div>
          ${ProviderBase.formatMarkdown(record.result)}
        </div>
      `;
    }
    if (input) {
      input.value = '';
      input.disabled = false;
      input.classList.remove('chat-input-disabled');
    }

    Modals.close('modal-history');
    Modals.open('modal-chat');
  }

});
