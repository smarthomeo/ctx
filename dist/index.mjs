#!/usr/bin/env node

// src/index.ts
import { Command } from "commander";
import chalk from "chalk";

// src/commands/init.ts
import { existsSync as existsSync8, writeFileSync as writeFileSync2, mkdirSync } from "fs";
import { dirname, isAbsolute, resolve } from "path";

// src/scanners/index.ts
import { existsSync as existsSync7, readFileSync as readFileSync6 } from "fs";
import { join as join7 } from "path";

// src/scanners/language.ts
import { existsSync, readFileSync } from "fs";
import { join } from "path";
var FRAMEWORK_HINTS = {
  express: { language: "JavaScript/TypeScript", framework: "Express" },
  fastify: { language: "JavaScript/TypeScript", framework: "Fastify" },
  koa: { language: "JavaScript/TypeScript", framework: "Koa" },
  next: { language: "JavaScript/TypeScript", framework: "Next.js" },
  nuxt: { language: "JavaScript/TypeScript", framework: "Nuxt" },
  react: { language: "JavaScript/TypeScript", framework: "React" },
  vue: { language: "JavaScript/TypeScript", framework: "Vue" },
  angular: { language: "TypeScript", framework: "Angular" },
  svelte: { language: "JavaScript/TypeScript", framework: "Svelte" },
  nestjs: { language: "TypeScript", framework: "NestJS" },
  hapi: { language: "JavaScript/TypeScript", framework: "Hapi" },
  fastapi: { language: "Python", framework: "FastAPI" },
  flask: { language: "Python", framework: "Flask" },
  django: { language: "Python", framework: "Django" },
  starlette: { language: "Python", framework: "Starlette" },
  tornado: { language: "Python", framework: "Tornado" },
  pyramid: { language: "Python", framework: "Pyramid" },
  gin: { language: "Go", framework: "Gin" },
  echo: { language: "Go", framework: "Echo" },
  fiber: { language: "Go", framework: "Fiber" },
  chi: { language: "Go", framework: "Chi" },
  actix: { language: "Rust", framework: "Actix" },
  rocket: { language: "Rust", framework: "Rocket" },
  axum: { language: "Rust", framework: "Axum" },
  spring: { language: "Java", framework: "Spring" }
};
var TEST_FRAMEWORK_HINTS = {
  vitest: "Vitest",
  jest: "Jest",
  mocha: "Mocha",
  jasmine: "Jasmine",
  ava: "AVA",
  tap: "tap",
  pytest: "pytest",
  unittest: "unittest",
  "ginkgo": "Ginkgo",
  "go test": "Go testing",
  cargo: "Cargo test"
};
var LINTER_HINTS = {
  eslint: "ESLint",
  tslint: "TSLint",
  prettier: "Prettier",
  biome: "Biome",
  ruff: "Ruff",
  flake8: "flake8",
  pylint: "Pylint",
  black: "Black",
  mypy: "mypy",
  golangci: "golangci-lint"
};
function detectNode(rootPath) {
  const pkgPath = join(rootPath, "package.json");
  if (!existsSync(pkgPath)) return null;
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  } catch {
    return null;
  }
  const allDeps = {
    ...pkg.dependencies ?? {},
    ...pkg.devDependencies ?? {}
  };
  const languages = [];
  const frameworks = [];
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
  let packageManager;
  if (existsSync(join(rootPath, "pnpm-lock.yaml"))) {
    packageManager = "pnpm";
  } else if (existsSync(join(rootPath, "yarn.lock"))) {
    packageManager = "yarn";
  } else if (existsSync(join(rootPath, "bun.lockb")) || existsSync(join(rootPath, "bun.lock"))) {
    packageManager = "bun";
  } else if (existsSync(join(rootPath, "package-lock.json"))) {
    packageManager = "npm";
  }
  let testFramework;
  let linter;
  for (const dep of Object.keys(allDeps)) {
    if (!testFramework && TEST_FRAMEWORK_HINTS[dep]) {
      testFramework = TEST_FRAMEWORK_HINTS[dep];
    }
    if (!linter && LINTER_HINTS[dep]) {
      linter = LINTER_HINTS[dep];
    }
  }
  const typeChecker = allDeps.typescript ? "TypeScript" : void 0;
  if (allDeps.typescript && !languages.includes("TypeScript")) {
    languages.push("TypeScript");
  }
  const runtime = allDeps.tsx || allDeps["ts-node"] ? "tsx/ts-node" : "Node.js";
  return {
    languages: languages.length > 0 ? languages : ["JavaScript"],
    frameworks,
    testFramework,
    linter,
    typeChecker,
    runtime,
    packageManager
  };
}
function detectPython(rootPath) {
  const pyprojectPath = join(rootPath, "pyproject.toml");
  const requirementsPath = join(rootPath, "requirements.txt");
  const setupPath = join(rootPath, "setup.py");
  if (!existsSync(pyprojectPath) && !existsSync(requirementsPath) && !existsSync(setupPath)) {
    return null;
  }
  const deps = [];
  if (existsSync(pyprojectPath)) {
    try {
      const content = readFileSync(pyprojectPath, "utf-8");
      const parsed = parseToml(content);
      deps.push(...parsed.project?.dependencies ?? []);
    } catch {
    }
  }
  if (existsSync(requirementsPath)) {
    const content = readFileSync(requirementsPath, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z0-9_.-]+)/);
      if (m) deps.push(m[1].toLowerCase());
    }
  }
  const frameworks = [];
  const normalizedDeps = deps.map((d) => d.toLowerCase());
  for (const dep of normalizedDeps) {
    const hint = FRAMEWORK_HINTS[dep];
    if (hint && !frameworks.includes(hint.framework)) {
      frameworks.push(hint.framework);
    }
  }
  let testFramework;
  let linter;
  for (const dep of normalizedDeps) {
    if (!testFramework && TEST_FRAMEWORK_HINTS[dep]) {
      testFramework = TEST_FRAMEWORK_HINTS[dep];
    }
    if (!linter && LINTER_HINTS[dep]) {
      linter = LINTER_HINTS[dep];
    }
  }
  return {
    languages: ["Python"],
    frameworks,
    testFramework,
    linter,
    runtime: "Python"
  };
}
function detectGo(rootPath) {
  const goModPath = join(rootPath, "go.mod");
  if (!existsSync(goModPath)) return null;
  let content = "";
  try {
    content = readFileSync(goModPath, "utf-8");
  } catch {
    return null;
  }
  const frameworks = [];
  const frameworksLower = content.toLowerCase();
  for (const [key, hint] of Object.entries(FRAMEWORK_HINTS)) {
    if (hint.language === "Go" && frameworksLower.includes(key)) {
      if (!frameworks.includes(hint.framework)) {
        frameworks.push(hint.framework);
      }
    }
  }
  return {
    languages: ["Go"],
    frameworks,
    testFramework: "Go testing",
    runtime: "Go"
  };
}
function detectRust(rootPath) {
  const cargoPath = join(rootPath, "Cargo.toml");
  if (!existsSync(cargoPath)) return null;
  return {
    languages: ["Rust"],
    frameworks: [],
    testFramework: "Cargo test",
    runtime: "Rust"
  };
}
function detectJava(rootPath) {
  if (!existsSync(join(rootPath, "pom.xml")) && !existsSync(join(rootPath, "build.gradle")) && !existsSync(join(rootPath, "build.gradle.kts"))) {
    return null;
  }
  return {
    languages: ["Java"],
    frameworks: [],
    runtime: "JVM"
  };
}
function detectRuby(rootPath) {
  if (!existsSync(join(rootPath, "Gemfile"))) return null;
  return {
    languages: ["Ruby"],
    frameworks: [],
    runtime: "Ruby"
  };
}
function parseToml(content) {
  const result = {};
  const current = result;
  const stack = [];
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("[") && line.endsWith("]")) {
      const key2 = line.slice(1, -1).trim();
      const parts = key2.replace(/^["']|["']$/g, "").split(".");
      let obj2 = result;
      for (const part of parts) {
        if (!obj2[part] || typeof obj2[part] !== "object") {
          obj2[part] = {};
        }
        obj2 = obj2[part];
      }
      stack.push({ name: key2, obj: obj2 });
      continue;
    }
    const eq = line.indexOf("=");
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
function parseTomlValue(value) {
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((v) => {
      const t = v.trim();
      if (t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1);
      if (t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1);
      const num2 = Number(t);
      return Number.isNaN(num2) ? t : num2;
    });
  }
  if (value === "true") return true;
  if (value === "false") return false;
  const num = Number(value);
  if (!Number.isNaN(num) && value !== "") return num;
  return value;
}
function detectTechStack(rootPath) {
  const result = {
    languages: [],
    frameworks: []
  };
  const sources = [
    detectNode(rootPath),
    detectPython(rootPath),
    detectGo(rootPath),
    detectRust(rootPath),
    detectJava(rootPath),
    detectRuby(rootPath)
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
    result.languages.push("Unknown");
  }
  return result;
}
function detectProjectName(rootPath) {
  const pkgPath = join(rootPath, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      if (pkg.name) return pkg.name;
    } catch {
    }
  }
  const pyprojectPath = join(rootPath, "pyproject.toml");
  if (existsSync(pyprojectPath)) {
    try {
      const parsed = parseToml(readFileSync(pyprojectPath, "utf-8"));
      if (parsed.project?.name) return parsed.project.name;
    } catch {
    }
  }
  const goModPath = join(rootPath, "go.mod");
  if (existsSync(goModPath)) {
    const content = readFileSync(goModPath, "utf-8");
    const match = content.match(/^module\s+(\S+)/m);
    if (match) {
      const modulePath = match[1];
      const parts = modulePath.split("/");
      return parts[parts.length - 1] ?? modulePath;
    }
  }
  const cargoPath = join(rootPath, "Cargo.toml");
  if (existsSync(cargoPath)) {
    try {
      const parsed = parseToml(readFileSync(cargoPath, "utf-8"));
      if (parsed.package?.name) return parsed.package.name;
    } catch {
    }
  }
  return rootPath.split(/[\\/]/).pop() ?? "project";
}

