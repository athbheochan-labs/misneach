# Project Management (GitHub)

Issues are source-of-truth. GitHub Project is execution view.

## Issue Types

Use the existing templates:

- `Feature`
- `Bug`
- `Infra`
- `Release Bundle` (parent issue for grouped deployment)

Templates live in `.github/ISSUE_TEMPLATE/`.

## Required Labels and Metadata

- Exactly one deploy label on PR:
  - `deploy:frontend`
  - `deploy:backend`
  - `deploy:both`
  - `deploy:none`
- Optional environment label:
  - `env:staging`
  - `env:prod`
- PR body must link an issue (`Closes #<id>` or equivalent).

Validation is enforced by [pr-metadata-guard.yml](../.github/workflows/pr-metadata-guard.yml).

## Recommended Project Fields

- `Status`: Backlog, In Progress, In Review, Ready for Deploy, Done
- `Domain`: app, web, admin, backend, infra
- `Type`: feature, bug, infra, chore
- `Priority`: p0, p1, p2
- `Deployment Impact`: frontend, backend, both, none
- `Environment Target`: staging, prod
- `Release Bundle`: parent issue reference (e.g. `#123`)

## Recommended Views

- Board grouped by `Status`
- Table filtered by `Environment Target = prod`
- Table filtered by `Release Bundle is not empty`

## Automation Behavior

- New issues and PRs should auto-add to project.
- Merged PR routes deployment from labels via `deploy-router.yml`.
- Linked issues move to `Ready for Deploy` on merge, then to `Done` on close.

## Release Bundle Workflow

1. Create parent issue from `Release Bundle` template.
2. Add blocking child issues as checklist items.
3. Ensure rollout and rollback plan fields are complete.
4. Merge child PRs with correct deploy/environment labels.
5. Execute deploy once release criteria are satisfied.
6. Close parent bundle when validation is complete.

## Contributor Contract

- Every deploy-impact PR must include:
  - linked issue,
  - deploy/env metadata,
  - documentation impact declaration in PR template.
