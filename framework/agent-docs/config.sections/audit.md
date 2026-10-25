---
id: reference.config
title: Configuration reference
summary: Configuration settings, defaults, validation rules, and related guides.
type: reference
area: publishing
subarea: publishing-configuration
canonical: /config
---

# Configuration reference

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Reference > Configuration reference

**Updated: 2026-10-24.**

Parent page: [Full Markdown page](/config.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [How Shoalrun works](https://www.shoalrun.com/concepts.md) — Understand publications, stable IDs, and config composition before changing settings.

A project's config starts at `docs.config.yaml`. The CLI looks for that name by default, and `shoalrun scaffold -n` searches parent directories for it. For the configuration workflow, composition rules, and debugging, start with [configure your project](https://www.shoalrun.com/configuration.md). This page lists every top-level key. Keys with a dedicated guide link there for the full rules. For complete, working configs, see [example configs](https://www.shoalrun.com/config/examples.md).

The root file must be a YAML mapping with `schemaVersion: 1`. YAML is parsed strictly: duplicate keys fail. Any top-level key not listed here fails with `unknown setting <key>`. Keys nested inside `site`, `apis`, `publications`, and `outputs` are not all checked yet, so check spelling there carefully.

```yaml title="docs.config.yaml"
schemaVersion: 1
site:
  title: Example documentation
publications:
  defaults: { channel: production, version: current, language: en }
  channels:
    production: { pathPrefix: "" }
  versions:
    current: { pathPrefix: "" }
  enabled:
    - { channel: production, version: current }
navigation: { $include: ./config/nav.yaml }
```

## `audit`

Optional local audit settings. Run `shoalrun check [config]` or `shoalrun audit [config]` to execute configured tests and build a temporary site. The checks compare API representations, inspect focused contracts, and validate local links. `check` prints readable results (`--json` selects JSON); `audit` returns JSON. Both exit with code 1 on failure.

```yaml title="docs.config.yaml"
audit:
  tests:
    - id: project-tests
      run: [node, --test, scripts/docs.test.mjs]
  api: true
  focusedContracts: true
  links: true
```

`audit.tests` is the integration point for external test suites. We recommend Doc Detective for documentation behavior tests; any command that exits nonzero on failure can be used. Each test needs a unique lowercase `id` and a nonempty `run` argument list. The first argument names the executable; the rest are passed without a shell. Commands run from the directory containing `docs.config.yaml`, so use project-relative paths. The `api`, `focusedContracts`, and `links` switches default to `true`. Set any to `false` to skip that group. The site build always runs because it checks the complete project and supplies focused contracts. See [audit a docs project](https://www.shoalrun.com/publish/audit.md) for a Doc Detective example, execution order, output, timeouts, and limits.

For snapshot validation, declare local check dependencies with optional `inputs` paths relative to the directory containing `docs.config.yaml`:

```yaml title="docs.config.yaml"
audit:
  tests:
    - id: formatting
      run: [vale, --config=../format.ini, content]
      inputs: [../format.ini, ../styles]
```

The snapshot copies declared files and directories within the project parent. It rejects missing inputs, symlinks, credentials, dependency folders, and paths outside that boundary. Directory declarations also track added and deleted files for freshness. Declare the configuration's supporting files too; Shoalrun does not infer dependencies from command arguments. Ordinary `check` and `audit` commands still run in the original project.

### Agent evaluation reports

`audit.evals` opts into checking a reviewed task report after the audit's temporary build. Set `tasks` to a YAML or JSON task file and `report` to a JSON result file. Both paths resolve relative to the file declaring them. Optional `run` is a nonempty command/argument list. It runs without a shell from the root config directory after a successful build. The timeout is two minutes; environment variables supply eval paths and digests. It can call external services and write the report; a nonzero exit fails independently of report validation. No evaluator is built into Shoalrun. See [evaluate agent tasks](https://www.shoalrun.com/publish/evals.md) for the report format, environment variables, and CLI commands.
