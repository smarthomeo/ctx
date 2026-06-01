import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { scanProject } from '../scanners/index.js';
import { parseContextJson } from '../generators/json.js';
import { diffContexts, formatDiff } from '../utils/diff.js';
import type { ProjectContext } from '../types.js';

export interface CheckOptions {
  rootPath: string;
  outputPath?: string;
  format?: 'md' | 'json';
  depth?: number;
  ignore?: string[];
  quiet?: boolean;
}

export interface CheckResult {
  fresh: boolean;
  previous: ProjectContext | null;
  current: ProjectContext;
  outputPath: string;
  summary: string;
  exitCode: number;
}

function loadExisting(filePath: string, format: 'md' | 'json'): ProjectContext | null {
  if (!existsSync(filePath)) return null;
  try {
    const content = readFileSync(filePath, 'utf-8');
    if (format === 'json') return parseContextJson(content);
    const jsonMatch = content.match(/<!--\s*ctx:json\s*([\s\S]*?)\s*-->/);
    if (jsonMatch) {
      return parseContextJson(jsonMatch[1]!);
    }
    return null;
  } catch {
    return null;
  }
}

export function runCheck(options: CheckOptions): CheckResult {
  const rootPath = resolve(options.rootPath);
  if (!existsSync(rootPath)) {
    throw new Error(`Project root does not exist: ${rootPath}`);
  }
  const format = options.format ?? 'md';
  const outputPath = options.outputPath
    ? (isAbsolute(options.outputPath) ? options.outputPath : resolve(rootPath, options.outputPath))
    : resolve(rootPath, format === 'json' ? '.ctx.json' : '.ctx.md');
  const previous = loadExisting(outputPath, format);
  const current = scanProject({
    rootPath,
    depth: options.depth,
    extraIgnore: options.ignore,
  });
  const diff = diffContexts(previous, current);
  const fresh = !diff.hasChanges && previous !== null;
  const summary = previous === null
    ? `No context file found at ${outputPath}. Run \`ctx init\` first.`
    : fresh
    ? `.ctx.md is up to date.`
    : formatDiff(diff);
  const exitCode = fresh ? 0 : 1;
  if (!options.quiet) {
    process.stdout.write(summary + '\n');
  }
  return { fresh, previous, current, outputPath, summary, exitCode };
}
