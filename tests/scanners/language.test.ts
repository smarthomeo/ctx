import { describe, test, expect } from 'vitest';
import { join } from 'node:path';
import { detectTechStack, detectProjectName } from '../../src/scanners/language.js';

const FIXTURES = join(process.cwd(), 'tests', 'fixtures');
const NODE = join(FIXTURES, 'node-project');
const PYTHON = join(FIXTURES, 'python-project');
const GO = join(FIXTURES, 'go-project');

describe('detectTechStack', () => {
  test('detects Node.js + TypeScript project (sample-node-app)', () => {
    const tech = detectTechStack(NODE);
    expect(tech.languages).toContain('TypeScript');
    expect(tech.languages).toContain('JavaScript/TypeScript');
    expect(tech.frameworks).toContain('Express');
    expect(tech.testFramework).toBe('Vitest');
    expect(tech.linter).toBe('ESLint');
    expect(tech.typeChecker).toBe('TypeScript');
    expect(tech.runtime).toBe('Node.js');
  });

  test('detects npm as package manager from package-lock.json presence', () => {
    const tech = detectTechStack(NODE);
    expect(tech.packageManager).toBe('npm');
  });

  test('detects Python + FastAPI project', () => {
    const tech = detectTechStack(PYTHON);
    expect(tech.languages).toContain('Python');
    expect(tech.frameworks).toContain('FastAPI');
    expect(tech.runtime).toBe('Python');
  });

  test('detects Go + Gin project', () => {
    const tech = detectTechStack(GO);
    expect(tech.languages).toContain('Go');
    expect(tech.frameworks).toContain('Gin');
    expect(tech.runtime).toBe('Go');
    expect(tech.testFramework).toBe('Go testing');
  });

  test('returns "Unknown" when no recognized project files exist', () => {
    const tech = detectTechStack('/tmp');
    expect(tech.languages).toEqual(['Unknown']);
  });

  test('does not duplicate languages or frameworks', () => {
    const tech = detectTechStack(NODE);
    const langSet = new Set(tech.languages);
    expect(langSet.size).toBe(tech.languages.length);
    const fwSet = new Set(tech.frameworks);
    expect(fwSet.size).toBe(tech.frameworks.length);
  });
});

describe('detectProjectName', () => {
  test('reads project name from package.json', () => {
    expect(detectProjectName(NODE)).toBe('sample-node-app');
  });

  test('reads project name from pyproject.toml', () => {
    expect(detectProjectName(PYTHON)).toBe('sample-python-app');
  });

  test('reads project name from go.mod (last segment of module path)', () => {
    expect(detectProjectName(GO)).toBe('sample-go-app');
  });

  test('falls back to directory name when no manifest', () => {
    expect(detectProjectName('/tmp/my-cool-project')).toBe('my-cool-project');
  });
});
