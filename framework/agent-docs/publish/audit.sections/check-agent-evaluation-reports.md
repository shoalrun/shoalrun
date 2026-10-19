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

**Page reading path** — these links apply to the full page.

**Next steps**

- [Evaluate agent tasks against your docs](https://www.shoalrun.com/publish/evals.md) — Add task definitions and reviewed result reports to the audit.

Run `shoalrun audit` from a project directory before publishing. The command combines tests that your project configures with Shoalrun's build and API representation checks. It reports each result as JSON and exits with code `1` if any result fails.

From `framework/`, this example needs no extra setup after `npm run build`:

```sh
node dist/cli.js audit example/docs.config.yaml
```

With no `audit` setting, Shoalrun runs the API source and focused-contract audits and builds the site. No project test commands run until you configure them.

## Check agent evaluation reports

Use [`audit.evals`](https://www.shoalrun.com/publish/evals.md) to import reviewed task results and check them against the temporary build. Task definitions, build freshness, citation IDs and publications, criterion judgments, and required outcomes are checked mechanically. Your team runs the agent and owns the review of its answers.

```yaml title="docs.config.yaml"
audit:
  evals:
    tasks: ./evals/tasks.yaml
    report: ./evals/results.json
```

An optional `audit.evals.run` command executes after the build and receives the temporary site path, task/report paths, and their digests through environment variables. This differs from ordinary `audit.tests`, which run before the build. The eval command's exit status and report checks are separate results; passing one does not bypass the other. See [evaluate agent tasks](https://www.shoalrun.com/publish/evals.md) for the format, preparation commands, optional-task behavior, and limits. No evals run unless configured.
