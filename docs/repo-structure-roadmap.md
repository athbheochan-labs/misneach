# Repo Structure Roadmap

This note documents the top-level repository structure after separating frontend applications from backend runtime services, captures the migration intent that drove the split, and records the remaining follow-up work.

## Goal

Make deployable product surfaces and backend runtimes visibly distinct at the top level:

- `apps/` -> frontend and user-facing applications
- `services/` -> backend/runtime services
- `packages/` -> shared reusable code
- `docs/` -> documentation

The `apps/` -> `services/` migration is now complete for the workspace-backed backend runtimes covered by `#188`.

## Current Top-Level Inventory

Frontend and user-facing applications under `apps/`:

- `admin-web`
- `cleachtadh-mobile`
- `cleachtadh-web`
- `irish-week`
- `misneach-mobile`
- `misneach-web`

Backend/runtime services under `services/`:

- `business`
- `challenges`
- `client`
- `courses`
- `discounts`
- `flashcards`
- `focus`
- `lexicon`
- `payment`
- `phrasebook`
- `practice`
- `translation/translation-connector`
- `waitlist`

Separate top-level runtime still outside `services/`:

- `nlp/`

## Target Structure

```text
apps/
  admin-web/
  cleachtadh-mobile/
  cleachtadh-web/
  irish-week/
  misneach-mobile/
  misneach-web/

services/
  business/
  challenges/
  client/
  courses/
  discounts/
  flashcards/
  focus/
  lexicon/
  payment/
  phrasebook/
  practice/
  translation/
    translation-connector/
  waitlist/
  nlp/                    # follow-up move, not yet completed

packages/
  analytics/
  auth/
  email/
  ui/
```

## Current-to-Target Mapping

| Current Path | Current Role | Target Path | Status | Notes |
| --- | --- | --- | --- | --- |
| `apps/misneach-web` | frontend app | `apps/misneach-web` | current | no move |
| `apps/cleachtadh-web` | frontend app | `apps/cleachtadh-web` | current | no move |
| `apps/admin-web` | frontend app | `apps/admin-web` | current | no move |
| `apps/cleachtadh-mobile` | frontend app | `apps/cleachtadh-mobile` | current | no move |
| `apps/misneach-mobile` | frontend app | `apps/misneach-mobile` | current | no move |
| `apps/irish-week` | frontend/microsite | `apps/irish-week` | current | rename optional; path can stay if brand-specific |
| `apps/client` | backend gateway | `services/client` | completed | moved in `#188` |
| `apps/business` | backend service | `services/business` | completed | moved in `#188` |
| `apps/challenges` | backend service | `services/challenges` | completed | moved in `#188` |
| `apps/courses` | backend service | `services/courses` | completed | moved in `#188` |
| `apps/discounts` | backend service | `services/discounts` | completed | moved in `#188` |
| `apps/flashcards` | backend service | `services/flashcards` | completed | moved in `#188` |
| `apps/focus` | backend service | `services/focus` | completed | moved in `#188` |
| `apps/lexicon` | backend service | `services/lexicon` | completed | moved in `#188` |
| `apps/payment` | backend service | `services/payment` | completed | moved in `#188` |
| `apps/phrasebook` | backend service | `services/phrasebook` | completed | moved in `#188` |
| `apps/practice` | backend service | `services/practice` | completed | moved in `#188` |
| `apps/waitlist` | backend service | `services/waitlist` | completed | moved in `#188` |
| `apps/translation/translation-connector` | integration service/tooling | `services/translation/translation-connector` | completed | still nested |
| `nlp` | standalone runtime service | `services/nlp` | pending | separate follow-up move |

## Workspace Strategy

Root workspaces now distinguish application and service boundaries explicitly:

```json
[
  "apps/*",
  "services/*",
  "services/translation/*",
  "libs/*",
  "packages/*"
]
```

Notes:

- `libs/*` remains unchanged for now.
- `packages/*` is reserved for code intentionally shared across products or runtimes.
- The `translation` subtree remains nested because `translation-connector` is not yet shaped like the other top-level services.
- `nlp/` is still outside npm workspace management and should be treated as a separate structural follow-up.

## Tooling and Runtime Impact

The path split required coordinated updates in:

- `package.json`
- `package-lock.json`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `docker/Dockerfile.backend`
- `.github/workflows/backend-images-dockerhub.yml`
- docs and file references that pointed at `apps/<backend-service>`

Frontend-only workflows remain correctly scoped to application entries under `apps/`:

- `.github/workflows/frontend-builds.yml`
- `.github/workflows/web-amplify-deploy.yml`

## Migration Risks That Remain

1. Top-level `nlp` inconsistency
   - `nlp/` is still outside `services/`.
   - That leaves the top-level structure conceptually inconsistent until it is moved.

2. Translation subtree ambiguity
   - `services/translation/translation-connector` does not match the flatter shape of the other runtime services.
   - It may remain acceptable, but it should be an explicit choice.

3. Shared-code boundary drift
   - `libs/` and `packages/` now coexist.
   - Without a deliberate rule, future code may be placed inconsistently.

4. Rename noise in future review
   - Any follow-up path moves should stay mechanical and isolated.
   - Mixing structure work with behavior changes will make regressions harder to see.

## Acceptance Checklist for the Completed Move

- backend runtimes covered by `#188` now live under `services/`
- frontend/product apps remain under `apps/`
- root workspaces resolve `services/*`
- compose files use `services/<name>` paths
- backend CI path filters track `services/**`
- docs no longer describe migrated backend runtimes as app entries

## Residual Follow-Up Work

1. Move `nlp/` to `services/nlp`
   - keep this as a separate mechanical change

2. Standardize naming conventions
   - decide whether `irish-week` should remain under that path or be renamed for consistency
   - decide whether `translation/translation-connector` should stay nested or move to something flatter such as `services/translator`

3. Reconcile `libs/` and `packages/`
   - keep them distinct unless there is a deliberate consolidation plan
   - do not combine that refactor with more path churn

4. Verify deployment/docs drift periodically
   - any new backend service should be added under `services/`
   - any new user-facing application should be added under `apps/`

## Repository Rule Going Forward

- If it is a deployable user-facing application, place it under `apps/`.
- If it is a deployable backend/runtime service, place it under `services/`.
- If it is imported shared code rather than a runtime, place it under `packages/` or `libs/` according to the existing shared-code strategy.
