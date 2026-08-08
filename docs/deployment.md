# Deployment and Operations

This project deploys as a multi-service system with containerized backend workloads and split frontend hosting.

## Environments

- Local/dev uses [`docker-compose.yml`](../docker-compose.yml).
- Staging/prod use [`docker-compose.prod.yml`](../docker-compose.prod.yml).
- Production compose expects env files in `/opt/misneach/env` by default, override with `ENV_DIR`.
- Serverless public API infrastructure is defined in [`infra/aws`](../infra/aws) for the production public API stack.

## Build and Image Flow

Production application deployment has one automatic `main` path:

1. Merge to `main` triggers `Full Application Deploy`.
2. The workflow validates required secrets and builds `misneach-web`.
3. It calls `Backend Images (Docker Hub)` to build and push:
   - Shared runtime image: `misneach-backend-runtime:<sha>`
   - `misneach-nlp:<sha>` and `latest`
4. It SSHes to the production host, uploads the production compose/proxy files, pulls images, and runs `docker compose up -d`.
5. It writes a summary with image tags, frontend URLs, and deployment results.

`misneach-web` Amplify deployment is temporarily kept out of the automatic full-app path while the Amplify app IAM role/build configuration is repaired. Deploy it manually from Amplify or with `web-amplify-deploy.yml` after that is fixed.

`cleachtadh-web` and `admin-web` are frontend applications and are intentionally not deployed on the EC2 compose host. Deploy them to their frontend hosting targets instead of adding them to `docker-compose.prod.yml`.

Relevant workflows:

- [full-app-deploy.yml](../.github/workflows/full-app-deploy.yml)
- [deploy-router.yml](../.github/workflows/deploy-router.yml)
- [backend-images-dockerhub.yml](../.github/workflows/backend-images-dockerhub.yml)
- [frontend-builds.yml](../.github/workflows/frontend-builds.yml)
- [web-amplify-deploy.yml](../.github/workflows/web-amplify-deploy.yml)
- [Frontend Amplify Runbook](./frontend-amplify.md)
- [Auth Runbook](./auth-runbook.md)

`Deploy Router` is retained as a manual legacy helper. `Frontend Builds` remains PR/manual validation. Production deploys should normally use `Full Application Deploy`.

### Full App Deployment Secrets

Required repository or `production` environment secrets:

```txt
DOCKERHUB_USERNAME
DOCKERHUB_TOKEN
DOCKERHUB_ORG               # optional; falls back to DOCKERHUB_USERNAME
PROD_SSH_HOST
PROD_SSH_USER
PROD_SSH_KEY
PROD_SSH_PORT              # optional; defaults to 22
PROD_DEPLOY_PATH           # optional; defaults to /opt/misneach
PROD_ENV_FILE              # optional; defaults to /opt/misneach/.env
```

Optional repository variables used only in summaries:

```txt
CLEACHTADH_WEB_URL
ADMIN_WEB_URL
```

Production host prerequisites:

- `PROD_DEPLOY_PATH` exists as the production compose bundle directory.
- Docker and Docker Compose v2 are installed.
- `/opt/misneach/.env` sets `DOCKERHUB_NAMESPACE` when not supplied by the workflow and any compose-level variables.
- Runtime env files exist under `/opt/misneach/env/*.env`.
- The SSH user can run `docker login`, `docker compose`, and passwordless `sudo install` for refreshing compose/proxy files.

## Environment Variable Strategy

- Use `deploy/env/examples/*.env.example` as templates.
- Copy each file to `/opt/misneach/env/<service>.env` in staging/prod.
- Never commit real secrets.
- Keep compose service definitions and env examples synchronized.

### Web Runtime API Variables

`misneach-web` and `cleachtadh-web` use the same env contract:

- `APP_BASE_URL`: public frontend URL
- `PUBLIC_API_BASE_URL`: browser-facing API base URL
- `API_INTERNAL_URL`: primary server-side upstream for SvelteKit proxy/server requests
- `API_INTERNAL_URLS`: optional comma-separated fallback upstreams

`misneach-web` also adds:

- `PUBLIC_API_URL`: server-side upstream for serverless public waitlist and survey flows
- `WAITLIST_API_URL`: optional primary upstream for public waitlist submissions
- `WAITLIST_API_URLS`: optional comma-separated waitlist upstream fallbacks
- `SURVEYS_API_URL`: optional primary upstream for public survey submissions and lookups
- `SURVEYS_API_URLS`: optional comma-separated survey upstream fallbacks
- `BUSINESS_INTERNAL_URL`: primary direct upstream for the business service
- `BUSINESS_INTERNAL_URLS`: optional comma-separated business-service fallbacks