// src/scanners/structure.ts
import { existsSync as existsSync3, readdirSync, statSync } from "fs";
import { join as join3, relative, sep } from "path";

// src/utils/ignore.ts
import { existsSync as existsSync2, readFileSync as readFileSync2, writeFileSync, appendFileSync } from "fs";
import { join as join2 } from "path";
import ignore from "ignore";
var DEFAULT_IGNORE_PATTERNS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".next",
  ".nuxt",
  ".cache",
  ".turbo",
  ".vercel",
  ".DS_Store",
  "*.log",
  ".ctx.md",
  ".ctx.json",
  ".ctxignore",
  "__pycache__",
  "*.pyc",
  ".pytest_cache",
  "venv",
  ".venv",
  "env",
  "target",
  "vendor",
  ".idea",
  ".vscode",
  "*.min.js",
  "*.bundle.js"
];
function loadIgnorePatterns(rootPath, extra = []) {
  const patterns = [...DEFAULT_IGNORE_PATTERNS, ...extra];
  const ctxignorePath = join2(rootPath, ".ctxignore");
  if (existsSync2(ctxignorePath)) {
    const content = readFileSync2(ctxignorePath, "utf-8");
    const custom = content.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0 && !line.startsWith("#"));
    patterns.push(...custom);
  }
  return patterns;
}
function createIgnoreMatcher(patterns) {
  const ig = ignore();
  for (const pattern of patterns) {
    ig.add(pattern);
  }
  return ig;
}
function isIgnored(matcher, relativePath) {
  if (!relativePath || relativePath === "." || relativePath === "") {
    return false;
  }
  return matcher.ignores(relativePath);
}
function readCtxignore(rootPath) {
  const ctxignorePath = join2(rootPath, ".ctxignore");
  if (!existsSync2(ctxignorePath)) {
    return "";
  }
  return readFileSync2(ctxignorePath, "utf-8");
}
function addIgnorePattern(rootPath, pattern) {
  if (!pattern || pattern.trim().length === 0) {
    throw new Error("Ignore pattern cannot be empty");
  }
  const ctxignorePath = join2(rootPath, ".ctxignore");
  const trimmed = pattern.trim();
  if (existsSync2(ctxignorePath)) {
    const existing = readFileSync2(ctxignorePath, "utf-8");
    const lines = existing.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0 && !line.startsWith("#"));
    if (lines.includes(trimmed)) {
      return;
    }
    const separator = existing.endsWith("\n") || existing.length === 0 ? "" : "\n";
    appendFileSync(ctxignorePath, `${separator}${trimmed}
`);
  } else {
    writeFileSync(ctxignorePath, `${trimmed}
`);
  }
}

