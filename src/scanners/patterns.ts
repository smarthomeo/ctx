import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import type { Convention } from '../types.js';
import { createIgnoreMatcher, isIgnored } from '../utils/ignore.js';
import ignore from 'ignore';

type IgnoreMatcher = ReturnType<typeof ignore>;

const CODE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.go', '.rs', '.java', '.kt', '.rb',
]);

const TAB_INDENT_EXTENSIONS = new Set(['.go']);
const TWO_SPACE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

interface IndentStats {
  tabs: number;
  twoSpaces: number;
  fourSpaces: number;
  samples: number;
}

interface NamingStats {
  camelCase: number;
  snake_case: number;
  PascalCase: number;
  kebabCase: number;
  samples: number;
}

export interface ScanPatternsOptions {
  rootPath: string;
  depth?: number;
  maxFiles?: number;
  extraIgnore?: string[];
}

function readSourceFiles(rootPath: string, depth: number, matcher: IgnoreMatcher, maxFiles: number): Array<{ path: string; content: string }> {
  const out: Array<{ path: string; content: string }> = [];
  function walk(current: string, d: number): void {
    if (d > depth) return;
    let entries: string[];
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (out.length >= maxFiles) return;
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
        walk(full, d + 1);
      } else if (stat.isFile()) {
        const ext = extname(entry);
        if (!CODE_EXTENSIONS.has(ext)) continue;
        if (stat.size > 256 * 1024) continue;
        try {
          const content = readFileSync(full, 'utf-8');
          out.push({ path: rel, content });
        } catch {
          // ignore
        }
      }
    }
  }
  if (existsSync(rootPath)) {
    walk(rootPath, 0);
  }
  return out;
}

function detectIndent(files: Array<{ path: string; content: string }>): IndentStats {
  const stats: IndentStats = { tabs: 0, twoSpaces: 0, fourSpaces: 0, samples: 0 };
  for (const file of files) {
    const ext = extname(file.path);
    const lines = file.content.split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^( {2,8}|\t+)/);
      if (!m) continue;
      stats.samples++;
      if (m[0]!.startsWith('\t')) {
        stats.tabs++;
      } else {
        const len = m[0]!.length;
        if (len <= 2) stats.twoSpaces++;
        else stats.fourSpaces++;
      }
      if (stats.samples > 500) break;
    }
    if (ext && TAB_INDENT_EXTENSIONS.has(ext)) {
      stats.tabs++;
    }
    if (ext && TWO_SPACE_EXTENSIONS.has(ext)) {
      stats.twoSpaces++;
    }
  }
  return stats;
}

function detectNaming(files: Array<{ path: string; content: string }>): NamingStats {
  const stats: NamingStats = { camelCase: 0, snake_case: 0, PascalCase: 0, kebabCase: 0, samples: 0 };
  const identifierRegex = /(?:function|class|const|let|var|export\s+(?:const|let|var|function|class))\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
  for (const file of files) {
    const ext = extname(file.path);
    if (ext !== '.ts' && ext !== '.tsx' && ext !== '.js' && ext !== '.jsx') continue;
    let match: RegExpExecArray | null;
    while ((match = identifierRegex.exec(file.content)) !== null) {
      const name = match[1]!;
      stats.samples++;
      if (/^[A-Z][A-Za-z0-9]*$/.test(name)) stats.PascalCase++;
      else if (/^[a-z][A-Za-z0-9]*$/.test(name)) stats.camelCase++;
      else if (/^[a-z][a-z0-9_]*$/.test(name)) stats.snake_case++;
      else if (/^[a-z][a-z0-9-]*$/.test(name)) stats.kebabCase++;
    }
    for (const m of file.content.matchAll(/\bdef\s+([a-zA-Z_][a-zA-Z0-9_]*)/g)) {
      const name = m[1]!;
      stats.samples++;
      if (/^[a-z][a-z0-9_]*$/.test(name)) stats.snake_case++;
      else if (/^[A-Z][A-Za-z0-9]*$/.test(name)) stats.PascalCase++;
    }
    for (const m of file.content.matchAll(/\bfunc\s+([a-zA-Z_][a-zA-Z0-9_]*)/g)) {
      const name = m[1]!;
      stats.samples++;
      if (/^[A-Z][A-Za-z0-9]*$/.test(name)) stats.PascalCase++;
      else if (/^[a-z][A-Za-z0-9]*$/.test(name)) stats.camelCase++;
    }
  }
  return stats;
}