Recommended values by environment:

- host-based local dev:
  - `PUBLIC_API_BASE_URL=http://localhost:8000`
  - `API_INTERNAL_URL=http://localhost:8000`
- docker local dev:
  - `PUBLIC_API_BASE_URL=http://localhost:8000`
  - `API_INTERNAL_URL=http://client:8000`
- production:
  - `PUBLIC_API_BASE_URL=https://api.<your-domain>`
  - `API_INTERNAL_URL=https://api.<your-domain>`
  - `PUBLIC_API_URL=https://<public-api-id>.execute-api.<region>.amazonaws.com`

See: [Environment Files README](../deploy/env/README.md)

## AWS CDK Public API Infrastructure

The `@decyphr/aws-infra` workspace contains the CDK app for serverless public Misneach flows. It currently provisions the public waitlist/surveys Lambdas, API Gateway HTTP API, and DynamoDB tables.

Stack naming convention:

```txt
decyphr-prod-public-api
```

Bootstrap an account/region once:

```bash
npm run bootstrap --workspace @decyphr/aws-infra -- aws://<account-id>/<region>
```

Synthesize the stack:

```bash
npm run synth --workspace @decyphr/aws-infra
```

Deploy the stack:

```bash
npm run deploy --workspace @decyphr/aws-infra
```

### Public API CI/CD

Public API infrastructure deploys through dedicated GitHub Actions workflows:

- `Public API PR` runs on pull requests that touch `infra/aws`, `services/public-api`, `packages/public-flows`, workspace metadata, or the workflow files. It installs dependencies, runs public-flow tests, runs public API Lambda tests/build, and runs CDK synth.
- `Public API Deploy` runs on pushes to `main` for the same paths and can also be run manually with `workflow_dispatch`. It repeats the validation steps, deploys `decyphr-prod-public-api`, and writes the `PublicApiUrl` output to the workflow summary.

Required GitHub repository or `production` environment secrets:

```txt
AWS_REGION
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
```

Manual production deploy:

```bash
npm ci
npm run synth --workspace @decyphr/aws-infra
npm run deploy --workspace @decyphr/aws-infra -- --require-approval never --outputs-file ../../cdk-public-api-outputs.json
```

Rollback:

1. Revert the PR or commit that introduced the bad stack/Lambda change.
2. Merge the revert to `main`.
3. Confirm `Public API Deploy` completes and reports the expected `PublicApiUrl`.

Manual rollback to a known-good commit:

```bash
git checkout <known-good-sha>
npm ci
npm run deploy --workspace @decyphr/aws-infra -- --require-approval never
```

Failed deploy diagnostics:

```bash
aws cloudformation describe-stack-events \
  --stack-name decyphr-prod-public-api \
  --region <region> \
  --max-items 25 \
  --output table
```

Run the same public API infrastructure locally with Floci:

```bash
npm run floci:start
npm run floci:cdk:bootstrap
npm run floci:cdk:synth
npm run floci:cdk:deploy
```

Run Lambda/API-path integration tests against local DynamoDB:

```bash
npm run floci:test:public-api
```

The Floci path uses dummy AWS credentials and the local endpoint `http://localhost:4566`, so it does not require real AWS credentials.

### Public Flow Cutover

Use this runbook when moving Misneach public waitlist and survey traffic from the EC2-backed services to API Gateway/Lambda/DynamoDB:

1. Deploy `decyphr-prod-public-api` and copy the `PublicApiUrl` output.
2. Dry-run the MariaDB data migration:

```bash
DB_HOST=<mariadb-host> \
DB_PORT=3306 \
DB_USER=<user> \
DB_PASSWORD=<password> \
DB_NAME=<database> \
AWS_REGION=<region> \
npm run migrate:mariadb --workspace public-api
```

3. Write the migration after the counts look right:

```bash
DB_HOST=<mariadb-host> \
DB_PORT=3306 \
DB_USER=<user> \
DB_PASSWORD=<password> \
DB_NAME=<database> \
AWS_REGION=<region> \
npm run migrate:mariadb:write --workspace public-api
```

4. Set `PUBLIC_API_URL` for `misneach-web` to the `PublicApiUrl` value, then redeploy the web app.
5. Smoke-test the deployed public API:

```bash
PUBLIC_API_URL=https://<api-id>.execute-api.<region>.amazonaws.com npm run smoke:public-api
PUBLIC_API_URL=https://<api-id>.execute-api.<region>.amazonaws.com npm run smoke:public-api -- --write
```

