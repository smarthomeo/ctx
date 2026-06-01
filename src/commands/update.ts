import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { scanProject } from '../scanners/index.js';
import { renderMarkdown } from '../generators/markdown.js';
import { renderJson } from '../generators/json.js';
import { parseContextJson } from '../generators/json.js';
import { diffContexts, formatDiff } from '../utils/diff.js';
import type { ProjectContext } from '../types.js';

export interface UpdateOptions {
  rootPath: string;
  outputPath?: string;
  format?: 'md' | 'json';
  depth?: number;
  ignore?: string[];
  dryRun?: boolean;
  quiet?: boolean;
  showDiff?: boolean;
}

export interface UpdateResult {
  context: ProjectContext;
  previous: ProjectContext | null;
  outputPath: string;
  content: string;
  written: boolean;
  hasChanges: boolean;
  diffSummary: string;
}

function loadPreviousContext(filePath: string, format: 'md' | 'json'): ProjectContext | null {
  if (!existsSync(filePath)) return null;
  try {
    const content = readFileSync(filePath, 'utf-8');
    if (format === 'json') {
      return parseContextJson(content);
    }
    // markdown: try to extract JSON-LD comment block first
    const jsonMatch = content.match(/<!--\s*ctx:json\s*([\s\S]*?)\s*-->/);
    if (jsonMatch) {
      try {
        return parseContextJson(jsonMatch[1]!);
      } catch {
        return null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function runUpdate(options: UpdateOptions): UpdateResult {
  const rootPath = resolve(options.rootPath);
  if (!existsSync(rootPath)) {
    throw new Error(`Project root does not exist: ${rootPath}`);
  }
  const format = options.format ?? 'md';
  const outputPath = options.outputPath
    ? (isAbsolute(options.outputPath) ? options.outputPath : resolve(rootPath, options.outputPath))
    : resolve(rootPath, format === 'json' ? '.ctx.json' : '.ctx.md');
  const previous = loadPreviousContext(outputPath, format);
  const context = scanProject({
    rootPath,
    depth: options.depth,
    extraIgnore: options.ignore,
  });
  const diff = diffContexts(previous, context);
  const content = format === 'json' ? renderJson(context) : renderMarkdown(context);
  let written = false;
  if (!options.dryRun) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, content, 'utf-8');
    written = true;
  }
  const diffSummary = formatDiff(diff);
  if (!options.quiet) {
    if (options.showDiff || !diff.hasChanges) {
      process.stdout.write(diffSummary + '\n');
    }
    if (written) {
      process.stdout.write(`Updated ${outputPath}\n`);
    }
  }
  return {
    context,
    previous,
    outputPath,
    content,
    written,
    hasChanges: diff.hasChanges,
    diffSummary,
  };
}
