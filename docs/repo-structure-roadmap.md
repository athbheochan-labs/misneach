# Repo Structure Roadmap

This note defines the target top-level repository layout after the product split, identifies which current entries under `apps/` should move to `services/`, and captures the migration risks and sequencing.

## Goal

Make deployable product surfaces and backend runtimes visibly distinct at the top level:

- `apps/` -> frontend and user-facing applications
- `services/` -> backend/runtime services
- `packages/` -> shared reusable code
- `docs/` -> documentation

This is a planning document only. It does not move code.

## Current Top-Level Inventory

Current entries under `apps/`:

- Frontend/product apps:
  - `admin-web`
  - `cleachtadh-mobile`
  - `cleachtadh-web`
  - `misneach-mobile`
  - `misneach-web`
  - `misneach-irish-week` (`apps/irish-week`)
- Backend/runtime services:
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
  - `waitlist`
- Special case:
  - `translation-connector` under `apps/translation/translation-connector`

## Target Structure

```text
apps/
  admin-web/
  cleachtadh-mobile/
  cleachtadh-web/
  misneach-mobile/
  misneach-web/
  irish-week/

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
  waitlist/
  translation/
    translation-connector/

packages/
  auth/
  analytics/
  email/
  ui/
```

## Proposed Current-to-Target Mapping

| Current Path | Current Role | Target Path | Notes |
| --- | --- | --- | --- |
| `apps/misneach-web` | frontend app | `apps/misneach-web` | no move |
| `apps/cleachtadh-web` | frontend app | `apps/cleachtadh-web` | no move |
| `apps/admin-web` | frontend app | `apps/admin-web` | no move |
| `apps/cleachtadh-mobile` | frontend app | `apps/cleachtadh-mobile` | no move |
| `apps/misneach-mobile` | frontend app | `apps/misneach-mobile` | no move |
| `apps/irish-week` | frontend/microsite | `apps/irish-week` | rename optional; path can stay if brand-specific |
| `apps/client` | backend gateway | `services/client` | highest-priority backend move |
| `apps/business` | backend service | `services/business` | move with compose/workflow updates |
| `apps/challenges` | backend service | `services/challenges` | move with compose/workflow updates |
| `apps/courses` | backend service | `services/courses` | move with compose/workflow updates |
| `apps/discounts` | backend service | `services/discounts` | move with compose/workflow updates |
| `apps/flashcards` | backend service | `services/flashcards` | move with compose/workflow updates |
| `apps/focus` | backend service | `services/focus` | move with compose/workflow updates |
| `apps/lexicon` | backend service | `services/lexicon` | move with compose/workflow updates |
| `apps/payment` | backend service | `services/payment` | move with compose/workflow updates |
| `apps/phrasebook` | backend service | `services/phrasebook` | move with compose/workflow updates |
| `apps/practice` | backend service | `services/practice` | move with compose/workflow updates |
| `apps/waitlist` | backend service | `services/waitlist` | move with compose/workflow updates |
| `apps/translation/translation-connector` | integration service/tooling | `services/translation/translation-connector` | decide if it remains a workspace package or becomes a service-only utility |

## Workspace Strategy

Current root workspaces:

```json
[
  "apps/*",
  "apps/translation/*",
  "libs/*",
  "packages/*"
]
```

Target workspace strategy:

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

- Keep `libs/*` in place until there is a separate decision to rename or absorb it.
- Do not combine `apps/` -> `services/` moves with `libs/` -> `packages/` moves.
- Update workspace globs only in the branch that performs the mechanical path moves, not in this planning ticket.

## Tooling and Runtime Impact

The path split affects more than imports. These areas must be updated together in the mechanical migration:

- `docker-compose.yml`
- `docker-compose.prod.yml`
- `.github/workflows/backend-images-dockerhub.yml`
- `.github/workflows/pr-metadata-guard.yml`
- any scripts or docs that refer to `apps/<backend-service>`
- Docker build contexts and `working_dir` values
- env file references that point into `apps/<service>`
- any CI filters keyed on `apps/**`

Frontend-only workflows already correctly target frontend apps and should stay under `apps/`:

- `.github/workflows/frontend-builds.yml`
- `.github/workflows/web-amplify-deploy.yml`

## Migration Risks

1. Path churn across Docker and CI
   - Compose files and Docker build contexts currently point directly at `apps/<service>`.
   - A partial move will break local boot and production deploys immediately.

2. Workspace resolution drift
   - Root `package.json` workspace globs will need to change atomically with the service moves.
   - Lockfile churn should be expected.

3. Hidden scripts and path assumptions
   - Some scripts, docs, and PR guard rules match literal `apps/<service>` paths.
   - Missed references will create silent CI blind spots.

4. Large rename noise in git history
   - Moving many directories at once will make review harder and can obscure accidental code changes.
   - The implementation branch should be deliberately mechanical.

5. Translation subtree ambiguity
   - `apps/translation/translation-connector` is not shaped like the other backend services.
   - Its target home should be confirmed before the mass move.

## Recommended Sequencing

1. Finish product-boundary and domain work first
   - Keep current repo paths stable while Misneach/Cleachtadh traffic and auth contracts settle.

2. Land this planning document
   - Use it as the source for implementation tickets.

3. Open one mechanical migration ticket
   - Move backend directories from `apps/` to `services/`
   - Update root workspaces, compose files, CI filters, and docs in the same branch

4. Validate the moved structure end-to-end
   - install
   - build
   - docker compose boot
   - backend image workflow path filters

5. Only then consider secondary cleanup
   - `libs/` rationalization
   - service naming normalization
   - further package extraction

## Acceptance Checklist for the Mechanical Move

- all backend runtimes live under `services/`
- all frontend/product apps remain under `apps/`
- root workspaces resolve correctly
- compose files use `services/<name>` paths
- backend CI path filters track `services/**`
- docs no longer describe backend runtimes as app entries

## Follow-Up Tickets

This plan implies three follow-up tracks:

1. `Monorepo: Migrate backend services from apps/ to services/`
2. `Monorepo: Standardize naming conventions for apps, services, and packages`
3. optional: `Monorepo: Reconcile libs/ and packages/ shared-code strategy`
