// TextTools — pure parsing/sanitizing helpers for text-embedded tool calls.
// Framework-free, dependency-free. Usable in the browser (global) and in
// Node tests (module.exports).
const TextTools = {
  // Extracts tool calls that a model emitted as plain text, e.g.
  // <tool_call>{"name": "read_file", "arguments": {"path": "a.md"}}</tool_call>
  parseTextToolCalls(content) {
    if (!content || typeof content !== 'string') return [];
    const calls = [];
    const re = /<tool_call>([\s\S]*?)<\/tool_call>/gi;
    let m;
    while ((m = re.exec(content)) !== null) {
      const parsed = this.parseToolCallPayload(m[1]);
      if (parsed) {
        calls.push({ id: `text_${calls.length}`, ...parsed });
      }
    }
    return calls;
  },

  // Tolerant payload parser: accepts {name, arguments|parameters} and
  // {function: {name, arguments}} shapes; extracts the outermost JSON object.
  parseToolCallPayload(raw) {
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

  // Removes tool-call markup from model output before display/persistence.
  stripToolSyntax(content) {
    if (!content) return '';
    return content
      .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '')
      .replace(/<tool_call>[\s\S]*$/i, '')
      .replace(/<\/?(?:tool_call|function_call|function|invoke)[^>]*>/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TextTools;
}
if (typeof window !== 'undefined') {
  window.TextTools = TextTools;
}
