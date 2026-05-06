# Mobile Auth API Contract (Token-Based)

- Status: Proposed for implementation
- Scope: Mobile clients (`apps/cleachtadh-mobile`) and any non-browser clients
- Related tickets: Define mobile auth contract (token-based), Build token auth endpoints in backend

## Goal

Define a token-based auth contract for mobile clients that does not depend on browser cookies or server-rendered session state.

This contract introduces four primary endpoints:

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

## Deprecation Statement

Cookie-only session dependency is deprecated for mobile clients.

- Existing cookie/session endpoints may continue for web compatibility.
- Mobile clients must authenticate via bearer access token + refresh token flow.
- New mobile features should assume token auth, not cookie auth.

## Authentication Model

- Access token: short-lived JWT bearer token for API authorization
- Refresh token: longer-lived token used only to obtain new access tokens
- Transport:
  - `Authorization: Bearer <access_token>` for protected endpoints
  - Refresh token sent in request body for `POST /auth/refresh`

## Endpoints

### 1) POST /auth/login

Starts login using email magic-link initiation (or equivalent login initiation mechanism) and returns a pending state.

Request:

```json
{
  "email": "user@example.com"
}
```

Success response (`200`):

```json
{
  "ok": true,
  "status": "pending_verification",
  "message": "Login link sent if account is eligible"
}
```

Validation errors (`400`):

```json
{
  "error": "Invalid email"
}
```

### 2) POST /auth/refresh

Exchanges a valid refresh token for a new access token (and optionally rotated refresh token).

Request:

```json
{
  "refreshToken": "<refresh_token>"
}
```

Success response (`200`):

```json
{
  "ok": true,
  "accessToken": "<jwt>",
  "expiresInSec": 900,
  "refreshToken": "<refresh_token_or_rotated_token>"
}
```

Invalid/expired token (`401`):

```json
{
  "error": "Invalid refresh token"
}
```

### 3) POST /auth/logout

Invalidates the provided refresh token (and associated token family/session).

Request:

```json
{
  "refreshToken": "<refresh_token>"
}
```

Success response (`200`):

```json
{
  "ok": true
}
```

Invalid token/no active session (`200` or `401`, implementation-defined but must be documented and consistent):

```json
{
  "ok": true
}
```

### 4) GET /auth/me

Returns authenticated user profile for a valid bearer access token.

Headers:

```http
Authorization: Bearer <access_token>
```

Success response (`200`):

```json
{
  "loggedIn": true,
  "user": {
    "id": 123,
    "clientId": "uuid",
    "email": "user@example.com",
    "role": "learner",
    "signupComplete": false
  }
}
```

Unauthorized (`401`):

```json
{
  "loggedIn": false,
  "user": null
}
```

## Contract Notes

- Response shape keeps parity with existing `me` semantics where practical.
- Access token lifetime and refresh rotation policy must be finalized in backend implementation ticket.
- Token claims must include fields needed for authorization (`userId`, `clientId`, `role`).
- All auth errors should use normalized API error shape:
  - `{ "error": "<message>" }`

## Compatibility and Migration

- Web cookie flow remains supported during transition.
- Mobile clients should not call cookie/session-only flows.
- Backend implementation should expose both flows until mobile migration is complete, then reduce cookie dependence for non-browser contexts.
