# Cloud Run Deployment

This repo is set up for two-service deployment on Google Cloud Run:

- `savemedia-api` runs the private cobalt processing service from the workspace root `Dockerfile`.
- `savemedia-web` runs the TanStack Start app from `web/Dockerfile`.

## Expected secrets

- `savemedia-cobalt-runtime`
  - `keys.json`
  - `cookies.json`
- `savemedia-web-config`
  - `cobalt-api-key`

## Recommended flow

1. Build and push the API image with the repo root `Dockerfile`.
2. Build and push the web image with `web/Dockerfile`.
3. Replace the placeholder image URLs and domains in:
   - `cloudrun/api.service.yaml`
   - `cloudrun/web.service.yaml`
4. Deploy both manifests with `gcloud run services replace ...`.
5. Set the public DNS values so:
   - `PUBLIC_APP_URL` points to the web service
   - `API_URL` points to the api service
   - `CORS_URL` matches the public web origin

## Notes

- The web service only exposes the SaveMedia wrapper API.
- The cobalt API remains an internal/private processing layer and should not be used directly by browsers.
- The API service is configured with lower concurrency and higher memory because media processing is much heavier than serving the web UI.