// src/scanners/structure.ts
var KEY_FILE_NAMES = /* @__PURE__ */ new Set([
  "README.md",
  "README",
  "readme.md",
  "package.json",
  "pyproject.toml",
  "Cargo.toml",
  "go.mod",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "Gemfile",
  "composer.json",
  "index.ts",
  "index.js",
  "main.ts",
  "main.js",
  "main.py",
  "main.go",
  "main.rs",
  "app.ts",
  "app.py",
  "server.ts",
  "server.js",
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  ".env.example",
  "tsconfig.json",
  "vite.config.ts",
  "vite.config.js",
  "next.config.js",
  "next.config.ts",
  "nuxt.config.ts",
  "tsup.config.ts",
  "vitest.config.ts",
  "jest.config.js",
  "jest.config.ts",
  "Makefile",
  "LICENSE"
]);
var ENTRY_PATTERNS = [
  /(^|\/)index\.(ts|js|tsx|jsx)$/,
  /(^|\/)main\.(ts|js|tsx|jsx|py|go|rs)$/,
  /(^|\/)server\.(ts|js)$/,
  /(^|\/)app\.(ts|js|py)$/,
  /(^|\/)cli\.(ts|js)$/
];
function scanStructure(options) {
  const { rootPath, depth, extraIgnore = [] } = options;
  const matcher = createIgnoreMatcher(extraIgnore);
  const files = [];
  const directories = [];
  const keyFiles = [];
  const entryPoints = [];
  function walk(current, currentDepth) {
    if (currentDepth > depth) return;
    let entries;
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join3(current, entry);
      const rel = relative(rootPath, full).split(sep).join("/");
      if (isIgnored(matcher, rel)) continue;
      let stat;
      try {
        stat = statSync(full);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        directories.push(rel);
        if (currentDepth < depth - 1) {
          walk(full, currentDepth + 1);
        }
      } else if (stat.isFile()) {
        files.push(rel);
        const baseName = entry;
        if (KEY_FILE_NAMES.has(baseName)) {
          keyFiles.push(rel);
        }
        for (const pattern of ENTRY_PATTERNS) {
          if (pattern.test(rel)) {
            entryPoints.push(rel);
            break;
          }
        }
      }
    }
  }
  if (existsSync3(rootPath)) {
    walk(rootPath, 0);
  }
  files.sort();
  directories.sort();
  keyFiles.sort();
  entryPoints.sort();
  const tree = renderTree(rootPath, depth, matcher);
  return {
    tree,
    files,
    directories,
    keyFiles,
    entryPoints,
    totalFiles: files.length,
    totalDirs: directories.length
  };
}
function renderTree(rootPath, depth, matcher) {
  const lines = [`.`];
  const rootName = rootPath.split(/[\\/]/).pop() || ".";
  function walk(current, prefix, currentDepth) {
    if (currentDepth > depth) return;
    let entries;
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }
    const filtered = [];
    for (const entry of entries) {
      const full = join3(current, entry);
      const rel = relative(rootPath, full).split(sep).join("/");
      if (isIgnored(matcher, rel)) continue;
      let stat;
      try {
        stat = statSync(full);
      } catch {
        continue;
      }
      filtered.push({ name: entry, full, isDir: stat.isDirectory() });
    }
    filtered.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (let i = 0; i < filtered.length; i++) {
      const { name, full, isDir } = filtered[i];
      const isLast = i === filtered.length - 1;
      const connector = isLast ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 ";
      const extension = isLast ? "    " : "\u2502   ";
      lines.push(`${prefix}${connector}${name}${isDir ? "/" : ""}`);
      if (isDir) {
        walk(full, prefix + extension, currentDepth + 1);
      }
    }
  }
  lines.length = 0;
  lines.push(rootName);
  walk(rootPath, "", 0);
  return lines.join("\n");
}

// src/scanners/env.ts
import { existsSync as existsSync4, readFileSync as readFileSync3, readdirSync as readdirSync2, statSync as statSync2 } from "fs";
import { join as join4 } from "path";
var PLACEHOLDER_VALUES = /* @__PURE__ */ new Set([
  "",
  "your-api-key-here",
  "changeme",
  "todo",
  "placeholder",
  "example",
  "your-key-here",
  "replace-me",
  "xxxxx",
  "xxxx",
  "your-value"
]);
function isPlaceholder(value) {
  if (PLACEHOLDER_VALUES.has(value.toLowerCase())) return true;
  if (/^(your|my|replace|change|insert|set)[-_]?/i.test(value)) return true;
  if (/^[<{\[]/.test(value) && /[>}\]]$/.test(value)) return true;
  if (/^\$\{?\w+\}?$/.test(value)) return true;
  return false;
}
function parseEnvLine(line) {
  const hashIdx = line.indexOf("#");
  if (hashIdx === -1) return null;
  return { comment: line.slice(hashIdx + 1).trim() };
}
function parseEnvContent(content) {
  const vars = [];
  const seen = /* @__PURE__ */ new Set();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const name = line.slice(0, eq).trim();
    if (!name || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) continue;
    let value = line.slice(eq + 1).trim();
    const inlineComment = parseEnvLine(line.slice(eq + 1));
    let comment;
    if (inlineComment && value.includes("#")) {
      const hashInValue = value.indexOf("#");
      value = value.slice(0, hashInValue).trim();
      comment = inlineComment.comment;
    }
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
      value = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
      value = value.slice(1, -1);
    }
    if (seen.has(name)) continue;
    seen.add(name);
    vars.push({
      name,
      defaultValue: value || void 0,
      comment,
      required: isPlaceholder(value)
    });
  }
  return vars;
}
function scanEnv(rootPath) {
  const candidates = [".env.example", ".env.sample", ".env.template"];
  for (const name of candidates) {
    const p = join4(rootPath, name);
    if (existsSync4(p)) {
      try {
        return parseEnvContent(readFileSync3(p, "utf-8"));
      } catch {
        return [];
      }
    }
  }
  return [];
}
function scanEnvAll(rootPath) {
  const vars = scanEnv(rootPath);
  const fromDocker = [];
  const dockerfile = join4(rootPath, "Dockerfile");
  if (existsSync4(dockerfile)) {
    try {
      const content = readFileSync3(dockerfile, "utf-8");
      for (const m of content.matchAll(/^ENV\s+([A-Z_][A-Z0-9_]*)/gm)) {
        fromDocker.push(m[1]);
      }
    } catch {
    }
  }
  const composeFiles = ["docker-compose.yml", "docker-compose.yaml"];
  for (const cf of composeFiles) {
    const p = join4(rootPath, cf);
    if (existsSync4(p)) {
      try {
        const content = readFileSync3(p, "utf-8");
        for (const m of content.matchAll(/\$\{?([A-Z_][A-Z0-9_]*)\}?/g)) {
          fromDocker.push(m[1]);
        }
      } catch {
      }
    }
  }
  const existing = new Set(vars.map((v) => v.name));
  for (const name of fromDocker) {
    if (!existing.has(name)) {
      vars.push({ name, required: true });
    }
  }
  return vars;
}

