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
    dropdown.style.display = 'flex';

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
    if (dropdown) dropdown.style.display = 'none';
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

    document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.sendChatMessage();
    });

    // Initialize custom select
    const templateSelect = document.getElementById('select-template');
    if (templateSelect) {
      CustomSelect.init(templateSelect);
    }
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

  openSettings() {
    const keys = App.state.apiKeys;
    document.getElementById('api-openai').value = keys.openai || '';
    document.getElementById('api-anthropic').value = keys.anthropic || '';
    document.getElementById('api-google').value = keys.google || '';
    document.getElementById('api-openrouter').value = keys.openrouter || '';
    this.open('modal-settings');
  },

  async saveSettings() {
    App.state.apiKeys = {
      openai: document.getElementById('api-openai')?.value.trim() || '',
      anthropic: document.getElementById('api-anthropic')?.value.trim() || '',
      google: document.getElementById('api-google')?.value.trim() || '',
      openrouter: document.getElementById('api-openrouter')?.value.trim() || ''
    };
    await App.saveAPIKeys();
    this.close('modal-settings');
    Notifications.show('Settings saved');
  },

  sendChatMessage() {
    const input = document.getElementById('chat-input');
    const messages = document.getElementById('chat-messages');

    if (!input || !messages) return;

    const text = input.value.trim();
    if (!text) return;

    const userMsg = document.createElement('div');
    userMsg.className = 'chat-msg';
    userMsg.innerHTML = `<strong>You</strong>${text}`;
    messages.appendChild(userMsg);

    input.value = '';

    const currentRun = Models.currentRun;
    const aiName = currentRun ? Models.getDisplayName(currentRun.model) : 'AI';

    setTimeout(() => {
      const aiMsg = document.createElement('div');
      aiMsg.className = 'chat-msg';
      aiMsg.innerHTML = `<strong>${aiName}</strong>I understand your question. This is a mock response since no real API is connected. In the full version, this would be processed by the selected model.`;
      messages.appendChild(aiMsg);
      messages.scrollTop = messages.scrollHeight;
    }, 500);

    messages.scrollTop = messages.scrollHeight;
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
