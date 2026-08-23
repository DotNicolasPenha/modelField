const { test } = require('node:test');
const assert = require('node:assert');
const PromptBuilder = require('../frontend/js/utils/prompt-builder.js');

test('base prompt contains core sections', () => {
  const p = PromptBuilder.build({});
  assert.ok(p.includes('## Core Rules'));
  assert.ok(p.includes('## Tool Usage'));
  assert.ok(p.includes('## Output'));
});

test('toolsSupported adds native-only agency contract', () => {
  const p = PromptBuilder.build({ toolsSupported: true });
  assert.ok(p.includes('native function calling ONLY'));
  assert.ok(p.includes('user is NOT your execution harness'));
});

test('no-tools contract forbids fake file access', () => {
  const p = PromptBuilder.build({ toolsSupported: false });
  assert.ok(p.includes('NO tools available'));
  assert.ok(p.includes('Never pretend to read or write files'));
});

test('project path adds project information section', () => {
  const p = PromptBuilder.build({ projectPath: '/home/user/proj' });
  assert.ok(p.includes('Project root: /home/user/proj'));
  assert.ok(p.includes('relative to the project root'));
});

test('empty project path omits project information', () => {
  assert.ok(!PromptBuilder.build({}).includes('Project root:'));
});

test('flattenDirTree walks nested trees with dir suffixes', () => {
  const tree = [
    { name: 'src', isDir: true, children: [
      { name: 'index.js', isDir: false },
      { name: 'lib', isDir: true, children: [{ name: 'a.js', isDir: false }] }
    ]},
    { name: 'README.md', isDir: false }
  ];
  assert.deepStrictEqual(PromptBuilder.flattenDirTree(tree), [
    'src/',
    'src/index.js',
    'src/lib/',
    'src/lib/a.js',
    'README.md'
  ]);
});

test('dirTree renders as fenced code block under Directory Structure', () => {
  const p = PromptBuilder.build({
    projectPath: '/p',
    dirTree: [{ name: 'a.md', isDir: false }]
  });
  assert.ok(p.includes('### Directory Structure'));
  assert.ok(p.includes('```\na.md\n```'));
});

test('context items render by type: folder, file with content, file by path', () => {
  const p = PromptBuilder.build({
    context: [
      { type: 'folder', name: 'frontend', path: '/p/frontend' },
      { type: 'spec', name: 'spec', content: '# hello' },
      { type: 'file', name: 'big.js', path: '/p/big.js' },
      { type: 'file', name: 'mystery' }
    ]
  });
  assert.ok(p.includes('### Directory: frontend'));
  assert.ok(p.includes('Path: /p/frontend'));
  assert.ok(p.includes('list_dir and read_file tools on this path'));
  assert.ok(p.includes('### spec\n```\n# hello\n```'));
  assert.ok(p.includes('### File: big.js\nPath: /p/big.js'));
  assert.ok(p.includes('read_file tool on this path'));
  assert.ok(p.includes('### File: mystery\n'));
});

test('empty context omits Selected Context section', () => {
  assert.ok(!PromptBuilder.build({ context: [] }).includes('Selected Context'));
});
