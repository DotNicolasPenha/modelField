// API — thin facade over the agent loop, prompt builder and provider
// registry. Heavy lifting lives in:
//   js/agent/agent-loop.js   (agentic request/tool loop)
//   js/utils/prompt-builder.js (system prompt assembly)
//   js/utils/text-tools.js   (text tool-call parsing/sanitizing)
const API = {
  _requests: new Map(),

  async validateKey(providerName, apiKeyOverride) {
    const provider = ProviderBase.get(providerName);
    if (!provider) {
      return { valid: false, error: 'Provider not found' };
    }
    const apiKey = apiKeyOverride || App.state.apiKeys[provider.apiKeyField];
    if (!apiKey) {
      return { valid: false, error: 'No API key configured' };
    }
    return await ProviderBase.validateKey(providerName, apiKey);
  },

  async fetchAllModels() {
    const results = {};
    const allProviders = ProviderBase.getAll();

    for (const [name, provider] of Object.entries(allProviders)) {
      const apiKey = App.state.apiKeys[provider.apiKeyField];
      if (!apiKey) {
        results[name] = { models: provider.models, fromCache: false, fromApi: false };
        continue;
      }

      const cached = ProviderBase.getCache(name);
      if (cached) {
        results[name] = { models: cached, fromCache: true, fromApi: false };
        provider._fetchedModels = cached;
        continue;
      }

      try {
        const models = await ProviderBase.fetchModels(name, apiKey);
        if (models && models.length > 0) {
          results[name] = { models, fromCache: false, fromApi: true };
          ProviderBase.setCache(name, models);
        } else {
          results[name] = { models: provider.models, fromCache: false, fromApi: false };
        }
      } catch (e) {
        console.warn(`Failed to fetch models for ${name}:`, e);
        results[name] = { models: provider.models, fromCache: false, fromApi: false };
      }
    }

    return results;
  },

  async sendRun(model, context, prompt, onToolCall, signal) {
    const { provider, apiKey, systemPrompt } = this._prepareRequest(model, context);

    const messages = provider.buildMessages(systemPrompt, prompt);
    const currentMessages = Array.isArray(messages) ? messages : messages.messages;

    return this._execute(model, provider, apiKey, systemPrompt, currentMessages, onToolCall, signal);
  },

  async sendChat(model, history, newMessage, context = [], onToolCall, signal) {
    const { provider, apiKey, systemPrompt } = this._prepareRequest(model, context);

    let currentMessages;
    if (provider.name === 'google') {
      currentMessages = provider.buildChatMessages(systemPrompt, history, newMessage);
    } else {
      const result = provider.buildChatMessages(systemPrompt, history, newMessage);
      currentMessages = Array.isArray(result) ? result : result.messages;
    }

    return this._execute(model, provider, apiKey, systemPrompt, currentMessages, onToolCall, signal);
  },

  _prepareRequest(model, context) {
    const provider = ProviderBase.getForModel(model.id);
    if (!provider) {
      throw new Error(`No provider found for model ${model.id}`);
    }

    const apiKey = App.state.apiKeys[provider.apiKeyField];
    if (!apiKey) {
      throw new Error(`API key not configured for ${provider.displayName}. Go to Settings to add it.`);
    }

    const systemPrompt = this.buildSystemPrompt(context, !model._toolsUnsupported);
    return { provider, apiKey, systemPrompt };
  },

  async _execute(model, provider, apiKey, systemPrompt, currentMessages, onToolCall, signal) {
    const startTime = Date.now();

    const result = await AgentLoop.run({
      provider,
      model,
      apiKey,
      systemPrompt,
      currentMessages,
      onToolCall,
      signal
    });

    const duration = (Date.now() - startTime) / 1000;
    const cost = AgentLoop.computeCost(
      provider.name, model.id, model,
      result.inputTokens, result.outputTokens
    );

    return {
      content: result.content,
      toolHistory: result.toolHistory,
      metrics: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        duration: duration,
        cost: cost,
        resultSize: result.content.length,
        toolCalls: result.toolHistory.length,
        iterations: result.iterations
      }
    };
  },

  buildSystemPrompt(context, toolsSupported = true) {
    const project = App.state.projects.find(p => p.id === App.state.currentProject);
    return PromptBuilder.build({
      projectPath: project ? (project.path || '') : '',
      dirTree: App.state.dirTree || [],
      context,
      toolsSupported
    });
  },

  _parseTextToolCalls(content) {
    return TextTools.parseTextToolCalls(content);
  },

  stripToolSyntax(content) {
    return TextTools.stripToolSyntax(content);
  },

  abortRequest(requestId) {
    const controller = this._requests.get(requestId);
    if (controller) {
      controller.abort();
      this._requests.delete(requestId);
    }
  }
};