// src/scanners/scripts.ts
import { existsSync as existsSync5, readFileSync as readFileSync4 } from "fs";
import { join as join5 } from "path";
function parseToml2(content) {
  const result = {};
  const stack = [{ obj: result }];
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("[") && line.endsWith("]")) {
      const key2 = line.slice(1, -1).trim().replace(/^["']|["']$/g, "");
      let obj = result;
      const parts = key2.split(".");
      for (const part of parts) {
        if (!obj[part] || typeof obj[part] !== "object") {
          obj[part] = {};
        }
        obj = obj[part];
      }
      stack.push({ obj });
      continue;
    }
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const valueRaw = line.slice(eq + 1).trim();
    const value = parseTomlValue2(valueRaw);
    const current = stack[stack.length - 1];
    current.obj[key] = value;
  }
  return result;
}
function parseTomlValue2(value) {
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((v) => {
      const t = v.trim();
      if (t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1);
      if (t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1);
      const num2 = Number(t);
      return Number.isNaN(num2) ? t : num2;
    });
  }
  if (value === "true") return true;
  if (value === "false") return false;
  const num = Number(value);
  if (!Number.isNaN(num) && value !== "") return num;
  return value;
}
function describeScript(name, command) {
  const lc = name.toLowerCase();
  const cmdLower = command.toLowerCase();
  if (lc === "dev" || cmdLower.includes("watch") || cmdLower.includes("serve")) {
    return "Start development server";
  }
  if (lc === "build" || cmdLower.includes("build") || cmdLower.includes("tsc") || cmdLower.includes("tsup")) {
    return "Build the project";
  }
  if (lc === "test" || cmdLower.includes("test")) {
    return "Run tests";
  }
  if (lc === "lint" || cmdLower.includes("lint") || cmdLower.includes("eslint")) {
    return "Run linter";
  }
  if (lc === "format" || cmdLower.includes("prettier") || cmdLower.includes("format")) {
    return "Format code";
  }
  if (lc === "start") {
    return "Start the application";
  }
  if (lc === "typecheck" || cmdLower.includes("tsc --noemit")) {
    return "Run type checks";
  }
  if (lc === "clean") {
    return "Clean build artifacts";
  }
  return `Run \`${name}\` script`;
}
function parseMakefile(content) {
  const commands = [];
  const targetRegex = /^([A-Za-z0-9_.-]+)\s*:([^=]*)$/;
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.replace(/^\t+/, "    ").trimEnd();
    if (line.startsWith("	")) continue;
    if (line.startsWith("#")) continue;
    if (line.includes(":=")) continue;
    const m = line.match(targetRegex);
    if (!m) continue;
    const name = m[1];
    if (name.startsWith(".")) continue;
    commands.push({
      name: `make ${name}`,
      description: `Run \`make ${name}\` target`,
      source: "Makefile",
      command: `make ${name}`
    });
  }
  return commands;
}
function scanScripts(rootPath) {
  const commands = [];
  const pkgPath = join5(rootPath, "package.json");
  if (existsSync5(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync4(pkgPath, "utf-8"));
      if (pkg.scripts) {
        for (const [name, command] of Object.entries(pkg.scripts)) {
          commands.push({
            name,
            description: describeScript(name, command),
            source: "package.json",
            command
          });
        }
      }
    } catch {
    }
  }
  const pyprojectPath = join5(rootPath, "pyproject.toml");
  if (existsSync5(pyprojectPath)) {
    try {
      const content = readFileSync4(pyprojectPath, "utf-8");
      const parsed = parseToml2(content);
      const scripts = parsed["tool.poetry.scripts"] ?? parsed.project?.scripts;
      if (scripts) {
        for (const [name, command] of Object.entries(scripts)) {
          commands.push({
            name,
            description: `Run \`${name}\` script`,
            source: "pyproject.toml",
            command
          });
        }
      }
    } catch {
    }
  }
  const makefilePath = join5(rootPath, "Makefile");
  if (existsSync5(makefilePath)) {
    try {
      const content = readFileSync4(makefilePath, "utf-8");
      commands.push(...parseMakefile(content));
    } catch {
    }
  }
  return commands;
}

