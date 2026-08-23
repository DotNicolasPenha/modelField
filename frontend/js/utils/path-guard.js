// PathGuard — pure path resolution/sandboxing helpers for tool execution.
// Framework-free, dependency-free. Usable in the browser (global) and in
// Node tests (module.exports).
const PathGuard = {
  // Resolves a model-supplied path against the project root.
  // Absolute paths inside the project are kept; paths outside are joined
  // under the root. Backslashes are normalized.
  resolveProjectPath(projectPath, argsPath) {
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

  // Returns true when resolvedPath stays inside projectPath.
  isPathInsideProject(projectPath, resolvedPath) {
    if (!projectPath) return true;
    const normalized = resolvedPath.replace(/\\/g, '/');
    const base = projectPath.replace(/\\/g, '/');
    return normalized.startsWith(base);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PathGuard;
}
if (typeof window !== 'undefined') {
  window.PathGuard = PathGuard;
}
