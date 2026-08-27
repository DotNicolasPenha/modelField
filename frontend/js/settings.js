// Settings — API keys management modal. Depends on globals:
// ProviderBase, App, Notifications, API, Modals.
const Settings = {
  init() {
    document.getElementById('btn-settings')?.addEventListener('click', () => {
      this.openSettings();
    });

    document.getElementById('btn-save-settings')?.addEventListener('click', () => {
      this.saveSettings();
    });
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

      const item = document.createElement('div');
      item.className = 'provider-key-item';

      const head = document.createElement('div');
      head.className = 'provider-key-head';

      const label = document.createElement('label');
      label.className = 'provider-key-name';
      label.htmlFor = `api-${field}`;
      label.textContent = provider.displayName || provider.name;
      head.appendChild(label);

      const status = document.createElement('span');
      status.className = 'key-status';
      status.id = `status-${field}`;
      status.role = 'status';
      head.appendChild(status);

      const row = document.createElement('div');
      row.className = 'api-key-row';

      const input = document.createElement('input');
      input.type = 'password';
      input.className = 'input';
      input.id = `api-${field}`;
      input.dataset.providerInput = field;
      input.placeholder = provider.keyPlaceholder || '';
      input.autocomplete = 'off';
      input.spellcheck = false;

      const testBtn = document.createElement('button');
      testBtn.type = 'button';
      testBtn.className = 'btn btn-secondary btn-test-key';
      testBtn.dataset.provider = provider.name;
      testBtn.textContent = 'Test';
      testBtn.addEventListener('click', () => this.testKey(provider.name));

      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'btn btn-primary btn-clear-key';
      clearBtn.dataset.provider = field;
      clearBtn.textContent = 'Clear';
      clearBtn.addEventListener('click', () => this.clearKey(provider.name));

      row.appendChild(input);
      row.appendChild(testBtn);
      row.appendChild(clearBtn);

      item.appendChild(head);
      item.appendChild(row);
      container.appendChild(item);
    }
  },

  openSettings() {
    this._renderApiKeyRows();

    const keys = App.state.apiKeys;
    document.querySelectorAll('[data-provider-input]').forEach(input => {
      input.value = keys[input.dataset.providerInput] || '';
    });

    document.querySelectorAll('#api-keys-list .key-status').forEach(el => {
      el.textContent = 'Not tested';
      el.className = 'key-status';
    });

    Modals.open('modal-settings');
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

    Modals.close('modal-settings');
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
      statusEl.textContent = 'Not tested';
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
      statusEl.textContent = 'Not tested';
      statusEl.className = 'key-status';
    }
  }
};
