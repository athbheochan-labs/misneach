# apps/mobile

Capacitor container bootstrap for Misneach mobile delivery (Phase 1 hosted-web shell).

## Prerequisites

- Node.js and npm
- Xcode (for iOS)
- Android Studio + SDK (for Android)

## Environment

Create `apps/mobile/.env` from `.env.example` and set:

- `MOBILE_APP_NAME`
- `MOBILE_APP_ID`
- `MOBILE_WEB_URL` (hosted web target)

## Setup

From repo root:

```bash
npm install --workspace mobile
```

From `apps/mobile`:

```bash
npm run cap:add:ios
npm run cap:add:android
npm run cap:sync
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

## Notes

- This is hosted-web mode (`server.url` in `capacitor.config.ts`).
- Bundled-assets mode is planned for later phase once server-coupling extraction is complete.
