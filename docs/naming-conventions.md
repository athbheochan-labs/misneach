# Naming Conventions

This note defines naming rules for `apps/`, `services/`, and `packages/`, identifies the current inconsistencies in the repository, and scopes the follow-up rename work that would be needed to make the naming fully uniform.

## Goal

Use names that communicate role first and product second:

- top-level directory names should reveal whether something is an application, service, or shared package
- frontend app names should use product-facing names
- backend service names should use domain/service names
- shared package names should use scoped import names

## Rules

## `apps/`

Use `kebab-case`.

Pattern:

- product apps: `<product>-<surface>`
- role-specific apps: `<role>-web`
- campaign or event apps: `<theme>` or `<product>-<theme>` when product ownership needs to be explicit

Examples:

- `misneach-web`
- `misneach-mobile`
- `cleachtadh-web`
- `cleachtadh-mobile`
- `admin-web`

When to use product names:

- use product names for anything user-facing
- prefer `misneach` and `cleachtadh` over technical names like `web` or `app-web`

When not to use domain names:

- do not name apps after deployment hosts such as `misneach-ie-web`
- domains can change; product identity is more stable

## `services/`

Use `kebab-case`.

Pattern:

- use the business/domain noun for the runtime service
- keep names product-agnostic where the service is shared by multiple products

Examples:

- `client`
- `phrasebook`
- `practice`
- `courses`
- `discounts`
- `waitlist`

Guidelines:

- prefer short domain names over transport-oriented names
- avoid embedding frontend product names in shared backend services unless the service is truly product-specific

## `packages/`

Use `kebab-case` for directories and scoped names for package ids.

Pattern:

- directory: `<capability>`
- package name: `@misneach/<capability>`

Examples:

- `packages/ui` -> `@misneach/ui`
- `packages/auth` -> `@misneach/auth`
- `packages/analytics` -> `@misneach/analytics`
- `packages/email` -> `@misneach/email`

Guidelines:

- use the scope for import identity, not product ownership of runtime behavior
- only place code in `packages/` if it is intentionally shared

## Product Name vs Domain Name

Use product names in:

- app directory names
- visible product copy
- workspace names
- package names when the package scope is organizational rather than product-specific runtime ownership

Use domain/service names in:

- backend runtime service names
- internal architectural docs
- API ownership boundaries

Do not use deployment hostnames as canonical code identifiers.

## Current State

The repository mostly follows the intended pattern now:

### Apps

- `admin-web`
- `cleachtadh-mobile`
- `cleachtadh-web`
- `irish-week`
- `misneach-mobile`
- `misneach-web`

### Services

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

### Packages

- `@misneach/analytics`
- `@misneach/auth`
- `@misneach/email`
- `@misneach/ui`

## Current Inconsistencies

1. `apps/irish-week`
   - directory name is generic event naming
   - workspace name is `misneach-irish-week`
   - this is understandable, but not perfectly aligned

2. `services/translation/translation-connector`
   - nested path differs from the flatter service layout
   - package name `translation-connector` is more integration-oriented than domain-oriented

3. `client`
   - service name is infrastructure/gateway-oriented rather than domain-oriented
   - this is acceptable if it remains the public API gateway abstraction
   - if it evolves into a stricter BFF/API platform layer, a future rename to something like `api-gateway` could be considered, but that is not recommended now

4. `services/nlp`
   - now matches the top-level backend layout
   - still differs operationally because it is a standalone Docker service rather than an npm workspace service

## Follow-Up Rename Work

These are the only follow-up naming changes worth considering from the current state:

1. Decide whether `apps/irish-week` should become `apps/misneach-irish-week`
   - benefit: matches workspace/package identity
   - cost: low-to-medium rename churn for a limited-value cleanup

2. Decide whether `services/translation/translation-connector` should become one of:
   - `services/translator`
   - `services/translation-connector`
   - keep current nested structure intentionally

3. Decide whether `services/nlp` should remain a standalone Docker service outside npm workspace management
   - this is not a naming problem now, but it is still an architectural distinction worth keeping explicit

## Recommendation

Adopt these as the repository rules going forward:

1. new frontend applications must be named `<product>-web`, `<product>-mobile`, or another product-first `kebab-case` variant
2. new backend runtimes must use short domain/service names under `services/`
3. new shared packages must use `@misneach/<name>`
4. do not rename stable services only for theoretical elegance unless there is a concrete clarity or ownership gain

## Practical Conclusion

The naming model is already good enough to standardize without more immediate churn.

The only worthwhile follow-up changes are:

1. make an explicit decision on `irish-week`
2. make an explicit decision on `translation-connector`
3. keep the `services/nlp` standalone-service treatment explicit in docs and tooling
