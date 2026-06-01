import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { cpSync } from 'node:fs';
import { runInit } from '../../src/commands/init.js';
import { runCheck } from '../../src/commands/check.js';

const FIXTURES = join(__dirname, '../fixtures');
const NODE = join(FIXTURES, 'node-project');

function copyFixture(src: string): string {
  const tmp = mkdtempSync(join(tmpdir(), 'ctx-test-'));
  cpSync(src, tmp, { recursive: true });
  return tmp;
}

describe('runCheck', () => {
  let tmp: string;

  afterEach(() => {
    if (tmp) rmSync(tmp, { recursive: true, force: true });
  });

  test('returns fresh (exitCode=0) on freshly initialized project (json format)', () => {
    tmp = copyFixture(NODE);
    runInit({ rootPath: tmp, format: 'json', quiet: true });
    const result = runCheck({ rootPath: tmp, format: 'json', quiet: true });
    expect(result.fresh).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.previous).not.toBeNull();
  });

  test('returns stale (exitCode=1) after file modification', () => {
    tmp = copyFixture(NODE);
    runInit({ rootPath: tmp, format: 'json', quiet: true });
    // Add a new file to make the project stale
    writeFileSync(join(tmp, 'new-file.ts'), 'export const x = 1;');
    const result = runCheck({ rootPath: tmp, format: 'json', quiet: true });
    expect(result.fresh).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  test('returns stale (exitCode=1) when no .ctx file exists', () => {
    tmp = copyFixture(NODE);
    const result = runCheck({ rootPath: tmp, format: 'json', quiet: true });
    expect(result.fresh).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.previous).toBeNull();
  });

  test('returns stale for markdown format (no JSON-LD state)', () => {
    tmp = copyFixture(NODE);
    runInit({ rootPath: tmp, format: 'md', quiet: true });
    const result = runCheck({ rootPath: tmp, format: 'md', quiet: true });
    // Markdown doesn't embed JSON-LD, so previous is always null → stale
    expect(result.fresh).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  test('throws on non-existent root', () => {
    expect(() => runCheck({ rootPath: '/tmp/nonexistent-ctx-test-xyz', quiet: true })).toThrow(/does not exist/);
  });

  test('reports current context correctly', () => {
    tmp = copyFixture(NODE);
    runInit({ rootPath: tmp, format: 'json', quiet: true });
    const result = runCheck({ rootPath: tmp, format: 'json', quiet: true });
    expect(result.current.projectName).toBe('sample-node-app');
    expect(result.current.techStack.frameworks).toContain('Express');
  });
});
