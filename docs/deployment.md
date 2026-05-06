# Deployment and Operations

This project deploys as a multi-service system with containerized backend workloads and split frontend hosting.

## Environments

- Local/dev uses [`docker-compose.yml`](../docker-compose.yml).
- Staging/prod use [`docker-compose.prod.yml`](../docker-compose.prod.yml).
- Production compose expects env files in `/opt/misneach/env` by default, override with `ENV_DIR`.

## Build and Image Flow

GitHub Actions routes deployment behavior from PR labels:

1. PR merge to `main` triggers `Deploy Router`.
2. Router inspects merged PR labels:
   - `deploy:backend` or `deploy:both` dispatches backend image publishing.
   - `deploy:frontend` or `deploy:both` emits frontend deploy event.
   - `env:prod` sets production target, otherwise staging.
3. `Backend Images (Docker Hub)` builds/pushes:
   - Shared runtime image: `misneach-backend-runtime:<sha>`
   - Service tags: `misneach-<service>:<sha>` and `latest`
   - NLP image independently from `services/nlp/`
4. Frontend builds run from `frontend-builds.yml` for `misneach-web`, `cleachtadh-web`, and `admin-web`.
5. `misneach-web` production deploy is triggered to Amplify by `web-amplify-deploy.yml`.
6. `cleachtadh-web` and `admin-web` continue with container runtime deployment.

Relevant workflows:

- [deploy-router.yml](../.github/workflows/deploy-router.yml)
- [backend-images-dockerhub.yml](../.github/workflows/backend-images-dockerhub.yml)
- [frontend-builds.yml](../.github/workflows/frontend-builds.yml)
- [web-amplify-deploy.yml](../.github/workflows/web-amplify-deploy.yml)
- [Frontend Amplify Runbook](./frontend-amplify.md)

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

See: [Environment Files README](../deploy/env/README.md)

## Deployment Runbook

1. Open or update Issue(s) and assign release metadata.
2. Open PR with:
   - linked issue in body (`Closes #123`),
   - exactly one deploy label,
   - optional target env label (`env:staging` or `env:prod`).
3. Merge to `main`.
4. Confirm workflow outcomes:
   - deploy routing decision
   - image publish (backend/nlp as applicable)
   - frontend build/deploy signal as applicable
5. Verify target environment health:
   - service boot logs
   - external endpoints
   - Kafka/DB dependent services

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
2. Set `IMAGE_TAG` in deployment environment to that known-good SHA.
3. Redeploy compose stack.
4. Validate dependent services and user-facing paths.
5. If issue persists, disable affected feature path and open `type:infra` incident issue with recovery notes.

Proxy topology rollback (if needed):

1. Re-publish `client` port mapping in compose (`8000:8000`) and remove/disable `api-proxy`.
2. Redeploy stack.
3. Verify API availability and service health.

## Documentation Contract

For deploy-impacting changes:

- Update this file if deploy mechanics changed.
- Update `deploy/env/examples/*.env.example` and [deploy/env/README.md](../deploy/env/README.md) if config surface changed.
- Include rollout/rollback notes in the linked issue and PR.
