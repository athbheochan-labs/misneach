# Frontend Web Deploy (Amplify)

This runbook deploys `apps/misneach-web` to AWS Amplify Hosting.

## What This Covers

- `apps/misneach-web` deploys via Amplify.
- `cleachtadh-web` and `admin-web` should use frontend hosting targets and are not part of the EC2 production compose runtime.

## Prerequisites

1. Create an Amplify app and connect this GitHub repository. SSR deploys require a connected repository app; disconnected/manual-only Amplify apps cannot deploy the SvelteKit SSR artifact correctly.
2. Configure the app to use repository root as base and [`amplify.yml`](../amplify.yml).
3. Set the monorepo app root to `apps/misneach-web`. The deploy workflow also enforces `AMPLIFY_MONOREPO_APP_ROOT=apps/misneach-web` before starting a release.
4. In GitHub repository secrets, add:
   - `AMPLIFY_WEB_APP_ID`
   - `AWS_REGION`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
5. Ensure the AWS deploy user can call these Amplify actions for the app:
   - `amplify:GetApp`
   - `amplify:UpdateApp`
   - `amplify:StartJob`
   - `amplify:GetJob`
   - `amplify:GetBranch`
6. In Amplify app environment variables, set any `PUBLIC_*` variables needed by `apps/misneach-web`.
7. Set web runtime API variables in Amplify environment:
   - `PUBLIC_API_BASE_URL` = browser-facing API URL
   - `PUBLIC_SURVEY_QR_BASE_URL` = public base URL for survey QR links
   - `PUBLIC_API_URL` = serverless public waitlist/survey API URL
   - `API_INTERNAL_URL` = primary server-side upstream
   - `API_INTERNAL_URLS` = optional comma-separated fallback upstreams
   - `BUSINESS_INTERNAL_URL` = business/onboarding upstream
   - `BUSINESS_INTERNAL_URLS` = optional comma-separated fallback upstreams
   - `WAITLIST_API_URL` = optional waitlist upstream override
   - `WAITLIST_API_URLS` = optional comma-separated waitlist fallback upstreams
   - `SURVEYS_API_URL` = optional surveys upstream override
   - `SURVEYS_API_URLS` = optional comma-separated surveys fallback upstreams
   - `INTERNAL_AUTH_SECRET` = shared internal auth secret used by server-side API calls
   - `APP_BASE_URL` = public web URL (for example `https://misneach.ie`)

## Deploy Flows

- Automatic: pushes to `main` that touch production application paths trigger [`full-app-deploy.yml`](../.github/workflows/full-app-deploy.yml), which deploys backend compose first and then calls [`web-amplify-deploy.yml`](../.github/workflows/web-amplify-deploy.yml).
- Manual: run `Web Deploy (Amplify)` workflow and set branch input.
- The deploy workflow applies [`amplify.yml`](../amplify.yml), verifies the Amplify app root is `apps/misneach-web`, then starts a connected Amplify branch build with `amplify start-job --job-type RELEASE`.
- It does not upload a manual zip because Amplify manual deploys do not support SSR apps.
- Deploy workflow smoke checks validate:
  - `GET /taster`
  - `GET /api/courses/taster`
  - survey and waitlist API flows

## Notes

- `apps/misneach-web` now uses `amplify-adapter` in `svelte.config.js`.
- If build fails on missing runtime deps, verify `amplify.yml` includes the install step under `apps/misneach-web/build/compute/default`.

Rollback:

1. Open the Amplify app for `misneach-web`.
2. Select branch `main`.
3. Redeploy the last known-good successful job, or revert the bad commit and let `Full Application Deploy` run again from `main`.
