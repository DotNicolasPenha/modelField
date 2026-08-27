const { test } = require('node:test');
const assert = require('node:assert');
const TextTools = require('../frontend/js/utils/text-tools.js');

test('parseTextToolCalls extracts a single valid call', () => {
  const content = 'Vou ler o arquivo.\n<tool_call>{"name": "read_file", "arguments": {"path": "a.md"}}</tool_call>';
  const calls = TextTools.parseTextToolCalls(content);
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].name, 'read_file');
  assert.deepStrictEqual(calls[0].arguments, { path: 'a.md' });
});

test('parseTextToolCalls extracts multiple calls', () => {
  const content = '<tool_call>{"name":"list_dir","parameters":{"path":"."}}</tool_call> meio <tool_call>{"name":"read_file","arguments":{"path":"b.md"}}</tool_call>';
  const calls = TextTools.parseTextToolCalls(content);
  assert.strictEqual(calls.length, 2);
  assert.strictEqual(calls[0].name, 'list_dir');
  assert.deepStrictEqual(calls[0].arguments, { path: '.' });
  assert.strictEqual(calls[1].name, 'read_file');
});

test('parseTextToolCalls accepts function-wrapped shape', () => {
  const content = '<tool_call>{"function":{"name":"write_file","arguments":"{\\"path\\":\\"x.md\\",\\"content\\":\\"hi\\"}"}}</tool_call>';
  const calls = TextTools.parseTextToolCalls(content);
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].name, 'write_file');
  assert.deepStrictEqual(calls[0].arguments, { path: 'x.md', content: 'hi' });
});

test('parseTextToolCalls tolerates leading/trailing prose around JSON', () => {
  const content = '<tool_call>Aqui está: {"name":"list_dir","arguments":{"path":"src"}} espero que ajude</tool_call>';
  const calls = TextTools.parseTextToolCalls(content);
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].name, 'list_dir');
});

test('parseTextToolCalls skips blocks without a name', () => {
  const content = '<tool_call>{"arguments":{"path":"a"}}</tool_call>';
  assert.strictEqual(TextTools.parseTextToolCalls(content).length, 0);
});

test('parseTextToolCalls returns empty for null/empty/non-string', () => {
  assert.deepStrictEqual(TextTools.parseTextToolCalls(null), []);
  assert.deepStrictEqual(TextTools.parseTextToolCalls(''), []);
  assert.deepStrictEqual(TextTools.parseTextToolCalls(42), []);
  assert.deepStrictEqual(TextTools.parseTextToolCalls('no tools here'), []);
});

test('parseTextToolCallPayload rejects invalid JSON', () => {
  assert.strictEqual(TextTools.parseToolCallPayload('{nome: quebrado}'), null);
  assert.strictEqual(TextTools.parseToolCallPayload('sem json'), null);
});

test('stripToolSyntax removes complete blocks', () => {
  const content = 'Antes.\n<tool_call>{"name":"read_file","arguments":{}}</tool_call>\nDepois.';
  assert.strictEqual(TextTools.stripToolSyntax(content), 'Antes.\n\nDepois.');
});

test('stripToolSyntax removes unterminated trailing block', () => {
  const content = 'Resposta parcial\n<tool_call>{"name":"read_file"';
  assert.strictEqual(TextTools.stripToolSyntax(content), 'Resposta parcial');
});

test('stripToolSyntax removes orphan tags', () => {
  const content = 'texto </function> mais <invoke>x</invoke> fim';
  const out = TextTools.stripToolSyntax(content);
  assert.ok(!out.includes('function'));
  assert.ok(!out.includes('invoke'));
  assert.ok(out.includes('texto'));
  assert.ok(out.includes('fim'));
});

test('stripToolSyntax collapses excess blank lines', () => {
  const content = 'a\n\n\n\n\nb';
  assert.strictEqual(TextTools.stripToolSyntax(content), 'a\n\nb');
});
