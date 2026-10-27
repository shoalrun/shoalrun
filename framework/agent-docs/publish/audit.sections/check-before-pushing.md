---
id: guide.audit
title: Audit a docs project
summary: Run project tests and local API representation checks with one CI command.
type: how-to
area: quality
subarea: quality-audits
canonical: /publish/audit
---

# Audit a docs project

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish > Audit a docs project

**Updated: 2026-10-26.**

Parent page: [Full Markdown page](/publish/audit.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Evaluate agent tasks against your docs](https://www.shoalrun.com/publish/evals.md) — Add task definitions and reviewed result reports to the audit.

- [Use Manni with Shoalrun](https://www.shoalrun.com/publish/manni.md) — Add conditional editorial metadata checks through an audit hook.

Run `shoalrun audit` from a project directory before publishing. The command combines tests that your project configures with Shoalrun's build and API representation checks. It reports each result as JSON and exits with code `1` if any result fails.

From `framework/`, this example needs no extra setup after `npm run build`:

```sh
node dist/cli.js audit example/docs.config.yaml
```

With no `audit` setting, Shoalrun runs the API source and focused-contract audits and builds the site. No project test commands run until you configure them.

## Check before pushing

Run this from your docs project:

```sh
shoalrun check
shoalrun check docs.config.yaml --json
```

The first command discovers `docs.config.yaml` in the current directory or a parent and prints PASS/FAIL results. Use `--json` for a structured report in CI. A failed check exits with code 1. `shoalrun audit` runs the same checks and retains its JSON output.

Checks include configured test commands, local OpenAPI sources, a complete temporary build, focused contracts, and local links. The build validates config, frontmatter, and supported MDX. YAML duplicate keys, excessive alias expansion, and cyclic aliases fail with a source-file diagnostic. OpenAPI inputs must declare a supported 3.0 or 3.1 version, an info title and version, and mapping-shaped paths.

Link checks inspect generated HTML and Markdown. They verify local destinations and HTML fragments, including same-origin absolute links. Markdown fragments are not checked because heading rules vary between readers. Links in code samples are ignored. Built-in checks need no browser or running server and do not fetch external URLs. Existing site output is preserved; normal generated metadata can still be written under `.shoalrun/`.

Add a package script to make the check easy to run:

```json
{ "scripts": { "docs:check": "shoalrun check docs.config.yaml" } }
```

An optional Git pre-push hook can run that script. Put these lines in `.git/hooks/pre-push` and make it executable with `chmod +x .git/hooks/pre-push`:

```sh
#!/bin/sh
exec npm run docs:check
```

The CLI does not install hooks. Configured test commands can perform their own network requests or writes.

To include a dependency check for a project with a package lock, configure:

```yaml
audit:
  tests:
    - id: dependencies
      run: [npm, audit, --omit=dev]
```

This optional command contacts the npm registry. Omit `--omit=dev` to include development dependencies. Commands run beside the docs config; use npm's `--prefix` option when the package lives elsewhere.
