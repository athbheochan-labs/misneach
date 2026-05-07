# Mobile Extraction Audit: misneach-web Server-Coupled Responsibilities

- Date: 2026-04-08
- Scope: `apps/misneach-web/src/hooks.server.ts`, all `apps/misneach-web/src/**/+server.ts`, and `apps/misneach-web/src/lib/server/*`
- Goal: identify current server-coupled responsibilities and assign target backend owner for mobile extraction planning.

## hooks.server.ts

| File | Current Responsibility | Target Backend Owner |
| --- | --- | --- |
| `apps/misneach-web/src/hooks.server.ts` | Initializes `event.locals.auth` to `null` for each request; currently no session resolution in this hook. | `client` auth/session module (token verification + user context resolution moved to backend/API layer for mobile) |

## +server.ts Route Handlers

| File | Current Responsibility | Target Backend Owner |
| --- | --- | --- |
| `apps/misneach-web/src/routes/api/waitlist/+server.ts` | Validates waitlist payload (`email`, `interest`, `source`) and proxies `POST /waitlist/join` to upstream API base URL(s). | `waitlist` service (validation + write path), exposed through `client` gateway/API |
| `apps/misneach-web/src/routes/api/surveys/+server.ts` | Entrypoint for survey API root; delegates GET/POST forwarding to surveys proxy helper. | `client` gateway surveys module |
| `apps/misneach-web/src/routes/api/surveys/[...path]/+server.ts` | Path-based survey proxy router; forwards GET/POST with suffix path to upstream surveys endpoints. | `client` gateway surveys module |
| `apps/misneach-web/src/routes/api/courses/[...path]/+server.ts` | Path-based courses proxy router; forwards GET/POST with suffix path to upstream courses endpoints. | `client` gateway courses module |
| `apps/misneach-web/src/routes/api/surveys/+server.ts` and `apps/misneach-web/src/routes/api/surveys/[...path]/+server.ts` (via `_proxy.ts`) | Removes hop-by-hop headers, forwards request bodies, normalizes proxy responses and errors for survey endpoints. | `client` gateway surveys module |
| `apps/misneach-web/src/routes/api/courses/[...path]/+server.ts` (via `_proxy.ts`) | Removes hop-by-hop headers, forwards request bodies, normalizes proxy responses and errors for course endpoints. | `client` gateway courses module |

## src/lib/server/*

| File | Current Responsibility | Target Backend Owner |
| --- | --- | --- |
| `apps/misneach-web/src/lib/server/api.ts` | `nestFetch` helper for server-side calls to upstream `client` API; injects internal auth headers and session-derived identity headers. | `client` gateway/BFF layer (auth context + proxying responsibilities outside cleachtadh-web runtime) |
| `apps/misneach-web/src/lib/server/discounts.ts` | Server-side discount quote client: forwards quote requests to the `client` gateway discount endpoint. | `client` gateway discount endpoint |

## Ownership Summary

- **Primary target owner:** `client` backend gateway/auth modules
- **Domain owners:** `waitlist` service, `discounts` service, `surveys` module, `courses` module
- **Platform boundary:** DB/email operations should remain backend-only, not frontend runtime

## Extraction Notes for Mobile

- The previous local magic-link/JWT implementation has been removed from `misneach-web`; auth now follows the same backend token contract as `cleachtadh-web`.
- Dormant focus/practice frontend stores have been removed from `misneach-web`; no dead `/api/proxy/focus/*` assumptions remain.
- `+server.ts` proxy routes are transport wrappers that should be removed once equivalent backend gateway routes are consumed directly by mobile/web clients.
- `misneach-web` and `cleachtadh-web` now share the same token-based auth contract; remaining mobile extraction work is around proxy reduction, not cookie-session compatibility.
