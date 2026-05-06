# ADR 0002: Mobile Session Storage Strategy (Keychain/Keystore)

- Date: 2026-04-08
- Status: Accepted
- Deciders: @aaronsinnott
- Related Issues: TBD
- Related PRs: TBD

## Context

Mobile auth tokens must not rely on browser cookies and need secure at-rest storage on iOS/Android.
For Capacitor delivery, this requires an abstraction that:

- Uses device-backed secure storage on native mobile platforms
- Avoids leaking token handling into route components
- Still works in browser/dev environments without a native runtime

## Decision

Use a dedicated mobile session storage abstraction in `cleachtadh-web`:

- Primary native target: Capacitor secure storage plugin interface (`SecureStoragePlugin`/`SecureStorage`) backed by Keychain (iOS) and Keystore (Android)
- Browser/dev fallback: `localStorage` adapter for non-native runtime only
- Consumer API: `saveAuthSession`, `loadAuthSession`, `clearAuthSession`

Implementation path:

- `apps/cleachtadh-web/src/lib/mobile/session-storage.ts`

## Alternatives Considered

- Store tokens only in cookies
Rejected for mobile-native token flow because HttpOnly cookies are not the mobile contract target.

- Use `sessionStorage` directly in components
Rejected because it spreads security/runtime branching logic across UI code.

- Hard-bind to one plugin package immediately
Rejected for now to avoid coupling web builds to native-only plugin install timing.

## Consequences

- Positive outcomes
  - Clear seam for native secure storage integration
  - Token storage calls are centralized and testable
  - Browser behavior remains available for local development

- Tradeoffs
  - Browser fallback is not secure storage and must remain non-production-mobile only
  - Final native plugin package installation/config is still required in `apps/cleachtadh-mobile` phase

- Operational impact
  - Mobile runtime must provide the secure plugin implementation before app-store release
  - Token lifecycle logic can now depend on one storage API, not platform conditionals everywhere

## Rollback / Reversal Plan

- Keep browser fallback adapter and disable native secure adapter selection.
- If plugin compatibility issues appear, preserve abstraction API and swap native adapter internals without changing route/component callers.

