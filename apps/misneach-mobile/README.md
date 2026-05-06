# apps/misneach-mobile

Capacitor shell for the Misneach course experience.

This scaffold is intentionally hosted-web first. It loads `misneach.ie` inside a native container until a dedicated bundled mobile build is needed.

## Environment

Create `apps/misneach-mobile/.env` from `.env.example` and set:

- `MOBILE_APP_NAME`
- `MOBILE_APP_ID`
- `MOBILE_USE_HOSTED_WEB`
- `MOBILE_WEB_URL`

Default values target:

- app name: `Misneach`
- app id: `ie.misneach.app`
- hosted web URL: `https://misneach.ie`

## Setup

From repo root:

```bash
npm install --workspace misneach-mobile
```

From `apps/misneach-mobile`:

```bash
npm run cap:add:ios
npm run cap:add:android
npm run cap:sync
```

## Notes

- This app is scaffold-only for now.
- `misneach-web` remains the primary delivery surface for course and business flows.
- When native-specific Misneach mobile work begins, this shell can either continue in hosted-web mode or move to a bundled-web/mobile-specific build path.
