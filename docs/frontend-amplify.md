# Frontend Web Deploy (Amplify)

This runbook deploys `apps/misneach-web` to AWS Amplify Hosting.

## What This Covers

- `apps/misneach-web` deploys via Amplify.
- `cleachtadh-web` and `admin-web` remain on EC2/container runtime.

## Prerequisites

1. Create an Amplify app and connect this GitHub repository.
2. Configure the app to use repository root as base and [`amplify.yml`](../amplify.yml).
3. In GitHub repository secrets, add:
   - `AMPLIFY_WEB_APP_ID`
   - `AWS_REGION`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
4. In Amplify app environment variables, set any `PUBLIC_*` variables needed by `apps/misneach-web`.
5. Set web runtime API variables in Amplify environment:
   - `CLIENT_API_URL` = public client API URL (for example `https://api.misneach.site`)
   - `NEST_INTERNAL_URL` = optional fallback (can be same as `CLIENT_API_URL`)
   - `WEB_APP_URL` / `APP_BASE_URL` = public web URL (for example `https://misneach.site`)

## Deploy Flows

- Automatic: pushes to `main` that touch `apps/misneach-web/**` trigger [`web-amplify-deploy.yml`](../.github/workflows/web-amplify-deploy.yml).
- Manual: run `Web Deploy (Amplify)` workflow and set branch input.
- Deploy workflow smoke checks validate:
  - `GET /taster`
  - `GET /api/courses/taster`
  - survey and waitlist API flows

## Notes

- `apps/misneach-web` now uses `amplify-adapter` in `svelte.config.js`.
- If build fails on missing runtime deps, verify `amplify.yml` includes the install step under `apps/misneach-web/build/compute/default`.
