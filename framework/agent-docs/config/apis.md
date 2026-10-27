---
id: reference.config-apis
title: API and audit settings
summary: Configure OpenAPI sources, generated references, focused contracts, and
  local validation.
type: reference
area: publishing
subarea: publishing-configuration
canonical: /config/apis
---

# API and audit settings

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Reference > Configuration reference > API and audit

**Updated: 2026-10-27.**

Configure OpenAPI sources, generated references, focused contracts, and local validation. These keys belong in `docs.config.yaml` or an included configuration file. For file composition and validation commands, see [Configure your project](https://www.shoalrun.com/configuration.md). Use the [configuration index](https://www.shoalrun.com/config.md) to find another setting.

## `apis`

A mapping from API ID to its source and operations. See [API references](https://www.shoalrun.com/publish/api-references.md) and [focused contracts](https://www.shoalrun.com/api-docs/focused-contracts.md).

| Key                         | Meaning                                                                                                                                                                                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source.kind`               | Must be `file`.                                                                                                                                                                                                                                    |
| `source.path`               | Local OpenAPI 3.0 or 3.1 file, relative to the declaring config file.                                                                                                                                                                              |
| `source.focused`            | `true` writes a [focused contract](https://www.shoalrun.com/api-docs/focused-contracts.md) for each reference page.                                                                                                                                |
| `source.publish`            | `true` publishes the full source file, which must end in `.yaml`, `.yml`, or `.json`. Also turns on focused contracts.                                                                                                                             |
| `publicReview.digest`       | Required SHA-256 review digest when API content appears on a public page or in a focused contract. Generate a candidate with `shoalrun api review <config> --output <local-directory>`, inspect it, then pin the reported digest.                  |
| `discovery.endpoint`        | Public HTTPS API URL for `/.well-known/api-catalog`. Needs `source.publish` and `site.origin`.                                                                                                                                                     |
| `operations`                | A list of `{ id, sourceOperationId, reference }` bindings. Stable IDs are unique across all APIs.                                                                                                                                                  |
| `publications`              | A list of `{ channel, version, source, discovery }` entries for publications other than the default.                                                                                                                                               |
| `generateReferences`        | `true`, or `{ pathPrefix, include }` or `{ pathPrefix, exclude }`. `pathPrefix` defaults to `/reference/<apiId>`.                                                                                                                                  |
| `mappings.subjectLifecycle` | Explicitly map an operation-level `x-*` scalar or dotted property to `beta`, `in-development`, `experimental`, or `deprecated`. See [OpenAPI extension mappings](https://www.shoalrun.com/publish/openapi-extension-mappings.md).                  |
| `querySyntax`               | Opt-in rules for a placeholder query parameter whose filter expressions go directly in the URL. Each rule has `parameter`, `pathPrefixes`, `style: unwrapped`, and `example`. See [API generation](https://www.shoalrun.com/api-docs/generate.md). |

One authored reference page for one operation. The spec stays private:

```yaml title="config/api.yaml"
payments:
  source: { kind: file, path: ../apis/payments/openapi.yaml }
  operations:
    - id: payments.create
      sourceOperationId: createPayment
      reference: reference.create-payment
```

Publish the spec, a focused contract per page, and the API catalog. This also needs `site.origin`:

```yaml title="config/api.yaml"
payments:
  source: { kind: file, path: ../apis/payments/openapi.yaml, publish: true }
  discovery:
    endpoint: https://api.example.com
  operations:
    - { id: payments.create, sourceOperationId: createPayment, reference: reference.create-payment }
```

Keep the spec private but publish focused contracts:

```yaml title="config/api.yaml"
payments:
  source: { kind: file, path: ../apis/payments/openapi.yaml, focused: true }
  operations:
    - { id: payments.create, sourceOperationId: createPayment, reference: reference.create-payment }
```

Generate reference pages for every operation except two:

```yaml title="config/api.yaml"
payments:
  source: { kind: file, path: ../apis/payments/openapi.yaml }
  generateReferences:
    pathPrefix: /api-reference/payments
    exclude: [internalReconcile, debugEcho]
```

Give the v2 publication its own spec. The top-level `source` covers the default publication:

```yaml title="config/api.yaml"
payments:
  source: { kind: file, path: ../apis/payments/v1.yaml }
  publications:
    - channel: production
      version: v2
      source: { kind: file, path: ../apis/payments/v2.yaml, publish: true }
  operations:
    - { id: payments.create, sourceOperationId: createPayment, reference: reference.create-payment }
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

## Related reading

### Read first

- [Organize project configuration](https://www.shoalrun.com/configuration.md) — Learn how files combine and how to validate configuration changes.

### Reference while working

- [Configuration reference](https://www.shoalrun.com/config.md) — Find configuration settings in another topic.
