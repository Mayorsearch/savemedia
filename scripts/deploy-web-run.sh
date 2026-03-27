#!/usr/bin/env bash

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

"$ROOT_DIR/scripts/setup-cloudrun-secrets.sh"

API_SERVICE_URL="${API_SERVICE_URL:-}"
WEB_PUBLIC_URL="${WEB_PUBLIC_URL:-}"

if [[ -z "$API_SERVICE_URL" ]]; then
  API_SERVICE_URL="$(run_gcloud run services describe "$API_SERVICE_NAME" --region="$REGION" --format='value(status.url)')"
fi

run_gcloud run deploy "$WEB_SERVICE_NAME" \
  --image="$(web_image_ref)" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --port=3000 \
  --cpu=1 \
  --memory=1Gi \
  --concurrency=40 \
  --timeout=900 \
  --set-env-vars="PUBLIC_APP_URL=https://placeholder.invalid,COBALT_API_URL=${API_SERVICE_URL}" \
  --set-secrets="COBALT_API_KEY=${WEB_API_KEY_SECRET_NAME}:latest"

if [[ -z "$WEB_PUBLIC_URL" ]]; then
  WEB_PUBLIC_URL="$(run_gcloud run services describe "$WEB_SERVICE_NAME" --region="$REGION" --format='value(status.url)')"
fi

echo "Web service URL: ${WEB_PUBLIC_URL}"
