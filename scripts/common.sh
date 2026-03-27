#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_BIN="${NODE_BIN:-$HOME/.nvm/versions/node/v24.13.0/bin/node}"
NODE_DIR="${NODE_DIR:-$(dirname "$NODE_BIN")}"
NPM_BIN="${NPM_BIN:-$NODE_DIR/npm}"
BUN_BIN="${BUN_BIN:-$HOME/.bun/bin/bun}"
PNPM_STANDALONE_BIN="${PNPM_STANDALONE_BIN:-$HOME/.local/share/pnpm/.tools/pnpm-exe/10.33.0/pnpm}"
GCLOUD_BIN="${GCLOUD_BIN:-$(command -v gcloud || true)}"
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
REGION="${REGION:-$(gcloud config get-value run/region 2>/dev/null || true)}"
ARTIFACT_REPO="${ARTIFACT_REPO:-savemedia}"
API_IMAGE_NAME="${API_IMAGE_NAME:-api}"
WEB_IMAGE_NAME="${WEB_IMAGE_NAME:-web}"

export PATH="$NODE_DIR:$PATH"

require_binary() {
  local path="$1"
  local name="$2"

  if [[ ! -x "$path" ]]; then
    echo "Missing $name binary at $path" >&2
    exit 1
  fi
}

run_bun() {
  require_binary "$BUN_BIN" "bun"
  "$BUN_BIN" "$@"
}

run_node() {
  require_binary "$NODE_BIN" "node"
  "$NODE_BIN" "$@"
}

run_npm() {
  require_binary "$NPM_BIN" "npm"
  "$NPM_BIN" "$@"
}

run_gcloud() {
  require_binary "$GCLOUD_BIN" "gcloud"
  "$GCLOUD_BIN" "$@"
}

artifact_host() {
  echo "${REGION}-docker.pkg.dev"
}

api_image_ref() {
  echo "$(artifact_host)/${PROJECT_ID}/${ARTIFACT_REPO}/${API_IMAGE_NAME}:latest"
}

web_image_ref() {
  echo "$(artifact_host)/${PROJECT_ID}/${ARTIFACT_REPO}/${WEB_IMAGE_NAME}:latest"
}
