# Auth Runbook

This runbook covers rollout verification, observability, and rollback guardrails for the shared backend-owned token auth flow used by `misneach-web` and `cleachtadh-web`.

## Scope

- Backend auth owner: `services/client/src/auth/*`
- Web entrypoints:
  - `apps/misneach-web`
  - `apps/cleachtadh-web`
- Primary user-visible flows:
  - request magic link
  - verify magic link
  - fetch `/auth/me`
  - refresh token
  - logout

## Current Auth Contract

- Magic-link initiation: `POST /auth/login` with `{ email, appBaseUrl? }`
- Magic-link verification to token pair: `POST /auth/login` with `{ email, token }`
- Current user: `GET /auth/me` with bearer token or compatibility session
- Refresh: `POST /auth/refresh`
- Logout: `POST /auth/logout`

Reference docs:

- [Mobile Auth Token Contract](./mobile-auth-token-contract.md)
- [Shared Service Contract Audit](./shared-service-contracts.md)

## Verification Checklist

Run these checks after deploy to staging or production.

### 1. Request a magic link

- Open `misneach-web` login page.
- Submit a known test email.
- Confirm UI returns a pending/sent state.
- Confirm backend logs include:
  - `magic_link_generated`
  - `magic_link_delivered` or `magic_link_delivery_logged`
  - `auth_login_pending`

### 2. Verify the magic link

- Open the received link from the email.
- Confirm redirect reaches:
  - `/dashboard` for completed users, or
  - `/auth/signup` for incomplete learner signup
- Confirm backend logs include:
  - `magic_link_verify_succeeded`
  - `auth_login_succeeded`

### 3. Verify `/auth/me`

- From the web app after login, confirm authenticated pages load normally.
- Spot check `GET /auth/me` through browser devtools or curl with a bearer token.
- Confirm no unexpected spike of:
  - `auth_me_unauthenticated mode=bearer`
  - `auth_me_unauthenticated mode=session`

### 4. Verify refresh

- Keep a logged-in session active long enough to trigger refresh logic, or trigger it manually with a stored refresh token.
- Confirm backend logs include:
  - `auth_refresh_succeeded`
- Confirm no repeated:
  - `auth_refresh_failed`

### 5. Verify logout

- Trigger logout from each web app.
- Confirm the next authenticated request returns logged-out state.
- Confirm backend logs include:
  - `auth_logout_requested`

## Observability

The current implementation uses grep-friendly structured log events rather than a separate metrics pipeline.

### Auth Log Events

- `magic_link_generated`
- `magic_link_delivered`
- `magic_link_delivery_logged`
- `magic_link_verify_succeeded`
- `magic_link_verify_failed`
- `auth_login_pending`
- `auth_login_succeeded`
- `auth_login_failed`
- `auth_refresh_succeeded`
- `auth_refresh_failed`
- `auth_me_unauthenticated`
- `auth_logout_requested`

### Suggested Log Queries

Use container logs for the `client` service.

```bash
docker compose --env-file /opt/misneach/.env -f /opt/misneach/docker-compose.prod.yml logs client --since=30m | rg "magic_link_|auth_login_|auth_refresh_|auth_me_|auth_logout_"
```

Failure-focused query:

```bash
docker compose --env-file /opt/misneach/.env -f /opt/misneach/docker-compose.prod.yml logs client --since=30m | rg "magic_link_verify_failed|auth_login_failed|auth_refresh_failed|auth_me_unauthenticated"
```

### What to Watch

- Increase in `magic_link_verify_failed cause=token_invalid`
- Increase in `magic_link_verify_failed cause=token_expired`
- Increase in `auth_refresh_failed`
- Sustained `auth_me_unauthenticated` events after a deployment
- Missing `magic_link_delivered` after `magic_link_generated`

## Fast Rollback Procedure

If auth regressions are user-visible:

1. Identify the last known good backend image tag for `client`.
2. Set `IMAGE_TAG` in the deployment environment to that SHA.
3. Redeploy the production compose stack.
4. Re-run:
   - magic-link request
   - magic-link verify
   - `/auth/me`
   - logout
5. If frontend behavior is still broken, revert the affected web image(s) as well.

Reference operational commands:

```bash
docker compose --env-file /opt/misneach/.env -f /opt/misneach/docker-compose.prod.yml pull client
docker compose --env-file /opt/misneach/.env -f /opt/misneach/docker-compose.prod.yml up -d client api-proxy cleachtadh-web
docker compose --env-file /opt/misneach/.env -f /opt/misneach/docker-compose.prod.yml logs client --tail=200
```

## Staging Dry-Run Record

Complete this before production rollout:

- Date:
- Branch / PR:
- Environment: `staging`
- Tester:

Checklist:

- Magic link requested successfully on `misneach-web`
- Magic link requested successfully on `cleachtadh-web`
- Verify link completed successfully on `misneach-web`
- Verify link completed successfully on `cleachtadh-web`
- `/auth/me` returned authenticated user after login
- Refresh completed successfully
- Logout completed successfully
- Rollback procedure reviewed and image tag identified

Result:

- Pass / Fail
- Notes:
