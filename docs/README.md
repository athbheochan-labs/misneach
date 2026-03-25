# Decyphr Documentation

This repository keeps operational and engineering documentation versioned with code.

## Documentation Map

- [Deployment and Operations](./deployment.md)
- [Project Management (GitHub)](./project-management.md)
- [System Architecture](./architecture.md)
- [Single Entrypoint Roadmap](./single-entrypoint-roadmap.md)
- [Architecture Decision Records](./adr/README.md)

## Source of Truth

- Docs in `docs/` are canonical.
- Environment examples in `deploy/env/examples/` are canonical for runtime variables.
- Deployment automation behavior is canonical in `.github/workflows/`.

## Publishing Path (Optional)

If you want a rendered docs site later, publish these same markdown files via MkDocs or Docusaurus.
Keep `docs/` as source-of-truth to avoid process drift.
