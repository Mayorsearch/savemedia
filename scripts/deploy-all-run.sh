#!/usr/bin/env bash

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

"$ROOT_DIR/scripts/push-images.sh"
"$ROOT_DIR/scripts/deploy-api-run.sh"
"$ROOT_DIR/scripts/deploy-web-run.sh"
"$ROOT_DIR/scripts/sync-cloudrun-urls.sh"

API_SERVICE_URL="$(run_gcloud run services describe "$API_SERVICE_NAME" --region="$REGION" --format='value(status.url)')"
WEB_PUBLIC_URL="$(run_gcloud run services describe "$WEB_SERVICE_NAME" --region="$REGION" --format='value(status.url)')"

echo "Deployed API: ${API_SERVICE_URL}"
echo "Deployed Web: ${WEB_PUBLIC_URL}"
