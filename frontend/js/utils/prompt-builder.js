// PromptBuilder — builds the agent system prompt.
// Pure: all state is injected, no App/global reads. Usable in the browser
// (global) and in Node tests (module.exports).
const PromptBuilder = {
  // Flattens a DirEntry tree into "path/to/entry" lines (dirs suffixed with /).
  flattenDirTree(entries, prefix = '') {
    let lines = [];
    for (const entry of entries) {
      const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDir) {
        lines.push(`${relPath}/`);
        if (entry.children) {
          lines = lines.concat(this.flattenDirTree(entry.children, relPath));
        }
      } else {
        lines.push(relPath);
      }
    }
    return lines;
  },

  // Renders a single context item according to its type.
  renderContextItem(item) {
    if (item.type === 'folder') {
      return `\n### Directory: ${item.name}\nPath: ${item.path}\nThis is a directory, not a file. Its contents are NOT included here — use the list_dir and read_file tools on this path to inspect it.\n`;
    }
    if (item.content) {
      return `\n### ${item.name}\n\`\`\`\n${item.content}\n\`\`\`\n`;
    }
    if (item.path) {
      return `\n### File: ${item.name}\nPath: ${item.path}\nContent not loaded. Use the read_file tool on this path if you need its contents.\n`;
    }
    return `\n### File: ${item.name}\n`;
  },

  build({ projectPath = '', dirTree = [], context = [], toolsSupported = true }) {
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
- Large files: read in chunks with offset/limit (e.g. limit 200 per call) — every read is re-sent each round and burns rate limit budget
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

    if (projectPath) {
      systemPrompt += `\n\n## Project Information\n`;
      systemPrompt += `Project root: ${projectPath}\n`;
      systemPrompt += `Use paths relative to the project root. For example: "src/index.js", not just "index.js".\n`;
      systemPrompt += `Always use the list_dir tool first to discover available files before reading or writing.\n`;

      if (dirTree && dirTree.length > 0) {
        const treeLines = this.flattenDirTree(dirTree);
        systemPrompt += `\n### Directory Structure\n\`\`\`\n${treeLines.join('\n')}\n\`\`\`\n`;
      }
    }

    if (context && context.length > 0) {
      systemPrompt += '\n\n## Selected Context\n';
      for (const item of context) {
        systemPrompt += this.renderContextItem(item);
      }
    }

    return systemPrompt;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PromptBuilder;
}
if (typeof window !== 'undefined') {
  window.PromptBuilder = PromptBuilder;
}
