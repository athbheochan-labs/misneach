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
