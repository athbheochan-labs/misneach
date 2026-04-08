# Architecture Decision Records (ADR)

Use ADRs for decisions that affect architecture, deployment model, or engineering process.

## When to Write an ADR

- Service boundary change
- New integration pattern (sync/async, queue/eventing, API contract direction)
- Deployment topology or environment strategy change
- Significant governance/process change in GitHub workflow

## How to Add

1. Copy [`0000-template.md`](./0000-template.md).
2. Name it `NNNN-short-title.md` (example: `0001-client-service-boundary.md`).
3. Fill all sections, especially consequences and rollback.
4. Link ADR in related PR/issue.

## ADR Index

- [0001: Mobile Delivery via Capacitor Phased Rollout](./0001-mobile-capacitor-phased-rollout.md)
- [0002: Mobile Session Storage Strategy (Keychain/Keystore)](./0002-mobile-session-storage-strategy.md)
