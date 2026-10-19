---
id: guide.openapi-support
title: OpenAPI support and limits
summary: Check supported OpenAPI operations, schema keywords, examples, and
  source restrictions before importing a specification.
type: reference
area: api
subarea: api-contracts
canonical: /api-docs/support
---

# OpenAPI support and limits

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Document an API > OpenAPI support and limits

**Updated: 2026-10-19.**

Shoalrun renders a defined subset of OpenAPI into HTML, Markdown, and focused contracts. Check these limits before importing a large specification. A supported OpenAPI version does not mean every feature in that version can be rendered.

## Compatibility

The supported behavior varies by OpenAPI feature and source structure.

| Area               | Supported behavior                                                                                                                                                                                                                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Source formats     | OpenAPI 3.0.x and 3.1.x in YAML or JSON. `kind: file` builds from local files; `api import` can create a pinned local snapshot from a public HTTPS URL.                                                                                                                                                                              |
| Operations         | Method and path, server alternatives, CommonMark descriptions, security alternatives and credential details, path and operation parameter overrides, request body media types, responses, and named examples.                                                                                                                        |
| Webhooks           | Top-level OpenAPI 3.1 `webhooks`, including a document without `paths`; authored and generated references describe the inbound request and acknowledgement, with no outbound cURL command. Focused contracts retain the `webhooks` location.                                                                                         |
| Authentication     | API keys in headers, query strings, or cookies; HTTP schemes; OAuth2 flow names and scopes; OpenID Connect discovery; mutual TLS. These describe authentication; the site does not authenticate or execute requests.                                                                                                                 |
| References         | Local `$ref` within the project or configured OpenAPI source directory, including multiple files. `api import` downloads same-origin relative references and rewrites them to local snapshot paths. Recursive schemas end with a named reference marker. Absolute file paths and references escaping those directories are rejected. |
| Schemas            | Objects, arrays, titled variants, discriminators, enums, constants, required fields, defaults, examples, nullable values, supported constraints, additional properties, and read/write/deprecated labels. OpenAPI 3.1 boolean schemas are supported. The exact keyword list is below.                                                |
| Named examples     | Parameter, request, and response `examples` maps; reusable `components.examples` references; names, summaries, descriptions, values, provenance, HTML selection and deep links. All examples appear in Markdown. HTTPS `externalValue` is an external link, not a fetched payload.                                                   |
| Focused contracts  | One-operation JSON with transitive local components, named examples, security schemes, and internal recursive references. Enabled by `source.focused: true` or `source.publish: true`.                                                                                                                                               |
| Reader layout      | Three columns at wide widths and a stacked order on narrow screens. JSON schemas supply type shapes even without named examples; shapes and named examples are distinct views.                                                                                                                                                       |
| Extension metadata | Explicit mappings from operation-level `x-*` values to `subjectLifecycle`; OpenAPI `deprecated: true` takes precedence. Other extensions do not automatically become page metadata.                                                                                                                                                  |

## Supported schema keywords

The renderer accepts these schema keys, plus `x-*` extension keys:

```text
$ref, type, format, nullable, enum, const, default,
minLength, maxLength, minimum, maximum, exclusiveMinimum,
exclusiveMaximum, multipleOf,
minItems, maxItems, uniqueItems, minProperties, maxProperties, pattern,
readOnly, writeOnly, deprecated, description, example, examples,
allOf, oneOf, anyOf, items, properties, required, additionalProperties,
title, discriminator
```

Other schema keywords fail when encountered by the renderer. This includes valid OpenAPI or JSON Schema keywords outside this list. The compiler presents supported constraints; it is not a general validator for payloads or the entire OpenAPI specification.

Exclusive bounds follow the entry document's version even when a schema lives in another local file. In OpenAPI 3.0, `exclusiveMinimum` and `exclusiveMaximum` are booleans that modify a numeric `minimum` or `maximum`. In OpenAPI 3.1, each exclusive bound is a number. The build rejects a value in the wrong form. OpenAPI 3.1 also accepts `true` and `false` as entire schemas, displayed as allowing any value or no value, and an `examples` array on a schema. OpenAPI 3.0 rejects boolean schemas and schema-level `examples`.

## Features requiring adaptation

These features have limits that may require adapting the source or authored documentation.

| Feature                         | Current limit and recovery                                                                                                                                                                                                                |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Remote `$ref` in a normal build | Fails with `Remote $ref requires a pinned snapshot`. Use `api import` for public HTTPS sources with same-origin relative references, then build from its local snapshot. Cross-origin references need a separately prepared local source. |
| Local `externalValue`           | Fails with `local externalValue needs a pinned adapter`. Use a local inline example value, or an HTTPS external example link.                                                                                                             |
| Callbacks                       | Operation callbacks fail with an unsupported feature diagnostic. Top-level 3.1 webhooks are supported separately.                                                                                                                         |
| Response headers and links      | Fail with `Response headers or links need an adapter`. Prepare a supported documentation source while retaining the original contract separately.                                                                                         |
| Parameter `content`             | Requires an adapter; use supported parameter schemas in the documentation source.                                                                                                                                                         |
| Request media `encoding`        | Fails with `Request encoding needs an adapter`. Multipart binary fields have limited generated upload commands, but media encoding settings are not rendered.                                                                             |
| Other schema keywords           | Fail with `Unsupported schema keyword`. Adapt the documentation source without claiming omitted constraints are represented.                                                                                                              |

Avoid removing source semantics silently. If your API needs an unsupported feature, describe that limitation in the authored page and keep the authoritative contract available to readers where appropriate.

## Check a source before adding pages

With the CLI built as in the [quickstart](https://www.shoalrun.com/start.md), run:

```sh
node "$SHOALRUN_CLI" api audit apis/notes/openapi.yaml
```

The audit renders every operation in the supplied source and checks field anchors and named examples across HTML and Markdown. It reports every unsupported schema keyword it finds for each operation, with the source file and schema location, before the strict renderer runs. It can reveal unsupported features beyond the operations you initially plan to publish. It does not call a live API or establish complete semantic fidelity.

After registering an API and authoring or selecting its pages, run `api review` and pin the reviewed digest before a normal public build. The [API tutorial](https://www.shoalrun.com/publish/api-references.md) gives the full sequence. `source.publish: true` publishes the entire source, even when only a subset has reference pages; use focused contracts when a full-source download is unnecessary.

For existing site output, run `api focused-audit <site-directory>` to check focused contract scope, internal references, and Markdown links. [Project audits](https://www.shoalrun.com/publish/audit.md) combine these checks with the site build and configured external tests.

## Related reading

### Next steps

- [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references.md) — Build a reference page from a supported local specification.

### Reference while working

- [Focused OpenAPI contracts](https://www.shoalrun.com/api-docs/focused-contracts.md) — Check what a focused export keeps and drops.
