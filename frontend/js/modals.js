const CustomSelect = {
  init(el) {
    if (!el) return;

    const trigger = el.querySelector('.custom-select-trigger');
    const dropdown = el.querySelector('.custom-select-dropdown');
    const options = el.querySelectorAll('.custom-select-option');

    // Move dropdown to body so it escapes modal overflow
    document.body.appendChild(dropdown);

    // Store reference on the element
    el._dropdown = dropdown;
    el._trigger = trigger;

    // Set default selection
    const firstOption = options[0];
    if (firstOption) {
      firstOption.classList.add('selected');
      el._selectedValue = firstOption.dataset.value || 'blank';
    }

    // Toggle dropdown on trigger click
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeAll(el);
      if (el.classList.contains('open')) {
        this.close(el);
      } else {
        this.open(el);
      }
    });

    // Select option on click
    options.forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        this.select(el, option);
      });
    });

    // Search filter
    const searchInput = dropdown.querySelector('.custom-select-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();
        options.forEach(option => {
          const text = option.textContent.toLowerCase();
          option.style.display = text.includes(query) ? '' : 'none';
        });
        dropdown.querySelectorAll('.custom-select-group').forEach(group => {
          const visible = group.querySelectorAll('.custom-select-option:not([style*="display: none"])');
          group.style.display = visible.length === 0 ? 'none' : '';
        });
      });
    }

    // Close on outside click
    document.addEventListener('click', () => {
      this.closeAll();
    });

    // Prevent dropdown clicks from closing
    dropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  },

  open(el) {
    const dropdown = el._dropdown;
    const trigger = el._trigger;
    if (!dropdown || !trigger) return;

    const rect = trigger.getBoundingClientRect();

    dropdown.style.top = (rect.bottom + 4) + 'px';
    dropdown.style.left = rect.left + 'px';
    dropdown.style.width = rect.width + 'px';

    el.classList.add('open');
    dropdown.classList.add('active');

    const searchInput = dropdown.querySelector('.custom-select-search-input');
    if (searchInput) {
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input'));
      setTimeout(() => searchInput.focus(), 50);
    }
  },

  close(el) {
    const dropdown = el._dropdown;
    el.classList.remove('open');
    if (dropdown) dropdown.classList.remove('active');
  },

  select(el, option) {
    const trigger = el._trigger?.querySelector('span');
    const options = el.querySelectorAll('.custom-select-option');

    options.forEach(o => o.classList.remove('selected'));
    option.classList.add('selected');
    el._selectedValue = option.dataset.value || 'blank';

    if (trigger) {
      trigger.textContent = option.textContent;
    }

    this.close(el);
  },

  getValue(el) {
    return el?._selectedValue || 'blank';
  },

  closeAll(except) {
    document.querySelectorAll('.custom-select.open').forEach(el => {
      if (el !== except) this.close(el);
    });
  }
};

