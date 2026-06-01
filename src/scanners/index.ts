import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { detectProjectName, detectTechStack } from './language.js';
import { scanStructure } from './structure.js';
import { scanEnvAll } from './env.js';
import { scanScripts } from './scripts.js';
import { scanPatterns } from './patterns.js';
import { loadIgnorePatterns } from '../utils/ignore.js';
import type { ProjectContext } from '../types.js';

export interface ScanProjectOptions {
  rootPath: string;
  depth?: number;
  extraIgnore?: string[];
}

function readOverview(rootPath: string): string {
  const candidates = ['README.md', 'README', 'readme.md', 'Readme.md'];
  for (const name of candidates) {
    const p = join(rootPath, name);
    if (existsSync(p)) {
      try {
        const content = readFileSync(p, 'utf-8');
        const lines = content.split(/\r?\n/);
        const collected: string[] = [];
        let started = false;
        for (const line of lines) {
          const trimmed = line.trim();
          if (!started) {
            if (trimmed.startsWith('# ')) {
              started = true;
              continue;
            }
            if (trimmed === '' || trimmed.startsWith('![') || trimmed.startsWith('<img')) {
              continue;
            }
            started = true;
          }
          if (trimmed.startsWith('#')) break;
          if (trimmed === '' && collected.length > 0) break;
          collected.push(trimmed);
          if (collected.length >= 6) break;
        }
        if (collected.length > 0) {
          return collected.join(' ').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
        }
      } catch {
        // ignore
      }
    }
  }
  return '';
}

function buildDataFlow(ctx: ProjectContext): string {
  const lines: string[] = [];
  const entry = ctx.architecture.entryPoints[0];
  if (entry) {
    lines.push(`- Entry point loads from \`${entry}\`.`);
  }
  if (ctx.techStack.frameworks.length > 0) {
    lines.push(`- Uses ${ctx.techStack.frameworks.join(', ')} as the application framework.`);
  }
  if (ctx.environment.length > 0) {
    const required = ctx.environment.filter((e) => e.required).map((e) => e.name);
    if (required.length > 0) {
      lines.push(`- Configuration sourced from environment: ${required.map((n) => `\`${n}\``).join(', ')}.`);
    }
  }
  if (ctx.commands.length > 0) {
    const dev = ctx.commands.find((c) => c.name === 'dev' || c.name === 'serve');
    if (dev) {
      lines.push(`- Development workflow: \`${dev.name}\` (${dev.command}).`);
    }
  }
  if (lines.length === 0) {
    return 'Data flow could not be inferred automatically.';
  }
  return lines.join('\n');
}

export function scanProject(options: ScanProjectOptions): ProjectContext {
  const { rootPath, depth = 3, extraIgnore = [] } = options;
  const ignorePatterns = loadIgnorePatterns(rootPath, extraIgnore);
  const techStack = detectTechStack(rootPath);
  const structure = scanStructure({ rootPath, depth, extraIgnore: ignorePatterns });
  const environment = scanEnvAll(rootPath);
  const commands = scanScripts(rootPath);
  const conventions = scanPatterns({ rootPath, depth: Math.max(depth, 4), extraIgnore: ignorePatterns });
  const projectName = detectProjectName(rootPath);
  const overview = readOverview(rootPath);

  const architecture = {
    entryPoints: structure.entryPoints,
    keyModules: structure.keyFiles,
    dataFlow: '',
  };

  const ctx: ProjectContext = {
    projectName,
    overview,
    techStack,
    structure: {
      tree: structure.tree,
      files: structure.files,
      directories: structure.directories,
      keyFiles: structure.keyFiles,
    },
    conventions,
    environment,
    commands,
    architecture,
    generatedAt: new Date().toISOString(),
    rootPath,
  };

  ctx.architecture.dataFlow = buildDataFlow(ctx);
  return ctx;
}
