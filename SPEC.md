# `ctx` — Terminal Context Manager for AI Agents

## Overview
`ctx` is a CLI tool that generates and maintains a `.ctx.md` file summarizing a project's structure, architecture decisions, and current state. AI coding agents (Claude Code, Codex, Gemini CLI, etc.) read this file as system context, eliminating redundant project discovery.

## Problem
Every time an AI coding agent starts a session, it burns tokens rediscovering: project structure, tech stack, conventions, current work-in-progress, and architecture decisions. This wastes time, money, and causes agents to repeat mistakes.

## Solution
`ctx init` generates a comprehensive `.ctx.md` from the actual project. `ctx update` keeps it in sync. Agents read it as their first action.

## Commands

### `ctx init`
- Scans the project directory
- Detects: language, framework, package manager, test framework, linter
- Reads: README, package.json/pyproject.toml/Cargo.toml/go.mod, .env.example, docker files
- Generates `.ctx.md` with sections:
  - **Project Overview** (from README or inferred)
  - **Tech Stack** (languages, frameworks, tools)
  - **Project Structure** (directory tree, key files)
  - **Conventions** (naming, patterns detected from code)
  - **Environment** (required env vars from .env.example)
  - **Commands** (scripts from package.json, Makefile, etc.)
  - **Architecture** (entry points, key modules, data flow)
- Options:
  - `--depth <n>` — directory scan depth (default: 3)
  - `--output <path>` — output file (default: `.ctx.md`)
  - `--format md|json` — output format (default: md)
  - `--ignore <patterns>` — additional ignore patterns

### `ctx update`
- Reads existing `.ctx.md`
- Re-scans project for changes
- Updates only changed sections (preserves manual edits where possible)
- Shows diff of what changed

### `ctx check`
- Validates `.ctx.md` is up to date
- Reports staleness (files changed since last update)
- Exit code 0 if fresh, 1 if stale

### `ctx ignore <pattern>`
- Adds pattern to `.ctxignore` file
- Prevents files/dirs from being scanned

## Technical Requirements
- **Language:** TypeScript, compiled to JS
- **Runtime:** Node.js 18+
- **Package:** Published to npm as `ctx-cli` (the name `ctx` is taken)
- **Binary name:** `ctx`
- **Dependencies:** Minimal — use built-in Node.js fs/path where possible
- **Testing:** Use vitest
- **Linting:** Use eslint with typescript-eslint
- **Build:** Use tsup for bundling

## Project Structure
```
ctx/
├── src/
│   ├── index.ts          # CLI entry point (commander)
│   ├── commands/
│   │   ├── init.ts       # ctx init logic
│   │   ├── update.ts     # ctx update logic
│   │   ├── check.ts      # ctx check logic
│   │   └── ignore.ts     # ctx ignore logic
│   ├── scanners/
│   │   ├── language.ts   # Detect language/framework
│   │   ├── structure.ts  # Directory tree scanner
│   │   ├── env.ts        # Environment var extractor
│   │   ├── scripts.ts    # Command/script extractor
│   │   └── patterns.ts   # Code convention detector
│   ├── generators/
│   │   ├── markdown.ts   # Markdown formatter
│   │   └── json.ts       # JSON formatter
│   └── utils/
│       ├── ignore.ts     # .ctxignore handling
│       └── diff.ts       # Change detection
├── tests/
│   ├── init.test.ts
│   ├── update.test.ts
│   ├── check.test.ts
│   ├── scanners/
│   │   ├── language.test.ts
│   │   ├── structure.test.ts
│   │   └── env.test.ts
│   └── fixtures/         # Sample projects for testing
│       ├── node-project/
│       ├── python-project/
│       └── go-project/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── .eslintrc.json
├── .ctxignore
├── README.md
└── LICENSE (MIT)
```

## Testing Requirements
- Unit tests for each scanner module
- Integration tests for init/update/check commands using fixtures
- Test with Node.js, Python, and Go project fixtures
- Minimum 80% code coverage
- All tests must pass before commit

## README Requirements
- Clear problem/solution statement
- Installation: `npm install -g ctx-cli`
- Quick start: `cd your-project && ctx init`
- Usage examples with real output
- GIF demo (mention it's coming)
- Badge for npm version, tests, license

## Quality Bar
- Clean TypeScript with strict mode
- Proper error handling (no unhandled rejections)
- Helpful error messages
- Fast (< 2 seconds on typical project)
- Works on Linux, macOS, Windows
