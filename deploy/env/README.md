# Environment Files

This directory defines the runtime env contract for production/staging compose services.

## Layout

- `manifest.json` declares the SSM Parameter Store path for every rendered compose env value.
- Templates live in `deploy/env/examples/*.env.example`.
- Runtime files are rendered to `/opt/misneach/env/*.env` by the production deploy workflow.

## SSM Paths

Production parameters use this shape:

```txt
/misneach/prod/<service>/<ENV_VAR_NAME>
```

Example:

```txt
/misneach/prod/client/INTERNAL_AUTH_SECRET
/misneach/prod/translator/DEEPL_API_KEY
/misneach/prod/mariadb/MYSQL_ROOT_PASSWORD
```

Use SSM `String` for non-secret config and `SecureString` for sensitive values.

List required parameters without printing values:

```bash
npm run render:env -- --list-parameters
```

## Rendering

Validate only:

```bash
npm run render:env -- --validate-only --summary
```

Check service source code against the env contract:

```bash
npm run check:env-contract
```

This fails when an EC2-backed service reads a runtime env var that is not declared in both `manifest.json` and the matching `.env.example`.

Render from AWS SSM:

```bash
AWS_REGION=eu-west-1 npm run render:env -- --provider aws --output-dir /tmp/misneach-env --summary
```

Seed AWS SSM from existing production env files:

```bash
npm run seed:ssm-env -- \
  --manifest deploy/env/manifest.json \
  --env-dir /tmp/misneach-prod-env-seed \
  --dry-run

npm run seed:ssm-env -- \
  --manifest deploy/env/manifest.json \
  --env-dir /tmp/misneach-prod-env-seed
```

The seed command prints counts and parameter names on failure, but never prints values.

Render from a local SSM-compatible JSON map:

```bash
npm run render:env -- \
  --provider file \
  --parameters /path/to/local-parameters.json \
  --output-dir /tmp/misneach-env \
  --summary
```

The local JSON file should map full SSM parameter names to values:

```json
{
  "/misneach/prod/client/NODE_ENV": "production",
  "/misneach/prod/client/INTERNAL_AUTH_SECRET": "local-only-secret"
}
```

## Production Deploy

`Full Application Deploy` renders env files from SSM before uploading compose files and before running `docker compose pull` or `docker compose up`.

If a required parameter is missing or empty, the workflow fails before containers restart.

## Security Rules

- Never commit real secrets.
- Keep production values in AWS SSM Parameter Store.
- Do not print rendered env files in CI logs.
- Rotate credentials on exposure.

## Maintenance Rules

- Any new runtime env var must be added to the relevant `.env.example` and `manifest.json`.
- Any removed env var must be removed from examples and deployment docs.
- Keep this README aligned with `docs/deployment.md`.

## Web App Contract

Use this contract for web apps unless a product-specific proxy needs extra service URLs:

- `APP_BASE_URL`: public app URL
- `PUBLIC_API_BASE_URL`: browser-facing API base URL
- `API_INTERNAL_URL`: primary server-side upstream for proxy/server requests
- `API_INTERNAL_URLS`: optional comma-separated fallback upstreams
- `PUBLIC_API_URL`: server-side upstream for Misneach serverless public waitlist and survey flows
