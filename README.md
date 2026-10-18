# Shoalrun

Shoalrun builds documentation for people and agents from shared content. The framework and private @shoalrun/cli package live here; the website is maintained independently in https://github.com/shoalrun/docs. Public documentation: https://www.shoalrun.com.

## Develop locally

Use Node.js 22.12 or newer. Install Chrome or allow Puppeteer to install its development browser for UI tests. Vale 3.20 or newer is used by the formatting-rule tests.

~~~sh
npm ci --prefix framework
npm --prefix framework run build
npm run test:compiled
npm run authoring:package-check
~~~

Run npm test to compile and run the full suite together. Reuse compiled output for follow-up checks when inputs are unchanged. No hosted workflow runs automatically; hosted execution requires explicit authorization.

## Documentation and examples

The framework includes runnable starters and maintained examples under framework/example-configs and framework/examples. Use the pinned offline snapshot through node framework/dist/cli.js docs search or docs read. Snapshot provenance is in framework/agent-docs/SNAPSHOT.json.

Import only an explicitly reviewed snapshot exported by the docs repo with npm run agent-docs:import -- PATH --source-commit FULL_DOCS_COMMIT. The importer verifies page/section digests and recorded provenance before replacing the bundled snapshot. It never downloads latest website content. Site-specific browser/integration checks remain in the docs repo; this repository checks portable behavior and snapshot integrity.

Reusable offline evaluation tooling is in eval/. Provider-backed studies are opt-in and require separate credentials/budgets; normal tests use offline fixtures. Historical private reports, source-repo history, personal instructions and local deployment state are not part of this source selection.

See framework/README.md for package installation and API details. Package releases, pushes and deployments remain separate actions.
