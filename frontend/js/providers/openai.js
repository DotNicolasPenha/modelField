const OpenAIProvider = {
  name: 'openai',
  displayName: 'OpenAI',
  apiKeyField: 'openai',
  baseUrl: 'https://api.openai.com/v1',

  models: [
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', description: 'Most capable model, multimodal', costPerInputToken: 0.000005, costPerOutputToken: 0.000015 },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', description: 'Fast and affordable', costPerInputToken: 0.00000015, costPerOutputToken: 0.0000006 },
    { id: 'o1-preview', name: 'o1-preview', provider: 'OpenAI', description: 'Advanced reasoning', costPerInputToken: 0.000015, costPerOutputToken: 0.00006 }
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
      return { valid: false, error: `API error ${response.status}` };
    } catch (e) {
      return { valid: false, error: 'Network error' };
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
    const chatPrefixes = ['gpt-4', 'gpt-3.5', 'o1', 'o3', 'chatgpt'];
    return (data.data || [])
      .filter(m => chatPrefixes.some(p => m.id.startsWith(p)))
      .map(m => ({
        id: m.id,
        name: m.id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        provider: 'OpenAI',
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
      max_tokens: options.maxTokens ?? 4096
    };
    if (options.tools) {
      body.tools = options.tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }
      }));
      body.tool_choice = options.toolChoice || 'auto';
    }
    return body;
  },

  parseResponse(data) {
    if (data.error) {
      throw new Error(data.error.message || 'OpenAI API error');
    }
    const choice = data.choices?.[0];
    if (!choice) {
      throw new Error('No response from OpenAI');
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
    if (options.history) {
      for (const msg of options.history) {
        if (msg.toolCalls) {
          const assistantMsg = { role: 'assistant', content: msg.content || '' };
          assistantMsg.tool_calls = msg.toolCalls.map(tc => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.name, arguments: JSON.stringify(tc.arguments) }
          }));
          messages.push(assistantMsg);
        } else if (msg.toolCallId) {
          messages.push({ role: 'tool', tool_call_id: msg.toolCallId, content: msg.content });
        } else {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
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
      if (msg.toolCalls) {
        const assistantMsg = { role: 'assistant', content: msg.content || '' };
        assistantMsg.tool_calls = msg.toolCalls.map(tc => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments) }
        }));
        messages.push(assistantMsg);
      } else if (msg.toolCallId) {
        messages.push({ role: 'tool', tool_call_id: msg.toolCallId, content: msg.content });
      } else {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
    messages.push({ role: 'user', content: newMessage });
    return messages;
  }
};

ProviderBase.register('openai', OpenAIProvider);
