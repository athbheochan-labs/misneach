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
   - `PUBLIC_API_BASE_URL` = browser-facing API URL
   - `PUBLIC_API_URL` = serverless public waitlist/survey API URL
   - `API_INTERNAL_URL` = primary server-side upstream
   - `API_INTERNAL_URLS` = optional comma-separated fallback upstreams
   - `APP_BASE_URL` = public web URL (for example `https://misneach.ie`)

## Deploy Flows

- Automatic: pushes to `main` that touch application deployment paths trigger [`full-app-deploy.yml`](../.github/workflows/full-app-deploy.yml), which calls [`web-amplify-deploy.yml`](../.github/workflows/web-amplify-deploy.yml).
- Manual: run `Web Deploy (Amplify)` workflow and set branch input.
- Deploy workflow smoke checks validate:
  - `GET /taster`
  - `GET /api/courses/taster`
  - survey and waitlist API flows

## Notes

- `apps/misneach-web` now uses `amplify-adapter` in `svelte.config.js`.
- If build fails on missing runtime deps, verify `amplify.yml` includes the install step under `apps/misneach-web/build/compute/default`.
