#!/usr/bin/env bash
set -euo pipefail

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Run: gh auth login" >&2
  exit 1
fi

# name|color|description
labels=(
  "type:feature|1D76DB|Net new feature work"
  "type:bug|D73A4A|Bug or regression"
  "type:infra|5319E7|Infrastructure, CI/CD, ops"
  "type:chore|BFD4F2|Maintenance or non-feature work"
  "domain:app|0E8A16|Learner app domain"
  "domain:web|0052CC|Marketing/public web domain"
  "domain:admin|FBCA04|Admin domain"
  "domain:backend|5319E7|Backend/API domain"
  "domain:infra|C2E0C6|Infrastructure/platform domain"
  "priority:p0|B60205|Urgent/critical"
  "priority:p1|D93F0B|High priority"
  "priority:p2|FBCA04|Normal priority"
  "deploy:frontend|0E8A16|Triggers frontend deployment flow"
  "deploy:backend|1D76DB|Triggers backend deployment flow"
  "deploy:both|5319E7|Triggers both frontend and backend flows"
  "deploy:none|BFDADC|No deployment required"
  "env:staging|C5DEF5|Target staging environment"
  "env:prod|D93F0B|Target production environment"
  "release:blocker|B60205|Must be complete before release bundle deploy"
  "status:blocked|D4C5F9|Blocked by external dependency"
)

for item in "${labels[@]}"; do
  IFS='|' read -r name color description <<<"$item"
  gh label create "$name" --color "$color" --description "$description" --force
  echo "Upserted label: $name"
done

echo "Label seeding complete."
