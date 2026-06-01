import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Command } from '../types.js';

interface PackageJson {
  scripts?: Record<string, string>;
}

interface PyProject {
  project?: {
    scripts?: Record<string, string>;
  };
  'tool.poetry.scripts'?: Record<string, string>;
}

function parseToml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const stack: Array<{ obj: Record<string, unknown> }> = [{ obj: result }];
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('[') && line.endsWith(']')) {
      const key = line.slice(1, -1).trim().replace(/^["']|["']$/g, '');
      let obj: Record<string, unknown> = result;
      const parts = key.split('.');
      for (const part of parts) {
        if (!obj[part] || typeof obj[part] !== 'object') {
          obj[part] = {};
        }
        obj = obj[part] as Record<string, unknown>;
      }
      stack.push({ obj });
      continue;
    }
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const valueRaw = line.slice(eq + 1).trim();
    const value = parseTomlValue(valueRaw);
    const current = stack[stack.length - 1]!;
    current.obj[key] = value;
  }
  return result;
}

function parseTomlValue(value: string): unknown {
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map((v) => {
      const t = v.trim();
      if (t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1);
      if (t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1);
      const num = Number(t);
      return Number.isNaN(num) ? t : num;
    });
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  const num = Number(value);
  if (!Number.isNaN(num) && value !== '') return num;
  return value;
}

function describeScript(name: string, command: string): string {
  const lc = name.toLowerCase();
  const cmdLower = command.toLowerCase();
  if (lc === 'dev' || cmdLower.includes('watch') || cmdLower.includes('serve')) {
    return 'Start development server';
  }
  if (lc === 'build' || cmdLower.includes('build') || cmdLower.includes('tsc') || cmdLower.includes('tsup')) {
    return 'Build the project';
  }
  if (lc === 'test' || cmdLower.includes('test')) {
    return 'Run tests';
  }
  if (lc === 'lint' || cmdLower.includes('lint') || cmdLower.includes('eslint')) {
    return 'Run linter';
  }
  if (lc === 'format' || cmdLower.includes('prettier') || cmdLower.includes('format')) {
    return 'Format code';
  }
  if (lc === 'start') {
    return 'Start the application';
  }
  if (lc === 'typecheck' || cmdLower.includes('tsc --noemit')) {
    return 'Run type checks';
  }
  if (lc === 'clean') {
    return 'Clean build artifacts';
  }
  return `Run \`${name}\` script`;
}

function parseMakefile(content: string): Command[] {
  const commands: Command[] = [];
  const targetRegex = /^([A-Za-z0-9_.-]+)\s*:([^=]*)$/;
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.replace(/^\t+/, '    ').trimEnd();
    if (line.startsWith('\t')) continue;
    if (line.startsWith('#')) continue;
    if (line.includes(':=')) continue;
    const m = line.match(targetRegex);
    if (!m) continue;
    const name = m[1]!;
    if (name.startsWith('.')) continue;
    commands.push({
      name: `make ${name}`,
      description: `Run \`make ${name}\` target`,
      source: 'Makefile',
      command: `make ${name}`,
    });
  }
  return commands;
}

export function scanScripts(rootPath: string): Command[] {
  const commands: Command[] = [];
  const pkgPath = join(rootPath, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as PackageJson;
      if (pkg.scripts) {
        for (const [name, command] of Object.entries(pkg.scripts)) {
          commands.push({
            name,
            description: describeScript(name, command),
            source: 'package.json',
            command,
          });
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  const pyprojectPath = join(rootPath, 'pyproject.toml');
  if (existsSync(pyprojectPath)) {
    try {
      const content = readFileSync(pyprojectPath, 'utf-8');
      const parsed = parseToml(content) as PyProject;
      const scripts = parsed['tool.poetry.scripts'] ?? parsed.project?.scripts;
      if (scripts) {
        for (const [name, command] of Object.entries(scripts)) {
          commands.push({
            name,
            description: `Run \`${name}\` script`,
            source: 'pyproject.toml',
            command,
          });
        }
      }
    } catch {
      // ignore
    }
  }

  const makefilePath = join(rootPath, 'Makefile');
  if (existsSync(makefilePath)) {
    try {
      const content = readFileSync(makefilePath, 'utf-8');
      commands.push(...parseMakefile(content));
    } catch {
      // ignore
    }
  }

  return commands;
}
