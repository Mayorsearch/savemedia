#!/usr/bin/env bash

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

"$ROOT_DIR/scripts/lint-web.sh"
"$ROOT_DIR/scripts/typecheck-web.sh"
