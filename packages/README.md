# Shared Packages

Scaffolded workspace packages for code shared between `misneach-web` and `cleachtadh-web`.

Current packages:
- `@misneach/ui`
- `@misneach/auth`
- `@misneach/analytics`
- `@misneach/email`

This scaffold intentionally does not move runtime code yet. The next extraction steps should add
workspace dependencies to consuming apps only when shared modules are actually moved here.
