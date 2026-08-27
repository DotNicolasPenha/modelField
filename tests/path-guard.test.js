const { test } = require('node:test');
const assert = require('node:assert');
const PathGuard = require('../frontend/js/utils/path-guard.js');

const ROOT = '/home/user/project';

test('resolveProjectPath joins relative paths under the root', () => {
  assert.strictEqual(
    PathGuard.resolveProjectPath(ROOT, 'src/index.js'),
    '/home/user/project/src/index.js'
  );
});

test('resolveProjectPath keeps absolute paths inside the root', () => {
  assert.strictEqual(
    PathGuard.resolveProjectPath(ROOT, '/home/user/project/src/a.md'),
    '/home/user/project/src/a.md'
  );
});

test('resolveProjectPath pulls absolute outside paths into the root', () => {
  assert.strictEqual(
    PathGuard.resolveProjectPath(ROOT, '/etc/passwd'),
    '/home/user/project/etc/passwd'
  );
});

test('resolveProjectPath maps "." to the root', () => {
  assert.strictEqual(PathGuard.resolveProjectPath(ROOT, '.'), ROOT);
  assert.strictEqual(PathGuard.resolveProjectPath(ROOT, './'), ROOT);
});

test('resolveProjectPath normalizes backslashes', () => {
  assert.strictEqual(
    PathGuard.resolveProjectPath('C:\\dev\\proj', 'src\\a.js'),
    'C:/dev/proj/src/a.js'
  );
});

test('resolveProjectPath returns argsPath unchanged when no project root', () => {
  assert.strictEqual(PathGuard.resolveProjectPath('', 'src/a.js'), 'src/a.js');
  assert.strictEqual(PathGuard.resolveProjectPath(null, 'x'), 'x');
});

test('resolveProjectPath returns root for empty argsPath', () => {
  assert.strictEqual(PathGuard.resolveProjectPath(ROOT, ''), ROOT);
  assert.strictEqual(PathGuard.resolveProjectPath(ROOT, null), ROOT);
});

test('isPathInsideProject accepts paths under the root', () => {
  assert.strictEqual(PathGuard.isPathInsideProject(ROOT, ROOT + '/a/b.md'), true);
  assert.strictEqual(PathGuard.isPathInsideProject(ROOT, ROOT), true);
});

test('isPathInsideProject rejects traversal outside the root', () => {
  assert.strictEqual(PathGuard.isPathInsideProject(ROOT, '/home/user/other/file'), false);
  assert.strictEqual(PathGuard.isPathInsideProject(ROOT, '/etc/passwd'), false);
});

test('isPathInsideProject allows everything when no project root', () => {
  assert.strictEqual(PathGuard.isPathInsideProject('', '/any/path'), true);
  assert.strictEqual(PathGuard.isPathInsideProject(null, '/any/path'), true);
});

test('isPathInsideProject normalizes backslashes before comparing', () => {
  assert.strictEqual(PathGuard.isPathInsideProject('C:\\dev\\proj', 'C:/dev/proj/a.md'), true);
});
