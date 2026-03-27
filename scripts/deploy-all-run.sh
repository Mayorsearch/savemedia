#!/usr/bin/env bash

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

"$ROOT_DIR/scripts/push-images.sh"
"$ROOT_DIR/scripts/deploy-api-run.sh"
API_SERVICE_URL="$(run_gcloud run services describe savemedia-api --region="$REGION" --format='value(status.url)')"
"$ROOT_DIR/scripts/deploy-web-run.sh"
WEB_PUBLIC_URL="$(run_gcloud run services describe savemedia-web --region="$REGION" --format='value(status.url)')"
"$ROOT_DIR/scripts/deploy-api-run.sh" WEB_PUBLIC_URL="$WEB_PUBLIC_URL"
