# ADR 0001: Mobile Delivery via Capacitor Phased Rollout

- Date: 2026-04-08
- Status: Accepted
- Deciders: @aaronsinnott
- Related Issues: TBD
- Related PRs: TBD

## Context

Misneach needs a mobile app path that can ship quickly without blocking on full backend extraction from the current web runtime coupling. The current web stack still has server-coupled behavior (auth/session handling, proxy routes, and backend-adjacent logic) that makes a direct jump to fully bundled mobile assets high risk.

The team needs a rollout model that:

- Delivers an installable app shell quickly
- Preserves existing product velocity
- Reduces architecture risk through staged extraction
- Provides a clear gate for when to switch from hosted web to bundled assets

## Decision

Adopt a three-phase Capacitor rollout:

1. Hosted-web shell
Use Capacitor as a native container that loads the deployed web app URL with environment switching and health fallback handling.

2. Auth/API extraction
Systematically remove mobile-critical dependencies on SvelteKit server runtime by moving auth/API proxy/backend-adjacent responsibilities into backend services and a stable API contract for mobile clients.

3. Bundled app
Switch Capacitor runtime from hosted URL mode to bundled local web assets once extraction criteria are met and parity is validated.

Phase gates:

- Phase 1 -> Phase 2 gate: Mobile token auth contract and backend endpoints are in place; mobile-safe session storage abstraction exists.
- Phase 2 -> Phase 3 gate: App no longer depends on app-web server routes for mobile-critical flows; parity smoke tests pass for auth, dashboard, courses, practice, and payments.

## Alternatives Considered

- Direct native rewrite first (Swift/Kotlin or React Native)
Rejected for now due to longer time-to-value and duplicated surface area while web product is still evolving.

- Bundle local assets immediately in Capacitor
Rejected for now because current server coupling would force parallel high-risk extraction and packaging work.

- Keep web-only and defer mobile entirely
Rejected because it delays app-store distribution and mobile adoption goals.

## Consequences

- Positive outcomes
  - Fastest path to an app-store-capable shell
  - Lower delivery risk through staged architecture changes
  - Clear sequence for backend extraction before bundled mode

- Negative outcomes or tradeoffs
  - Phase 1 depends on hosted web availability/network quality
  - Operational complexity during transition (web + mobile parity management)
  - Additional discipline required around phase-gate criteria

- Operational impact
  - Backend ownership expands to include mobile auth/API contracts
  - QA must run parity checks across web and mobile during transitions
  - Deployment/docs must track which phase is active per environment

## Rollback / Reversal Plan

- If hosted-web Capacitor rollout underperforms, keep web as the primary channel while preserving mobile shell as an internal/beta build.
- If extraction scope expands beyond planned boundaries, pause at current phase and re-baseline remaining server-coupling tickets before Phase 3 cutover.
- If bundled mode introduces regressions, revert Capacitor to hosted URL mode and redeploy while parity issues are addressed.
