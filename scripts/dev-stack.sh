#!/usr/bin/env bash

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

cd "$ROOT_DIR"
docker compose up -d api

cleanup() {
  docker compose stop api >/dev/null 2>&1 || true
}

trap cleanup EXIT

"$ROOT_DIR/scripts/dev-web.sh"
