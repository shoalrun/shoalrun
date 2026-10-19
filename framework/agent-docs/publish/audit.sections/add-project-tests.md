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

## Add project tests

Add `audit` to `docs.config.yaml`. This example assumes your project has a `scripts/docs.test.mjs` file that Node's test runner can execute:

```yaml title="docs.config.yaml"
audit:
  tests:
    - id: project-tests
      run: [node, --test, scripts/docs.test.mjs]
  api: true
  focusedContracts: true
  links: true
```

Each test has a unique lowercase `id` (letters, digits, and hyphens) and a nonempty `run` list of strings. Shoalrun starts the executable in the first item and passes the rest as arguments. It does not invoke a shell, so shell operators, pipes, and redirection do not work in `run`. Tests run in list order from the directory containing the config file. They run before API audits and the build. A failing test does not stop the other tests or audits.

Each test has a two minute timeout. Shoalrun captures its output and includes the last 16,000 characters in a failure finding. Successful test output is omitted from the report. Because the commands are executable code, review test entries before running an unfamiliar project. Set `audit.api: false` to skip local OpenAPI source audits, or `audit.focusedContracts: false` to skip focused-contract checks. Set `audit.links: false` to skip local link checks. All three default to `true`; the build always runs.
