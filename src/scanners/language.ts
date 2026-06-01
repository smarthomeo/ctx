import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { TechStack } from '../types.js';

interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  engines?: Record<string, string>;
  packageManager?: string;
  scripts?: Record<string, string>;
}

interface PyProject {
  project?: {
    name?: string;
    dependencies?: string[];
  };
  tool?: Record<string, unknown>;
}

const FRAMEWORK_HINTS: Record<string, { language: string; framework: string }> = {
  express: { language: 'JavaScript/TypeScript', framework: 'Express' },
  fastify: { language: 'JavaScript/TypeScript', framework: 'Fastify' },
  koa: { language: 'JavaScript/TypeScript', framework: 'Koa' },
  next: { language: 'JavaScript/TypeScript', framework: 'Next.js' },
  nuxt: { language: 'JavaScript/TypeScript', framework: 'Nuxt' },
  react: { language: 'JavaScript/TypeScript', framework: 'React' },
  vue: { language: 'JavaScript/TypeScript', framework: 'Vue' },
  angular: { language: 'TypeScript', framework: 'Angular' },
  svelte: { language: 'JavaScript/TypeScript', framework: 'Svelte' },
  nestjs: { language: 'TypeScript', framework: 'NestJS' },
  hapi: { language: 'JavaScript/TypeScript', framework: 'Hapi' },
  fastapi: { language: 'Python', framework: 'FastAPI' },
  flask: { language: 'Python', framework: 'Flask' },
  django: { language: 'Python', framework: 'Django' },
  starlette: { language: 'Python', framework: 'Starlette' },
  tornado: { language: 'Python', framework: 'Tornado' },
  pyramid: { language: 'Python', framework: 'Pyramid' },
  gin: { language: 'Go', framework: 'Gin' },
  echo: { language: 'Go', framework: 'Echo' },
  fiber: { language: 'Go', framework: 'Fiber' },
  chi: { language: 'Go', framework: 'Chi' },
  actix: { language: 'Rust', framework: 'Actix' },
  rocket: { language: 'Rust', framework: 'Rocket' },
  axum: { language: 'Rust', framework: 'Axum' },
  spring: { language: 'Java', framework: 'Spring' },
};

const TEST_FRAMEWORK_HINTS: Record<string, string> = {
  vitest: 'Vitest',
  jest: 'Jest',
  mocha: 'Mocha',
  jasmine: 'Jasmine',
  ava: 'AVA',
  tap: 'tap',
  pytest: 'pytest',
  unittest: 'unittest',
  'ginkgo': 'Ginkgo',
  'go test': 'Go testing',
  cargo: 'Cargo test',
};

const LINTER_HINTS: Record<string, string> = {
  eslint: 'ESLint',
  tslint: 'TSLint',
  prettier: 'Prettier',
  biome: 'Biome',
  ruff: 'Ruff',
  flake8: 'flake8',
  pylint: 'Pylint',
  black: 'Black',
  mypy: 'mypy',
  golangci: 'golangci-lint',
};

function detectNode(rootPath: string): { tech: Partial<TechStack>; packageManager?: string } | null {
  const pkgPath = join(rootPath, 'package.json');
  if (!existsSync(pkgPath)) return null;
  let pkg: PackageJson;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as PackageJson;
  } catch {
    return null;
  }
  const allDeps: Record<string, string> = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
  };
  const languages: string[] = [];
  const frameworks: string[] = [];
  for (const dep of Object.keys(allDeps)) {
    const hint = FRAMEWORK_HINTS[dep];
    if (hint) {
      if (!languages.includes(hint.language)) {
        languages.push(hint.language);
      }
      if (!frameworks.includes(hint.framework)) {
        frameworks.push(hint.framework);
      }
    }
  }
  let packageManager: string | undefined;
  if (existsSync(join(rootPath, 'pnpm-lock.yaml'))) {
    packageManager = 'pnpm';
  } else if (existsSync(join(rootPath, 'yarn.lock'))) {
    packageManager = 'yarn';
  } else if (existsSync(join(rootPath, 'bun.lockb')) || existsSync(join(rootPath, 'bun.lock'))) {
    packageManager = 'bun';
  } else if (existsSync(join(rootPath, 'package-lock.json'))) {
    packageManager = 'npm';
  }

  let testFramework: string | undefined;
  let linter: string | undefined;
  for (const dep of Object.keys(allDeps)) {
    if (!testFramework && TEST_FRAMEWORK_HINTS[dep]) {
      testFramework = TEST_FRAMEWORK_HINTS[dep];
    }
    if (!linter && LINTER_HINTS[dep]) {
      linter = LINTER_HINTS[dep];
    }
  }

  const typeChecker = allDeps.typescript ? 'TypeScript' : undefined;
    if (allDeps.typescript && !languages.includes('TypeScript')) {
      languages.push('TypeScript');
    }
  const runtime = allDeps.tsx || allDeps['ts-node'] ? 'tsx/ts-node' : 'Node.js';

  return {
    languages: languages.length > 0 ? languages : ['JavaScript'],
    frameworks,
    testFramework,
    linter,
    typeChecker,
    runtime,
    packageManager,
  } as Partial<TechStack> & { packageManager?: string };
}

