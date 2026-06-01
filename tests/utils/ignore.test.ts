import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  addIgnorePattern,
  readCtxignore,
  loadIgnorePatterns,
  getDefaultIgnorePatterns,
  createIgnoreMatcher,
  isIgnored,
  filterPaths,
} from '../../src/utils/ignore.js';

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'ctx-ignore-test-'));
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe('getDefaultIgnorePatterns', () => {
  test('returns a non-empty list of patterns', () => {
    const patterns = getDefaultIgnorePatterns();
    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns).toContain('node_modules');
    expect(patterns).toContain('.git');
    expect(patterns).toContain('dist');
  });

  test('returns a copy, not the original array', () => {
    const a = getDefaultIgnorePatterns();
    const b = getDefaultIgnorePatterns();
    expect(a).not.toBe(b);
    a.push('mutated');
    expect(b).not.toContain('mutated');
  });
});

describe('addIgnorePattern', () => {
  test('creates a new .ctxignore file when none exists', () => {
    addIgnorePattern(tmp, 'build');
    const ctxignorePath = join(tmp, '.ctxignore');
    expect(existsSync(ctxignorePath)).toBe(true);
    const content = readFileSync(ctxignorePath, 'utf-8');
    expect(content.trim()).toBe('build');
  });

  test('trims whitespace from the pattern', () => {
    addIgnorePattern(tmp, '  tmp  ');
    const content = readFileSync(join(tmp, '.ctxignore'), 'utf-8');
    expect(content.trim()).toBe('tmp');
  });

  test('appends to an existing .ctxignore file', () => {
    const ctxignorePath = join(tmp, '.ctxignore');
    writeFileSync(ctxignorePath, 'foo\n');
    addIgnorePattern(tmp, 'bar');
    const content = readFileSync(ctxignorePath, 'utf-8');
    expect(content).toContain('foo');
    expect(content).toContain('bar');
  });

  test('does not add duplicate patterns', () => {
    const ctxignorePath = join(tmp, '.ctxignore');
    addIgnorePattern(tmp, 'foo');
    addIgnorePattern(tmp, 'foo');
    const content = readFileSync(ctxignorePath, 'utf-8');
    const matches = content.match(/^foo$/gm) ?? [];
    expect(matches.length).toBe(1);
  });

  test('throws on empty pattern', () => {
    expect(() => addIgnorePattern(tmp, '')).toThrow(/empty/);
    expect(() => addIgnorePattern(tmp, '   ')).toThrow(/empty/);
  });

  test('handles file without trailing newline', () => {
    const ctxignorePath = join(tmp, '.ctxignore');
    writeFileSync(ctxignorePath, 'foo');
    addIgnorePattern(tmp, 'bar');
    const content = readFileSync(ctxignorePath, 'utf-8');
    expect(content).toContain('foo');
    expect(content).toContain('bar');
  });
});

describe('readCtxignore', () => {
  test('returns empty string when no .ctxignore file', () => {
    expect(readCtxignore(tmp)).toBe('');
  });

  test('returns content of .ctxignore file', () => {
    writeFileSync(join(tmp, '.ctxignore'), 'foo\nbar\n');
    expect(readCtxignore(tmp)).toBe('foo\nbar\n');
  });
});

describe('loadIgnorePatterns', () => {
  test('returns default patterns when no .ctxignore file', () => {
    const patterns = loadIgnorePatterns(tmp);
    expect(patterns).toContain('node_modules');
    expect(patterns).toContain('dist');
    expect(patterns.length).toBe(getDefaultIgnorePatterns().length);
  });

  test('includes custom patterns from .ctxignore', () => {
    writeFileSync(join(tmp, '.ctxignore'), 'custom-pattern\n# a comment\n\nanother-pattern\n');
    const patterns = loadIgnorePatterns(tmp);
    expect(patterns).toContain('custom-pattern');
    expect(patterns).toContain('another-pattern');
  });

  test('skips comments and blank lines in .ctxignore', () => {
    writeFileSync(join(tmp, '.ctxignore'), '# this is a comment\n\n  \nvalid-pattern\n');
    const patterns = loadIgnorePatterns(tmp);
    expect(patterns).toContain('valid-pattern');
    expect(patterns).not.toContain('# this is a comment');
    expect(patterns).not.toContain('');
  });

  test('appends extra patterns argument', () => {
    const patterns = loadIgnorePatterns(tmp, ['extra1', 'extra2']);
    expect(patterns).toContain('extra1');
    expect(patterns).toContain('extra2');
  });
});

describe('createIgnoreMatcher and isIgnored', () => {
  test('matches file names listed in default patterns', () => {
    const matcher = createIgnoreMatcher(['node_modules']);
    expect(isIgnored(matcher, 'node_modules/foo.js')).toBe(true);
  });

  test('does not match non-ignored paths', () => {
    const matcher = createIgnoreMatcher(['node_modules']);
    expect(isIgnored(matcher, 'src/index.ts')).toBe(false);
  });

  test('returns false for empty/dot paths', () => {
    const matcher = createIgnoreMatcher(['node_modules']);
    expect(isIgnored(matcher, '')).toBe(false);
    expect(isIgnored(matcher, '.')).toBe(false);
  });

  test('supports glob patterns', () => {
    const matcher = createIgnoreMatcher(['*.log']);
    expect(isIgnored(matcher, 'debug.log')).toBe(true);
    expect(isIgnored(matcher, 'src/app.ts')).toBe(false);
  });

  test('supports negation patterns', () => {
    const matcher = createIgnoreMatcher(['*.log', '!keep.log']);
    expect(isIgnored(matcher, 'debug.log')).toBe(true);
    expect(isIgnored(matcher, 'keep.log')).toBe(false);
  });
});

describe('filterPaths', () => {
  test('removes ignored paths from a list', () => {
    const matcher = createIgnoreMatcher(['node_modules']);
    const paths = ['src/index.ts', 'node_modules/lib.js', 'README.md'];
    const filtered = filterPaths(matcher, paths);
    expect(filtered).toEqual(['src/index.ts', 'README.md']);
  });

  test('returns empty list when all paths ignored', () => {
    const matcher = createIgnoreMatcher(['*']);
    expect(filterPaths(matcher, ['a', 'b'])).toEqual([]);
  });

  test('returns unchanged list when no patterns', () => {
    const matcher = createIgnoreMatcher([]);
    const paths = ['a', 'b', 'c'];
    expect(filterPaths(matcher, paths)).toEqual(paths);
  });
});
