import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { addIgnorePattern, readCtxignore } from '../utils/ignore.js';

export interface IgnoreOptions {
  rootPath: string;
  pattern: string;
}

export interface IgnoreResult {
  pattern: string;
  added: boolean;
  ctxignorePath: string;
  contents: string;
}

export function runIgnore(options: IgnoreOptions): IgnoreResult {
  const rootPath = resolve(options.rootPath);
  if (!existsSync(rootPath)) {
    throw new Error(`Project root does not exist: ${rootPath}`);
  }
  const pattern = options.pattern.trim();
  if (!pattern) {
    throw new Error('Ignore pattern cannot be empty');
  }
  const ctxignorePath = `${rootPath}/.ctxignore`;
  const before = readCtxignore(rootPath);
  const hadPattern = before
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'))
    .includes(pattern);
  addIgnorePattern(rootPath, pattern);
  return {
    pattern,
    added: !hadPattern,
    ctxignorePath,
    contents: readCtxignore(rootPath),
  };
}
