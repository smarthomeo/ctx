import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanScripts } from '../../src/scanners/scripts.js';

const FIXTURES = join(process.cwd(), 'tests', 'fixtures');
const NODE = join(FIXTURES, 'node-project');
const PYTHON = join(FIXTURES, 'python-project');
const GO = join(FIXTURES, 'go-project');

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'ctx-scripts-test-'));
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe('scanScripts - node-project', () => {
  test('extracts dev, build, test, lint from package.json', () => {
    const commands = scanScripts(NODE);
    const names = commands.map((c) => c.name);
    expect(names).toContain('dev');
    expect(names).toContain('build');
    expect(names).toContain('test');
    expect(names).toContain('lint');
  });

  test('all commands are sourced from package.json', () => {
    const commands = scanScripts(NODE);
    for (const cmd of commands) {
      expect(cmd.source).toBe('package.json');
    }
  });

  test('preserves the original command string', () => {
    const commands = scanScripts(NODE);
    const dev = commands.find((c) => c.name === 'dev');
    expect(dev).toBeDefined();
    expect(dev!.command).toBe('tsx watch src/index.ts');
  });

  test('attaches meaningful descriptions to well-known scripts', () => {
    const commands = scanScripts(NODE);
    const byName = Object.fromEntries(commands.map((c) => [c.name, c]));
    expect(byName.dev?.description).toMatch(/development/i);
    expect(byName.build?.description).toMatch(/build/i);
    expect(byName.test?.description).toMatch(/test/i);
    expect(byName.lint?.description).toMatch(/lint/i);
  });
});

describe('scanScripts - python-project', () => {
  test('extracts serve script from pyproject.toml [project.scripts]', () => {
    const commands = scanScripts(PYTHON);
    const serve = commands.find((c) => c.name === 'serve');
    expect(serve).toBeDefined();
    expect(serve!.source).toBe('pyproject.toml');
    expect(serve!.command).toBe('app.main:run');
  });
});

describe('scanScripts - go-project', () => {
  test('returns no commands when no manifest defines any', () => {
    expect(scanScripts(GO)).toEqual([]);
  });
});

describe('scanScripts - empty project', () => {
  test('returns empty list when nothing is detected', () => {
    expect(scanScripts(tmp)).toEqual([]);
  });
});

describe('scanScripts - Makefile parsing', () => {
  test('extracts targets from a Makefile', () => {
    writeFileSync(
      join(tmp, 'Makefile'),
      '# top-level comment\nbuild:\n\tgo build -o app\n\ntest:\n\tgo test ./...\n\n.PHONY: build test\n',
    );
    const commands = scanScripts(tmp);
    const names = commands.map((c) => c.name);
    expect(names).toContain('make build');
    expect(names).toContain('make test');
  });

  test('skips .PHONY targets and assignment lines', () => {
    writeFileSync(
      join(tmp, 'Makefile'),
      'CC := gcc\nbuild:\n\t$(CC) -o app main.c\n\n.PHONY: build\n',
    );
    const commands = scanScripts(tmp);
    const names = commands.map((c) => c.name);
    expect(names).toEqual(['make build']);
  });

  test('attaches source=Makefile to parsed targets', () => {
    writeFileSync(join(tmp, 'Makefile'), 'all:\n\t@true\n');
    const commands = scanScripts(tmp);
    expect(commands[0]!.source).toBe('Makefile');
  });
});

describe('scanScripts - package.json script description logic', () => {
  test('detects "build" by command containing tsup', () => {
    writeFileSync(
      join(tmp, 'package.json'),
      JSON.stringify({ scripts: { bundle: 'tsup src/index.ts' } }),
    );
    const commands = scanScripts(tmp);
    expect(commands[0]!.description).toMatch(/build/i);
  });

  test('detects "start" script', () => {
    writeFileSync(
      join(tmp, 'package.json'),
      JSON.stringify({ scripts: { start: 'node server.js' } }),
    );
    const commands = scanScripts(tmp);
    expect(commands[0]!.description).toMatch(/start/i);
  });

  test('falls back to generic description for unknown scripts', () => {
    writeFileSync(
      join(tmp, 'package.json'),
      JSON.stringify({ scripts: { mystery: 'do-something' } }),
    );
    const commands = scanScripts(tmp);
    expect(commands[0]!.description).toMatch(/mystery/);
  });
});
