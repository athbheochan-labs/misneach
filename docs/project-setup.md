# GitHub Project Setup (v2)

Use Issues as source-of-truth, and Project as planning/execution view.

## Recommended Project Fields

- `Status`: Backlog, In Progress, In Review, Ready for Deploy, Done
- `Domain`: app, web, admin, backend, infra
- `Type`: feature, bug, infra, chore
- `Priority`: p0, p1, p2
- `Deployment Impact`: frontend, backend, both, none
- `Environment Target`: staging, prod
- `Release Bundle`: free-text parent issue reference (e.g. #123)

## Recommended Views

- Board by `Status`
- Table filtered by `Environment Target = prod`
- Table filtered by `Release Bundle is not empty`

## Automation Rules

- Auto-add new issues and PRs to project.
- On PR merge: move linked issue to `Ready for Deploy`.
- On issue close: move to `Done`.

## Release Bundle Pattern

Create a parent "Release Bundle" issue with checklist of child issues.
Ship only when all checklist items are complete.
