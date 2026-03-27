#!/usr/bin/env bash

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

"$ROOT_DIR/scripts/push-api-image.sh"
"$ROOT_DIR/scripts/push-web-image.sh"