// src/scanners/patterns.ts
import { existsSync as existsSync6, readFileSync as readFileSync5, readdirSync as readdirSync3, statSync as statSync3 } from "fs";
import { extname, join as join6, relative as relative2, sep as sep2 } from "path";
var CODE_EXTENSIONS = /* @__PURE__ */ new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".rb"
]);
var TAB_INDENT_EXTENSIONS = /* @__PURE__ */ new Set([".go"]);
var TWO_SPACE_EXTENSIONS = /* @__PURE__ */ new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
function readSourceFiles(rootPath, depth, matcher, maxFiles) {
  const out = [];
  function walk(current, d) {
    if (d > depth) return;
    let entries;
    try {
      entries = readdirSync3(current);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (out.length >= maxFiles) return;
      const full = join6(current, entry);
      const rel = relative2(rootPath, full).split(sep2).join("/");
      if (isIgnored(matcher, rel)) continue;
      let stat;
      try {
        stat = statSync3(full);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        walk(full, d + 1);
      } else if (stat.isFile()) {
        const ext = extname(entry);
        if (!CODE_EXTENSIONS.has(ext)) continue;
        if (stat.size > 256 * 1024) continue;
        try {
          const content = readFileSync5(full, "utf-8");
          out.push({ path: rel, content });
        } catch {
        }
      }
    }
  }
  if (existsSync6(rootPath)) {
    walk(rootPath, 0);
  }
  return out;
}
function detectIndent(files) {
  const stats = { tabs: 0, twoSpaces: 0, fourSpaces: 0, samples: 0 };
  for (const file of files) {
    const ext = extname(file.path);
    const lines = file.content.split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^( {2,8}|\t+)/);
      if (!m) continue;
      stats.samples++;
      if (m[0].startsWith("	")) {
        stats.tabs++;
      } else {
        const len = m[0].length;
        if (len <= 2) stats.twoSpaces++;
        else stats.fourSpaces++;
      }
      if (stats.samples > 500) break;
    }
    if (ext && TAB_INDENT_EXTENSIONS.has(ext)) {
      stats.tabs++;
    }
    if (ext && TWO_SPACE_EXTENSIONS.has(ext)) {
      stats.twoSpaces++;
    }
  }
  return stats;
}
function detectNaming(files) {
  const stats = { camelCase: 0, snake_case: 0, PascalCase: 0, kebabCase: 0, samples: 0 };
  const identifierRegex = /(?:function|class|const|let|var|export\s+(?:const|let|var|function|class))\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
  for (const file of files) {
    const ext = extname(file.path);
    if (ext !== ".ts" && ext !== ".tsx" && ext !== ".js" && ext !== ".jsx") continue;
    let match;
    while ((match = identifierRegex.exec(file.content)) !== null) {
      const name = match[1];
      stats.samples++;
      if (/^[A-Z][A-Za-z0-9]*$/.test(name)) stats.PascalCase++;
      else if (/^[a-z][A-Za-z0-9]*$/.test(name)) stats.camelCase++;
      else if (/^[a-z][a-z0-9_]*$/.test(name)) stats.snake_case++;
      else if (/^[a-z][a-z0-9-]*$/.test(name)) stats.kebabCase++;
    }
    for (const m of file.content.matchAll(/\bdef\s+([a-zA-Z_][a-zA-Z0-9_]*)/g)) {
      const name = m[1];
      stats.samples++;
      if (/^[a-z][a-z0-9_]*$/.test(name)) stats.snake_case++;
      else if (/^[A-Z][A-Za-z0-9]*$/.test(name)) stats.PascalCase++;
    }
    for (const m of file.content.matchAll(/\bfunc\s+([a-zA-Z_][a-zA-Z0-9_]*)/g)) {
      const name = m[1];
      stats.samples++;
      if (/^[A-Z][A-Za-z0-9]*$/.test(name)) stats.PascalCase++;
      else if (/^[a-z][A-Za-z0-9]*$/.test(name)) stats.camelCase++;
    }
  }
  return stats;
}
function detectQuotes(files) {
  let single = 0;
  let double = 0;
  for (const file of files) {
    const matches = file.content.match(/(['"])[^'"]*\1/g);
    if (!matches) continue;
    for (const m of matches) {
      if (m.startsWith("'")) single++;
      else double++;
    }
    if (single + double > 500) break;
  }
  return { single, double };
}
function hasEslintConfig(rootPath) {
  return existsSync6(join6(rootPath, ".eslintrc")) || existsSync6(join6(rootPath, ".eslintrc.json")) || existsSync6(join6(rootPath, ".eslintrc.js")) || existsSync6(join6(rootPath, ".eslintrc.cjs")) || existsSync6(join6(rootPath, ".eslintrc.yaml")) || existsSync6(join6(rootPath, ".eslintrc.yml")) || existsSync6(join6(rootPath, "eslint.config.js")) || existsSync6(join6(rootPath, "eslint.config.mjs")) || existsSync6(join6(rootPath, "eslint.config.cjs")) || existsSync6(join6(rootPath, "eslint.config.ts"));
}
function hasPrettierConfig(rootPath) {
  return existsSync6(join6(rootPath, ".prettierrc")) || existsSync6(join6(rootPath, ".prettierrc.json")) || existsSync6(join6(rootPath, ".prettierrc.js")) || existsSync6(join6(rootPath, "prettier.config.js")) || existsSync6(join6(rootPath, "prettier.config.cjs")) || existsSync6(join6(rootPath, "prettier.config.mjs"));
}
function detectTypeScriptStrict(rootPath) {
  const tsconfigPath = join6(rootPath, "tsconfig.json");
  if (!existsSync6(tsconfigPath)) return false;
  try {
    const content = readFileSync5(tsconfigPath, "utf-8");
    return /"strict"\s*:\s*true/.test(content);
  } catch {
    return false;
  }
}
function scanPatterns(options) {
  const { rootPath, depth = 4, maxFiles = 50, extraIgnore = [] } = options;
  const matcher = createIgnoreMatcher(extraIgnore);
  const files = readSourceFiles(rootPath, depth, matcher, maxFiles);
  const conventions = [];
  if (files.length === 0) {
    return conventions;
  }
  const indent = detectIndent(files);
  if (indent.samples > 0) {
    if (indent.tabs > indent.twoSpaces && indent.tabs > indent.fourSpaces) {
      conventions.push({
        name: "Tab indentation",
        description: "Source files use tab characters for indentation.",
        evidence: `${indent.tabs} tab-indented lines sampled`
      });
    } else if (indent.fourSpaces > indent.twoSpaces) {
      conventions.push({
        name: "4-space indentation",
        description: "Source files use 4 spaces for indentation.",
        evidence: `${indent.fourSpaces} 4-space-indented lines sampled`
      });
    } else if (indent.twoSpaces > 0) {
      conventions.push({
        name: "2-space indentation",
        description: "Source files use 2 spaces for indentation.",
        evidence: `${indent.twoSpaces} 2-space-indented lines sampled`
      });
    }
  }
  const naming = detectNaming(files);
  if (naming.samples > 0) {
    const total = naming.camelCase + naming.snake_case + naming.PascalCase + naming.kebabCase;
    if (total > 0) {
      const dominant = [
        { name: "camelCase", count: naming.camelCase },
        { name: "snake_case", count: naming.snake_case },
        { name: "PascalCase", count: naming.PascalCase },
        { name: "kebab-case", count: naming.kebabCase }
      ].sort((a, b) => b.count - a.count);
      const top = dominant[0];
      if (top.count > 0) {
        const pct = Math.round(top.count / total * 100);
        conventions.push({
          name: `${top.name} identifiers`,
          description: `Identifiers predominantly use ${top.name} (${pct}% of samples).`,
          evidence: `${top.count} of ${total} identifiers`
        });
      }
    }
  }
  const quotes = detectQuotes(files);
  if (quotes.single + quotes.double > 5) {
    const total = quotes.single + quotes.double;
    if (quotes.single > quotes.double) {
      const pct = Math.round(quotes.single / total * 100);
      conventions.push({
        name: "Single quotes",
        description: `String literals predominantly use single quotes (${pct}%).`,
        evidence: `${quotes.single} single vs ${quotes.double} double`
      });
    } else {
      const pct = Math.round(quotes.double / total * 100);
      conventions.push({
        name: "Double quotes",
        description: `String literals predominantly use double quotes (${pct}%).`,
        evidence: `${quotes.double} double vs ${quotes.single} single`
      });
    }
  }
  if (hasEslintConfig(rootPath)) {
    conventions.push({
      name: "ESLint configured",
      description: "Project ships an ESLint configuration for static analysis."
    });
  }
  if (hasPrettierConfig(rootPath)) {
    conventions.push({
      name: "Prettier configured",
      description: "Project uses Prettier for code formatting."
    });
  }
  if (detectTypeScriptStrict(rootPath)) {
    conventions.push({
      name: "TypeScript strict mode",
      description: 'tsconfig.json enables `"strict": true`.'
    });
  }
  return conventions;
}

// src/scanners/index.ts
function readOverview(rootPath) {
  const candidates = ["README.md", "README", "readme.md", "Readme.md"];
  for (const name of candidates) {
    const p = join7(rootPath, name);
    if (existsSync7(p)) {
      try {
        const content = readFileSync6(p, "utf-8");
        const lines = content.split(/\r?\n/);
        const collected = [];
        let started = false;
        for (const line of lines) {
          const trimmed = line.trim();
          if (!started) {
            if (trimmed.startsWith("# ")) {
              started = true;
              continue;
            }
            if (trimmed === "" || trimmed.startsWith("![") || trimmed.startsWith("<img")) {
              continue;
            }
            started = true;
          }
          if (trimmed.startsWith("#")) break;
          if (trimmed === "" && collected.length > 0) break;
          collected.push(trimmed);
          if (collected.length >= 6) break;
        }
        if (collected.length > 0) {
          return collected.join(" ").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
        }
      } catch {
      }
    }
  }
  return "";
}
function buildDataFlow(ctx) {
  const lines = [];
  const entry = ctx.architecture.entryPoints[0];
  if (entry) {
    lines.push(`- Entry point loads from \`${entry}\`.`);
  }
  if (ctx.techStack.frameworks.length > 0) {
    lines.push(`- Uses ${ctx.techStack.frameworks.join(", ")} as the application framework.`);
  }
  if (ctx.environment.length > 0) {
    const required = ctx.environment.filter((e) => e.required).map((e) => e.name);
    if (required.length > 0) {
      lines.push(`- Configuration sourced from environment: ${required.map((n) => `\`${n}\``).join(", ")}.`);
    }
  }
  if (ctx.commands.length > 0) {
    const dev = ctx.commands.find((c) => c.name === "dev" || c.name === "serve");
    if (dev) {
      lines.push(`- Development workflow: \`${dev.name}\` (${dev.command}).`);
    }
  }
  if (lines.length === 0) {
    return "Data flow could not be inferred automatically.";
  }
  return lines.join("\n");
}
function scanProject(options) {
  const { rootPath, depth = 3, extraIgnore = [] } = options;
  const ignorePatterns = loadIgnorePatterns(rootPath, extraIgnore);
  const techStack = detectTechStack(rootPath);
  const structure = scanStructure({ rootPath, depth, extraIgnore: ignorePatterns });
  const environment = scanEnvAll(rootPath);
  const commands = scanScripts(rootPath);
  const conventions = scanPatterns({ rootPath, depth: Math.max(depth, 4), extraIgnore: ignorePatterns });
  const projectName = detectProjectName(rootPath);
  const overview = readOverview(rootPath);
  const architecture = {
    entryPoints: structure.entryPoints,
    keyModules: structure.keyFiles,
    dataFlow: ""
  };
  const ctx = {
    projectName,
    overview,
    techStack,
    structure: {
      tree: structure.tree,
      files: structure.files,
      directories: structure.directories,
      keyFiles: structure.keyFiles
    },
    conventions,
    environment,
    commands,
    architecture,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    rootPath
  };
  ctx.architecture.dataFlow = buildDataFlow(ctx);
  return ctx;
}

// src/generators/markdown.ts
function renderTechStack(tech) {
  const lines = [];
  lines.push("## Tech Stack");
  lines.push("");
  if (tech.languages.length > 0) {
    lines.push(`- **Languages:** ${tech.languages.join(", ")}`);
  }
  if (tech.frameworks.length > 0) {
    lines.push(`- **Frameworks:** ${tech.frameworks.join(", ")}`);
  }
  if (tech.runtime) {
    lines.push(`- **Runtime:** ${tech.runtime}`);
  }
  if (tech.packageManager) {
    lines.push(`- **Package manager:** ${tech.packageManager}`);
  }
  if (tech.typeChecker) {
    lines.push(`- **Type checker:** ${tech.typeChecker}`);
  }
  if (tech.testFramework) {
    lines.push(`- **Testing:** ${tech.testFramework}`);
  }
  if (tech.linter) {
    lines.push(`- **Linter:** ${tech.linter}`);
  }
  lines.push("");
  return lines;
}
function renderCommands(commands) {
  const lines = ["## Commands", ""];
  if (commands.length === 0) {
    lines.push("_No commands detected._");
    lines.push("");
    return lines;
  }
  lines.push("| Name | Source | Command | Description |");
  lines.push("| --- | --- | --- | --- |");
  for (const cmd of commands) {
    const name = cmd.name.replace(/\|/g, "\\|");
    const command = cmd.command.replace(/\|/g, "\\|");
    const desc = cmd.description.replace(/\|/g, "\\|");
    lines.push(`| \`${name}\` | ${cmd.source} | \`${command}\` | ${desc} |`);
  }
  lines.push("");
  return lines;
}
function renderEnvironment(env) {
  const lines = ["## Environment", ""];
  if (env.length === 0) {
    lines.push("_No environment variables detected. Add a `.env.example` file to declare them._");
    lines.push("");
    return lines;
  }
  lines.push("| Variable | Required | Default | Description |");
  lines.push("| --- | --- | --- | --- |");
  for (const e of env) {
    const required = e.required ? "yes" : "no";
    const def = e.defaultValue ? `\`${e.defaultValue.replace(/\|/g, "\\|")}\`` : "\u2014";
    const comment = e.comment ? e.comment.replace(/\|/g, "\\|") : "\u2014";
    lines.push(`| \`${e.name}\` | ${required} | ${def} | ${comment} |`);
  }
  lines.push("");
  return lines;
}
function renderConventions(conventions) {
  const lines = ["## Conventions", ""];
  if (conventions.length === 0) {
    lines.push("_No conventions detected._");
    lines.push("");
    return lines;
  }
  for (const c of conventions) {
    lines.push(`- **${c.name}** \u2014 ${c.description}${c.evidence ? ` _(${c.evidence})_` : ""}`);
  }
  lines.push("");
  return lines;
}
function renderStructure(structure) {
  const lines = ["## Project Structure", ""];
  lines.push(`- **Files:** ${structure.files.length}`);
  lines.push(`- **Directories:** ${structure.directories.length}`);
  if (structure.keyFiles.length > 0) {
    lines.push(`- **Key files:** ${structure.keyFiles.map((f) => `\`${f}\``).join(", ")}`);
  }
  lines.push("");
  lines.push("```");
  lines.push(structure.tree);
  lines.push("```");
  lines.push("");
  return lines;
}
function renderArchitecture(arch) {
  const lines = ["## Architecture", ""];
  if (arch.entryPoints.length > 0) {
    lines.push("### Entry Points");
    for (const e of arch.entryPoints) {
      lines.push(`- \`${e}\``);
    }
    lines.push("");
  }
  if (arch.keyModules.length > 0) {
    lines.push("### Key Modules");
    for (const m of arch.keyModules) {
      lines.push(`- \`${m}\``);
    }
    lines.push("");
  }
  if (arch.dataFlow) {
    lines.push("### Data Flow");
    lines.push("");
    lines.push(arch.dataFlow);
    lines.push("");
  }
  return lines;
}
function renderMarkdown(ctx) {
  const lines = [];
  lines.push(`# ${ctx.projectName}`);
  lines.push("");
  lines.push("> Generated by [ctx](https://github.com/smarthomeo/ctx-cli) on " + ctx.generatedAt);
  lines.push("");
  lines.push("## Project Overview");
  lines.push("");
  lines.push(ctx.overview || "_No overview available. Add a `README.md` to provide one._");
  lines.push("");
  lines.push(...renderTechStack(ctx.techStack));
  lines.push(...renderStructure(ctx.structure));
  lines.push(...renderConventions(ctx.conventions));
  lines.push(...renderEnvironment(ctx.environment));
  lines.push(...renderCommands(ctx.commands));
  lines.push(...renderArchitecture(ctx.architecture));
  return lines.join("\n");
}

// src/generators/json.ts
function renderJson(ctx) {
  return JSON.stringify(ctx, null, 2) + "\n";
}
function parseContextJson(input) {
  const parsed = JSON.parse(input);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid context JSON: expected an object");
  }
  const obj = parsed;
  if (!obj.projectName || typeof obj.projectName !== "string") {
    throw new Error("Invalid context JSON: missing projectName");
  }
  if (!obj.techStack || typeof obj.techStack !== "object") {
    throw new Error("Invalid context JSON: missing techStack");
  }
  if (!obj.structure || typeof obj.structure !== "object") {
    throw new Error("Invalid context JSON: missing structure");
  }
  return {
    projectName: obj.projectName,
    overview: obj.overview ?? "",
    techStack: obj.techStack,
    structure: obj.structure,
    conventions: obj.conventions ?? [],
    environment: obj.environment ?? [],
    commands: obj.commands ?? [],
    architecture: obj.architecture ?? { entryPoints: [], keyModules: [], dataFlow: "" },
    generatedAt: obj.generatedAt ?? (/* @__PURE__ */ new Date()).toISOString(),
    rootPath: obj.rootPath ?? ""
  };
}

