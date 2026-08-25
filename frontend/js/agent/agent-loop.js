// AgentLoop — the agentic request loop shared by Run and Chat.
// Drives provider round-trips, native + text-embedded tool calls,
// retries and the tools-unsupported fallback. Depends on globals:
// ProviderBase, TextTools.
const AgentLoop = {
  MAX_TOOL_ROUNDS: 10,

  // options: { provider, model, apiKey, systemPrompt, currentMessages,
  //            onToolCall, signal }
  // Round budget resolution order: provider.maxToolRounds → global default.
  // Providers on free/tight rate-limit tiers can declare fewer rounds.
  async run(options) {
    const {
      provider, model, apiKey,
      systemPrompt, currentMessages,
      onToolCall, signal
    } = options;

    const maxRounds = provider.maxToolRounds ?? this.MAX_TOOL_ROUNDS;
    const url = provider.name === 'google'
      ? provider.getUrl(model.id, apiKey)
      : `${provider.baseUrl}/chat/completions`;
    const headers = provider.buildHeaders(apiKey);
    const tools = ProviderBase.defineTools();

    let finalContent = '';
    let iterations = 0;
    let toolsEnabled = !model._toolsUnsupported;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    const toolHistory = [];

    while (iterations < maxRounds) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      iterations++;

      const body = ProviderBase.buildBody(provider, model, currentMessages, systemPrompt, {
        tools: toolsEnabled ? tools : undefined
      });

      const response = await ProviderBase.httpWithRetry(provider.name, url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
        signal
      });

      // Proxied requests cannot be cancelled mid-flight (Go HTTPFetch has
      // no cancellation), so stop acts cooperatively: the moment a response
      // arrives we bail out instead of processing further rounds.
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 400 && toolsEnabled) {
          toolsEnabled = false;
          model._toolsUnsupported = true;
          iterations--;
          continue;
        }
        // Some gateways return non-404 statuses (404/502/503 with an error
        // body) when a model doesn't exist or its upstream is gone — e.g.
        // "Upstream request failed: Model is unavailable". Treat all of
        // those as dead-model signals and prune the catalog entry.
        const apiMessage = String(errorData?.error?.message || errorData?.message || '');
        const modelUnavailable = response.status === 404
          || /model is unavailable|unknown model|model not found|does not exist/i.test(apiMessage);
        if (modelUnavailable) {
          ProviderBase.removeModel(provider.name, model.id);
          const err = new Error(
            `${provider.displayName}: model "${model.id}" is unavailable and has been removed from the model list.`
          );
          throw err;
        }
        throw this.handleError(response.status, errorData, provider.displayName);
      }

      const data = await response.json();
      const parsed = provider.parseResponse(data);

      totalInputTokens += parsed.inputTokens || 0;
      totalOutputTokens += parsed.outputTokens || 0;

      if (parsed.content) {
        finalContent = parsed.content;
      }

      const roundToolCalls = (parsed.toolCalls && parsed.toolCalls.length > 0)
        ? parsed.toolCalls
        : (toolsEnabled ? TextTools.parseTextToolCalls(finalContent) : []);

      if (!toolsEnabled || roundToolCalls.length === 0) {
        finalContent = TextTools.stripToolSyntax(finalContent);
        break;
      }

      await this.runToolRound(
        roundToolCalls,
        TextTools.stripToolSyntax(finalContent),
        currentMessages,
        toolHistory,
        onToolCall
      );
    }

    return {
      content: finalContent,
      toolHistory,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      iterations
    };
  },

  // Appends the assistant tool_calls message, executes each tool through
  // the sandboxed executor and feeds results back into the conversation.
  async runToolRound(toolCalls, assistantContent, currentMessages, toolHistory, onToolCall) {
    currentMessages.push({
      role: 'assistant',
      content: assistantContent || '',
      tool_calls: toolCalls.map(tc => ({
        id: tc.id,
        type: 'function',
        function: { name: tc.name, arguments: JSON.stringify(tc.arguments) }
      }))
    });

    for (const toolCall of toolCalls) {
      if (onToolCall) {
        onToolCall({ type: 'call', name: toolCall.name, arguments: toolCall.arguments });
      }

      const result = await ProviderBase.executeTool(toolCall.name, toolCall.arguments);

      toolHistory.push({
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        arguments: toolCall.arguments,
        result: result
      });

      if (onToolCall) {
        onToolCall({ type: 'result', name: toolCall.name, result: result });
      }

      currentMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result
      });
    }
  },

  handleError(status, errorData, providerName) {
    const message = errorData?.error?.message || errorData?.message || '';

    if (status === 401 || status === 403) {
      return new Error(`Invalid API key for ${providerName}. Check your key in Settings.`);
    }
    if (status === 429) {
      return new Error(`Rate limit exceeded for ${providerName}. Try again in a few seconds.`);
    }
    if (status === 404) {
      return new Error(`Model not found or not available for ${providerName}.`);
    }
    if (status >= 500) {
      return new Error(`${providerName} server error. Try again later.`);
    }
    if (message) {
      return new Error(`${providerName}: ${message}`);
    }
    return new Error(`API error ${status} from ${providerName}.`);
  },

  computeCost(providerName, modelId, fallbackModel, inputTokens, outputTokens) {
    const allModels = ProviderBase.getModels(providerName);
    const modelData = allModels.find(m => m.id === modelId) || fallbackModel;
    return modelData
      ? (inputTokens * (modelData.costPerInputToken || 0)) + (outputTokens * (modelData.costPerOutputToken || 0))
      : 0;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AgentLoop;
}
if (typeof window !== 'undefined') {
  window.AgentLoop = AgentLoop;
}
