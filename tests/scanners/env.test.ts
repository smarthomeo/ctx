import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanEnv, scanEnvAll, listEnvFiles } from '../../src/scanners/env.js';

const FIXTURES = join(process.cwd(), 'tests', 'fixtures');
const NODE = join(FIXTURES, 'node-project');
const PYTHON = join(FIXTURES, 'python-project');
const GO = join(FIXTURES, 'go-project');

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'ctx-env-test-'));
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe('scanEnv - .env.example parsing', () => {
  test('extracts PORT, DATABASE_URL, API_KEY from node-project', () => {
    const env = scanEnv(NODE);
    const names = env.map((e) => e.name);
    expect(names).toContain('PORT');
    expect(names).toContain('DATABASE_URL');
    expect(names).toContain('API_KEY');
  });

  test('marks placeholder values as required', () => {
    const env = scanEnv(NODE);
    const apiKey = env.find((e) => e.name === 'API_KEY');
    expect(apiKey).toBeDefined();
    expect(apiKey!.required).toBe(true);
  });

  test('marks concrete values as not required', () => {
    const env = scanEnv(NODE);
    const port = env.find((e) => e.name === 'PORT');
    expect(port).toBeDefined();
    expect(port!.required).toBe(false);
    expect(port!.defaultValue).toBe('3000');
  });

  test('extracts env vars from python-project', () => {
    const env = scanEnv(PYTHON);
    const names = env.map((e) => e.name);
    expect(names).toContain('PORT');
    expect(names).toContain('REDIS_URL');
  });

  test('returns empty array for project without .env files', () => {
    expect(scanEnv(GO)).toEqual([]);
  });

  test('strips surrounding double quotes from values', () => {
    writeFileSync(join(tmp, '.env.example'), 'TOKEN="abc123"\n');
    const env = scanEnv(tmp);
    expect(env[0]!.defaultValue).toBe('abc123');
  });

  test('strips surrounding single quotes from values', () => {
    writeFileSync(join(tmp, '.env.example'), "TOKEN='abc123'\n");
    const env = scanEnv(tmp);
    expect(env[0]!.defaultValue).toBe('abc123');
  });

  test('extracts inline comments after a #', () => {
    writeFileSync(join(tmp, '.env.example'), 'SECRET=changeme # the api secret\n');
    const env = scanEnv(tmp);
    expect(env[0]!.comment).toBe('the api secret');
    expect(env[0]!.defaultValue).toBe('changeme');
  });

  test('skips blank lines and full-line comments', () => {
    writeFileSync(join(tmp, '.env.example'), '# top comment\n\nKEY=val\n# bottom comment\n');
    const env = scanEnv(tmp);
    expect(env).toHaveLength(1);
    expect(env[0]!.name).toBe('KEY');
  });

  test('ignores malformed lines without =', () => {
    writeFileSync(join(tmp, '.env.example'), 'NOEQUALS\nKEY=val\n');
    const env = scanEnv(tmp);
    expect(env).toHaveLength(1);
    expect(env[0]!.name).toBe('KEY');
  });

  test('dedupes repeated variables, keeping first occurrence', () => {
    writeFileSync(join(tmp, '.env.example'), 'KEY=first\nKEY=second\n');
    const env = scanEnv(tmp);
    expect(env).toHaveLength(1);
    expect(env[0]!.defaultValue).toBe('first');
  });

  test('falls back to .env.sample when .env.example is missing', () => {
    writeFileSync(join(tmp, '.env.sample'), 'X=1\n');
    const env = scanEnv(tmp);
    expect(env).toHaveLength(1);
    expect(env[0]!.name).toBe('X');
  });

  test('falls back to .env.template when .env.example is missing', () => {
    writeFileSync(join(tmp, '.env.template'), 'Y=2\n');
    const env = scanEnv(tmp);
    expect(env).toHaveLength(1);
    expect(env[0]!.name).toBe('Y');
  });

  test('detects <placeholder> style placeholders as required', () => {
    writeFileSync(join(tmp, '.env.example'), 'X=<your-value>\n');
    const env = scanEnv(tmp);
    expect(env[0]!.required).toBe(true);
  });
});

describe('scanEnvAll - docker integration', () => {
  test('returns env file vars for plain project', () => {
    const env = scanEnvAll(NODE);
    const names = env.map((e) => e.name);
    expect(names).toContain('PORT');
  });

  test('adds vars from Dockerfile ENV lines', () => {
    writeFileSync(
      join(tmp, 'Dockerfile'),
      'FROM node:20\nENV NODE_ENV=production\nENV PORT 3000\n',
    );
    writeFileSync(join(tmp, '.env.example'), 'API_KEY=changeme\n');
    const env = scanEnvAll(tmp);
    const names = env.map((e) => e.name);
    expect(names).toContain('NODE_ENV');
    expect(names).toContain('PORT');
    expect(names).toContain('API_KEY');
  });

  test('adds vars from docker-compose.yml references', () => {
    writeFileSync(
      join(tmp, 'docker-compose.yml'),
      'services:\n  api:\n    environment:\n      DB_HOST: ${DB_HOST}\n',
    );
    const env = scanEnvAll(tmp);
    const names = env.map((e) => e.name);
    expect(names).toContain('DB_HOST');
  });
});

describe('listEnvFiles', () => {
  test('returns [] for project with no env files', () => {
    expect(listEnvFiles(GO)).toEqual([]);
  });

  test('lists .env.example in node-project', () => {
    const files = listEnvFiles(NODE);
    expect(files).toContain('.env.example');
  });

  test('excludes the bare .env file', () => {
    writeFileSync(join(tmp, '.env'), 'SECRET=x\n');
    writeFileSync(join(tmp, '.env.example'), 'KEY=val\n');
    const files = listEnvFiles(tmp);
    expect(files).toContain('.env.example');
    expect(files).not.toContain('.env');
  });

  test('returns sorted list', () => {
    writeFileSync(join(tmp, '.env.example'), '');
    writeFileSync(join(tmp, '.env.production'), '');
    writeFileSync(join(tmp, '.env.development'), '');
    const files = listEnvFiles(tmp);
    const sorted = [...files].sort();
    expect(files).toEqual(sorted);
  });
});
