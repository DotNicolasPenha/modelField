const GoogleProvider = {
  name: 'google',
  displayName: 'Google',
  apiKeyField: 'google',
  keyPlaceholder: 'AI...',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',

  models: [
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', description: 'Premium model', costPerInputToken: 0.00000125, costPerOutputToken: 0.00001 },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', description: 'Fast and efficient', costPerInputToken: 0.000000075, costPerOutputToken: 0.0000003 }
  ],

  async validateKey(apiKey) {
    try {
      const response = await fetch(`${this.baseUrl}/models?key=${apiKey}`);
      if (response.ok) {
        return { valid: true };
      }
      if (response.status === 400 || response.status === 403) {
        return { valid: false, error: 'Invalid API key' };
      }
      return { valid: false, error: `API error ${response.status}` };
    } catch (e) {
      return { valid: false, error: 'Network error' };
    }
  },

  async fetchModels(apiKey) {
    const response = await fetch(`${this.baseUrl}/models?key=${apiKey}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }
    const data = await response.json();
    return (data.models || [])
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => ({
        id: m.baseModelId || m.name.replace('models/', ''),
        name: (m.displayName || m.baseModelId || m.name.replace('models/', '')).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        provider: 'Google',
        description: m.description || ''
      }));
  },

  buildHeaders(apiKey) {
    return {
      'Content-Type': 'application/json'
    };
  },

  getUrl(modelId, apiKey) {
    return `${this.baseUrl}/models/${modelId}:generateContent?key=${apiKey}`;
  },

  buildBody(model, messages, systemPrompt, options = {}) {
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: Array.isArray(msg.parts) ? msg.parts : [{ text: msg.content || '' }]
    }));

    const body = { contents };

    if (systemPrompt) {
      body.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    if (options.tools) {
      body.tools = [{
        functionDeclarations: options.tools.map(t => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }))
      }];
    }

    return body;
  },

  parseResponse(data) {
    if (data.error) {
      throw new Error(data.error.message || 'Google API error');
    }
    const candidate = data.candidates?.[0];
    if (!candidate) {
      throw new Error('No response from Google Gemini');
    }
    const parts = candidate.content?.parts || [];
    const textParts = parts.filter(p => p.text);
    const funcParts = parts.filter(p => p.functionCall);
    const usage = data.usageMetadata || {};
    return {
      content: textParts.map(p => p.text).join('\n'),
      toolCalls: funcParts.map(p => ({
        id: `google_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: p.functionCall.name,
        arguments: p.functionCall.args
      })),
      stopReason: candidate.finishReason || '',
      inputTokens: usage.promptTokenCount || 0,
      outputTokens: usage.candidatesTokenCount || 0
    };
  },

  buildMessages(systemPrompt, userPrompt, options = {}) {
    const messages = [];
    if (options.history) {
      for (const msg of options.history) {
        if (msg.toolCalls) {
          const parts = [];
          if (msg.content) parts.push({ text: msg.content });
          for (const tc of msg.toolCalls) {
            parts.push({ functionCall: { name: tc.name, args: tc.arguments } });
          }
          messages.push({ role: 'model', parts });
        } else if (msg.toolCallId) {
          messages.push({
            role: 'user',
            parts: [{ functionResponse: { name: msg.toolName || 'tool', response: { result: msg.content } } }]
          });
        } else {
          messages.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
          });
        }
      }
    }
    messages.push({ role: 'user', content: userPrompt });
    return messages;
  },

  buildChatMessages(systemPrompt, history, newMessage, options = {}) {
    const messages = [];
    for (const msg of history) {
      if (msg.toolCalls) {
        const parts = [];
        if (msg.content) parts.push({ text: msg.content });
        for (const tc of msg.toolCalls) {
          parts.push({ functionCall: { name: tc.name, args: tc.arguments } });
        }
        messages.push({ role: 'model', parts });
      } else if (msg.toolCallId) {
        messages.push({
          role: 'user',
          parts: [{ functionResponse: { name: msg.toolName || 'tool', response: { result: msg.content } } }]
        });
      } else {
        messages.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }
    }
    messages.push({ role: 'user', content: newMessage });
    return messages;
  }
};

ProviderBase.register('google', GoogleProvider);
