const NvidiaProvider = {
  name: 'nvidia',
  displayName: 'NVIDIA',
  apiKeyField: 'nvidia',
  baseUrl: 'https://integrate.api.nvidia.com/v1',

  models: [
    { id: 'nvidia/nemotron-3-nano-omni', name: 'Nemotron 3 Nano Omni', provider: 'NVIDIA', description: 'Fast multimodal reasoning', costPerInputToken: 0.0000002, costPerOutputToken: 0.0000002 },
    { id: 'nvidia/llama-3.3-nemotron-super-49b-v1', name: 'Nemotron Super 49B', provider: 'NVIDIA', description: 'Balanced performance', costPerInputToken: 0.0000002, costPerOutputToken: 0.0000002 },
    { id: 'nvidia/llama-3.1-nemotron-ultra-253b-v1', name: 'Nemotron Ultra 253B', provider: 'NVIDIA', description: 'Maximum capability', costPerInputToken: 0.0000003, costPerOutputToken: 0.0000003 },
    { id: 'nvidia/nemotron-3-super-120b-a12b', name: 'Nemotron 3 Super 120B', provider: 'NVIDIA', description: 'Large context reasoning', costPerInputToken: 0.0000003, costPerOutputToken: 0.0000003 },
    { id: 'meta/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'NVIDIA', description: 'Meta open source', costPerInputToken: 0.0000002, costPerOutputToken: 0.0000002 }
  ],

  async validateKey(apiKey) {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: this.buildHeaders(apiKey)
      });
      if (response.ok) {
        return { valid: true };
      }
      if (response.status === 401 || response.status === 403) {
        return { valid: false, error: 'Invalid API key' };
      }
      if (response.status === 402) {
        return { valid: false, error: 'No credits remaining' };
      }
      return { valid: false, error: `API error ${response.status}` };
    } catch (e) {
      return { valid: false, error: 'Network error: ' + e.message };
    }
  },

  async fetchModels(apiKey) {
    const response = await fetch(`${this.baseUrl}/models`, {
      method: 'GET',
      headers: this.buildHeaders(apiKey)
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }
    const data = await response.json();
    const chatPrefixes = ['nvidia/', 'meta/', 'mistralai/', 'google/', 'deepseek-ai/'];
    return (data.data || [])
      .filter(m => chatPrefixes.some(p => m.id.startsWith(p)))
      .map(m => ({
        id: m.id,
        name: m.id.split('/').pop().split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        provider: 'NVIDIA',
        description: m.owned_by || ''
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
      max_tokens: Math.min(options.maxTokens ?? 4096, 4096)
    };
    return body;
  },

  parseResponse(data) {
    if (data.error) {
      throw new Error(data.error.message || 'NVIDIA API error');
    }
    const choice = data.choices?.[0];
    if (!choice) {
      throw new Error('No response from NVIDIA');
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

ProviderBase.register('nvidia', NvidiaProvider);
