# Frontend Web Deploy (Amplify)

This runbook deploys `apps/web` to AWS Amplify Hosting.

## What This Covers

- `apps/web` deploys via Amplify.
- `app-web` and `admin-web` remain on EC2/container runtime.

## Prerequisites

1. Create an Amplify app and connect this GitHub repository.
2. Configure the app to use repository root as base and [`amplify.yml`](../amplify.yml).
3. In GitHub repository secrets, add:
   - `AMPLIFY_WEB_APP_ID`
   - `AWS_REGION`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
4. In Amplify app environment variables, set any `PUBLIC_*` variables needed by `apps/web`.

## Deploy Flows

- Automatic: pushes to `main` that touch `apps/web/**` trigger [`web-amplify-deploy.yml`](../.github/workflows/web-amplify-deploy.yml).
- Manual: run `Web Deploy (Amplify)` workflow and set branch input.

## Notes

- `apps/web` now uses `amplify-adapter` in `svelte.config.js`.
- If build fails on missing runtime deps, verify `amplify.yml` includes the install step under `apps/web/build/compute/default`.
