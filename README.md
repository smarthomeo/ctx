# ctx

**Terminal context manager for AI coding agents.**

`ctx` generates a `.ctx.md` file that summarizes your project — tech stack, structure, environment, conventions, architecture. AI agents (Claude Code, Codex, Gemini CLI, Cursor) read it as their first action, skipping expensive project rediscovery.

## Why

Every time an AI coding agent starts a session, it burns tokens rediscovering your project. `ctx init` gives it everything it needs in one file.

## Install

```bash
npm install -g ctx-cli
```

## Quick Start

```bash
cd your-project
ctx init
```

That's it. Your `.ctx.md` is ready for agents to read.

## Usage

### `ctx init`

Scan the project and generate `.ctx.md`:

```bash
ctx init                    # Generate .ctx.md (default)
ctx init -f json            # Generate .ctx.json instead
ctx init -d 5               # Scan 5 levels deep (default: 3)
ctx init -o docs/ctx.md     # Custom output path
ctx init --dry-run           # Preview without writing
```

### `ctx check`

Verify your context file is up to date:

```bash
ctx check                   # Returns exit 0 if fresh, 1 if stale
ctx check -f json           # Check JSON format (preserves state)
```

Use in CI to catch stale context files:

```yaml
# .github/workflows/ctx.yml
- run: ctx check || (echo "Run 'ctx init' to update" && exit 1)
```

### `ctx update`

Re-scan and update the context file:

```bash
ctx update                  # Re-scan and update .ctx.md
ctx update --show-diff      # Show what changed
ctx update --dry-run        # Preview changes without writing
```

### `ctx ignore`

Exclude files from scanning:

```bash
ctx ignore node_modules     # Add to .ctxignore
ctx ignore "*.test.ts"      # Ignore test files
ctx ignore dist             # Ignore build output
```

## What It Detects

| Category | Examples |
|----------|----------|
| **Languages** | TypeScript, Python, Go, Rust, Java, Ruby |
| **Frameworks** | Express, FastAPI, Gin, Django, Rails, Spring |
| **Test frameworks** | Vitest, Jest, Pytest, Go testing, RSpec |
| **Linters** | ESLint, Pylint, golangci-lint |
| **Package managers** | npm, yarn, pnpm, bun, pip, cargo |
| **Type checkers** | TypeScript, mypy |
| **Environment vars** | From `.env.example`, `Dockerfile`, `docker-compose.yml` |
| **Scripts/Commands** | From `package.json`, `pyproject.toml`, `Makefile`, `Cargo.toml` |
| **Project structure** | Directory tree, key files, entry points |

## Output Formats

### Markdown (default)

Generates a human-readable `.ctx.md` with sections:

```markdown
# my-project

## Project Overview
A REST API for managing widgets.

## Tech Stack
- **Languages:** TypeScript
- **Frameworks:** Express
- **Runtime:** Node.js
- **Testing:** Vitest

## Project Structure
- **Files:** 47
- **Directories:** 12

## Environment
- `PORT` (required) — Server port
- `DATABASE_URL` (required) — PostgreSQL connection string

## Commands
- `dev` — Start development server
- `test` — Run tests
- `build` — Build for production
```

### JSON

Machine-readable `.ctx.json` for programmatic use:

```bash
ctx init -f json
cat .ctx.json | jq '.techStack'
```

## Supported Projects

| Language | Package Manager | Detected Files |
|----------|----------------|----------------|
| **Node.js** | npm, yarn, pnpm, bun | `package.json`, lockfiles |
| **Python** | pip, poetry, uv | `pyproject.toml`, `requirements.txt` |
| **Go** | go modules | `go.mod` |
| **Rust** | cargo | `Cargo.toml` |
| **Java** | maven, gradle | `pom.xml`, `build.gradle` |
| **Ruby** | bundler | `Gemfile` |

## How Agents Use It

When an agent reads `.ctx.md`, it immediately knows:
- What language and framework you're using
- Where the entry points are
- What environment variables are needed
- What commands to run (dev, test, build)
- Project conventions and patterns

This eliminates the first 30-60 seconds of every agent session spent on project discovery.

## Development

```bash
git clone https://github.com/smarthomeo/ctx.git
cd ctx
npm install
npm test        # Run 155 tests
npm run build   # Build to dist/
```

## License

MIT
