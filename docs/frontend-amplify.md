# Frontend Web Deploy (Amplify)

This runbook deploys `apps/misneach-web` to AWS Amplify Hosting.

## What This Covers

- `apps/misneach-web` deploys via Amplify.
- `cleachtadh-web` and `admin-web` should use frontend hosting targets and are not part of the EC2 production compose runtime.

## Prerequisites

1. Create an Amplify app and connect this GitHub repository. SSR deploys require a connected repository app; disconnected/manual-only Amplify apps cannot deploy the SvelteKit SSR artifact correctly.
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

- Automatic: temporarily disabled while the Amplify app IAM role/build configuration is repaired.
- Manual: run `Web Deploy (Amplify)` workflow and set branch input.
- The deploy workflow starts a connected Amplify branch build with `amplify start-job --job-type RELEASE`; it does not upload a manual zip because Amplify manual deploys do not support SSR apps.
- Deploy workflow smoke checks validate:
  - `GET /taster`
  - `GET /api/courses/taster`
  - survey and waitlist API flows

## Notes

- `apps/misneach-web` now uses `amplify-adapter` in `svelte.config.js`.
- If build fails on missing runtime deps, verify `amplify.yml` includes the install step under `apps/misneach-web/build/compute/default`.
