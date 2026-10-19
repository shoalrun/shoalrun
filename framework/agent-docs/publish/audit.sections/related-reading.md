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

**Updated: 2026-10-19.**

Parent page: [Full Markdown page](/publish/audit.md)

Run `shoalrun audit` from a project directory before publishing. The command combines tests that your project configures with Shoalrun's build and API representation checks. It reports each result as JSON and exits with code `1` if any result fails.

From `framework/`, this example needs no extra setup after `npm run build`:

```sh
node dist/cli.js audit example/docs.config.yaml
```

With no `audit` setting, Shoalrun runs the API source and focused-contract audits and builds the site. No project test commands run until you configure them.

## Related reading

### Next steps

- [Evaluate agent tasks against your docs](https://www.shoalrun.com/publish/evals.md) — Add task definitions and reviewed result reports to the audit.

### Reference while working

- [CLI reference](https://www.shoalrun.com/cli.md) — Look up the audit and api audit commands.

### Often confused with

- [Check a deployed site](https://www.shoalrun.com/publish/deployment-check.md) — The audit checks project sources in CI; the deployment check tests the published site over HTTP.
