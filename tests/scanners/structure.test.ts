import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanStructure } from '../../src/scanners/structure.js';

const FIXTURES = join(process.cwd(), 'tests', 'fixtures');
const NODE = join(FIXTURES, 'node-project');
const PYTHON = join(FIXTURES, 'python-project');
const GO = join(FIXTURES, 'go-project');

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'ctx-structure-test-'));
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe('scanStructure - node-project fixture', () => {
  test('returns sorted files and directories', () => {
    const info = scanStructure({ rootPath: NODE, depth: 3 });
    expect(info.files).toContain('README.md');
    expect(info.files).toContain('package.json');
    expect(info.files).toContain('src/index.ts');
    expect(info.directories).toContain('src');
    const sorted = [...info.files].sort();
    expect(info.files).toEqual(sorted);
  });

  test('identifies key files (package.json, README.md, .env.example)', () => {
    const info = scanStructure({ rootPath: NODE, depth: 3 });
    expect(info.keyFiles).toContain('package.json');
    expect(info.keyFiles).toContain('README.md');
    expect(info.keyFiles).toContain('.env.example');
  });

  test('identifies entry points', () => {
    const info = scanStructure({ rootPath: NODE, depth: 3 });
    expect(info.entryPoints).toContain('src/index.ts');
  });

  test('renders a tree representation', () => {
    const info = scanStructure({ rootPath: NODE, depth: 3 });
    expect(info.tree).toContain('node-project');
    expect(info.tree).toContain('package.json');
    expect(info.tree).toContain('src');
  });

  test('reports total file and directory counts', () => {
    const info = scanStructure({ rootPath: NODE, depth: 3 });
    expect(info.totalFiles).toBe(info.files.length);
    expect(info.totalDirs).toBe(info.directories.length);
    expect(info.totalFiles).toBeGreaterThan(0);
  });
});

describe('scanStructure - python-project fixture', () => {
  test('detects pyproject.toml as key file', () => {
    const info = scanStructure({ rootPath: PYTHON, depth: 3 });
    expect(info.keyFiles).toContain('pyproject.toml');
  });

  test('detects app/main.py as entry point', () => {
    const info = scanStructure({ rootPath: PYTHON, depth: 3 });
    expect(info.entryPoints).toContain('app/main.py');
  });
});

describe('scanStructure - go-project fixture', () => {
  test('detects main.go and go.mod', () => {
    const info = scanStructure({ rootPath: GO, depth: 3 });
    expect(info.files).toContain('main.go');
    expect(info.files).toContain('go.mod');
    expect(info.keyFiles).toContain('go.mod');
    expect(info.keyFiles).toContain('main.go');
  });
});

describe('scanStructure - depth control', () => {
  test('respects depth=1 (no recursion into subdirs)', () => {
    const info = scanStructure({ rootPath: NODE, depth: 1 });
    expect(info.files).not.toContain('src/index.ts');
    expect(info.files).toContain('package.json');
  });

  test('depth=0 still includes top-level files', () => {
    const info = scanStructure({ rootPath: NODE, depth: 0 });
    expect(info.files.length).toBeGreaterThan(0);
  });
});

describe('scanStructure - ignore patterns', () => {
  test('skips directories matched by extraIgnore', () => {
    const info = scanStructure({ rootPath: NODE, depth: 3, extraIgnore: ['src'] });
    expect(info.directories).not.toContain('src');
    expect(info.files).not.toContain('src/index.ts');
  });

  test('skips files matched by extraIgnore', () => {
    const info = scanStructure({ rootPath: NODE, depth: 3, extraIgnore: ['README.md'] });
    expect(info.files).not.toContain('README.md');
  });
});

describe('scanStructure - synthetic tree', () => {
  test('walks a freshly created project tree', () => {
    mkdirSync(join(tmp, 'src/lib'), { recursive: true });
    writeFileSync(join(tmp, 'src/index.ts'), 'export {};');
    writeFileSync(join(tmp, 'src/lib/util.ts'), 'export {};');
    writeFileSync(join(tmp, 'package.json'), '{}');
    mkdirSync(join(tmp, 'node_modules/foo'), { recursive: true });
    writeFileSync(join(tmp, 'node_modules/foo/index.js'), '');
    const info = scanStructure({ rootPath: tmp, depth: 5 });
    expect(info.files).toContain('src/index.ts');
    expect(info.files).toContain('src/lib/util.ts');
    expect(info.directories).toContain('node_modules');
  });

  test('returns empty for non-existent root', () => {
    const info = scanStructure({ rootPath: join(tmp, 'does-not-exist'), depth: 3 });
    expect(info.files).toEqual([]);
    expect(info.directories).toEqual([]);
    expect(info.entryPoints).toEqual([]);
  });
});
