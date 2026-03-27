#!/usr/bin/env bash

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

"$ROOT_DIR/scripts/gcp-setup.sh"
"$ROOT_DIR/scripts/gcp-docker-auth.sh"

docker build -t "$(web_image_ref)" -f "$ROOT_DIR/web/Dockerfile" "$ROOT_DIR"
docker push "$(web_image_ref)"
