# Single Entrypoint Roadmap (Web -> Client)

This roadmap defines the migration to a single public backend entrypoint for frontend traffic.

## Target State

- Public frontend host (`web`) calls one public API domain only.
- Public API domain routes to `client` service.
- Domain services (`business`, `waitlist`, `discounts`, etc.) are internal-only and not directly exposed to frontend.
- Web runtime no longer requires per-service internal URLs.

## Current vs Target

Current:

- `web` uses direct service proxies for `business` and `waitlist`.
- `app-web` and `admin-web` already call `client`.

Target:

- `web`, `app-web`, and `admin-web` all call `client`.
- `client` owns cross-service orchestration and external-facing API surface.

## Phased Execution

1. Add `client` endpoints for waitlist flows.
2. Add `client` endpoints for web survey/business flows.
3. Refactor `web` routes to call `client` endpoints only.
4. Remove direct service URL dependencies from `web` env config.
5. Restrict public exposure to `client` API entrypoint and frontend hosts.
6. Validate and document rollback/recovery checkpoints.

## Acceptance Criteria

- `web` has no direct runtime dependency on `WAITLIST_API_URL`/`BUSINESS_API_URL`.
- All web integration traffic goes through `client`.
- Public ingress policy exposes only intended entrypoints (`api-proxy` for API).
- Staging and production smoke tests pass for waitlist/survey flows.
- Staging and production smoke tests pass for taster endpoint/page (`/api/courses/taster`, `/taster`).

## Infrastructure Baseline

Production compose baseline includes:

- `api-proxy` (nginx) as single public API ingress.
- `client` exposed only on the internal Docker network.
- Healthchecks for `mariadb`, `redis`, `client`, and `api-proxy`.

## Rollback Strategy

- Keep old web proxy handlers behind feature flag or branch fallback during migration.
- Revert web endpoint targets to previous service URLs if `client` proxy routes regress.
- Roll back `client` endpoint changes by image tag if required.
