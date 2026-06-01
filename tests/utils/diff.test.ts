import { describe, test, expect } from 'vitest';
import { diffContexts, formatDiff } from '../../src/utils/diff.js';
import type { ProjectContext } from '../../src/types.js';

function makeContext(overrides: Partial<ProjectContext> = {}): ProjectContext {
  return {
    projectName: 'sample',
    overview: 'A sample project.',
    techStack: {
      languages: ['TypeScript'],
      frameworks: ['Express'],
      packageManager: 'npm',
      testFramework: 'Vitest',
      linter: 'ESLint',
      runtime: 'Node.js',
      typeChecker: 'TypeScript',
    },
    structure: {
      tree: 'sample\n├── src\n│   └── index.ts\n├── package.json\n',
      files: ['src/index.ts', 'package.json'],
      directories: ['src'],
      keyFiles: ['package.json'],
    },
    conventions: [{ name: '2-space indentation', description: '2 spaces' }],
    environment: [{ name: 'PORT', defaultValue: '3000', required: false }],
    commands: [{ name: 'dev', description: 'Start dev', source: 'package.json', command: 'tsx watch' }],
    architecture: { entryPoints: ['src/index.ts'], keyModules: ['src/index.ts'], dataFlow: 'flow' },
    generatedAt: '2024-01-01T00:00:00.000Z',
    rootPath: '/tmp/sample',
    ...overrides,
  };
}

describe('diffContexts', () => {
  test('returns full change set when before is null', () => {
    const after = makeContext();
    const diff = diffContexts(null, after);
    expect(diff.hasChanges).toBe(true);
    expect(diff.changedSections).toEqual(['all']);
    expect(diff.addedFiles).toEqual(after.structure.files);
    expect(diff.removedFiles).toEqual([]);
    expect(diff.modifiedFiles).toEqual([]);
  });

  test('returns no changes when contexts are identical', () => {
    const ctx = makeContext();
    const diff = diffContexts(ctx, makeContext());
    expect(diff.hasChanges).toBe(false);
    expect(diff.changedSections).toEqual([]);
    expect(diff.addedFiles).toEqual([]);
    expect(diff.removedFiles).toEqual([]);
  });

  test('detects changed projectName', () => {
    const before = makeContext({ projectName: 'old' });
    const after = makeContext({ projectName: 'new' });
    const diff = diffContexts(before, after);
    expect(diff.hasChanges).toBe(true);
    expect(diff.changedSections).toContain('projectName');
    expect(diff.details.projectName).toEqual({ before: 'old', after: 'new' });
  });

  test('detects changed overview', () => {
    const before = makeContext({ overview: 'old' });
    const after = makeContext({ overview: 'new' });
    const diff = diffContexts(before, after);
    expect(diff.hasChanges).toBe(true);
    expect(diff.changedSections).toContain('overview');
  });

  test('detects changed techStack', () => {
    const before = makeContext({
      techStack: { languages: ['JavaScript'], frameworks: [], runtime: 'Node.js' },
    });
    const after = makeContext({
      techStack: { languages: ['TypeScript'], frameworks: ['Express'], runtime: 'Node.js' },
    });
    const diff = diffContexts(before, after);
    expect(diff.hasChanges).toBe(true);
    expect(diff.changedSections).toContain('techStack');
  });

  test('detects changed structure (tree)', () => {
    const before = makeContext({ structure: makeContext().structure });
    const after = makeContext({
      structure: { ...makeContext().structure, tree: 'different\n' },
    });
    const diff = diffContexts(before, after);
    expect(diff.hasChanges).toBe(true);
    expect(diff.changedSections).toContain('structure');
  });

  test('detects changed environment', () => {
    const before = makeContext({ environment: [] });
    const after = makeContext({ environment: [{ name: 'API_KEY', required: true }] });
    const diff = diffContexts(before, after);
    expect(diff.hasChanges).toBe(true);
    expect(diff.changedSections).toContain('environment');
  });

  test('detects changed commands', () => {
    const before = makeContext({ commands: [] });
    const after = makeContext({
      commands: [{ name: 'build', description: 'Build', source: 'package.json', command: 'tsc' }],
    });
    const diff = diffContexts(before, after);
    expect(diff.hasChanges).toBe(true);
    expect(diff.changedSections).toContain('commands');
  });

  test('detects changed conventions', () => {
    const before = makeContext({ conventions: [] });
    const after = makeContext({ conventions: [{ name: 'X', description: 'Y' }] });
    const diff = diffContexts(before, after);
    expect(diff.hasChanges).toBe(true);
    expect(diff.changedSections).toContain('conventions');
  });

  test('detects changed architecture', () => {
    const before = makeContext({ architecture: { entryPoints: [], keyModules: [], dataFlow: 'a' } });
    const after = makeContext({ architecture: { entryPoints: [], keyModules: [], dataFlow: 'b' } });
    const diff = diffContexts(before, after);
    expect(diff.hasChanges).toBe(true);
    expect(diff.changedSections).toContain('architecture');
  });

  test('detects added files', () => {
    const before = makeContext({ structure: { ...makeContext().structure, files: ['a.ts'] } });
    const after = makeContext({ structure: { ...makeContext().structure, files: ['a.ts', 'b.ts'] } });
    const diff = diffContexts(before, after);
    expect(diff.hasChanges).toBe(true);
    expect(diff.addedFiles).toEqual(['b.ts']);
  });

  test('detects removed files', () => {
    const before = makeContext({ structure: { ...makeContext().structure, files: ['a.ts', 'b.ts'] } });
    const after = makeContext({ structure: { ...makeContext().structure, files: ['a.ts'] } });
    const diff = diffContexts(before, after);
    expect(diff.hasChanges).toBe(true);
    expect(diff.removedFiles).toEqual(['b.ts']);
  });

  test('detects added/removed directories', () => {
    const before = makeContext({ structure: { ...makeContext().structure, directories: ['src'] } });
    const after = makeContext({ structure: { ...makeContext().structure, directories: ['src', 'lib'] } });
    const diff = diffContexts(before, after);
    expect(diff.hasChanges).toBe(true);
    expect(diff.changedSections).toContain('directories');
  });

  test('details object contains full before/after for changed sections', () => {
    const before = makeContext({ projectName: 'a' });
    const after = makeContext({ projectName: 'b' });
    const diff = diffContexts(before, after);
    expect(diff.details.projectName).toEqual({ before: 'a', after: 'b' });
    expect(diff.details.overview).toBeUndefined();
  });
});

