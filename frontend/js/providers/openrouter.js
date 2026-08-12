const OpenRouterProvider = {
  name: 'openrouter',
  displayName: 'OpenRouter',
  apiKeyField: 'openrouter',
  baseUrl: 'https://openrouter.ai/api/v1',

  models: [
    { id: 'meta-llama/llama-4-maverick', name: 'Llama 4 Maverick', provider: 'Meta via OpenRouter', description: 'Open source model', costPerInputToken: 0.0000002, costPerOutputToken: 0.0000002 },
    { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek via OpenRouter', description: 'Advanced reasoning', costPerInputToken: 0.00000055, costPerOutputToken: 0.0000022 }
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
    return (data.data || [])
      .filter(m => {
        const arch = m.architecture?.modality || '';
        return arch.includes('text') || arch === '';
      })
      .slice(0, 100)
      .map(m => {
        const inputPrice = parseFloat(m.pricing?.prompt || '0');
        const outputPrice = parseFloat(m.pricing?.completion || '0');
        return {
          id: m.id,
          name: m.name || m.id,
          provider: 'OpenRouter',
          description: m.description || '',
          costPerInputToken: isNaN(inputPrice) ? 0 : inputPrice,
          costPerOutputToken: isNaN(outputPrice) ? 0 : outputPrice
        };
      });
  },

  buildHeaders(apiKey) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://modelfield.app',
      'X-Title': 'ModelField'
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
      throw new Error(data.error.message || 'OpenRouter API error');
    }
    const choice = data.choices?.[0];
    if (!choice) {
      throw new Error('No response from OpenRouter');
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

ProviderBase.register('openrouter', OpenRouterProvider);
