# Mobile Capacitor Bundled Assets

This runbook switches mobile delivery to local bundled web assets (Phase 3).

## What changed

- Capacitor default mode now loads local files from `apps/app-web/build`.
- `server.url` hosted mode is now an opt-in rollback path.
- `app-web` has a dedicated mobile build command using static adapter mode.

## Build and sync

From repo root:

```bash
npm install --workspace app-web --workspace mobile
npm run cap:sync:bundled --workspace mobile
```

## Run Android

From `apps/mobile`:

```bash
npm run cap:run:android
```

## Optional rollback to hosted mode

Set in `apps/mobile/.env`:

```bash
MOBILE_USE_HOSTED_WEB=true
MOBILE_WEB_URL=https://www.misneach.site
```

Then run:

```bash
npm run cap:sync --workspace mobile
```