// src/commands/init.ts
function runInit(options) {
  const rootPath = resolve(options.rootPath);
  if (!existsSync8(rootPath)) {
    throw new Error(`Project root does not exist: ${rootPath}`);
  }
  const format = options.format ?? "md";
  const outputPath = options.outputPath ? isAbsolute(options.outputPath) ? options.outputPath : resolve(rootPath, options.outputPath) : resolve(rootPath, format === "json" ? ".ctx.json" : ".ctx.md");
  const context = scanProject({
    rootPath,
    depth: options.depth,
    extraIgnore: options.ignore
  });
  const content = format === "json" ? renderJson(context) : renderMarkdown(context);
  let written = false;
  if (!options.dryRun) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync2(outputPath, content, "utf-8");
    written = true;
  }
  if (!options.quiet && written) {
    const fileCount = context.structure.files.length;
    process.stdout.write(`Wrote context (${fileCount} files scanned) to ${outputPath}
`);
  }
  return { context, outputPath, content, written };
}

// src/commands/update.ts
import { existsSync as existsSync9, readFileSync as readFileSync7, writeFileSync as writeFileSync3, mkdirSync as mkdirSync2 } from "fs";
import { dirname as dirname2, isAbsolute as isAbsolute2, resolve as resolve2 } from "path";

