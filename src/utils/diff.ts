import type { ContextDiff, ProjectContext } from '../types.js';

function arraysEqual(a: string[] | undefined, b: string[] | undefined): boolean {
  const aa = a ?? [];
  const bb = b ?? [];
  if (aa.length !== bb.length) return false;
  for (let i = 0; i < aa.length; i++) {
    if (aa[i] !== bb[i]) return false;
  }
  return true;
}

function jsonEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function diffContexts(
  before: ProjectContext | null,
  after: ProjectContext,
): ContextDiff {
  const details: Record<string, { before: unknown; after: unknown }> = {};
  const changedSections: string[] = [];

  if (!before) {
    return {
      hasChanges: true,
      changedSections: ['all'],
      addedFiles: after.structure.files,
      removedFiles: [],
      modifiedFiles: [],
      details: {},
    };
  }

  if (before.projectName !== after.projectName) {
    changedSections.push('projectName');
    details.projectName = { before: before.projectName, after: after.projectName };
  }
  if (before.overview !== after.overview) {
    changedSections.push('overview');
    details.overview = { before: before.overview, after: after.overview };
  }
  if (!jsonEqual(before.techStack, after.techStack)) {
    changedSections.push('techStack');
    details.techStack = { before: before.techStack, after: after.techStack };
  }
  if (before.structure.tree !== after.structure.tree) {
    changedSections.push('structure');
    details.structure = { before: before.structure.tree, after: after.structure.tree };
  }
  if (!jsonEqual(before.environment, after.environment)) {
    changedSections.push('environment');
    details.environment = { before: before.environment, after: after.environment };
  }
  if (!jsonEqual(before.commands, after.commands)) {
    changedSections.push('commands');
    details.commands = { before: before.commands, after: after.commands };
  }
  if (!jsonEqual(before.conventions, after.conventions)) {
    changedSections.push('conventions');
    details.conventions = { before: before.conventions, after: after.conventions };
  }
  if (!jsonEqual(before.architecture, after.architecture)) {
    changedSections.push('architecture');
    details.architecture = { before: before.architecture, after: after.architecture };
  }

  const beforeFiles = new Set(before.structure.files);
  const afterFiles = new Set(after.structure.files);
  const addedFiles = after.structure.files.filter((f) => !beforeFiles.has(f));
  const removedFiles = before.structure.files.filter((f) => !afterFiles.has(f));

  const beforeDirs = new Set(before.structure.directories);
  const afterDirs = new Set(after.structure.directories);
  const addedDirs = after.structure.directories.filter((d) => !beforeDirs.has(d));
  const removedDirs = before.structure.directories.filter((d) => !afterDirs.has(d));

  const modifiedFiles: string[] = [];
  for (const file of after.structure.files) {
    if (beforeFiles.has(file) && !arraysEqual(addedFiles, removedFiles)) {
      // Both present - cannot tell if content changed without reading;
      // for now treat as unchanged in mtime-less mode
    }
  }

  if (addedDirs.length > 0 || removedDirs.length > 0) {
    changedSections.push('directories');
  }

  return {
    hasChanges: changedSections.length > 0 || addedFiles.length > 0 || removedFiles.length > 0,
    changedSections,
    addedFiles,
    removedFiles,
    modifiedFiles,
    details,
  };
}

export function formatDiff(diff: ContextDiff): string {
  const lines: string[] = [];
  if (!diff.hasChanges) {
    lines.push('No changes detected. .ctx.md is up to date.');
    return lines.join('\n');
  }
  lines.push('Changes detected:');
  if (diff.changedSections.length > 0) {
    lines.push(`  Modified sections: ${diff.changedSections.join(', ')}`);
  }
  if (diff.addedFiles.length > 0) {
    lines.push(`  Added files (${diff.addedFiles.length}):`);
    for (const f of diff.addedFiles) {
      lines.push(`    + ${f}`);
    }
  }
  if (diff.removedFiles.length > 0) {
    lines.push(`  Removed files (${diff.removedFiles.length}):`);
    for (const f of diff.removedFiles) {
      lines.push(`    - ${f}`);
    }
  }
  if (diff.modifiedFiles.length > 0) {
    lines.push(`  Modified files (${diff.modifiedFiles.length}):`);
    for (const f of diff.modifiedFiles) {
      lines.push(`    ~ ${f}`);
    }
  }
  return lines.join('\n');
}
