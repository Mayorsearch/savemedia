#!/usr/bin/env bash

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

echo "Root: $ROOT_DIR"
echo "Node: $NODE_BIN"
run_node --version

echo "npm: $NPM_BIN"
run_npm --version

echo "Bun: $BUN_BIN"
run_bun --version

echo "pnpm binary: $PNPM_STANDALONE_BIN"
if [[ -x "$PNPM_STANDALONE_BIN" ]]; then
  file "$PNPM_STANDALONE_BIN"
else
  echo "pnpm standalone binary not found"
fi

docker --version
docker compose version
docker compose config --services
