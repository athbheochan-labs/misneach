# Decyphr Documentation

This repository keeps operational and engineering documentation versioned with code.

## Documentation Map

- [Deployment and Operations](./deployment.md)
- [Project Management (GitHub)](./project-management.md)
- [System Architecture](./architecture.md)
- [Naming Conventions](./naming-conventions.md)
- [Repo Structure Roadmap](./repo-structure-roadmap.md)
- [Shared Service Contract Audit](./shared-service-contracts.md)
- [Single Entrypoint Roadmap](./single-entrypoint-roadmap.md)
- [Mobile Auth Token Contract](./mobile-auth-token-contract.md)
- [Mobile Capacitor Bootstrap](./mobile-capacitor-bootstrap.md)
- [Mobile Capacitor Bundled Assets](./mobile-capacitor-bundled-assets.md)
- [Mobile Deep Links and Universal/App Links](./mobile-deep-links-universal-links.md)
- [Architecture Decision Records](./adr/README.md)
- [ADR 0002: Mobile Session Storage Strategy](./adr/0002-mobile-session-storage-strategy.md)

## Source of Truth

- Docs in `docs/` are canonical.
- Environment examples in `deploy/env/examples/` are canonical for runtime variables.
- Deployment automation behavior is canonical in `.github/workflows/`.

## Publishing Path (Optional)

If you want a rendered docs site later, publish these same markdown files via MkDocs or Docusaurus.
Keep `docs/` as source-of-truth to avoid process drift.
