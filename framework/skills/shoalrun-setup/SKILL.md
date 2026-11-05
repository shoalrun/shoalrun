---
name: shoalrun-setup
description: Start a Shoalrun documentation project from a working example, configure its first pages or API source, and verify HTML and Markdown output. Use for new Shoalrun sites or a first migration, not routine page edits.
---

# Set up Shoalrun docs

First inspect the target repository for an existing `docs.config.yaml`, content, OpenAPI files, and build scripts. Preserve an existing project rather than copying a starter over it. Ask for missing publication choices only when they affect the first build, such as the intended API version or whether pages are ready to be public.

When adapting existing documentation, start with a connected, representative set of pages. Identify each page's reader goal and choose native structures accordingly: `Fields` for authored configuration or parameter lists, source-backed schemas and references for OpenAPI contracts, `Steps` for titled procedures, and document cards for reading paths. Read the matching bundled component references before writing syntax. Preserve IDs, routes, examples, defaults, bounds, and the distinction between an optional value and a nullable one. A successful build does not establish that these meanings survived.

Use `shoalrun init <directory> --starter minimal` for a small site or `--starter api-docs` for a parcel API site with guides, generated references, and focused contracts. Use `--starter showcase` for a fuller Cedar Parcel handbook with component examples, diagrams, reader views, a landing page, local-workflow cookbook, and generated API references. All three starters build without provider credentials. The command copies a bundled example without overwriting existing files. From the source checkout, use `node framework/dist/cli.js init <directory> --starter <name>` from the repository root. Replace fixture names, prose, API files, navigation, and example domains. Keep `docs.config.yaml` as the entry point. Consult the Shoalrun config reference for unfamiliar keys; do not invent config fields or assume that a package has been published to npm.

For customer-specific or white-label editions, read [the customer-edition workflow](../shoalrun-author/references/customer-editions.md) before configuring selection. Keep the SKU manifest shared and the selected customer profile in its deployment environment. Check CLI support before using `--profile`, preserve strict-classification choices, and use that profile for validation, build, and export. On `0.1.0-alpha.18` or later, `shoalrun dev docs.config.yaml edition-dist --profile /path/to/profile.yaml` builds, serves, and watches that edition; older releases need a profiled build followed by `serve`.

When products need independent releases, read [the publication workflow](../shoalrun-author/references/publications.md). On supported releases, configure `publications.products` with each product's versions, default, and prefix; select exact product coordinates in enabled publications and pages. Don't turn a reader facet into a product catalog unless the task calls for that migration. The package's `example-configs/products` is a fictional multi-product/profile example, not an `init --starter` option.

Run scaffolding from the project directory or use an absolute target path. Passing `--config` does not rebase `scaffold -n` against that config's directory. Resolve scaffold placeholders and remove unused optional sections while retaining the page's intended identity and draft access.

For a specific setting or workflow, run `shoalrun docs search "<topic>"`, then `shoalrun docs read <document-id>` to load the matching generated Markdown. Use these bundled docs before guessing at a command or config key.

Use the installed `shoalrun` command when available. From the source checkout, install dependencies in `framework/` with `npm ci` when missing or changed, compile with `npm run build`, then use `node dist/cli.js` if there is no linked command. Check required tool availability before building; browser checks need a usable browser executable. Work from the project directory or pass the config path explicitly:

```sh
shoalrun config validate docs.config.yaml
shoalrun build docs.config.yaml site-dist
shoalrun serve site-dist
```

`serve` previews the existing build. Use `shoalrun dev docs.config.yaml site-dist` when you need to keep editing with automatic rebuilds. Do not rebuild unchanged input solely to open a preview. A required clean-install release check remains separate from ordinary setup and authoring.

Keep the build output separate from source files: `build` replaces its output directory. For draft pages, follow the authoring snapshot workflow in `guide.authoring-workspace`: capture a baseline before editing, run `docs validate`, then review and preview its captured output. Normal builds exclude drafts; changing working-page access is not a way to make validation pass. Reuse the validated snapshot rather than building a second preview.

For a new OpenAPI source, read `guide.api-references` and complete its API-source review before final validation. For a first import, the minimal starter avoids bindings to the Cedar demo. When adapting api-docs or showcase, replacing the spec alone is insufficient. Update registered operations, authored page operation lists and embeds, navigation, and related links as a connected set. Also update API-specific mappings, query syntax, and discovery settings. Review full-source publication and remove the old review digest. If draft-only pages prevent the normal review command from rendering a candidate, use a separate local review candidate and keep working-page access intact. Pin only a reviewed digest for the same API source and operation selection.

Check the generated HTML, Markdown twins, and `documents.json`. Confirm navigation and API links resolve, and inspect assets inside the components that contain them. Run `shoalrun audit docs.config.yaml` when project checks or API audits are configured; documentation behavior tests can use Doc Detective through `audit.tests` or another external CLI.

For optional semantic search, use `outputs.html.search.provider: semantic` (available since `0.1.0-alpha.16`) with `retrieval.embeddings`; do not generate a custom browser adapter for Shoalrun's own endpoint. Build the site, run `shoalrun index <output> --embed --config docs.config.yaml`, then `shoalrun serve <output> --search --config docs.config.yaml` with the provider key only in the environment. Confirm the endpoint returns `mode: vector`; a visible result or keyword fallback does not prove semantic retrieval. Selecting the browser provider does not provision production hosting, and profiled Vercel chat-function builds remain unsupported.

Report the files created, commands run, and anything still needing an owner decision. Do not deploy, publish a release, or claim factual accuracy from a successful build alone.
