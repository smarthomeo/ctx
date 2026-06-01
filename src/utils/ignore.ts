import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import ignore from 'ignore';

const DEFAULT_IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  '.nuxt',
  '.cache',
  '.turbo',
  '.vercel',
  '.DS_Store',
  '*.log',
  '.ctx.md',
  '.ctx.json',
  '.ctxignore',
  '__pycache__',
  '*.pyc',
  '.pytest_cache',
  'venv',
  '.venv',
  'env',
  'target',
  'vendor',
  '.idea',
  '.vscode',
  '*.min.js',
  '*.bundle.js',
];

export function getDefaultIgnorePatterns(): string[] {
  return [...DEFAULT_IGNORE_PATTERNS];
}

export function loadIgnorePatterns(rootPath: string, extra: string[] = []): string[] {
  const patterns = [...DEFAULT_IGNORE_PATTERNS, ...extra];
  const ctxignorePath = join(rootPath, '.ctxignore');
  if (existsSync(ctxignorePath)) {
    const content = readFileSync(ctxignorePath, 'utf-8');
    const custom = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'));
    patterns.push(...custom);
  }
  return patterns;
}

export function createIgnoreMatcher(patterns: string[]): ReturnType<typeof ignore> {
  const ig = ignore();
  for (const pattern of patterns) {
    ig.add(pattern);
  }
  return ig;
}

export function isIgnored(matcher: ReturnType<typeof ignore>, relativePath: string): boolean {
  if (!relativePath || relativePath === '.' || relativePath === '') {
    return false;
  }
  return matcher.ignores(relativePath);
}

export function filterPaths(
  matcher: ReturnType<typeof ignore>,
  paths: string[],
): string[] {
  return paths.filter((p) => !isIgnored(matcher, p));
}

export function readCtxignore(rootPath: string): string {
  const ctxignorePath = join(rootPath, '.ctxignore');
  if (!existsSync(ctxignorePath)) {
    return '';
  }
  return readFileSync(ctxignorePath, 'utf-8');
}

export function addIgnorePattern(rootPath: string, pattern: string): void {
  if (!pattern || pattern.trim().length === 0) {
    throw new Error('Ignore pattern cannot be empty');
  }
  const ctxignorePath = join(rootPath, '.ctxignore');
  const trimmed = pattern.trim();
  if (existsSync(ctxignorePath)) {
    const existing = readFileSync(ctxignorePath, 'utf-8');
    const lines = existing
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'));
    if (lines.includes(trimmed)) {
      return;
    }
    const separator = existing.endsWith('\n') || existing.length === 0 ? '' : '\n';
    appendFileSync(ctxignorePath, `${separator}${trimmed}\n`);
  } else {
    writeFileSync(ctxignorePath, `${trimmed}\n`);
  }
}
