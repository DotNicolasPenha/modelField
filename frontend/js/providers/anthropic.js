const AnthropicProvider = {
  name: 'anthropic',
  displayName: 'Anthropic',
  apiKeyField: 'anthropic',
  keyPlaceholder: 'sk-ant-...',
  baseUrl: 'https://api.anthropic.com/v1',

  models: [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'Anthropic', description: 'Balanced speed and quality', costPerInputToken: 0.000003, costPerOutputToken: 0.000015 },
    { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', provider: 'Anthropic', description: 'Most capable model', costPerInputToken: 0.000015, costPerOutputToken: 0.000075 },
    { id: 'claude-haiku-3-5', name: 'Claude 3.5 Haiku', provider: 'Anthropic', description: 'Ultra fast', costPerInputToken: 0.0000008, costPerOutputToken: 0.000004 }
  ],

  async validateKey(apiKey) {
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: this.buildHeaders(apiKey),
        body: JSON.stringify({
          model: 'claude-haiku-3-5',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }]
        })
      });
      if (response.ok) {
        return { valid: true };
      }
      if (response.status === 401 || response.status === 403) {
        return { valid: false, error: 'Invalid API key' };
      }
      if (response.status === 400) {
        const data = await response.json().catch(() => ({}));
        if (data.error?.type === 'authentication_error') {
          return { valid: false, error: 'Invalid API key' };
        }
        return { valid: true };
      }
      return { valid: false, error: `API error ${response.status}` };
    } catch (e) {
      return { valid: false, error: 'Network error' };
    }
  },

  buildHeaders(apiKey) {
    return {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    };
  },

  toolDialect: 'anthropic',

  buildBody(model, messages, systemPrompt, options = {}) {
    const body = {
      model: model.id,
      max_tokens: options.maxTokens ?? 4096,
      messages: messages
    };
    if (systemPrompt) {
      body.system = systemPrompt;
    }
    return body;
  },

  parseResponse(data) {
    if (data.error) {
      throw new Error(data.error.message || 'Anthropic API error');
    }
    if (!data.content) {
      throw new Error('No response from Anthropic');
    }
    const textBlocks = data.content.filter(b => b.type === 'text') || [];
    const toolBlocks = data.content.filter(b => b.type === 'tool_use') || [];
    return {
      content: textBlocks.map(b => b.text).join('\n'),
      toolCalls: toolBlocks.map(b => ({
        id: b.id,
        name: b.name,
        arguments: b.input
      })),
      stopReason: data.stop_reason || '',
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0
    };
  },

  buildMessages(systemPrompt, userPrompt, options = {}) {
    const messages = [];
    if (options.history) {
      for (const msg of options.history) {
        if (msg.toolCalls) {
          const blocks = [];
          if (msg.content) blocks.push({ type: 'text', text: msg.content });
          for (const tc of msg.toolCalls) {
            blocks.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.arguments });
          }
          messages.push({ role: 'assistant', content: blocks });
        } else if (msg.toolCallId) {
          messages.push({
            role: 'user',
            content: [{ type: 'tool_result', tool_use_id: msg.toolCallId, content: msg.content }]
          });
        } else {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }
    messages.push({ role: 'user', content: userPrompt });
    return { messages, system: systemPrompt || '' };
  },

  buildChatMessages(systemPrompt, history, newMessage, options = {}) {
    const messages = [];
    for (const msg of history) {
      if (msg.toolCalls) {
        const blocks = [];
        if (msg.content) blocks.push({ type: 'text', text: msg.content });
        for (const tc of msg.toolCalls) {
          blocks.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.arguments });
        }
        messages.push({ role: 'assistant', content: blocks });
      } else if (msg.toolCallId) {
        messages.push({
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: msg.toolCallId, content: msg.content }]
        });
      } else {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
    messages.push({ role: 'user', content: newMessage });
    return { messages, system: systemPrompt || '' };
  }
};

ProviderBase.register('anthropic', AnthropicProvider);
