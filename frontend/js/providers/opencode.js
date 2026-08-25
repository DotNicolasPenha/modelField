const OpenCodeZenProvider = {
  name: 'opencode',
  displayName: 'OpenCode Zen',
  apiKeyField: 'opencode',
  keyPlaceholder: 'sk-...',
  baseUrl: 'https://opencode.ai/zen/v1',
  needsProxy: true,
  // Free tier burns rate limit fast; cap the agent loop tighter.
  maxToolRounds: 6,

  models: [
    { id: 'big-pickle', name: 'Big Pickle', provider: 'OpenCode Zen', description: 'Free coding model', costPerInputToken: 0, costPerOutputToken: 0 },
    { id: 'x-preview-f-free', name: 'Ox Alpha Free', provider: 'OpenCode Zen', description: 'Free model', costPerInputToken: 0, costPerOutputToken: 0 },
    { id: 'mimo-v2.5-free', name: 'MiMo-V2.5 Free', provider: 'OpenCode Zen', description: 'Free reasoning model', costPerInputToken: 0, costPerOutputToken: 0 },
    { id: 'hy3-free', name: 'Hy3 Free', provider: 'OpenCode Zen', description: 'Free model', costPerInputToken: 0, costPerOutputToken: 0 },
    { id: 'glm-5', name: 'GLM 5', provider: 'OpenCode Zen', description: 'Advanced general model', costPerInputToken: 0, costPerOutputToken: 0 },
    { id: 'kimi-k3', name: 'Kimi K3', provider: 'OpenCode Zen', description: 'Advanced coding model', costPerInputToken: 0, costPerOutputToken: 0 }
  ],

  async validateKey(apiKey) {
    try {
      const response = await ProviderBase.http(this.name, `${this.baseUrl}/models`, {
        headers: this.buildHeaders(apiKey)
      });
      if (response.ok) {
        return { valid: true };
      }
      if (response.status === 401 || response.status === 403) {
        return { valid: false, error: 'Invalid API key' };
      }
      return { valid: false, error: `API error ${response.status}` };
    } catch (e) {
      return { valid: false, error: 'Network error: ' + e.message };
    }
  },

  async fetchModels(apiKey) {
    const response = await ProviderBase.http(this.name, `${this.baseUrl}/models`, {
      headers: this.buildHeaders(apiKey)
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }
    const data = await response.json();
    const raw = Array.isArray(data) ? data : (data.data || []);
    return raw
      .map(m => typeof m === 'string' ? { id: m } : m)
      .filter(m => m.id && !/^(gpt-|claude-|gemini-)/.test(m.id))
      .slice(0, 100)
      .map(m => ({
        id: m.id,
        name: m.name || m.id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        provider: 'OpenCode Zen',
        description: m.description || m.owned_by || ''
      }));
  },

  buildHeaders(apiKey) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
  },

  buildBody(model, messages, systemPrompt, options = {}) {
    const body = {
      model: model.id,
      messages: messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096
    };
    return body;
  },

  parseResponse(data) {
    if (data.error) {
      throw new Error(data.error.message || 'OpenCode Zen API error');
    }
    const choice = data.choices?.[0];
    if (!choice) {
      throw new Error('No response from OpenCode Zen');
    }
    const message = choice.message || {};
    const toolCalls = (message.tool_calls || []).map(tc => ({
      id: tc.id,
      name: tc.function.name,
      arguments: (() => { try { return JSON.parse(tc.function.arguments); } catch { return {}; } })()
    }));
    return {
      content: message.content || '',
      toolCalls: toolCalls,
      stopReason: choice.finish_reason || '',
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0
    };
  },

  buildMessages(systemPrompt, userPrompt, options = {}) {
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: userPrompt });
    return messages;
  },

  buildChatMessages(systemPrompt, history, newMessage, options = {}) {
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    for (const msg of history) {
      if (msg.toolCallId) {
        continue;
      }
      messages.push({ role: msg.role, content: msg.content });
    }
    messages.push({ role: 'user', content: newMessage });
    return messages;
  }
};

ProviderBase.register('opencode', OpenCodeZenProvider);
