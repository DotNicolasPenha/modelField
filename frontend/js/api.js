const API = {
  _requests: new Map(),
  MAX_TOOL_ROUNDS: 10,

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
    const provider = ProviderBase.getForModel(model.id);
    if (!provider) {
      throw new Error(`No provider found for model ${model.id}`);
    }

    const apiKey = App.state.apiKeys[provider.apiKeyField];
    if (!apiKey) {
      throw new Error(`API key not configured for ${provider.displayName}. Go to Settings to add it.`);
    }

    const systemPrompt = this.buildSystemPrompt(context, !model._toolsUnsupported);
    const tools = ProviderBase.defineTools();
    const startTime = Date.now();
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    const toolHistory = [];

    const messages = provider.buildMessages(systemPrompt, prompt);

    let url;
    if (provider.name === 'google') {
      url = provider.getUrl(model.id, apiKey);
    } else {
      url = `${provider.baseUrl}/chat/completions`;
    }
    const headers = provider.buildHeaders(apiKey);

    let currentMessages = Array.isArray(messages) ? messages : messages.messages;
    let finalContent = '';
    let iterations = 0;
    let toolsEnabled = !model._toolsUnsupported;

    while (iterations < this.MAX_TOOL_ROUNDS) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      iterations++;
      const body = provider.buildBody(model, currentMessages, systemPrompt, {
        tools: toolsEnabled ? tools : undefined
      });

      const response = await ProviderBase.httpWithRetry(provider.name, url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
        signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 400 && toolsEnabled) {
          toolsEnabled = false;
          model._toolsUnsupported = true;
          iterations--;
          continue;
        }
        throw this._handleError(response.status, errorData, provider.displayName);
      }

      const data = await response.json();
      const parsed = provider.parseResponse(data);

      totalInputTokens += parsed.inputTokens || 0;
      totalOutputTokens += parsed.outputTokens || 0;

      if (parsed.content) {
        finalContent = parsed.content;
      }

      let roundToolCalls = (parsed.toolCalls && parsed.toolCalls.length > 0)
        ? parsed.toolCalls
        : (toolsEnabled ? this._parseTextToolCalls(finalContent) : []);

      if (!toolsEnabled || roundToolCalls.length === 0) {
        finalContent = this.stripToolSyntax(finalContent);
        break;
      }

      await this._runToolRound(roundToolCalls, this.stripToolSyntax(finalContent), currentMessages, toolHistory, onToolCall);
    }

    const duration = (Date.now() - startTime) / 1000;
    const allModels = ProviderBase.getModels(provider.name);
    const modelData = allModels.find(m => m.id === model.id) || model;
    const cost = modelData
      ? (totalInputTokens * (modelData.costPerInputToken || 0)) + (totalOutputTokens * (modelData.costPerOutputToken || 0))
      : 0;

    return {
      content: finalContent,
      toolHistory: toolHistory,
      metrics: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        duration: duration,
        cost: cost,
        resultSize: finalContent.length,
        toolCalls: toolHistory.length,
        iterations: iterations
      }
    };
  },

  async sendChat(model, history, newMessage, context = [], onToolCall, signal) {
    const provider = ProviderBase.getForModel(model.id);
    if (!provider) {
      throw new Error(`No provider found for model ${model.id}`);
    }

    const apiKey = App.state.apiKeys[provider.apiKeyField];
    if (!apiKey) {
      throw new Error(`API key not configured for ${provider.displayName}. Go to Settings to add it.`);
    }

    const systemPrompt = this.buildSystemPrompt(context, !model._toolsUnsupported);
    const tools = ProviderBase.defineTools();
    const startTime = Date.now();
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    const toolHistory = [];

    let url;
    if (provider.name === 'google') {
      url = provider.getUrl(model.id, apiKey);
    } else {
      url = `${provider.baseUrl}/chat/completions`;
    }
    const headers = provider.buildHeaders(apiKey);

    let currentMessages;
    if (provider.name === 'google') {
      currentMessages = provider.buildChatMessages(systemPrompt, history, newMessage);
    } else {
      const result = provider.buildChatMessages(systemPrompt, history, newMessage);
      currentMessages = Array.isArray(result) ? result : result.messages;
    }

    let finalContent = '';
    let iterations = 0;
    let toolsEnabled = !model._toolsUnsupported;

    while (iterations < this.MAX_TOOL_ROUNDS) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      iterations++;
      const body = provider.buildBody(model, currentMessages, systemPrompt, {
        tools: toolsEnabled ? tools : undefined
      });

      const response = await ProviderBase.httpWithRetry(provider.name, url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
        signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 400 && toolsEnabled) {
          toolsEnabled = false;
          model._toolsUnsupported = true;
          iterations--;
          continue;
        }
        throw this._handleError(response.status, errorData, provider.displayName);
      }

      const data = await response.json();
      const parsed = provider.parseResponse(data);

      totalInputTokens += parsed.inputTokens || 0;
      totalOutputTokens += parsed.outputTokens || 0;

      if (parsed.content) {
        finalContent = parsed.content;
      }

      let roundToolCalls = (parsed.toolCalls && parsed.toolCalls.length > 0)
        ? parsed.toolCalls
        : (toolsEnabled ? this._parseTextToolCalls(finalContent) : []);

      if (!toolsEnabled || roundToolCalls.length === 0) {
        finalContent = this.stripToolSyntax(finalContent);
        break;
      }

      await this._runToolRound(roundToolCalls, this.stripToolSyntax(finalContent), currentMessages, toolHistory, onToolCall);
    }

    const duration = (Date.now() - startTime) / 1000;
    const allModels = ProviderBase.getModels(provider.name);
    const modelData = allModels.find(m => m.id === model.id) || model;
    const cost = modelData
      ? (totalInputTokens * (modelData.costPerInputToken || 0)) + (totalOutputTokens * (modelData.costPerOutputToken || 0))
      : 0;

    return {
      content: finalContent,
      toolHistory: toolHistory,
      metrics: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        duration: duration,
        cost: cost,
        resultSize: finalContent.length,
        toolCalls: toolHistory.length,
        iterations: iterations
      }
    };
  },

  buildSystemPrompt(context, toolsSupported = true) {
    let systemPrompt = `You are an engineering assistant. Think before acting.

## Core Rules
- Analyze context before proposing solutions
- When context is insufficient, ask specific questions — never assume
- Use tools to read before writing — understand the current state first
- Be direct, skip pleasantries, no emojis

## Decision Framework
1. Read relevant files first (list_dir → read_file)
2. If context is clear → execute
3. If context is ambiguous → ask 1-2 focused questions
4. If context is missing → ask what's needed, suggest what to create

## Task Execution
- Small task (1 step) → execute directly
- Medium task (2-3 steps) → state plan briefly, then execute
- Large task (4+ steps) → list steps as [ ] task1 [ ] task2, execute one by one, report progress
- Always probe context first: read files, understand state, then act
- If user request is vague, ask 1 specific question before acting

## Tool Usage
- Prefer read_file to understand before modifying
- Batch related changes in one write_file call
- Never ask the user to create/edit files — do it yourself
- Use list_dir to discover structure before assuming paths

## Output
- Markdown for documents, plain text for code
- Be concise — every token costs money
- Structure: context → analysis → action`;

    if (toolsSupported) {
      systemPrompt += `\n\n## Agency Contract
- Tools are invoked through native function calling ONLY.
- This application executes the tools for you automatically. You never execute them yourself, and the user is NOT your execution harness.
- NEVER write tool invocations as text in your reply — no <tool_call> tags, no XML, no JSON blocks describing tool use. The user sees exactly what you write.
- To use a tool, issue the native function call and stop. Wait for the tool result before continuing.`;
    } else {
      systemPrompt += `\n\n## Agency Contract
- This environment has NO tools available. Nothing you write will be executed.
- Work only with the context already provided below.
- Never pretend to read or write files. Never output tool syntax.
- Deliver full code and instructions directly in your response.`;
    }

    const project = App.state.projects.find(p => p.id === App.state.currentProject);
    if (project && project.path) {
      systemPrompt += `\n\n## Project Information\n`;
      systemPrompt += `Project root: ${project.path}\n`;
      systemPrompt += `Use paths relative to the project root. For example: "src/index.js", not just "index.js".\n`;
      systemPrompt += `Always use the list_dir tool first to discover available files before reading or writing.\n`;

      const dirTree = App.state.dirTree || [];
      if (dirTree.length > 0) {
        const flatten = (entries, prefix = '') => {
          let lines = [];
          for (const entry of entries) {
            const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
            if (entry.isDir) {
              lines.push(`${relPath}/`);
              if (entry.children) {
                lines = lines.concat(flatten(entry.children, relPath));
              }
            } else {
              lines.push(relPath);
            }
          }
          return lines;
        };
        const treeLines = flatten(dirTree);
        systemPrompt += `\n### Directory Structure\n\`\`\`\n${treeLines.join('\n')}\n\`\`\`\n`;
      }
    }

    if (context && context.length > 0) {
      systemPrompt += '\n\n## Selected Context\n';
      for (const item of context) {
        if (item.type === 'folder') {
          systemPrompt += `\n### Directory: ${item.name}\nPath: ${item.path}\nThis is a directory, not a file. Its contents are NOT included here — use the list_dir and read_file tools on this path to inspect it.\n`;
        } else if (item.content) {
          systemPrompt += `\n### ${item.name}\n\`\`\`\n${item.content}\n\`\`\`\n`;
        } else if (item.path) {
          systemPrompt += `\n### File: ${item.name}\nPath: ${item.path}\nContent not loaded. Use the read_file tool on this path if you need its contents.\n`;
        } else {
          systemPrompt += `\n### File: ${item.name}\n`;
        }
      }
    }

    return systemPrompt;
  },

  _parseTextToolCalls(content) {
    if (!content || typeof content !== 'string') return [];
    const calls = [];
    const re = /<tool_call>([\s\S]*?)<\/tool_call>/gi;
    let m;
    while ((m = re.exec(content)) !== null) {
      const parsed = this._parseToolCallPayload(m[1]);
      if (parsed) {
        calls.push({ id: `text_${Date.now()}_${calls.length}`, ...parsed });
      }
    }
    return calls;
  },

  _parseToolCallPayload(raw) {
    try {
      let text = raw.trim();
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start === -1 || end === -1 || end <= start) return null;
      text = text.slice(start, end + 1);
      const obj = JSON.parse(text);
      const name = obj.name || (obj.function && obj.function.name);
      let args = obj.arguments ?? obj.parameters ?? (obj.function && obj.function.arguments);
      if (typeof args === 'string') {
        try { args = JSON.parse(args); } catch (e) { /* keep as string */ }
      }
      if (!name) return null;
      return { name, arguments: args && typeof args === 'object' ? args : {} };
    } catch (e) {
      return null;
    }
  },

  stripToolSyntax(content) {
    if (!content) return '';
    return content
      .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '')
      .replace(/<tool_call>[\s\S]*$/i, '')
      .replace(/<\/?(?:tool_call|function_call|function|invoke)[^>]*>/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  },

  async _runToolRound(toolCalls, assistantContent, currentMessages, toolHistory, onToolCall) {
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

  _handleError(status, errorData, providerName) {
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

  abortRequest(requestId) {
    const controller = this._requests.get(requestId);
    if (controller) {
      controller.abort();
      this._requests.delete(requestId);
    }
  }
};
