import { describe, test, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { cpSync } from 'node:fs';
import { runInit } from '../../src/commands/init.js';
import { runUpdate } from '../../src/commands/update.js';

const FIXTURES = join(__dirname, '../fixtures');
const NODE = join(FIXTURES, 'node-project');

function copyFixture(src: string): string {
  const tmp = mkdtempSync(join(tmpdir(), 'ctx-test-'));
  cpSync(src, tmp, { recursive: true });
  return tmp;
}

describe('runUpdate', () => {
  let tmp: string;

  afterEach(() => {
    if (tmp) rmSync(tmp, { recursive: true, force: true });
  });

  test('writes the .ctx.md file on first run (no previous)', () => {
    tmp = copyFixture(NODE);
    const result = runUpdate({ rootPath: tmp, quiet: true });
    expect(result.written).toBe(true);
    expect(existsSync(join(tmp, '.ctx.md'))).toBe(true);
    expect(result.previous).toBeNull();
    expect(result.hasChanges).toBe(true); // no previous = changes
  });

  test('re-generates context with current state (json format)', () => {
    tmp = copyFixture(NODE);
    runInit({ rootPath: tmp, format: 'json', quiet: true });
    const result = runUpdate({ rootPath: tmp, format: 'json', quiet: true });
    expect(result.written).toBe(true);
    expect(result.context.projectName).toBe('sample-node-app');
    expect(result.previous).not.toBeNull();
  });

  test('detects no changes for unchanged project (json format)', () => {
    tmp = copyFixture(NODE);
    runInit({ rootPath: tmp, format: 'json', quiet: true });
    const result = runUpdate({ rootPath: tmp, format: 'json', quiet: true });
    expect(result.hasChanges).toBe(false);
  });

  test('detects changes after file modification (json format)', () => {
    tmp = copyFixture(NODE);
    runInit({ rootPath: tmp, format: 'json', quiet: true });
    writeFileSync(join(tmp, 'new-module.ts'), 'export const hello = "world";');
    const result = runUpdate({ rootPath: tmp, format: 'json', quiet: true });
    expect(result.hasChanges).toBe(true);
    expect(result.written).toBe(true);
  });

  test('respects dryRun', () => {
    tmp = copyFixture(NODE);
    const result = runUpdate({ rootPath: tmp, dryRun: true, quiet: true });
    expect(result.written).toBe(false);
    expect(existsSync(join(tmp, '.ctx.md'))).toBe(false);
  });

  test('produces valid markdown content', () => {
    tmp = copyFixture(NODE);
    const result = runUpdate({ rootPath: tmp, quiet: true });
    expect(result.content).toContain('# sample-node-app');
    expect(result.content).toContain('## Tech Stack');
    expect(result.content).toContain('## Project Structure');
  });

  test('produces valid JSON content with format=json', () => {
    tmp = copyFixture(NODE);
    const result = runUpdate({ rootPath: tmp, format: 'json', quiet: true });
    expect(() => JSON.parse(result.content)).not.toThrow();
    const parsed = JSON.parse(result.content);
    expect(parsed.projectName).toBe('sample-node-app');
  });

  test('throws on non-existent root', () => {
    expect(() => runUpdate({ rootPath: '/tmp/nonexistent-ctx-test-xyz', quiet: true })).toThrow(/does not exist/);
  });

  test('update after update is stable (json format)', () => {
    tmp = copyFixture(NODE);
    runInit({ rootPath: tmp, format: 'json', quiet: true });
    runUpdate({ rootPath: tmp, format: 'json', quiet: true });
    const result = runUpdate({ rootPath: tmp, format: 'json', quiet: true });
    expect(result.hasChanges).toBe(false);
    expect(result.written).toBe(true);
  });
});
