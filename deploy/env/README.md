# Environment Files

This directory defines production/staging env file templates.

## Layout

- Templates live in `deploy/env/examples/*.env.example`.
- Runtime files should live in `/opt/misneach/env/*.env` (or `${ENV_DIR}` override).

## Setup

1. Copy each required template from `deploy/env/examples/`.
2. Rename to `<service>.env` (remove `.example`).
3. Populate all values with environment-specific settings.
4. Ensure filenames match service `env_file` references in `docker-compose.prod.yml`.

## Security Rules

- Never commit real secrets.
- Keep secrets in your secret manager or host-level secure storage.
- Rotate credentials on exposure.

## Maintenance Rules

- Any new runtime env var must be added to the relevant `.env.example`.
- Any removed env var must be removed from examples and deployment docs.
- Keep this README aligned with `docs/deployment.md`.

## Web App Contract

Use this contract for web apps unless a product-specific proxy needs extra service URLs:

- `APP_BASE_URL`: public app URL
- `PUBLIC_API_BASE_URL`: browser-facing API base URL
- `API_INTERNAL_URL`: primary server-side upstream for proxy/server requests
- `API_INTERNAL_URLS`: optional comma-separated fallback upstreams
- `PUBLIC_API_URL`: server-side upstream for Misneach serverless public waitlist and survey flows
