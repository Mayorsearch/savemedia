#!/usr/bin/env bash

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

API_PUBLIC_URL="$(run_gcloud run services describe "$API_SERVICE_NAME" --region="$REGION" --format='value(status.url)')"
WEB_PUBLIC_URL="$(run_gcloud run services describe "$WEB_SERVICE_NAME" --region="$REGION" --format='value(status.url)')"

run_gcloud run services update "$API_SERVICE_NAME" \
  --region="$REGION" \
  --update-env-vars="API_URL=${API_PUBLIC_URL},CORS_URL=${WEB_PUBLIC_URL}" >/dev/null

run_gcloud run services update "$WEB_SERVICE_NAME" \
  --region="$REGION" \
  --update-env-vars="PUBLIC_APP_URL=${WEB_PUBLIC_URL},COBALT_API_URL=${API_PUBLIC_URL}" >/dev/null

echo "API service URL: ${API_PUBLIC_URL}"
echo "Web service URL: ${WEB_PUBLIC_URL}"
