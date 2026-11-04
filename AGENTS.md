# Repository working rules

Keep this repository focused on maintained framework source, tests, minimal fixtures, reusable evaluation tools, package documentation, and release notes. Public-site source and deployment tooling live in shoalrun/docs.

Validate relevant behavior locally before every push. Build once per final input set and reuse compiled output. Run npm test when broad regression coverage is warranted; use npm run test:compiled to reuse an existing build. Fix failures and rerun affected checks. Preserve historical evaluation provenance.

Both workflows are manual-only. Do not enable automatic triggers, add runner matrices, or dispatch hosted jobs without explicit authorization. Do not commit credentials, private notes/corpora, historical run dumps, dependencies, caches, or generated build output. Inspect staged files and package inventories before sharing. Retain required licenses/notices.

The docs snapshot in framework/agent-docs is an explicit pinned import. Never fetch arbitrary latest site content during a package build. Run source fixtures locally; site-specific integration tests belong in the docs repository.

Before advising on feature availability, check `framework/package.json`, `framework/CHANGELOG.md`, and the installed package version when working in a consumer project. Unreleased branch changes are not published features. Bundled docs are pinned: inspect `framework/agent-docs/SNAPSHOT.json` and use the current README and source/tests when newer features are absent from that snapshot.

After publishing a package, synchronize its reviewed source and matching version tag to the public repository. Keep unfinished follow-up work on a separate branch. Verify the public default branch and installation examples are current; npm publication alone does not update GitHub. See RELEASING.md.

Release completion requires `framework/scripts/check-release.mjs` with the exact
version, artifact source commit and reviewed integrity. It checks the registry,
remote tag target and remote main ancestry. A local tag or registry-only retry
does not complete source synchronization. Keep the successful report; verify
coordinated website deployment separately before calling the docs live.
