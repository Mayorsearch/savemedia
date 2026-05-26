# SaveMedia Workspace

SaveMedia is a downloader product built on top of a private media-processing deployment.
This repository is organized as a workspace with a branded TanStack Start web app,
an imported processing API, and a private reference snapshot of the upstream
Svelte frontend for implementation research only.

## Workspace layout

- `api/` - imported processing API
- `packages/` - imported workspace packages
- `web/` - the SaveMedia TanStack Start app and public wrapper API
- `docs/` - operational and deployment documentation
- `cloudrun/` - example Cloud Run service manifests for the web and api services
- `reference/cobalt-web/` - non-deployed upstream frontend reference

## Public API surface

The public SaveMedia API is served by the web app:

- `POST /api/preview`
- `POST /api/download`
- `GET /api/proxy-download`
- `GET /docs/api`

The web service talks to the private processing API internally through `COBALT_API_URL` and `COBALT_API_KEY`.

## Local setup

This workspace is set up to work with direct Bun and Node binaries, plus Docker Compose for the private processing API.

```bash
make doctor
make setup
make dev
```

Use these example env files as a starting point:

- `api/.env.example`
- `web/.env.example`

## Dev commands

- `make doctor` - show the resolved Bun, Node, and Docker toolchain
- `make setup` - install workspace dependencies with Bun
- `make dev` - start the dockerized processing API and the local SaveMedia web dev server
- `make dev-web` - run only the local TanStack frontend
- `make dev-api` - run only the dockerized processing API
- `make dev-api-local` - run the processing API directly with Node
- `make lint` - run frontend ESLint
- `make typecheck` - run frontend TypeScript checks
- `make check` - run lint and typecheck together
- `make compose-up` - run the full dockerized web + api stack
- `make compose-down` - stop the full dockerized stack
- `make build` - build the SaveMedia web app
- `make preview-web` - run the built web output

## Mobile app wrapper (Capacitor)

The repository includes a Capacitor wrapper in `web/` for iOS and Android. The native apps keep using the existing SaveMedia web app via WebView.

### App identity

- Display name: `imediasave`
- Internal app name: `SaveMedia`
- App ID / bundle identifier / Android applicationId: `com.mayorsearch.savemedia`

### Prerequisites

- Node.js 20+ with Corepack enabled
- `pnpm` via Corepack (`corepack pnpm --version`)
- macOS + Xcode (for iOS builds)
- Android Studio + Android SDK (for Android builds)

### Install

```bash
corepack pnpm install --no-frozen-lockfile
```

### Build/export web assets and sync Capacitor

```bash
# Ensure web app build still succeeds
corepack pnpm run mobile:build

# Copy/update Capacitor web assets and native config
corepack pnpm run mobile:sync
```

Capacitor is configured with a minimal bundled shell (`web/mobile-shell`) and can load deployed SaveMedia over HTTPS by setting:

```bash
export CAPACITOR_SERVER_URL="https://<your-production-savemedia-url>"
corepack pnpm run mobile:sync
```

`CAPACITOR_SERVER_URL` should always be an `https://` URL for production.

### Open and run in native IDEs

```bash
# Open native projects
corepack pnpm run mobile:ios
corepack pnpm run mobile:android

# Optional direct CLI run (requires configured simulator/emulator/device)
corepack pnpm run mobile:run:ios
corepack pnpm run mobile:run:android
```

From Xcode/Android Studio, choose a simulator/device and run the `App` target/module.

## GitHub Actions deployment

This repo now includes:

- `.github/workflows/ci.yml` for checks and Docker build verification
- `.github/workflows/deploy.yml` for production Cloud Run deployment with GitHub OIDC
- `docs/github-actions-deploy.md` for the setup steps and required GitHub secrets

Bootstrap GitHub deploy access with:

```bash
make gcp-github-oidc
```

The bootstrap uses `gh` to create the repository variables and secrets that the deploy workflow needs.

## Cloud Run

Deploy the workspace as two separate Cloud Run services:

- `savemedia-api` using the repo root `Dockerfile`
- `savemedia-web` using `web/Dockerfile`

The starter manifests live in:

- `cloudrun/api.service.yaml`
- `cloudrun/web.service.yaml`

## License notes

- The imported cobalt API code in `api/` remains subject to its upstream AGPL-3.0 terms.
- The reference frontend in `reference/cobalt-web/` remains subject to cobalt web's upstream license and branding restrictions.
- SaveMedia does not ship the cobalt Svelte frontend as part of the live product.