const Modals = {
  init() {
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.dataset.modal;
        if (modalId) this.close(modalId);
      });
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.close(overlay.id);
        }
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(modal => {
          this.close(modal.id);
        });
        Files.hideDropdowns();
        CustomSelect.closeAll();
      }
    });

    document.getElementById('btn-settings')?.addEventListener('click', () => {
      this.openSettings();
    });

    document.getElementById('btn-save-settings')?.addEventListener('click', () => {
      this.saveSettings();
    });

    document.getElementById('btn-send-chat')?.addEventListener('click', () => {
      this.sendChatMessage();
    });

    document.getElementById('btn-stop-chat')?.addEventListener('click', () => {
      if (Models._currentAbortController) {
        Models._currentAbortController.abort();
      }
    });

    document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.sendChatMessage();
    });

    // Initialize custom select
    const templateSelect = document.getElementById('select-template');
    if (templateSelect) {
      CustomSelect.init(templateSelect);
    }

    document.getElementById('btn-clear-context')?.addEventListener('click', () => {
      FileExplorer.clearAll();
    });
  },

  showTaskSelect() {
    const project = App.getCurrentProject();
    const list = document.getElementById('task-select-list');
    if (!list) return;

    const tasks = project?.checklist || [];
    if (tasks.length === 0) {
      list.innerHTML = '<div class="checklist-empty">No tasks yet</div>';
    } else {
      list.innerHTML = tasks.map(t => `
        <div class="task-select-item" data-task-id="${t.id}">
          <span class="task-select-text">${t.text}</span>
          ${t.description ? `<span class="task-select-desc">${t.description.substring(0, 60)}${t.description.length > 60 ? '...' : ''}</span>` : ''}
        </div>
      `).join('');

      list.querySelectorAll('.task-select-item').forEach(el => {
        el.addEventListener('click', () => {
          const task = tasks.find(t => t.id === el.dataset.taskId);
          if (task) {
            Checklist.useAsPrompt(task);
            this.close('modal-task-select');
          }
        });
      });
    }

    this.open('modal-task-select');
  },

  open(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      const firstInput = modal.querySelector('input:not([type="hidden"])');
      if (firstInput) setTimeout(() => firstInput.focus(), 100);
    }
  },

  close(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  },

  _renderApiKeyRows() {
    const container = document.getElementById('api-keys-list');
    if (!container) return;
    container.innerHTML = '';

    const providers = Object.values(ProviderBase.getAll())
      .sort((a, b) => (a.displayName || a.name).localeCompare(b.displayName || b.name));

    for (const provider of providers) {
      const field = provider.apiKeyField;
      if (!field) continue;

      const group = document.createElement('div');
      group.className = 'form-group';

      const label = document.createElement('label');
      label.className = 'form-label';
      label.textContent = provider.displayName || provider.name;
      group.appendChild(label);

      const row = document.createElement('div');
      row.className = 'api-key-row';

      const input = document.createElement('input');
      input.type = 'password';
      input.className = 'input';
      input.id = `api-${field}`;
      input.dataset.providerInput = field;
      input.placeholder = provider.keyPlaceholder || '';

      const testBtn = document.createElement('button');
      testBtn.className = 'btn btn-secondary btn-test-key';
      testBtn.dataset.provider = provider.name;
      testBtn.textContent = 'Test';
      testBtn.addEventListener('click', () => this.testKey(provider.name));

      const clearBtn = document.createElement('button');
      clearBtn.className = 'btn btn-primary btn-clear-key';
      clearBtn.dataset.provider = field;
      clearBtn.textContent = 'Clear';
      clearBtn.addEventListener('click', () => this.clearKey(provider.name));

      const status = document.createElement('span');
      status.className = 'key-status';
      status.id = `status-${field}`;

      row.appendChild(input);
      row.appendChild(testBtn);
      row.appendChild(clearBtn);
      row.appendChild(status);
      group.appendChild(row);
      container.appendChild(group);
    }
  },

  openSettings() {
    this._renderApiKeyRows();

    const keys = App.state.apiKeys;
    document.querySelectorAll('[data-provider-input]').forEach(input => {
      input.value = keys[input.dataset.providerInput] || '';
    });

    document.querySelectorAll('.key-status').forEach(el => {
      el.textContent = 'Not Tested';
      el.className = 'key-status';
    });

    this.open('modal-settings');
  },

  async saveSettings() {
    const keys = { ...App.state.apiKeys };
    document.querySelectorAll('[data-provider-input]').forEach(input => {
      keys[input.dataset.providerInput] = input.value.trim();
    });
    App.state.apiKeys = keys;
    await App.saveAPIKeys();

    const changedProviders = [];
    for (const [name, provider] of Object.entries(ProviderBase.getAll())) {
      const newKey = App.state.apiKeys[provider.apiKeyField];
      const statusEl = document.getElementById(`status-${provider.apiKeyField}`);
      if (newKey && statusEl && !statusEl.classList.contains('valid')) {
        changedProviders.push(name);
      }
    }

    if (changedProviders.length > 0) {
      Notifications.show('Saving and validating keys...');
      for (const name of changedProviders) {
        await this.testKey(name);
      }
      try {
        await API.fetchAllModels();
      } catch (e) {
        console.warn('Failed to refresh model catalog:', e);
      }
    }

    this.close('modal-settings');
    Notifications.show('Settings saved');
  },

  async testKey(providerName) {
    const provider = ProviderBase.get(providerName);
    if (!provider) return;

    const inputEl = document.getElementById(`api-${provider.apiKeyField}`);
    const statusEl = document.getElementById(`status-${provider.apiKeyField}`);
    if (!inputEl || !statusEl) return;

    const apiKey = inputEl.value.trim();
    if (!apiKey) {
      statusEl.textContent = '';
      statusEl.className = 'key-status';
      return;
    }

    statusEl.textContent = 'Testing...';
    statusEl.className = 'key-status testing';

    const result = await API.validateKey(providerName, apiKey);

    if (result.valid) {
      statusEl.textContent = 'Valid';
      statusEl.className = 'key-status valid';
    } else {
      statusEl.textContent = 'Invalid';
      statusEl.className = 'key-status invalid';
    }
  },

  clearKey(providerName) {
    const provider = ProviderBase.get(providerName);
    if (!provider) return;

    const inputEl = document.getElementById(`api-${provider.apiKeyField}`);
    const statusEl = document.getElementById(`status-${provider.apiKeyField}`);

    if (inputEl) {
      inputEl.value = '';
      inputEl.focus();
    }
    if (statusEl) {
      statusEl.textContent = '';
      statusEl.className = 'key-status';
    }
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

  confirm(message) {
    return new Promise(resolve => {
      const msgEl = document.getElementById('confirm-message');
      const okBtn = document.getElementById('btn-confirm-ok');
      const cancelBtn = document.getElementById('btn-confirm-cancel');
      if (msgEl) msgEl.textContent = message;

      const cleanup = () => {
        okBtn?.removeEventListener('click', onOk);
        cancelBtn?.removeEventListener('click', onCancel);
        this.close('modal-confirm');
      };

      const onOk = () => { cleanup(); resolve(true); };
      const onCancel = () => { cleanup(); resolve(false); };

      okBtn?.addEventListener('click', onOk);
      cancelBtn?.addEventListener('click', onCancel);

      this.open('modal-confirm');
      setTimeout(() => okBtn?.focus(), 100);
    });
  },

  prompt(message, defaultValue = '', validator = null) {
    return new Promise(resolve => {
      const msgEl = document.getElementById('prompt-message');
      const input = document.getElementById('prompt-input');
      const errorEl = document.getElementById('prompt-error');
      const okBtn = document.getElementById('btn-prompt-ok');
      const cancelBtn = document.getElementById('btn-prompt-cancel');

      if (msgEl) msgEl.textContent = message;
      if (input) {
        input.value = defaultValue;
        input.className = 'input';
      }
      if (errorEl) errorEl.textContent = '';

      const validate = () => {
        const val = input.value.trim();
        if (validator) {
          const err = validator(val);
          if (err) {
            if (errorEl) errorEl.textContent = err;
            input.classList.add('input-error');
            if (okBtn) okBtn.disabled = true;
            return false;
          }
        }
        if (errorEl) errorEl.textContent = '';
        input.classList.remove('input-error');
        if (okBtn) okBtn.disabled = false;
        return true;
      };

      const cleanup = () => {
        okBtn?.removeEventListener('click', onOk);
        cancelBtn?.removeEventListener('click', onCancel);
        input?.removeEventListener('input', validate);
        input?.removeEventListener('keydown', onKeydown);
        this.close('modal-prompt');
      };

      const onOk = () => {
        if (!validate()) return;
        cleanup();
        resolve(input.value.trim());
      };

      const onCancel = () => { cleanup(); resolve(null); };

      const onKeydown = (e) => {
        if (e.key === 'Enter') onOk();
      };

      okBtn?.addEventListener('click', onOk);
      cancelBtn?.addEventListener('click', onCancel);
      input?.addEventListener('input', validate);
      input?.addEventListener('keydown', onKeydown);

      this.open('modal-prompt');
      setTimeout(() => {
        input?.focus();
        input?.select();
        validate();
      }, 100);
    });
  }
};
