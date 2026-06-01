#!/bin/bash
# Demo script for ctx CLI

# Create a demo project
DEMO_DIR=$(mktemp -d)
cd "$DEMO_DIR"

# Set up a sample Node.js project
cat > package.json << 'EOF'
{
  "name": "my-awesome-api",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsup",
    "test": "vitest run",
    "lint": "eslint src/"
  },
  "dependencies": {
    "express": "^4.18.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
EOF

cat > README.md << 'EOF'
# My Awesome API
A REST API built with Express.js and TypeScript.
EOF

cat > .env.example << 'EOF'
PORT=3000
DATABASE_URL=postgres://localhost:5432/mydb
API_KEY=your-api-key-here
EOF

mkdir -p src
cat > src/index.ts << 'EOF'
import express from 'express';
const app = express();
app.listen(3000);
EOF

# Demo commands with delays
echo '$ cd my-awesome-api'
sleep 0.5

echo '$ ctx init'
sleep 0.3
/root/ctx/dist/index.mjs init 2>&1
sleep 1

echo ''
echo '$ cat .ctx.md | head -30'
sleep 0.3
head -30 .ctx.md
sleep 1.5

echo ''
echo '$ ctx check -f json'
sleep 0.3
/root/ctx/dist/index.mjs init -f json 2>&1
/root/ctx/dist/index.mjs check -f json 2>&1
echo "Exit code: $?"
sleep 1

echo ''
echo '$ echo "export const config = {};" > src/config.ts'
sleep 0.3
echo 'export const config = {};' > src/config.ts

echo '$ ctx check -f json'
sleep 0.3
/root/ctx/dist/index.mjs check -f json 2>&1
echo "Exit code: $?"
sleep 1

echo ''
echo '$ ctx update -f json'
sleep 0.3
/root/ctx/dist/index.mjs update -f json 2>&1
sleep 0.5

echo '$ ctx check -f json'
sleep 0.3
/root/ctx/dist/index.mjs check -f json 2>&1
echo "Exit code: $?"
sleep 2

# Cleanup
rm -rf "$DEMO_DIR"
