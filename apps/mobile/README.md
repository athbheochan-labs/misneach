# apps/mobile

Capacitor container for Misneach mobile delivery (Phase 2 bundled local assets).

## Prerequisites

- Node.js and npm
- Xcode (for iOS)
- Android Studio + SDK (for Android)

## Environment

Create `apps/mobile/.env` from `.env.example` and set:

- `MOBILE_APP_NAME`
- `MOBILE_APP_ID`
- `MOBILE_USE_HOSTED_WEB` (`false` by default)
- `MOBILE_WEB_URL` (optional rollback target when hosted mode is enabled)

## Setup

From repo root:

```bash
npm install --workspace mobile
```

From `apps/mobile`:

```bash
npm run cap:add:ios
npm run cap:add:android
npm run cap:sync:bundled
```

## Run

iOS:

```bash
npm run cap:open:ios
```

Android:

```bash
npm run cap:open:android
```

## Deep Link Tests (Android)

Launch via app link:

```bash
adb shell am start -a android.intent.action.VIEW -d "https://www.misneach.site/auth/verify-request?token=test&email=test@example.com"
```

Launch via custom scheme:

```bash
adb shell am start -a android.intent.action.VIEW -d "site.misneach.mobile://auth/verify-request?token=test&email=test@example.com"
```

## Notes

- Default mode is bundled assets from `apps/cleachtadh-web/build`.
- `npm run cap:sync:bundled` rebuilds cleachtadh-web in mobile static mode, then syncs native projects.
- Hosted-web fallback can be enabled by setting `MOBILE_USE_HOSTED_WEB=true` and providing `MOBILE_WEB_URL`.
- Deep links are handled in `apps/cleachtadh-web/src/routes/+layout.svelte` using the Capacitor App plugin.

## Mobile telemetry (events + crashes)

- Native runtime sends telemetry to `POST /mobile/telemetry`.
- Captured signals include:
  - app open
  - route views
  - deep-link opens
  - hardware back actions
  - window errors
  - unhandled promise rejections
- To watch ingestion locally:

```bash
docker compose logs -f client | rg -i "MobileTelemetryController|mobile_app|window_error|unhandled_rejection"
```
