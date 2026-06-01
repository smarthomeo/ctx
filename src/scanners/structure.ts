import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import ignore from 'ignore';
import { createIgnoreMatcher, isIgnored } from '../utils/ignore.js';

type IgnoreMatcher = ReturnType<typeof ignore>;

const KEY_FILE_NAMES = new Set([
  'README.md',
  'README',
  'readme.md',
  'package.json',
  'pyproject.toml',
  'Cargo.toml',
  'go.mod',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'Gemfile',
  'composer.json',
  'index.ts',
  'index.js',
  'main.ts',
  'main.js',
  'main.py',
  'main.go',
  'main.rs',
  'app.ts',
  'app.py',
  'server.ts',
  'server.js',
  'Dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  '.env.example',
  'tsconfig.json',
  'vite.config.ts',
  'vite.config.js',
  'next.config.js',
  'next.config.ts',
  'nuxt.config.ts',
  'tsup.config.ts',
  'vitest.config.ts',
  'jest.config.js',
  'jest.config.ts',
  'Makefile',
  'LICENSE',
]);

const ENTRY_PATTERNS = [
  /(^|\/)index\.(ts|js|tsx|jsx)$/,
  /(^|\/)main\.(ts|js|tsx|jsx|py|go|rs)$/,
  /(^|\/)server\.(ts|js)$/,
  /(^|\/)app\.(ts|js|py)$/,
  /(^|\/)cli\.(ts|js)$/,
];

export interface StructureInfo {
  tree: string;
  files: string[];
  directories: string[];
  keyFiles: string[];
  entryPoints: string[];
  totalFiles: number;
  totalDirs: number;
}

export interface ScanStructureOptions {
  rootPath: string;
  depth: number;
  extraIgnore?: string[];
}

export function scanStructure(options: ScanStructureOptions): StructureInfo {
  const { rootPath, depth, extraIgnore = [] } = options;
  const matcher: IgnoreMatcher = createIgnoreMatcher(extraIgnore);

  const files: string[] = [];
  const directories: string[] = [];
  const keyFiles: string[] = [];
  const entryPoints: string[] = [];

  function walk(current: string, currentDepth: number): void {
    if (currentDepth > depth) return;
    let entries: string[];
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(current, entry);
      const rel = relative(rootPath, full).split(sep).join('/');
      if (isIgnored(matcher, rel)) continue;
      let stat;
      try {
        stat = statSync(full);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        directories.push(rel);
        if (currentDepth < depth - 1) {
          walk(full, currentDepth + 1);
        }
      } else if (stat.isFile()) {
        files.push(rel);
        const baseName = entry;
        if (KEY_FILE_NAMES.has(baseName)) {
          keyFiles.push(rel);
        }
        for (const pattern of ENTRY_PATTERNS) {
          if (pattern.test(rel)) {
            entryPoints.push(rel);
            break;
          }
        }
      }
    }
  }

  if (existsSync(rootPath)) {
    walk(rootPath, 0);
  }

  files.sort();
  directories.sort();
  keyFiles.sort();
  entryPoints.sort();

  const tree = renderTree(rootPath, depth, matcher);

  return {
    tree,
    files,
    directories,
    keyFiles,
    entryPoints,
    totalFiles: files.length,
    totalDirs: directories.length,
  };
}

export function renderTree(rootPath: string, depth: number, matcher: IgnoreMatcher): string {
  const lines: string[] = [`.`];
  const rootName = rootPath.split(/[\\/]/).pop() || '.';

  function walk(current: string, prefix: string, currentDepth: number): void {
    if (currentDepth > depth) return;
    let entries: string[];
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }
    const filtered: Array<{ name: string; full: string; isDir: boolean }> = [];
    for (const entry of entries) {
      const full = join(current, entry);
      const rel = relative(rootPath, full).split(sep).join('/');
      if (isIgnored(matcher, rel)) continue;
      let stat;
      try {
        stat = statSync(full);
      } catch {
        continue;
      }
      filtered.push({ name: entry, full, isDir: stat.isDirectory() });
    }
    filtered.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (let i = 0; i < filtered.length; i++) {
      const { name, full, isDir } = filtered[i]!;
      const isLast = i === filtered.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const extension = isLast ? '    ' : '│   ';
      lines.push(`${prefix}${connector}${name}${isDir ? '/' : ''}`);
      if (isDir) {
        walk(full, prefix + extension, currentDepth + 1);
      }
    }
  }

  lines.length = 0;
  lines.push(rootName);
  walk(rootPath, '', 0);
  return lines.join('\n');
}
