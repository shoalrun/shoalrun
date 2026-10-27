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

## Connect a documentation test suite

`audit.tests` is the hookup for an external test suite. We recommend [Doc Detective](https://docs.doc-detective.com/docs/get-started/how-testing-works) for testing documentation behavior, but you can run any installed command that exits nonzero on failure. Shoalrun passes the arguments and records the process exit status; the tool owns its test specifications, fixtures, assertions, and detailed results. For a project with Doc Detective installed locally and its configuration in `.doc-detective.json` beside `docs.config.yaml`:

```yaml title="docs.config.yaml"
audit:
  tests:
    - id: doc-detective
      run: [npx, --no-install, doc-detective, --config, .doc-detective.json, --exit-on-fail]
```

The `--exit-on-fail` flag matters: Doc Detective's standalone CLI otherwise [can exit successfully when a test fails](https://docs.doc-detective.com/docs/ci/reporters-and-artifacts). `npx --no-install` uses the locally installed package without downloading one during the audit. Configure tests and report artifacts with Doc Detective. Shoalrun's audit report only records the command's success or failure and the end of its output on failure. To use another suite, replace the `run` list with its command and failure-exit option.

Configured test commands run before Shoalrun's temporary site build. If a tool needs a built or deployed site, run it as a separate step after building or deploying. Shoalrun does not define a competing documentation assertion format or CLI, HTTP, or browser test engine.
