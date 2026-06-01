import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { EnvVar } from '../types.js';

const PLACEHOLDER_VALUES = new Set([
  '',
  'your-api-key-here',
  'changeme',
  'todo',
  'placeholder',
  'example',
  'your-key-here',
  'replace-me',
  'xxxxx',
  'xxxx',
  'your-value',
]);

function isPlaceholder(value: string): boolean {
  if (PLACEHOLDER_VALUES.has(value.toLowerCase())) return true;
  if (/^(your|my|replace|change|insert|set)[-_]?/i.test(value)) return true;
  if (/^[<{\[]/.test(value) && /[>}\]]$/.test(value)) return true;
  if (/^\$\{?\w+\}?$/.test(value)) return true;
  return false;
}

function parseEnvLine(line: string): { comment: string } | null {
  const hashIdx = line.indexOf('#');
  if (hashIdx === -1) return null;
  return { comment: line.slice(hashIdx + 1).trim() };
}

function parseEnvContent(content: string): EnvVar[] {
  const vars: EnvVar[] = [];
  const seen = new Set<string>();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const name = line.slice(0, eq).trim();
    if (!name || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) continue;
    let value = line.slice(eq + 1).trim();
    const inlineComment = parseEnvLine(line.slice(eq + 1));
    let comment: string | undefined;
    if (inlineComment && value.includes('#')) {
      const hashInValue = value.indexOf('#');
      value = value.slice(0, hashInValue).trim();
      comment = inlineComment.comment;
    }
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
      value = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
      value = value.slice(1, -1);
    }
    if (seen.has(name)) continue;
    seen.add(name);
    vars.push({
      name,
      defaultValue: value || undefined,
      comment,
      required: isPlaceholder(value),
    });
  }
  return vars;
}

export function scanEnv(rootPath: string): EnvVar[] {
  const candidates = ['.env.example', '.env.sample', '.env.template'];
  for (const name of candidates) {
    const p = join(rootPath, name);
    if (existsSync(p)) {
      try {
        return parseEnvContent(readFileSync(p, 'utf-8'));
      } catch {
        return [];
      }
    }
  }
  return [];
}

export function scanEnvAll(rootPath: string): EnvVar[] {
  const vars = scanEnv(rootPath);
  const fromDocker: string[] = [];
  const dockerfile = join(rootPath, 'Dockerfile');
  if (existsSync(dockerfile)) {
    try {
      const content = readFileSync(dockerfile, 'utf-8');
      for (const m of content.matchAll(/^ENV\s+([A-Z_][A-Z0-9_]*)/gm)) {
        fromDocker.push(m[1]!);
      }
    } catch {
      // ignore
    }
  }
  const composeFiles = ['docker-compose.yml', 'docker-compose.yaml'];
  for (const cf of composeFiles) {
    const p = join(rootPath, cf);
    if (existsSync(p)) {
      try {
        const content = readFileSync(p, 'utf-8');
        for (const m of content.matchAll(/\$\{?([A-Z_][A-Z0-9_]*)\}?/g)) {
          fromDocker.push(m[1]!);
        }
      } catch {
        // ignore
      }
    }
  }
  const existing = new Set(vars.map((v) => v.name));
  for (const name of fromDocker) {
    if (!existing.has(name)) {
      vars.push({ name, required: true });
    }
  }
  return vars;
}

export function listEnvFiles(rootPath: string): string[] {
  const out: string[] = [];
  if (!existsSync(rootPath)) return out;
  let entries: string[];
  try {
    entries = readdirSync(rootPath);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (/^\.env(\.|$)/.test(entry) && entry !== '.env') {
      const full = join(rootPath, entry);
      try {
        const s = statSync(full);
        if (s.isFile()) {
          out.push(entry);
        }
      } catch {
        // ignore
      }
    }
  }
  return out.sort();
}
