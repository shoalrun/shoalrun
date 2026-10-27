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

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish and maintain > Audit a docs project

**Updated: 2026-10-26.**

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

## Check agent evaluation reports

Use [`audit.evals`](https://www.shoalrun.com/publish/evals.md) to import reviewed task results and check them against the temporary build. Task definitions, build freshness, citation IDs and publications, criterion judgments, and required outcomes are checked mechanically. Your team runs the agent and owns the review of its answers.

```yaml title="docs.config.yaml"
audit:
  evals:
    tasks: ./evals/tasks.yaml
    report: ./evals/results.json
```

An optional `audit.evals.run` command executes after the build and receives the temporary site path, task/report paths, and their digests through environment variables. This differs from ordinary `audit.tests`, which run before the build. The eval command's exit status and report checks are separate results; passing one does not bypass the other. See [evaluate agent tasks](https://www.shoalrun.com/publish/evals.md) for the format, preparation commands, optional-task behavior, and limits. No evals run unless configured.

## Read the report

The default example produces this shape (counts and source paths depend on the project):

```json
{
  "status": "ok",
  "results": [
    {
      "id": "api:payments:default",
      "status": "ok",
      "findings": [],
      "details": { "source": "/path/to/openapi.yaml", "operations": 1, "rendered": 1, "namedExamples": 7 }
    },
    { "id": "build", "status": "ok", "findings": [], "details": { "documents": 3 } },
    { "id": "focused-contracts", "status": "ok", "findings": [], "details": { "contracts": 1 } }
  ]
}
```

Configured tests have IDs such as `test:project-tests`. Additional API publications use IDs such as `api:payments:publication-0`. A failing result has `status: "error"` and one or more `findings`, each with a `target` and `message`. The top-level status becomes `error`, and the process exits with code `1`. Config or command-line errors occur before a report can be produced; the CLI writes `{"status":"error","message":"..."}` to standard error instead.

Shoalrun audits each configured local OpenAPI source, including sources that are not published. It checks operation IDs, unique HTML field anchors, and named examples in both representations. The build checks project content and writes a temporary site. If the build succeeds, the focused-contract audit checks each generated contract and its Markdown link. If the build fails, the report keeps test and API results and adds a `build` finding; it cannot run the focused-contract audit.

The temporary site is removed after the audit. Like a normal build, this command also writes the generated frontmatter reference and schema to `.shoalrun/` beside the config. Add `.shoalrun/` to your project's `.gitignore`.

These checks cover the rules Shoalrun implements and any tests you supply. A passing audit does not establish the factual accuracy of prose, full OpenAPI semantic fidelity, accessibility conformance, or live deployment behavior. Use the [post-deploy checker](https://www.shoalrun.com/publish/deployment-check.md) for HTTP behavior on a hosted site.

## Related reading

### Next steps

- [Evaluate agent tasks against your docs](https://www.shoalrun.com/publish/evals.md) — Add task definitions and reviewed result reports to the audit.

- [Use Manni with Shoalrun](https://www.shoalrun.com/publish/manni.md) — Add conditional editorial metadata checks through an audit hook.

### Reference while working

- [CLI reference](https://www.shoalrun.com/cli.md) — Look up the audit and api audit commands.

### Often confused with

- [Check a deployed site](https://www.shoalrun.com/publish/deployment-check.md) — The audit checks project sources in CI; the deployment check tests the published site over HTTP.
