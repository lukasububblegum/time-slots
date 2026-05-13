#!/usr/bin/env bash
set -euo pipefail

RUNTIME_NODE="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

if command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
elif [ -x "$RUNTIME_NODE" ]; then
  NODE_BIN="$RUNTIME_NODE"
else
  echo "Node.js was not found. Install Node.js or run this from Codex with the bundled runtime available." >&2
  exit 1
fi

NEXT_TEST_WASM=1 \
NEXT_TEST_WASM_DIR=node_modules/@next/swc-wasm-nodejs \
"$NODE_BIN" "$PROJECT_DIR/node_modules/next/dist/bin/next" build
