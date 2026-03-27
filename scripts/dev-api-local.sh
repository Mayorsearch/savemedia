#!/usr/bin/env bash

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

cd "$ROOT_DIR/api"
export API_URL="${API_URL:-http://localhost:9000/}"
export API_PORT="${API_PORT:-9000}"
export CORS_WILDCARD="${CORS_WILDCARD:-0}"
export CORS_URL="${CORS_URL:-http://localhost:3000}"
export API_AUTH_REQUIRED="${API_AUTH_REQUIRED:-0}"

run_node src/cobalt
