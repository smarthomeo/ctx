import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { scanProject } from '../scanners/index.js';
import { renderMarkdown } from '../generators/markdown.js';
import { renderJson } from '../generators/json.js';
import type { ProjectContext } from '../types.js';

export interface InitOptions {
  rootPath: string;
  outputPath?: string;
  format?: 'md' | 'json';
  depth?: number;
  ignore?: string[];
  dryRun?: boolean;
  quiet?: boolean;
}

export interface InitResult {
  context: ProjectContext;
  outputPath: string;
  content: string;
  written: boolean;
}

export function runInit(options: InitOptions): InitResult {
  const rootPath = resolve(options.rootPath);
  if (!existsSync(rootPath)) {
    throw new Error(`Project root does not exist: ${rootPath}`);
  }
  const format = options.format ?? 'md';
  const outputPath = options.outputPath
    ? (isAbsolute(options.outputPath) ? options.outputPath : resolve(rootPath, options.outputPath))
    : resolve(rootPath, format === 'json' ? '.ctx.json' : '.ctx.md');
  const context = scanProject({
    rootPath,
    depth: options.depth,
    extraIgnore: options.ignore,
  });
  const content = format === 'json' ? renderJson(context) : renderMarkdown(context);
  let written = false;
  if (!options.dryRun) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, content, 'utf-8');
    written = true;
  }
  if (!options.quiet && written) {
    const fileCount = context.structure.files.length;
    process.stdout.write(`Wrote context (${fileCount} files scanned) to ${outputPath}\n`);
  }
  return { context, outputPath, content, written };
}