// src/utils/diff.ts
function arraysEqual(a, b) {
  const aa = a ?? [];
  const bb = b ?? [];
  if (aa.length !== bb.length) return false;
  for (let i = 0; i < aa.length; i++) {
    if (aa[i] !== bb[i]) return false;
  }
  return true;
}
function jsonEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
function diffContexts(before, after) {
  const details = {};
  const changedSections = [];
  if (!before) {
    return {
      hasChanges: true,
      changedSections: ["all"],
      addedFiles: after.structure.files,
      removedFiles: [],
      modifiedFiles: [],
      details: {}
    };
  }
  if (before.projectName !== after.projectName) {
    changedSections.push("projectName");
    details.projectName = { before: before.projectName, after: after.projectName };
  }
  if (before.overview !== after.overview) {
    changedSections.push("overview");
    details.overview = { before: before.overview, after: after.overview };
  }
  if (!jsonEqual(before.techStack, after.techStack)) {
    changedSections.push("techStack");
    details.techStack = { before: before.techStack, after: after.techStack };
  }
  if (before.structure.tree !== after.structure.tree) {
    changedSections.push("structure");
    details.structure = { before: before.structure.tree, after: after.structure.tree };
  }
  if (!jsonEqual(before.environment, after.environment)) {
    changedSections.push("environment");
    details.environment = { before: before.environment, after: after.environment };
  }
  if (!jsonEqual(before.commands, after.commands)) {
    changedSections.push("commands");
    details.commands = { before: before.commands, after: after.commands };
  }
  if (!jsonEqual(before.conventions, after.conventions)) {
    changedSections.push("conventions");
    details.conventions = { before: before.conventions, after: after.conventions };
  }
  if (!jsonEqual(before.architecture, after.architecture)) {
    changedSections.push("architecture");
    details.architecture = { before: before.architecture, after: after.architecture };
  }
  const beforeFiles = new Set(before.structure.files);
  const afterFiles = new Set(after.structure.files);
  const addedFiles = after.structure.files.filter((f) => !beforeFiles.has(f));
  const removedFiles = before.structure.files.filter((f) => !afterFiles.has(f));
  const beforeDirs = new Set(before.structure.directories);
  const afterDirs = new Set(after.structure.directories);
  const addedDirs = after.structure.directories.filter((d) => !beforeDirs.has(d));
  const removedDirs = before.structure.directories.filter((d) => !afterDirs.has(d));
  const modifiedFiles = [];
  for (const file of after.structure.files) {
    if (beforeFiles.has(file) && !arraysEqual(addedFiles, removedFiles)) {
    }
  }
  if (addedDirs.length > 0 || removedDirs.length > 0) {
    changedSections.push("directories");
  }
  return {
    hasChanges: changedSections.length > 0 || addedFiles.length > 0 || removedFiles.length > 0,
    changedSections,
    addedFiles,
    removedFiles,
    modifiedFiles,
    details
  };
}
function formatDiff(diff) {
  const lines = [];
  if (!diff.hasChanges) {
    lines.push("No changes detected. .ctx.md is up to date.");
    return lines.join("\n");
  }
  lines.push("Changes detected:");
  if (diff.changedSections.length > 0) {
    lines.push(`  Modified sections: ${diff.changedSections.join(", ")}`);
  }
  if (diff.addedFiles.length > 0) {
    lines.push(`  Added files (${diff.addedFiles.length}):`);
    for (const f of diff.addedFiles) {
      lines.push(`    + ${f}`);
    }
  }
  if (diff.removedFiles.length > 0) {
    lines.push(`  Removed files (${diff.removedFiles.length}):`);
    for (const f of diff.removedFiles) {
      lines.push(`    - ${f}`);
    }
  }
  if (diff.modifiedFiles.length > 0) {
    lines.push(`  Modified files (${diff.modifiedFiles.length}):`);
    for (const f of diff.modifiedFiles) {
      lines.push(`    ~ ${f}`);
    }
  }
  return lines.join("\n");
}

// src/commands/update.ts
function loadPreviousContext(filePath, format) {
  if (!existsSync9(filePath)) return null;
  try {
    const content = readFileSync7(filePath, "utf-8");
    if (format === "json") {
      return parseContextJson(content);
    }
    const jsonMatch = content.match(/<!--\s*ctx:json\s*([\s\S]*?)\s*-->/);
    if (jsonMatch) {
      try {
        return parseContextJson(jsonMatch[1]);
      } catch {
        return null;
      }
    }
    return null;
  } catch {
    return null;
  }
}
function runUpdate(options) {
  const rootPath = resolve2(options.rootPath);
  if (!existsSync9(rootPath)) {
    throw new Error(`Project root does not exist: ${rootPath}`);
  }
  const format = options.format ?? "md";
  const outputPath = options.outputPath ? isAbsolute2(options.outputPath) ? options.outputPath : resolve2(rootPath, options.outputPath) : resolve2(rootPath, format === "json" ? ".ctx.json" : ".ctx.md");
  const previous = loadPreviousContext(outputPath, format);
  const context = scanProject({
    rootPath,
    depth: options.depth,
    extraIgnore: options.ignore
  });
  const diff = diffContexts(previous, context);
  const content = format === "json" ? renderJson(context) : renderMarkdown(context);
  let written = false;
  if (!options.dryRun) {
    mkdirSync2(dirname2(outputPath), { recursive: true });
    writeFileSync3(outputPath, content, "utf-8");
    written = true;
  }
  const diffSummary = formatDiff(diff);
  if (!options.quiet) {
    if (options.showDiff || !diff.hasChanges) {
      process.stdout.write(diffSummary + "\n");
    }
    if (written) {
      process.stdout.write(`Updated ${outputPath}
`);
    }
  }
  return {
    context,
    previous,
    outputPath,
    content,
    written,
    hasChanges: diff.hasChanges,
    diffSummary
  };
}

