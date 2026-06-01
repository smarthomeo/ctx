import { describe, test, expect } from 'vitest';
import { renderJson, parseContextJson } from '../../src/generators/json.js';
import type { ProjectContext } from '../../src/types.js';

const sampleCtx: ProjectContext = {
  projectName: 'test-app',
  overview: 'A test app',
  techStack: { languages: ['TypeScript'], frameworks: ['Express'] },
  structure: { tree: '.', files: ['index.ts'], directories: ['src'], keyFiles: ['package.json'], totalFiles: 1, totalDirs: 1 },
  conventions: ['camelCase'],
  environment: [{ name: 'PORT', value: '3000', required: true }],
  commands: [{ name: 'dev', description: 'Start dev server' }],
  architecture: { entryPoints: ['src/index.ts'], keyModules: ['src/app.ts'], dataFlow: 'Request → Express → Response' },
  generatedAt: '2026-01-01T00:00:00.000Z',
};

describe('renderJson', () => {
  test('produces valid JSON', () => {
    const output = renderJson(sampleCtx);
    expect(() => JSON.parse(output)).not.toThrow();
  });

  test('is pretty-printed with 2-space indent', () => {
    const output = renderJson(sampleCtx);
    expect(output).toContain('  "projectName"');
  });

  test('ends with newline', () => {
    const output = renderJson(sampleCtx);
    expect(output.endsWith('\n')).toBe(true);
  });

  test('preserves all fields', () => {
    const parsed = JSON.parse(renderJson(sampleCtx));
    expect(parsed.projectName).toBe('test-app');
    expect(parsed.overview).toBe('A test app');
    expect(parsed.techStack.languages).toEqual(['TypeScript']);
    expect(parsed.structure.files).toEqual(['index.ts']);
  });

  test('round-trips through parseContextJson', () => {
    const json = renderJson(sampleCtx);
    const parsed = parseContextJson(json);
    expect(parsed.projectName).toBe(sampleCtx.projectName);
    expect(parsed.techStack.languages).toEqual(sampleCtx.techStack.languages);
    expect(parsed.structure.files).toEqual(sampleCtx.structure.files);
  });
});

describe('parseContextJson', () => {
  test('parses valid JSON', () => {
    const parsed = parseContextJson(JSON.stringify(sampleCtx));
    expect(parsed.projectName).toBe('test-app');
  });

  test('throws on invalid JSON', () => {
    expect(() => parseContextJson('not json')).toThrow();
  });

  test('throws on missing projectName', () => {
    const { projectName, ...rest } = sampleCtx;
    expect(() => parseContextJson(JSON.stringify(rest))).toThrow(/projectName/);
  });

  test('throws on missing techStack', () => {
    const { techStack, ...rest } = sampleCtx;
    expect(() => parseContextJson(JSON.stringify(rest))).toThrow(/techStack/);
  });

  test('throws on missing structure', () => {
    const { structure, ...rest } = sampleCtx;
    expect(() => parseContextJson(JSON.stringify(rest))).toThrow(/structure/);
  });

  test('fills in defaults for missing optional fields', () => {
    const minimal = { projectName: 'x', techStack: { languages: ['Go'], frameworks: [] }, structure: { tree: '.', files: [], directories: [], keyFiles: [], totalFiles: 0, totalDirs: 0 } };
    const parsed = parseContextJson(JSON.stringify(minimal));
    expect(parsed.overview).toBe('');
    expect(parsed.conventions).toEqual([]);
    expect(parsed.environment).toEqual([]);
    expect(parsed.commands).toEqual([]);
  });

  test('throws on non-object input', () => {
    expect(() => parseContextJson('"hello"')).toThrow();
    expect(() => parseContextJson('123')).toThrow();
    expect(() => parseContextJson('null')).toThrow();
  });
});