6. Stop the EC2-backed services when full application features are idle.

In full app mode, the compose stack and MariaDB-backed services run normally and `API_INTERNAL_URL` handles authenticated/full-product traffic. In public-only mode, Amplify keeps serving `misneach-web`; public waitlist and survey routes continue through the SvelteKit proxies to `PUBLIC_API_URL`, while authenticated or non-public API routes are unavailable until the EC2 stack is started again.

## Deployment Runbook

1. Open or update Issue(s) and assign release metadata.
2. Open PR with linked issue in body (`Closes #123`).
3. Confirm PR validation workflows pass.
4. Merge to `main`.
5. Confirm `Full Application Deploy` succeeds:
   - frontend build validation
   - Docker image publish
   - production compose restart
   - Amplify Misneach web deploy
6. Verify production health:
   - service boot logs
   - external endpoints
   - Kafka/DB dependent services

Manual full-app deploy:

```bash
gh workflow run full-app-deploy.yml --ref main
```

Manual image-only publish:

```bash
gh workflow run backend-images-dockerhub.yml --ref main -f service=all
```

Manual Misneach web deploy:

```bash
gh workflow run web-amplify-deploy.yml --ref main -f branch=main
```

### Single API Entrypoint (Production Compose)

Production exposes backend API traffic through `api-proxy` only:

- `api-proxy` listens on host `:8000` and proxies to `client:8000`.
- `client` is internal-only (`expose`), not host-published.
- Domain services remain internal-only.

Operational checks:

```bash
docker compose --env-file /opt/misneach/.env -f /opt/misneach/docker-compose.prod.yml ps api-proxy client
docker compose --env-file /opt/misneach/.env -f /opt/misneach/docker-compose.prod.yml exec api-proxy wget -q -O - http://127.0.0.1/healthz
docker compose --env-file /opt/misneach/.env -f /opt/misneach/docker-compose.prod.yml exec client node -e "fetch('http://127.0.0.1:8000/health').then(r=>{console.log(r.status);process.exit(r.ok?0:1)}).catch(()=>process.exit(1))"
docker compose --env-file /opt/misneach/.env -f /opt/misneach/docker-compose.prod.yml exec client node -e "fetch('http://127.0.0.1:8000/courses/taster').then(async r=>{console.log(r.status);const j=await r.json();process.exit(r.ok&&j?.lesson?0:1)}).catch(()=>process.exit(1))"
```

### Taster Content Verification

`/courses/taster` is the public source for web taster content.

- Endpoint smoke: `GET /courses/taster` should return `200` with `lesson`.
- Web smoke: `GET /taster` should return `200` and render screens.

If you need to pin a specific taster target in `courses`:

- `COURSES_TASTER_COURSE_SLUG`
- `COURSES_TASTER_LESSON_SLUG`

Defaults use the first lesson in `cafe` when available.

## Rollback Runbook

1. Identify last known good image tags per impacted service.
2. SSH to the production host and redeploy compose with that tag:

```bash
cd /opt/misneach
DOCKERHUB_NAMESPACE=<dockerhub-namespace> IMAGE_TAG=<known-good-sha> \
  docker compose --env-file /opt/misneach/.env -f docker-compose.prod.yml pull
DOCKERHUB_NAMESPACE=<dockerhub-namespace> IMAGE_TAG=<known-good-sha> \
  docker compose --env-file /opt/misneach/.env -f docker-compose.prod.yml up -d --remove-orphans
```

3. Validate compose health:

```bash
DOCKERHUB_NAMESPACE=<dockerhub-namespace> IMAGE_TAG=<known-good-sha> \
  docker compose --env-file /opt/misneach/.env -f docker-compose.prod.yml ps
```

4. Validate dependent services and user-facing paths.
5. If issue persists, disable affected feature path and open `type:infra` incident issue with recovery notes.

Misneach web rollback is done from the Amplify console by redeploying the previous successful job/artifact for the `main` branch, or by reverting the bad PR and letting `Full Application Deploy` run again.

Cleachtadh web and admin web roll back with the compose image tag because they are containerized services in `docker-compose.prod.yml`.

Proxy topology rollback (if needed):

1. Re-publish `client` port mapping in compose (`8000:8000`) and remove/disable `api-proxy`.
2. Redeploy stack.
3. Verify API availability and service health.

## Documentation Contract

For deploy-impacting changes:

- Update this file if deploy mechanics changed.
- Update `deploy/env/examples/*.env.example` and [deploy/env/README.md](../deploy/env/README.md) if config surface changed.
- Include rollout/rollback notes in the linked issue and PR.
