# Mobile Capacitor Bootstrap

This runbook bootstraps `apps/cleachtadh-mobile` as the Phase 1 hosted-web Capacitor container.

> Superseded for current delivery by `docs/mobile-capacitor-bundled-assets.md` (Phase 3 local assets).

## Goal

- Create iOS and Android shell projects from Capacitor.
- Load hosted web URL (`MOBILE_WEB_URL`) inside the native container.

## Workspace

- Path: `apps/cleachtadh-mobile`
- Config: `apps/cleachtadh-mobile/capacitor.config.ts`

## Environment

Create `apps/cleachtadh-mobile/.env` from `.env.example`:

```bash
cp apps/cleachtadh-mobile/.env.example apps/cleachtadh-mobile/.env
```

Key values:

- `MOBILE_APP_NAME`
- `MOBILE_APP_ID`
- `MOBILE_WEB_URL` (for example `https://www.misneach.site`)

## Commands

From repo root:

```bash
npm install --workspace cleachtadh-mobile
```

From `apps/cleachtadh-mobile`:

```bash
npm run cap:add:ios
npm run cap:add:android
npm run cap:sync
```

Open native projects:

```bash
npm run cap:open:ios
npm run cap:open:android
```

## Notes

- Hosted-web shell mode is configured through `server.url` in `capacitor.config.ts`.
- Bundled asset mode is a later phase and not part of this bootstrap ticket.
