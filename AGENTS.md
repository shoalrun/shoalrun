# Repository working rules

Keep this repository focused on maintained framework source, tests, minimal fixtures, reusable evaluation tools, package documentation, and release notes. Public-site source and deployment tooling live in shoalrun/docs.

Validate relevant behavior locally before every push. Build once per final input set and reuse compiled output. Run npm test when broad regression coverage is warranted; use npm run test:compiled to reuse an existing build. Fix failures and rerun affected checks. Preserve historical evaluation provenance.

Both workflows are manual-only. Do not enable automatic triggers, add runner matrices, or dispatch hosted jobs without explicit authorization. Do not commit credentials, private notes/corpora, historical run dumps, dependencies, caches, or generated build output. Inspect staged files and package inventories before sharing. Retain required licenses/notices.

The docs snapshot in framework/agent-docs is an explicit pinned import. Never fetch arbitrary latest site content during a package build. Run source fixtures locally; site-specific integration tests belong in the docs repository.
