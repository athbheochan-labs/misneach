# Mobile Extraction Audit: app-web Server-Coupled Responsibilities

- Date: 2026-04-08
- Scope: `apps/web/src/hooks.server.ts`, all `apps/web/src/**/+server.ts`, and `apps/web/src/lib/server/*`
- Goal: identify current server-coupled responsibilities and assign target backend owner for mobile extraction planning.

## hooks.server.ts

| File | Current Responsibility | Target Backend Owner |
| --- | --- | --- |
| `apps/web/src/hooks.server.ts` | Initializes `event.locals.auth` to `null` for each request; currently no session resolution in this hook. | `client` auth/session module (token verification + user context resolution moved to backend/API layer for mobile) |

## +server.ts Route Handlers

| File | Current Responsibility | Target Backend Owner |
| --- | --- | --- |
| `apps/web/src/routes/api/waitlist/+server.ts` | Validates waitlist payload (`email`, `interest`, `source`) and proxies `POST /waitlist/join` to upstream API base URL(s). | `waitlist` service (validation + write path), exposed through `client` gateway/API |
| `apps/web/src/routes/api/surveys/+server.ts` | Entrypoint for survey API root; delegates GET/POST forwarding to surveys proxy helper. | `client` gateway surveys module |
| `apps/web/src/routes/api/surveys/[...path]/+server.ts` | Path-based survey proxy router; forwards GET/POST with suffix path to upstream surveys endpoints. | `client` gateway surveys module |
| `apps/web/src/routes/api/courses/[...path]/+server.ts` | Path-based courses proxy router; forwards GET/POST with suffix path to upstream courses endpoints. | `client` gateway courses module |
| `apps/web/src/routes/api/surveys/+server.ts` and `apps/web/src/routes/api/surveys/[...path]/+server.ts` (via `_proxy.ts`) | Removes hop-by-hop headers, forwards request bodies, normalizes proxy responses and errors for survey endpoints. | `client` gateway surveys module |
| `apps/web/src/routes/api/courses/[...path]/+server.ts` (via `_proxy.ts`) | Removes hop-by-hop headers, forwards request bodies, normalizes proxy responses and errors for course endpoints. | `client` gateway courses module |

## src/lib/server/*

| File | Current Responsibility | Target Backend Owner |
| --- | --- | --- |
| `apps/web/src/lib/server/api.ts` | `nestFetch` helper for server-side calls to upstream `client` API; injects internal auth headers and session-derived identity headers. | `client` gateway/BFF layer (auth context + proxying responsibilities outside app-web runtime) |
| `apps/web/src/lib/server/auth.ts` | Signs/verifies JWT session cookie claims (`web_session`) using `WEB_SESSION_SECRET`. | `client` auth service (token/session issuance + verification), with app-web reduced to token transport only |
| `apps/web/src/lib/server/db.ts` | Creates and exports MySQL pool for direct DB access from web runtime. | Platform-owned DB access only from backend services; remove direct DB dependency from app-web |
| `apps/web/src/lib/server/magic-link.ts` | User lookup/create, table discovery, default language setup, magic-link issuance/verification, and email delivery via Resend; direct DB writes/reads and token hashing. | `client` auth service (or dedicated auth backend) owning magic-link + DB + email workflows |
| `apps/web/src/lib/server/discounts.ts` | Server-side discount quote client: forwards quote request to `discounts` service with internal auth header support. | `discounts` service + `client` gateway endpoint (web/mobile consume gateway contract only) |

## Ownership Summary

- **Primary target owner:** `client` backend gateway/auth modules
- **Domain owners:** `waitlist` service, `discounts` service, `surveys` module, `courses` module
- **Platform boundary:** DB/email operations should remain backend-only, not app-web runtime

## Extraction Notes for Mobile

- `magic-link.ts` and `db.ts` are the highest-risk mobile blockers because they embed backend data/email logic in web runtime.
- `+server.ts` proxy routes are transport wrappers that should be removed once equivalent backend gateway routes are consumed directly by mobile/web clients.
- `auth.ts` cookie session assumptions should be replaced by token-based mobile contract while preserving web compatibility during transition.