// src/commands/check.ts
import { existsSync as existsSync10, readFileSync as readFileSync8 } from "fs";
import { isAbsolute as isAbsolute3, resolve as resolve3 } from "path";
function loadExisting(filePath, format) {
  if (!existsSync10(filePath)) return null;
  try {
    const content = readFileSync8(filePath, "utf-8");
    if (format === "json") return parseContextJson(content);
    const jsonMatch = content.match(/<!--\s*ctx:json\s*([\s\S]*?)\s*-->/);
    if (jsonMatch) {
      return parseContextJson(jsonMatch[1]);
    }
    return null;
  } catch {
    return null;
  }
}
function runCheck(options) {
  const rootPath = resolve3(options.rootPath);
  if (!existsSync10(rootPath)) {
    throw new Error(`Project root does not exist: ${rootPath}`);
  }
  const format = options.format ?? "md";
  const outputPath = options.outputPath ? isAbsolute3(options.outputPath) ? options.outputPath : resolve3(rootPath, options.outputPath) : resolve3(rootPath, format === "json" ? ".ctx.json" : ".ctx.md");
  const previous = loadExisting(outputPath, format);
  const current = scanProject({
    rootPath,
    depth: options.depth,
    extraIgnore: options.ignore
  });
  const diff = diffContexts(previous, current);
  const fresh = !diff.hasChanges && previous !== null;
  const summary = previous === null ? `No context file found at ${outputPath}. Run \`ctx init\` first.` : fresh ? `.ctx.md is up to date.` : formatDiff(diff);
  const exitCode = fresh ? 0 : 1;
  if (!options.quiet) {
    process.stdout.write(summary + "\n");
  }
  return { fresh, previous, current, outputPath, summary, exitCode };
}

// src/commands/ignore.ts
import { existsSync as existsSync11 } from "fs";
import { resolve as resolve4 } from "path";
function runIgnore(options) {
  const rootPath = resolve4(options.rootPath);
  if (!existsSync11(rootPath)) {
    throw new Error(`Project root does not exist: ${rootPath}`);
  }
  const pattern = options.pattern.trim();
  if (!pattern) {
    throw new Error("Ignore pattern cannot be empty");
  }
  const ctxignorePath = `${rootPath}/.ctxignore`;
  const before = readCtxignore(rootPath);
  const hadPattern = before.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith("#")).includes(pattern);
  addIgnorePattern(rootPath, pattern);
  return {
    pattern,
    added: !hadPattern,
    ctxignorePath,
    contents: readCtxignore(rootPath)
  };
}

// src/index.ts
var program = new Command();
program.name("ctx").description("Terminal context manager for AI coding agents").version("0.1.0");
program.command("init").description("Scan the project and generate .ctx.md").option("-d, --depth <n>", "directory scan depth", (v) => Number.parseInt(v, 10), 3).option("-o, --output <path>", "output file path").option("-f, --format <fmt>", "output format: md|json", "md").option("-i, --ignore <patterns>", "comma-separated additional ignore patterns", (v) => v.split(",").map((p) => p.trim()).filter(Boolean)).option("--dry-run", "do not write any files", false).action(async (opts) => {
  try {
    const format = opts.format === "json" ? "json" : "md";
    const result = runInit({
      rootPath: process.cwd(),
      outputPath: opts.output ?? (format === "json" ? ".ctx.json" : ".ctx.md"),
      format,
      depth: opts.depth,
      ignore: opts.ignore ?? [],
      dryRun: opts.dryRun
    });
    if (opts.dryRun) {
      process.stdout.write(result.content);
    }
  } catch (err) {
    process.stderr.write(chalk.red(`Error: ${err.message}
`));
    process.exit(1);
  }
});
program.command("update").description("Re-scan the project and update .ctx.md").option("-d, --depth <n>", "directory scan depth", (v) => Number.parseInt(v, 10), 3).option("-o, --output <path>", "output file path").option("-f, --format <fmt>", "output format: md|json", "md").option("-i, --ignore <patterns>", "comma-separated additional ignore patterns", (v) => v.split(",").map((p) => p.trim()).filter(Boolean)).option("--dry-run", "do not write any files", false).option("--show-diff", "always show the diff summary", false).action(async (opts) => {
  try {
    const format = opts.format === "json" ? "json" : "md";
    runUpdate({
      rootPath: process.cwd(),
      outputPath: opts.output ?? (format === "json" ? ".ctx.json" : ".ctx.md"),
      format,
      depth: opts.depth,
      ignore: opts.ignore ?? [],
      dryRun: opts.dryRun,
      showDiff: opts.showDiff
    });
  } catch (err) {
    process.stderr.write(chalk.red(`Error: ${err.message}
`));
    process.exit(1);
  }
});
program.command("check").description("Check whether .ctx.md is up to date").option("-d, --depth <n>", "directory scan depth", (v) => Number.parseInt(v, 10), 3).option("-o, --output <path>", "context file path").option("-f, --format <fmt>", "output format: md|json", "md").option("-i, --ignore <patterns>", "comma-separated additional ignore patterns", (v) => v.split(",").map((p) => p.trim()).filter(Boolean)).action(async (opts) => {
  try {
    const format = opts.format === "json" ? "json" : "md";
    const result = runCheck({
      rootPath: process.cwd(),
      outputPath: opts.output ?? (format === "json" ? ".ctx.json" : ".ctx.md"),
      format,
      depth: opts.depth,
      ignore: opts.ignore ?? []
    });
    process.exit(result.exitCode);
  } catch (err) {
    process.stderr.write(chalk.red(`Error: ${err.message}
`));
    process.exit(1);
  }
});
program.command("ignore <pattern>").description("Add a pattern to .ctxignore").action((pattern) => {
  try {
    const result = runIgnore({ rootPath: process.cwd(), pattern });
    if (result.added) {
      process.stdout.write(chalk.green(`Added "${result.pattern}" to ${result.ctxignorePath}
`));
    } else {
      process.stdout.write(chalk.yellow(`"${result.pattern}" is already in ${result.ctxignorePath}
`));
    }
  } catch (err) {
    process.stderr.write(chalk.red(`Error: ${err.message}
`));
    process.exit(1);
  }
});
program.parseAsync(process.argv).catch((err) => {
  process.stderr.write(chalk.red(`Error: ${err.message}
`));
  process.exit(1);
});
//# sourceMappingURL=index.mjs.map