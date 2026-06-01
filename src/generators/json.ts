import type { ProjectContext } from '../types.js';

export function renderJson(ctx: ProjectContext): string {
  return JSON.stringify(ctx, null, 2) + '\n';
}

export function parseContextJson(input: string): ProjectContext {
  const parsed = JSON.parse(input) as unknown;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid context JSON: expected an object');
  }
  const obj = parsed as Partial<ProjectContext>;
  if (!obj.projectName || typeof obj.projectName !== 'string') {
    throw new Error('Invalid context JSON: missing projectName');
  }
  if (!obj.techStack || typeof obj.techStack !== 'object') {
    throw new Error('Invalid context JSON: missing techStack');
  }
  if (!obj.structure || typeof obj.structure !== 'object') {
    throw new Error('Invalid context JSON: missing structure');
  }
  return {
    projectName: obj.projectName,
    overview: obj.overview ?? '',
    techStack: obj.techStack,
    structure: obj.structure,
    conventions: obj.conventions ?? [],
    environment: obj.environment ?? [],
    commands: obj.commands ?? [],
    architecture: obj.architecture ?? { entryPoints: [], keyModules: [], dataFlow: '' },
    generatedAt: obj.generatedAt ?? new Date().toISOString(),
    rootPath: obj.rootPath ?? '',
  };
}
