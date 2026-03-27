#!/usr/bin/env bash

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

WEB_PUBLIC_URL="${WEB_PUBLIC_URL:-https://placeholder.invalid}"

run_gcloud run deploy savemedia-api \
  --image="$(api_image_ref)" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --port=9000 \
  --cpu=2 \
  --memory=4Gi \
  --concurrency=2 \
  --timeout=900 \
  --set-env-vars="API_URL=https://placeholder.invalid/,API_PORT=9000,CORS_WILDCARD=0,CORS_URL=${WEB_PUBLIC_URL},API_AUTH_REQUIRED=0"

API_PUBLIC_URL="$(run_gcloud run services describe savemedia-api --region="$REGION" --format='value(status.url)')"

run_gcloud run services update savemedia-api \
  --region="$REGION" \
  --update-env-vars="API_URL=${API_PUBLIC_URL},CORS_URL=${WEB_PUBLIC_URL}"

echo "API service URL: ${API_PUBLIC_URL}"
