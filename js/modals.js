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

  saveSettings() {
    App.state.apiKeys = {
      openai: document.getElementById('api-openai')?.value.trim() || '',
      anthropic: document.getElementById('api-anthropic')?.value.trim() || '',
      google: document.getElementById('api-google')?.value.trim() || '',
      openrouter: document.getElementById('api-openrouter')?.value.trim() || ''
    };
    App.saveState();
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

    setTimeout(() => {
      const aiMsg = document.createElement('div');
      aiMsg.className = 'chat-msg';
      aiMsg.innerHTML = `<strong>AI</strong>I understand your question. This is a mock response since no real API is connected. In the full version, this would be processed by the selected model.`;
      messages.appendChild(aiMsg);
      messages.scrollTop = messages.scrollHeight;
    }, 500);

    messages.scrollTop = messages.scrollHeight;
  }
};