function detectPython(rootPath: string): Partial<TechStack> | null {
  const pyprojectPath = join(rootPath, 'pyproject.toml');
  const requirementsPath = join(rootPath, 'requirements.txt');
  const setupPath = join(rootPath, 'setup.py');
  if (!existsSync(pyprojectPath) && !existsSync(requirementsPath) && !existsSync(setupPath)) {
    return null;
  }
  const deps: string[] = [];
  if (existsSync(pyprojectPath)) {
    try {
      const content = readFileSync(pyprojectPath, 'utf-8');
      const parsed = parseToml(content) as PyProject;
      deps.push(...(parsed.project?.dependencies ?? []));
    } catch {
      // ignore parse errors
    }
  }
  if (existsSync(requirementsPath)) {
    const content = readFileSync(requirementsPath, 'utf-8');
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z0-9_.-]+)/);
      if (m) deps.push(m[1].toLowerCase());
    }
  }
  const frameworks: string[] = [];
  const normalizedDeps = deps.map((d) => d.toLowerCase());
  for (const dep of normalizedDeps) {
    const hint = FRAMEWORK_HINTS[dep];
    if (hint && !frameworks.includes(hint.framework)) {
      frameworks.push(hint.framework);
    }
  }
  let testFramework: string | undefined;
  let linter: string | undefined;
  for (const dep of normalizedDeps) {
    if (!testFramework && TEST_FRAMEWORK_HINTS[dep]) {
      testFramework = TEST_FRAMEWORK_HINTS[dep];
    }
    if (!linter && LINTER_HINTS[dep]) {
      linter = LINTER_HINTS[dep];
    }
  }
  return {
    languages: ['Python'],
    frameworks,
    testFramework,
    linter,
    runtime: 'Python',
  };
}

function detectGo(rootPath: string): Partial<TechStack> | null {
  const goModPath = join(rootPath, 'go.mod');
  if (!existsSync(goModPath)) return null;
  let content = '';
  try {
    content = readFileSync(goModPath, 'utf-8');
  } catch {
    return null;
  }
  const frameworks: string[] = [];
  const frameworksLower = content.toLowerCase();
  for (const [key, hint] of Object.entries(FRAMEWORK_HINTS)) {
    if (hint.language === 'Go' && frameworksLower.includes(key)) {
      if (!frameworks.includes(hint.framework)) {
        frameworks.push(hint.framework);
      }
    }
  }
  return {
    languages: ['Go'],
    frameworks,
    testFramework: 'Go testing',
    runtime: 'Go',
  };
}

function detectRust(rootPath: string): Partial<TechStack> | null {
  const cargoPath = join(rootPath, 'Cargo.toml');
  if (!existsSync(cargoPath)) return null;
  return {
    languages: ['Rust'],
    frameworks: [],
    testFramework: 'Cargo test',
    runtime: 'Rust',
  };
}

function detectJava(rootPath: string): Partial<TechStack> | null {
  if (
    !existsSync(join(rootPath, 'pom.xml')) &&
    !existsSync(join(rootPath, 'build.gradle')) &&
    !existsSync(join(rootPath, 'build.gradle.kts'))
  ) {
    return null;
  }
  return {
    languages: ['Java'],
    frameworks: [],
    runtime: 'JVM',
  };
}

