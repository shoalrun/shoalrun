---
name: shoalrun-setup
description: Start a Shoalrun documentation project from a working example, configure its first pages or API source, and verify HTML and Markdown output. Use for new Shoalrun sites or a first migration, not routine page edits.
---

# Set up Shoalrun docs

First inspect the target repository for an existing `docs.config.yaml`, content, OpenAPI files, and build scripts. Preserve an existing project rather than copying a starter over it. Ask for missing publication choices only when they affect the first build, such as the intended API version or whether pages are ready to be public.

Use `shoalrun init <directory> --starter minimal` for a small site or `--starter api-docs` for a parcel API site with guides, generated references, and focused contracts. The command copies a bundled example without overwriting existing files. From the source checkout, use `node framework/dist/cli.js init <directory> --starter <name>` from the repository root. Replace fixture names, prose, API files, navigation, and example domains. Keep `docs.config.yaml` as the entry point. Consult the Shoalrun config reference for unfamiliar keys; do not invent config fields or assume that a package has been published to npm.

For a specific setting or workflow, run `shoalrun docs search "<topic>"`, then `shoalrun docs read <document-id>` to load the matching generated Markdown. Use these bundled docs before guessing at a command or config key.

Use the installed `shoalrun` command when available. From the source checkout, run `npm ci` and `npm run build` in `framework/`, then use `node dist/cli.js` if there is no linked command. Work from the project directory or pass the config path explicitly:

```sh
shoalrun config validate docs.config.yaml
shoalrun build docs.config.yaml site-dist
shoalrun dev docs.config.yaml site-dist
```

Keep the build output separate from source files: `build` replaces its output directory. Check at least one generated HTML page, its `.md` twin, and `documents.json`. Confirm navigation and any API operation links resolve to the intended publication. Run `shoalrun audit docs.config.yaml` when project checks or API audits are configured; documentation behavior tests can use Doc Detective through `audit.tests` or another external CLI.

Report the files created, commands run, and anything still needing an owner decision. Do not deploy, publish a release, or claim factual accuracy from a successful build alone.
