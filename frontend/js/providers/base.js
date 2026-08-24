const ProviderBase = {
  _providers: {},
  _cache: {},

  // Provider contract:
  //   name, displayName, apiKeyField, baseUrl, models[]
  //   needsProxy          → route HTTP through Go backend (CORS)
  //   toolDialect         → 'openai' (default) | 'anthropic' | 'google'
  //   validateKey(k)      → {valid, error?}
  //   fetchModels(k)      → [{id, name?, description?}]
  //   buildHeaders(k)     → headers object
  //   getUrl(modelId, k)  → endpoint URL (google only)
  //   buildBody(model, messages, systemPrompt, options)
  //                       → request body; tools are guaranteed by
  //                         ProviderBase.buildBody wrapper via toolDialect,
  //                         so buildBody implementations may ignore options.tools
  //   parseResponse(data) → {content, toolCalls[{id,name,arguments}], inputTokens, outputTokens}
  //   buildMessages(systemPrompt, userPrompt)         → messages for Run
  //   buildChatMessages(systemPrompt, history, msg)   → messages for Chat

  register(name, provider) {
    this._providers[name] = provider;
  },

  _usesProxy(name) {
    const provider = this.get(name);
    return !!(provider && provider.needsProxy && window.go && window.go.main && window.go.main.App && window.go.main.App.HTTPFetch);
  },

  // Unified HTTP helper. Providers flagged with needsProxy are routed through
  // the Go backend to bypass webview CORS restrictions. When an AbortSignal
  // is provided, the request is registered under an id so abort cancels the
  // in-flight Go HTTP call (real stop, not cooperative).
  _nextReqId: 1,

  async http(name, url, options = {}) {
    const method = options.method || 'GET';
    const headers = options.headers || {};
    if (this._usesProxy(name)) {
      if (options.signal) {
        const id = this._nextReqId++;
        const onAbort = () => window.go.main.App.HTTPCancel(id);
        options.signal.addEventListener('abort', onAbort, { once: true });
        try {
          const resp = await window.go.main.App.HTTPFetchWithID(id, method, url, headers, options.body || '');
          return this._proxyResponse(resp);
        } catch (e) {
          // Go returns "context canceled" when cancelled via HTTPCancel.
          if (options.signal.aborted) throw new DOMException('Aborted', 'AbortError');
          throw e;
        } finally {
          options.signal.removeEventListener('abort', onAbort);
        }
      }
      const resp = await window.go.main.App.HTTPFetch(method, url, headers, options.body || '');
      return this._proxyResponse(resp);
    }
    return fetch(url, {
      method: method,
      headers: headers,
      body: options.body || undefined,
      signal: options.signal
    });
  },

  _proxyResponse(resp) {
    return {
      ok: resp.status >= 200 && resp.status < 300,
      status: resp.status,
      headers: resp.headers || {},
      json: async () => JSON.parse(resp.body),
      text: async () => resp.body
    };
  },

  _retryAfterSeconds(response) {
    const raw = response.headers && (response.headers['retry-after'] ?? response.headers['x-ratelimit-reset']);
    const secs = Number(raw);
    if (Number.isFinite(secs) && secs > 0 && secs <= 120) return secs;
    return null;
  },

  // Retries transient failures (429/5xx) with exponential backoff,
  // honoring the server's Retry-After header when present.
  async httpWithRetry(name, url, options = {}, maxRetries = 3) {
    let retryAfterMs = null;
    for (let attempt = 0; ; attempt++) {
      if (attempt > 0) {
        const delayMs = retryAfterMs ?? Math.min(8000, 1000 * Math.pow(2, attempt - 1));
        await new Promise(resolve => setTimeout(resolve, delayMs));
        retryAfterMs = null;
      }
      if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const response = await this.http(name, url, options);
      if (response.ok) return response;

      const transient = response.status === 429 || response.status >= 500;
      if (transient && attempt < maxRetries) {
        const ra = this._retryAfterSeconds(response);
        if (ra !== null) retryAfterMs = ra * 1000;
        continue;
      }
      return response;
    }
  },

  get(name) {
    return this._providers[name] || null;
  },

  // ── Tool contract ────────────────────────────────────────────────
  // Providers declare `toolDialect` ('openai' default | 'anthropic' | 'google').
  // This wrapper guarantees that requested tools reach the wire regardless
  // of the provider's own buildBody implementation.
  buildBody(provider, model, messages, systemPrompt, options = {}) {
    const body = provider.buildBody(model, messages, systemPrompt, options);
    if (options.tools && options.tools.length > 0 && body.tools === undefined) {
      console.warn(`Provider "${provider.name}" dropped tools from its body; injecting via dialect.`);
      this.applyTools(body, options.tools, provider.toolDialect || 'openai');
    }
    return body;
  },

  applyTools(body, tools, dialect) {
    if (!tools || tools.length === 0) return body;
    if (dialect === 'google') {
      body.tools = [{
        functionDeclarations: tools.map(t => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }))
      }];
    } else if (dialect === 'anthropic') {
      body.tools = tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters
      }));
      body.tool_choice = { type: 'auto' };
    } else {
      body.tools = tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }
      }));
      body.tool_choice = 'auto';
    }
    return body;
  },

  getAll() {
    return { ...this._providers };
  },

  getForModel(modelId) {
    for (const [name, provider] of Object.entries(this._providers)) {
      const models = provider._fetchedModels || provider.models;
      if (models.some(m => m.id === modelId)) {
        return provider;
      }
    }
    return null;
  },

  getForProviderKey(apiKeyField) {
    for (const [name, provider] of Object.entries(this._providers)) {
      if (provider.apiKeyField === apiKeyField) {
        return provider;
      }
    }
    return null;
  },

  getProviderName(provider) {
    for (const [name, p] of Object.entries(this._providers)) {
      if (p === provider) return name;
    }
    return null;
  },

  async validateKey(providerName, apiKey) {
    const provider = this.get(providerName);
    if (!provider || !provider.validateKey) {
      return { valid: false, error: 'Provider not found' };
    }
    try {
      return await provider.validateKey(apiKey);
    } catch (e) {
      return { valid: false, error: e.message || 'Validation failed' };
    }
  },

  async fetchModels(providerName, apiKey) {
    const provider = this.get(providerName);
    if (!provider || !provider.fetchModels) {
      return null;
    }
    try {
      const models = await provider.fetchModels(apiKey);
      if (models && models.length > 0) {
        provider._fetchedModels = models;
      }
      return models;
    } catch (e) {
      console.warn(`Failed to fetch models for ${providerName}:`, e);
      return null;
    }
  },

  getModels(providerName) {
    const provider = this.get(providerName);
    if (!provider) return [];
    const pruned = this._prunedModelKeys();
    return (provider._fetchedModels || provider.models || [])
      .filter(m => !pruned.has(`${providerName}:${m.id}`));
  },

  // Drops a model that the API itself rejected as unavailable from every
  // catalog (fetched list, static fallback, cache) and remembers the
  // decision across restarts so ghosts stop reappearing.
  removeModel(providerName, modelId) {
    const provider = this.get(providerName);
    if (!provider) return;
    if (provider._fetchedModels) {
      provider._fetchedModels = provider._fetchedModels.filter(m => m.id !== modelId);
    }
    if (Array.isArray(provider.models)) {
      provider.models = provider.models.filter(m => m.id !== modelId);
    }
    const cached = this._cache[providerName];
    if (cached && Array.isArray(cached.data)) {
      this._cache[providerName].data = cached.data.filter(m => m.id !== modelId);
    }
    try {
      const key = `${providerName}:${modelId}`;
      const pruned = new Set(JSON.parse(localStorage.getItem('modelfield-pruned-models') || '[]'));
      pruned.add(key);
      localStorage.setItem('modelfield-pruned-models', JSON.stringify([...pruned]));
    } catch (e) { /* storage unavailable — in-memory prune still applies */ }
  },

  _prunedModelKeys() {
    try {
      return new Set(JSON.parse(localStorage.getItem('modelfield-pruned-models') || '[]'));
    } catch (e) {
      return new Set();
    }
  },

  setCache(providerName, data) {
    this._cache[providerName] = {
      data: data,
      fetchedAt: Date.now()
    };
  },

  getCache(providerName, maxAgeMs = 24 * 60 * 60 * 1000) {
    const cached = this._cache[providerName];
    if (!cached) return null;
    if (Date.now() - cached.fetchedAt > maxAgeMs) {
      delete this._cache[providerName];
      return null;
    }
    return cached.data;
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  formatMarkdown(text) {
    if (!text) return '';
    let html = this.escapeHtml(text);

    // Fenced code blocks: ```lang\n...\n```
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      const cls = lang ? ` class="language-${lang}"` : '';
      return `<pre><code${cls}>${code.trimEnd()}</code></pre>`;
    });

    // Inline code: `code`
    html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');

    // Headers
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Bold and italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Strikethrough
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Horizontal rules
    html = html.replace(/^---+$/gm, '<hr>');

    // Blockquotes
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
    // Merge consecutive blockquotes
    html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n');

    // Unordered lists
    html = html.replace(/^(?:- (.+)\n?)+/gm, (match) => {
      const items = match.trim().split('\n').map(line => {
        const content = line.replace(/^- /, '');
        return `<li>${content}</li>`;
      }).join('');
      return `<ul>${items}</ul>`;
    });

    // Ordered lists
    html = html.replace(/^(?:\d+\. (.+)\n?)+/gm, (match) => {
      const items = match.trim().split('\n').map(line => {
        const content = line.replace(/^\d+\. /, '');
        return `<li>${content}</li>`;
      }).join('');
      return `<ol>${items}</ol>`;
    });

    // Tables
    html = html.replace(/^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)*)/gm, (_, headerRow, separator, bodyRows) => {
      const headers = headerRow.split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('');
      const rows = bodyRows.trim().split('\n').map(row => {
        const cells = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
    });

    // Paragraphs: double newlines
    html = html.replace(/\n{2,}/g, '</p><p>');
    // Single newlines to <br> (but not inside pre blocks)
    html = html.replace(/(?<!<\/pre>)\n(?!<)/g, '<br>');
    html = '<p>' + html + '</p>';

    // Clean up empty paragraphs and nested p tags
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/<p>\s*(<h[1-4]>)/g, '$1');
    html = html.replace(/(<\/h[1-4]>)\s*<\/p>/g, '$1');
    html = html.replace(/<p>\s*(<pre>)/g, '$1');
    html = html.replace(/(<\/pre>)\s*<\/p>/g, '$1');
    html = html.replace(/<p>\s*(<ul>)/g, '$1');
    html = html.replace(/(<\/ul>)\s*<\/p>/g, '$1');
    html = html.replace(/<p>\s*(<ol>)/g, '$1');
    html = html.replace(/(<\/ol>)\s*<\/p>/g, '$1');
    html = html.replace(/<p>\s*(<blockquote>)/g, '$1');
    html = html.replace(/(<\/blockquote>)\s*<\/p>/g, '$1');
    html = html.replace(/<p>\s*(<table>)/g, '$1');
    html = html.replace(/(<\/table>)\s*<\/p>/g, '$1');
    html = html.replace(/<p>\s*(<hr>)/g, '$1');
    html = html.replace(/(<hr>)\s*<\/p>/g, '$1');

    return html;
  },

  defineTools() {
    return [
      {
        name: 'read_file',
        description: 'Read a file from disk. Large files are truncated; use offset/limit to page through them.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path' },
            offset: { type: 'integer', description: 'First line to read (1-based, default 1)' },
            limit: { type: 'integer', description: 'Max lines to read (default 400). Prefer chunks over full reads of large files.' }
          },
          required: ['path']
        }
      },
      {
        name: 'write_file',
        description: 'Write a file to disk',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path' },
            content: { type: 'string', description: 'File content' }
          },
          required: ['path', 'content']
        }
      },
      {
        name: 'list_dir',
        description: 'List directory contents',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Directory path' }
          },
          required: ['path']
        }
      }
    ];
  },

  // Caps a tool result before it enters the conversation. Every character
  // here is re-sent on every subsequent agent round, so unbounded results
  // burn rate limit budget quadratically.
  _capToolResult(text, maxChars = 30000) {
    const s = String(text ?? '');
    if (s.length <= maxChars) return s;
    return s.slice(0, maxChars)
      + `\n\n[... TRUNCATED: ${s.length - maxChars} more characters. Re-call the tool with offset/limit or a narrower path.]`;
  },

  _resolvePath(argsPath) {
    const project = App.state.projects.find(p => p.id === App.state.currentProject);
    const projectPath = project ? (project.path || '') : '';
    return PathGuard.resolveProjectPath(projectPath, argsPath);
  },

  _isPathSafe(resolvedPath) {
    const project = App.state.projects.find(p => p.id === App.state.currentProject);
    const projectPath = project ? (project.path || '') : '';
    return PathGuard.isPathInsideProject(projectPath, resolvedPath);
  },

  _sliceLines(content, offset, limit) {
    const text = content || '';
    const firstLine = Math.max(1, Number(offset) || 1);
    const maxLines = Math.max(1, Math.min(Number(limit) || 400, 2000));
    const lines = text.split('\n');
    const slice = lines.slice(firstLine - 1, firstLine - 1 + maxLines).join('\n');
    if (firstLine === 1 && maxLines >= lines.length) return text;
    return `[lines ${firstLine}–${firstLine - 1 + slice.split('\n').length} of ${lines.length}]\n${slice}`;
  },

  async executeTool(name, args) {
    switch (name) {
      case 'read_file': {
        if (App.isWails) {
          try {
            const resolvedPath = this._resolvePath(args.path);
            if (!this._isPathSafe(resolvedPath)) {
              return 'Error: access denied. Path is outside the project directory.';
            }
            const content = await window.go.main.App.ReadFileContent(resolvedPath);
            return this._capToolResult(this._sliceLines(content, args.offset, args.limit));
          } catch (e) {
            return `Error reading file: ${e.message}`;
          }
        }
        return 'Error: disk file access requires Wails runtime';
      }
      case 'write_file': {
        if (App.isWails) {
          try {
            const resolvedPath = this._resolvePath(args.path);
            if (!this._isPathSafe(resolvedPath)) {
              return 'Error: access denied. Path is outside the project directory.';
            }
            await window.go.main.App.SaveFileContent(resolvedPath, args.content);
            return `Successfully wrote file "${args.path}"`;
          } catch (e) {
            return `Error writing file: ${e.message}`;
          }
        }
        return 'Error: disk file write requires Wails runtime';
      }
      case 'list_dir': {
        if (App.isWails) {
          try {
            const resolvedPath = this._resolvePath(args.path || '.');
            if (!this._isPathSafe(resolvedPath)) {
              return 'Error: access denied. Path is outside the project directory.';
            }
            const entries = await window.go.main.App.ReadProjectDir(resolvedPath);
            return this._capToolResult(JSON.stringify(entries), 15000);
          } catch (e) {
            return `Error listing directory: ${e.message}`;
          }
        }
        return 'Error: directory listing requires Wails runtime';
      }
      default:
        return `Error: unknown tool "${name}"`;
    }
  }
};