describe('formatDiff', () => {
  test('returns "no changes" message for empty diff', () => {
    const ctx = makeContext();
    const diff = diffContexts(ctx, ctx);
    const out = formatDiff(diff);
    expect(out).toMatch(/no changes/i);
  });

  test('lists modified sections', () => {
    const before = makeContext({ projectName: 'a' });
    const after = makeContext({ projectName: 'b' });
    const diff = diffContexts(before, after);
    const out = formatDiff(diff);
    expect(out).toMatch(/modified sections/i);
    expect(out).toContain('projectName');
  });

  test('lists added files with + prefix', () => {
    const before = makeContext({ structure: { ...makeContext().structure, files: [] } });
    const after = makeContext({ structure: { ...makeContext().structure, files: ['new.ts'] } });
    const diff = diffContexts(before, after);
    const out = formatDiff(diff);
    expect(out).toContain('+ new.ts');
  });

  test('lists removed files with - prefix', () => {
    const before = makeContext({ structure: { ...makeContext().structure, files: ['gone.ts'] } });
    const after = makeContext({ structure: { ...makeContext().structure, files: [] } });
    const diff = diffContexts(before, after);
    const out = formatDiff(diff);
    expect(out).toContain('- gone.ts');
  });

  test('lists modified files with ~ prefix', () => {
    const diff = {
      hasChanges: true,
      changedSections: [],
      addedFiles: [],
      removedFiles: [],
      modifiedFiles: ['mod.ts'],
      details: {},
    };
    const out = formatDiff(diff);
    expect(out).toContain('~ mod.ts');
  });
});
