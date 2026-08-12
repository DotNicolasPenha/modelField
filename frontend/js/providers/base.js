const ProviderBase = {
  _providers: {},
  _cache: {},

  register(name, provider) {
    this._providers[name] = provider;
  },

  get(name) {
    return this._providers[name] || null;
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
    return provider._fetchedModels || provider.models || [];
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
        name: 'read_spec',
        description: 'Read a spec file',
        parameters: {
          type: 'object',
          properties: {
            spec_name: { type: 'string', description: 'Spec name without .md' }
          },
          required: ['spec_name']
        }
      },
      {
        name: 'write_spec',
        description: 'Create or update a spec file',
        parameters: {
          type: 'object',
          properties: {
            spec_name: { type: 'string', description: 'Spec name without .md' },
            content: { type: 'string', description: 'Markdown content' }
          },
          required: ['spec_name', 'content']
        }
      },
      {
        name: 'rename_spec',
        description: 'Rename a spec file',
        parameters: {
          type: 'object',
          properties: {
            old_name: { type: 'string', description: 'Current name without .md' },
            new_name: { type: 'string', description: 'New name without .md' }
          },
          required: ['old_name', 'new_name']
        }
      },
      {
        name: 'delete_spec',
        description: 'Delete a spec file',
        parameters: {
          type: 'object',
          properties: {
            spec_name: { type: 'string', description: 'Spec name without .md' }
          },
          required: ['spec_name']
        }
      },
      {
        name: 'list_specs',
        description: 'List all specs in the project',
        parameters: { type: 'object', properties: {} }
      },
      {
        name: 'read_file',
        description: 'Read a file from disk',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path' }
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

  _resolvePath(argsPath) {
    const project = App.state.projects.find(p => p.id === App.state.currentProject);
    const projectPath = project ? (project.path || '') : '';
    if (!projectPath) return argsPath;

    let path = argsPath || '';
    if (!path) return projectPath;

    path = path.replace(/\\/g, '/');
    const normalized = projectPath.replace(/\\/g, '/');

    if (path.startsWith('/')) {
      if (path.startsWith(normalized)) return path;
      return normalized + path;
    }

    if (path === '.' || path === './') return normalized;

    return normalized + '/' + path;
  },

  _isPathSafe(resolvedPath) {
    const project = App.state.projects.find(p => p.id === App.state.currentProject);
    const projectPath = project ? (project.path || '') : '';
    if (!projectPath) return true;

    const normalized = resolvedPath.replace(/\\/g, '/');
    const base = projectPath.replace(/\\/g, '/');
    return normalized.startsWith(base);
  },

  async executeTool(name, args) {
    switch (name) {
      case 'read_spec': {
        const file = App.state.files.find(f => f.name === args.spec_name && !f.trashed);
        return file ? file.content : `Error: spec "${args.spec_name}" not found`;
      }
      case 'write_spec': {
        let target = App.state.files.find(f => f.name === args.spec_name && !f.trashed);
        if (target) {
          target.content = args.content;
          target.modified = new Date().toISOString();
        } else {
          App.state.files.push({
            id: Date.now().toString(),
            projectId: App.state.currentProject,
            name: args.spec_name,
            content: args.content,
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            trashed: false
          });
        }
        await App.saveState();
        return `Successfully ${target ? 'updated' : 'created'} spec "${args.spec_name}"`;
      }
      case 'rename_spec': {
        const file = App.state.files.find(f => f.name === args.old_name && !f.trashed);
        if (!file) return `Error: spec "${args.old_name}" not found`;
        const exists = App.state.files.find(f => f.name === args.new_name && !f.trashed);
        if (exists) return `Error: spec "${args.new_name}" already exists`;
        file.name = args.new_name;
        file.modified = new Date().toISOString();
        await App.saveState();
        return `Successfully renamed "${args.old_name}" to "${args.new_name}"`;
      }
      case 'delete_spec': {
        const file = App.state.files.find(f => f.name === args.spec_name && !f.trashed);
        if (!file) return `Error: spec "${args.spec_name}" not found`;
        file.trashed = true;
        file.trashedAt = new Date().toISOString();
        await App.saveState();
        return `Successfully moved "${args.spec_name}" to trash`;
      }
      case 'list_specs': {
        const specs = App.getProjectFiles().map(f => f.name);
        return JSON.stringify(specs);
      }
      case 'read_file': {
        if (App.isWails) {
          try {
            const resolvedPath = this._resolvePath(args.path);
            if (!this._isPathSafe(resolvedPath)) {
              return 'Error: access denied. Path is outside the project directory.';
            }
            const content = await window.go.main.App.ReadFileContent(resolvedPath);
            return content || '';
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
            return JSON.stringify(entries);
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