function detectQuotes(files: Array<{ path: string; content: string }>): { single: number; double: number } {
  let single = 0;
  let double = 0;
  for (const file of files) {
    const matches = file.content.match(/(['"])[^'"]*\1/g);
    if (!matches) continue;
    for (const m of matches) {
      if (m.startsWith("'")) single++;
      else double++;
    }
    if (single + double > 500) break;
  }
  return { single, double };
}

function hasEslintConfig(rootPath: string): boolean {
  return (
    existsSync(join(rootPath, '.eslintrc')) ||
    existsSync(join(rootPath, '.eslintrc.json')) ||
    existsSync(join(rootPath, '.eslintrc.js')) ||
    existsSync(join(rootPath, '.eslintrc.cjs')) ||
    existsSync(join(rootPath, '.eslintrc.yaml')) ||
    existsSync(join(rootPath, '.eslintrc.yml')) ||
    existsSync(join(rootPath, 'eslint.config.js')) ||
    existsSync(join(rootPath, 'eslint.config.mjs')) ||
    existsSync(join(rootPath, 'eslint.config.cjs')) ||
    existsSync(join(rootPath, 'eslint.config.ts'))
  );
}

function hasPrettierConfig(rootPath: string): boolean {
  return (
    existsSync(join(rootPath, '.prettierrc')) ||
    existsSync(join(rootPath, '.prettierrc.json')) ||
    existsSync(join(rootPath, '.prettierrc.js')) ||
    existsSync(join(rootPath, 'prettier.config.js')) ||
    existsSync(join(rootPath, 'prettier.config.cjs')) ||
    existsSync(join(rootPath, 'prettier.config.mjs'))
  );
}

function detectTypeScriptStrict(rootPath: string): boolean {
  const tsconfigPath = join(rootPath, 'tsconfig.json');
  if (!existsSync(tsconfigPath)) return false;
  try {
    const content = readFileSync(tsconfigPath, 'utf-8');
    return /"strict"\s*:\s*true/.test(content);
  } catch {
    return false;
  }
}

export function scanPatterns(options: ScanPatternsOptions): Convention[] {
  const { rootPath, depth = 4, maxFiles = 50, extraIgnore = [] } = options;
  const matcher = createIgnoreMatcher(extraIgnore);
  const files = readSourceFiles(rootPath, depth, matcher, maxFiles);
  const conventions: Convention[] = [];

  if (files.length === 0) {
    return conventions;
  }

  const indent = detectIndent(files);
  if (indent.samples > 0) {
    if (indent.tabs > indent.twoSpaces && indent.tabs > indent.fourSpaces) {
      conventions.push({
        name: 'Tab indentation',
        description: 'Source files use tab characters for indentation.',
        evidence: `${indent.tabs} tab-indented lines sampled`,
      });
    } else if (indent.fourSpaces > indent.twoSpaces) {
      conventions.push({
        name: '4-space indentation',
        description: 'Source files use 4 spaces for indentation.',
        evidence: `${indent.fourSpaces} 4-space-indented lines sampled`,
      });
    } else if (indent.twoSpaces > 0) {
      conventions.push({
        name: '2-space indentation',
        description: 'Source files use 2 spaces for indentation.',
        evidence: `${indent.twoSpaces} 2-space-indented lines sampled`,
      });
    }
  }

  const naming = detectNaming(files);
  if (naming.samples > 0) {
    const total = naming.camelCase + naming.snake_case + naming.PascalCase + naming.kebabCase;
    if (total > 0) {
      const dominant = [
        { name: 'camelCase', count: naming.camelCase },
        { name: 'snake_case', count: naming.snake_case },
        { name: 'PascalCase', count: naming.PascalCase },
        { name: 'kebab-case', count: naming.kebabCase },
      ].sort((a, b) => b.count - a.count);
      const top = dominant[0]!;
      if (top.count > 0) {
        const pct = Math.round((top.count / total) * 100);
        conventions.push({
          name: `${top.name} identifiers`,
          description: `Identifiers predominantly use ${top.name} (${pct}% of samples).`,
          evidence: `${top.count} of ${total} identifiers`,
        });
      }
    }
  }

  const quotes = detectQuotes(files);
  if (quotes.single + quotes.double > 5) {
    const total = quotes.single + quotes.double;
    if (quotes.single > quotes.double) {
      const pct = Math.round((quotes.single / total) * 100);
      conventions.push({
        name: 'Single quotes',
        description: `String literals predominantly use single quotes (${pct}%).`,
        evidence: `${quotes.single} single vs ${quotes.double} double`,
      });
    } else {
      const pct = Math.round((quotes.double / total) * 100);
      conventions.push({
        name: 'Double quotes',
        description: `String literals predominantly use double quotes (${pct}%).`,
        evidence: `${quotes.double} double vs ${quotes.single} single`,
      });
    }
  }

  if (hasEslintConfig(rootPath)) {
    conventions.push({
      name: 'ESLint configured',
      description: 'Project ships an ESLint configuration for static analysis.',
    });
  }
  if (hasPrettierConfig(rootPath)) {
    conventions.push({
      name: 'Prettier configured',
      description: 'Project uses Prettier for code formatting.',
    });
  }
  if (detectTypeScriptStrict(rootPath)) {
    conventions.push({
      name: 'TypeScript strict mode',
      description: 'tsconfig.json enables `"strict": true`.',
    });
  }

  return conventions;
}