function detectRuby(rootPath: string): Partial<TechStack> | null {
  if (!existsSync(join(rootPath, 'Gemfile'))) return null;
  return {
    languages: ['Ruby'],
    frameworks: [],
    runtime: 'Ruby',
  };
}

function parseToml(content: string): Record<string, unknown> {
  // Minimal TOML parser supporting tables, simple string/array values.
  const result: Record<string, unknown> = {};
  const current: Record<string, unknown> = result;
  const stack: Array<{ name: string; obj: Record<string, unknown> }> = [];
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('[') && line.endsWith(']')) {
      const key = line.slice(1, -1).trim();
      const parts = key.replace(/^["']|["']$/g, '').split('.');
      let obj: Record<string, unknown> = result;
      for (const part of parts) {
        if (!obj[part] || typeof obj[part] !== 'object') {
          obj[part] = {};
        }
        obj = obj[part] as Record<string, unknown>;
      }
      stack.push({ name: key, obj });
      continue;
    }
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const valueRaw = line.slice(eq + 1).trim();
    const value = parseTomlValue(valueRaw);
    let obj = result;
    for (const s of stack) {
      obj = s.obj;
    }
    obj[key] = value;
  }
  return result;
}

function parseTomlValue(value: string): unknown {
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map((v) => {
      const t = v.trim();
      if (t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1);
      if (t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1);
      const num = Number(t);
      return Number.isNaN(num) ? t : num;
    });
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  const num = Number(value);
  if (!Number.isNaN(num) && value !== '') return num;
  return value;
}

export function detectTechStack(rootPath: string): TechStack {
  const result: TechStack = {
    languages: [],
    frameworks: [],
  };
  const sources: Array<Partial<TechStack> | null> = [
    detectNode(rootPath),
    detectPython(rootPath),
    detectGo(rootPath),
    detectRust(rootPath),
    detectJava(rootPath),
    detectRuby(rootPath),
  ];
  for (const src of sources) {
    if (!src) continue;
    for (const lang of src.languages ?? []) {
      if (!result.languages.includes(lang)) {
        result.languages.push(lang);
      }
    }
    for (const fw of src.frameworks ?? []) {
      if (!result.frameworks.includes(fw)) {
        result.frameworks.push(fw);
      }
    }
    if (!result.testFramework && src.testFramework) {
      result.testFramework = src.testFramework;
    }
    if (!result.linter && src.linter) {
      result.linter = src.linter;
    }
    if (!result.runtime && src.runtime) {
      result.runtime = src.runtime;
    }
    if (!result.typeChecker && src.typeChecker) {
      result.typeChecker = src.typeChecker;
    }
  }
  const node = detectNode(rootPath);
  if (node?.packageManager) {
    result.packageManager = node.packageManager;
  }
  if (result.languages.length === 0) {
    result.languages.push('Unknown');
  }
  return result;
}

export function detectProjectName(rootPath: string): string {
  const pkgPath = join(rootPath, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as PackageJson;
      if (pkg.name) return pkg.name;
    } catch {
      // ignore
    }
  }
  const pyprojectPath = join(rootPath, 'pyproject.toml');
  if (existsSync(pyprojectPath)) {
    try {
      const parsed = parseToml(readFileSync(pyprojectPath, 'utf-8')) as PyProject;
      if (parsed.project?.name) return parsed.project.name;
    } catch {
      // ignore
    }
  }
  const goModPath = join(rootPath, 'go.mod');
  if (existsSync(goModPath)) {
    const content = readFileSync(goModPath, 'utf-8');
    const match = content.match(/^module\s+(\S+)/m);
    if (match) {
      const modulePath = match[1];
      const parts = modulePath.split('/');
      return parts[parts.length - 1] ?? modulePath;
    }
  }
  const cargoPath = join(rootPath, 'Cargo.toml');
  if (existsSync(cargoPath)) {
    try {
      const parsed = parseToml(readFileSync(cargoPath, 'utf-8')) as { package?: { name?: string } };
      if (parsed.package?.name) return parsed.package.name;
    } catch {
      // ignore
    }
  }
  return rootPath.split(/[\\/]/).pop() ?? 'project';
}
