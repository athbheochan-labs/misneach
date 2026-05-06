# Shared Service Contract Audit

This note verifies how `misneach-web` and `cleachtadh-web` currently share backend services, where the contracts are clean, and where product-boundary coupling still exists.

## Summary

- No direct app-to-app imports were found between `misneach-web` and `cleachtadh-web`.
- `cleachtadh-web` is mostly aligned with the target architecture: it talks to shared backend services through the `client` gateway or app-local proxy routes.
- `misneach-web` now uses the same backend-owned token auth flow as `cleachtadh-web` for magic-link issuance and verification.
- Shared backend services are viable for both products, but auth and a few product-specific routes still need cleanup before the split can be considered fully contract-safe.

## Contract Matrix

| Surface | Current Consumer(s) | Access Pattern | Contract Status | Notes |
| --- | --- | --- | --- | --- |
| `client` gateway | `cleachtadh-web`, `misneach-web` | HTTP | Good | Main shared entrypoint. Cleachtadh uses it heavily; Misneach uses it through narrower proxies. |
| `phrasebook` | `cleachtadh-web` | via `client` proxy | Good | No direct app coupling found. Safe shared domain service. |
| `practice` | `cleachtadh-web` | via `client` proxy | Good | Practice remains product-agnostic at the service boundary. |
| `flashcards` | `cleachtadh-web` | via `client` proxy | Good | Shared service boundary is clean. |
| `lexicon` | `cleachtadh-web` | via `client` proxy | Good | Shared service boundary is clean. |
| `focus` | `cleachtadh-web`, dormant in `misneach-web` | via `client` proxy | Mixed | Cleachtadh uses the shared path. Misneach still has a leftover focus store pointing at `/api/proxy`, but no corresponding route. |
| `goals` / `challenges` | `cleachtadh-web` | via `client` proxy | Good | Cleachtadh-only product features at present, but service access pattern is clean. |
| `courses` | `misneach-web`, stubs remain in `cleachtadh-web` | Misneach app-local proxy to `client` | Mixed | Correct owner should be `misneach-web`; Cleachtadh only has redirect stubs now. |
| `surveys` | `misneach-web` | app-local proxy to `client` | Good | Product-specific but contract is still service-based, not app-coupled. |
| `waitlist` | `misneach-web` | app-local proxy to `client` | Good | Product-specific but contract is clean. |
| `business` / onboarding / payment bootstrap | `cleachtadh-web` | via `client` proxy + app-local payment endpoint | Leaking | This looks Misneach-owned but still lives in Cleachtadh routes. |
| Auth token issuance / refresh / verification | both apps | backend `client` auth endpoints | Good | Both products now use the same token bundle contract. |
| Legacy cookie session verification | `cleachtadh-web` only | app-local JWT verification in optional session mode | Mixed | Legacy fallback still exists in Cleachtadh, but Misneach no longer duplicates it. |

## Cleachtadh-Web Findings

### Clean shared-service usage

`cleachtadh-web` is mostly operating as a thin product shell over shared services:

- auth client calls go through `/api/proxy/auth/*`
- practice calls go through `/api/proxy/practice/*`
- flashcards calls go through `/api/proxy/flashcards/*`
- lexicon calls go through `/api/proxy/snapshot/*` and `/api/proxy/lexicon/*`
- phrasebook calls go through `/api/proxy/phrasebook/*`
- mobile telemetry goes through `/api/proxy/mobile/telemetry`

This is the right direction for a multi-product setup.

### Remaining leaks

1. `cleachtadh-web` still contains business onboarding flow under [apps/cleachtadh-web/src/routes/business/setup/+page.svelte](/home/aaronsinnott/Documents/projects/decyphr/apps/cleachtadh-web/src/routes/business/setup/+page.svelte).
2. `cleachtadh-web` still owns an app-local signup payment route under [apps/cleachtadh-web/src/routes/api/auth/signup/payment/+server.ts](/home/aaronsinnott/Documents/projects/decyphr/apps/cleachtadh-web/src/routes/api/auth/signup/payment/+server.ts).

These are product-boundary violations, not service-contract failures.

## Misneach-Web Findings

### Clean shared-service usage

`misneach-web` currently uses app-local proxy routes for:

- `courses`
- `surveys`
- `waitlist`

That is acceptable. The product shell is not importing implementation from Cleachtadh.

### Remaining leaks

1. `misneach-web` hook behavior currently sets `event.locals.auth = null` unconditionally in [apps/misneach-web/src/hooks.server.ts](/home/aaronsinnott/Documents/projects/decyphr/apps/misneach-web/src/hooks.server.ts).
2. `misneach-web` still contains a leftover focus store in [apps/misneach-web/src/lib/stores/focus.ts](/home/aaronsinnott/Documents/projects/decyphr/apps/misneach-web/src/lib/stores/focus.ts) that assumes `/api/proxy/focus/*`, but no such proxy exists in this app.

The remaining issue is not auth duplication anymore. It is that Misneach still has a few leftover UI/runtime assumptions that do not map cleanly to its current product boundary.

## Verified Non-Issues

- No direct imports from `apps/cleachtadh-web` into `apps/misneach-web`
- No direct imports from `apps/misneach-web` into `apps/cleachtadh-web`
- No shared-service calls that depend on app internals rather than HTTP contracts
- No `@misneach/*` package coupling yet, which is expected because the scaffold ticket was intentionally non-migratory

## Recommended Follow-Ups

1. Remove business onboarding flow from Cleachtadh and relocate it under Misneach ownership.
2. Delete or replace Misneach’s leftover focus store if focus is not a Misneach feature.
3. Standardize env naming for shared backend entrypoints so both apps resolve the same gateway contract consistently.

## Verdict

The split is viable.

The backend service model is already mostly compatible with two products. The main remaining risk is not shared-domain-service coupling; it is a handful of routes and runtime leftovers still living in the wrong frontend shell.
