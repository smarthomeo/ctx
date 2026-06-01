import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { cpSync } from 'node:fs';
import { runInit } from '../../src/commands/init.js';

const FIXTURES = join(__dirname, '../fixtures');
const NODE = join(FIXTURES, 'node-project');
const PYTHON = join(FIXTURES, 'python-project');
const GO = join(FIXTURES, 'go-project');

function copyFixture(src: string): string {
  const tmp = mkdtempSync(join(tmpdir(), 'ctx-test-'));
  cpSync(src, tmp, { recursive: true });
  return tmp;
}

describe('runInit', () => {
  let tmp: string;

  afterEach(() => {
    if (tmp) rmSync(tmp, { recursive: true, force: true });
  });

  test('generates .ctx.md on node-project', () => {
    tmp = copyFixture(NODE);
    const result = runInit({ rootPath: tmp, quiet: true });
    expect(result.written).toBe(true);
    expect(existsSync(join(tmp, '.ctx.md'))).toBe(true);
  });

  test('generates .ctx.json with format=json', () => {
    tmp = copyFixture(NODE);
    const result = runInit({ rootPath: tmp, format: 'json', quiet: true });
    expect(result.written).toBe(true);
    expect(existsSync(join(tmp, '.ctx.json'))).toBe(true);
    expect(() => JSON.parse(result.content)).not.toThrow();
  });

  test('detects project name from package.json', () => {
    tmp = copyFixture(NODE);
    const result = runInit({ rootPath: tmp, quiet: true });
    expect(result.context.projectName).toBe('sample-node-app');
  });

  test('detects Express in frameworks', () => {
    tmp = copyFixture(NODE);
    const result = runInit({ rootPath: tmp, quiet: true });
    expect(result.context.techStack.frameworks).toContain('Express');
  });

  test('includes env vars from .env.example', () => {
    tmp = copyFixture(NODE);
    const result = runInit({ rootPath: tmp, quiet: true });
    const envNames = result.context.environment.map(e => e.name);
    expect(envNames).toContain('PORT');
    expect(envNames).toContain('DATABASE_URL');
  });

  test('includes scripts from package.json', () => {
    tmp = copyFixture(NODE);
    const result = runInit({ rootPath: tmp, quiet: true });
    const scriptNames = result.context.commands.map(c => c.name);
    expect(scriptNames).toContain('dev');
    expect(scriptNames).toContain('test');
  });

  test('respects dryRun', () => {
    tmp = copyFixture(NODE);
    const result = runInit({ rootPath: tmp, dryRun: true, quiet: true });
    expect(result.written).toBe(false);
    expect(existsSync(join(tmp, '.ctx.md'))).toBe(false);
  });

  test('throws on non-existent root', () => {
    expect(() => runInit({ rootPath: '/tmp/nonexistent-ctx-test-xyz', quiet: true })).toThrow(/does not exist/);
  });

  test('works on python-project', () => {
    tmp = copyFixture(PYTHON);
    const result = runInit({ rootPath: tmp, quiet: true });
    expect(result.context.projectName).toBe('sample-python-app');
    expect(result.context.techStack.languages).toContain('Python');
  });

  test('works on go-project', () => {
    tmp = copyFixture(GO);
    const result = runInit({ rootPath: tmp, quiet: true });
    expect(result.context.projectName).toBe('sample-go-app');
    expect(result.context.techStack.languages).toContain('Go');
  });

  test('respects custom output path', () => {
    tmp = copyFixture(NODE);
    const customOut = join(tmp, 'custom-ctx.md');
    const result = runInit({ rootPath: tmp, outputPath: customOut, quiet: true });
    expect(result.outputPath).toBe(customOut);
    expect(existsSync(customOut)).toBe(true);
  });

  test('markdown contains expected sections', () => {
    tmp = copyFixture(NODE);
    const result = runInit({ rootPath: tmp, quiet: true });
    expect(result.content).toContain('# sample-node-app');
    expect(result.content).toContain('## Tech Stack');
    expect(result.content).toContain('## Project Structure');
    expect(result.content).toContain('## Commands');
  });
});
