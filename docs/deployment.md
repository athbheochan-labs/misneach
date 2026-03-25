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
   - NLP image independently from `nlp/`
4. Frontend builds run from `frontend-builds.yml` for `web`, `app-web`, and `admin-web`.
5. `web` production deploy is triggered to Amplify by `web-amplify-deploy.yml`.
6. `app-web` and `admin-web` continue with container runtime deployment.

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

## Rollback Runbook

1. Identify last known good image tags per impacted service.
2. Set `IMAGE_TAG` in deployment environment to that known-good SHA.
3. Redeploy compose stack.
4. Validate dependent services and user-facing paths.
5. If issue persists, disable affected feature path and open `type:infra` incident issue with recovery notes.

## Documentation Contract

For deploy-impacting changes:

- Update this file if deploy mechanics changed.
- Update `deploy/env/examples/*.env.example` and [deploy/env/README.md](../deploy/env/README.md) if config surface changed.
- Include rollout/rollback notes in the linked issue and PR.
