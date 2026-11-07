---
id: reference.code-api-references
title: Code API reference settings
summary: Catalog configuration, converter snapshots, Python extraction limits,
  and generated reference behavior.
type: reference
area: api
subarea: api-generation
canonical: /api-docs/code-reference-settings
---

# Code API reference settings

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Document an API > Code API reference settings

**Updated: 2026-11-06.**

**Available since: 1.0.0.**

`codeReferences` maps a catalog ID to a local converter snapshot and presentation settings. Start with [Generate code API references](https://www.shoalrun.com/api-docs/code-references.md) for a complete Python workflow. This setting is separate from `apis`, which registers OpenAPI sources.

## Catalog settings

Use these fields inside `codeReferences.<catalog-id>`. Catalog IDs use lowercase letters, numbers, and dashes, starting with a letter.

| Field                | Meaning                                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `source`             | `{ kind: file, path: ./reference.json }` for the default publication. Paths resolve relative to the declaring config file and must remain inside the project root. |
| `publications`       | Explicit `{ product?, channel, version, language?, source }` bindings. Declare this or `source`, not both.                                                         |
| `layout`             | `symbols` (default), `classes`, or `modules`. Changes inline grouping while retaining individual symbol pages.                                                     |
| `pathPrefix`         | Prefix for generated symbol slugs; defaults to `/reference/code`. Explicit symbol slugs take precedence.                                                           |
| `include`, `exclude` | Exact symbol IDs to select. Every listed ID must exist. Private symbols and descendants of private symbols aren't published.                                       |
| `symbols`            | Per-symbol `{ documentId?, slug?, metadata? }` overrides.                                                                                                          |
| `metadata`           | Ordinary page metadata, including taxonomy, reader filters, `shared`, and feature requirements. Project defaults and enforced metadata still apply.                |
| `sourceLink.baseUrl` | Optional HTTPS repository directory URL. Must omit credentials, query strings, and fragments.                                                                      |
| `singlePage`         | An optional object defining a complete reference page. Omit it or use `false` to disable it.                                                                       |

Generated pages have `type: code-reference`. Default document IDs combine the catalog and symbol IDs; IDs outside the simple identifier character set use a deterministic digest. Default slugs combine the path prefix, normalized symbol ID, and a digest. Use explicit overrides when a public URL or content-delivery identity must survive a symbol rename.

## Complete reference page

The `singlePage` object accepts these fields. No complete page is emitted when its selection contains no eligible symbols.

| Field        | Default or behavior                                   |
| ------------ | ----------------------------------------------------- |
| `documentId` | `reference.<catalog-id>.complete`                     |
| `slug`       | `<pathPrefix>/all`                                    |
| `title`      | `Complete API reference`                              |
| `summary`    | `Classes, functions, and fields in this publication.` |
| `metadata`   | Overrides the catalog's metadata for this page.       |

Grouped and complete pages use outline depth two unless frontmatter supplies another depth. Each embedded symbol gets a section heading. Links to embedded symbols target that section; ordinary symbol URLs remain valid for external links and content delivery.

## Publication sources

Bind a snapshot to each interface release. This example assumes the `sdk` product and versions already exist in `publications`:

```yaml
codeReferences:
  sdk:
    publications:
      - product: sdk
        channel: production
        version: v1
        language: en
        source: { kind: file, path: ./reference/v1.json }
      - product: sdk
        channel: production
        version: v2
        language: en
        source: { kind: file, path: ./reference/v2.json }
```

Links, member tables, inline details, and complete references stay within the selected catalog and publication. A full snapshot isn't automatically published as a downloadable asset.

## Metadata and selection

A symbol's explicit `shared` or `requires` classification replaces the catalog's classification. Requirements are evaluated separately for each symbol; a parent's feature requirements don't automatically apply to its children. Strictly classified projects need an explicit classification for eligible public symbols and the complete page. Inherited frontmatter defaults don't satisfy that source-classification requirement.

Visibility, feature grants, access policy, and build reader-filter selection apply before references are combined. An excluded type is left as plain text rather than linked to unavailable content. Reader views remain browsing controls; build/profile selection determines which content is published.

## Converter snapshot

A converter writes JSON with `schemaVersion: 1`, `kind: shoalrun-code-reference`, a `programmingLanguage`, producer identity, and a nonempty `symbols` array. The package ships `schemas/code-reference.schema.json`; `shoalrun references check <snapshot.json>` also checks unique IDs, referenced targets, and acyclic parents.

This Kotlin-shaped example illustrates the shared contract. It doesn't imply a bundled Kotlin extractor:

```json
{
  "schemaVersion": 1,
  "kind": "shoalrun-code-reference",
  "programmingLanguage": "kotlin",
  "producer": { "name": "example-converter", "version": "1.0.0" },
  "symbols": [{
    "id": "example.greet",
    "name": "greet",
    "kind": "function",
    "summary": "Create a greeting.",
    "signatures": ["fun greet(name: String): String"],
    "parameters": [{ "name": "name", "type": "String", "description": "Reader name." }],
    "returns": { "type": "String", "description": "A greeting ready to display." }
  }]
}
```

Run a converter explicitly in your workflow, validate its output, then build. Shoalrun doesn't load executable converter plugins during compilation. JavaScript tools can import `validateCodeReference` from `@shoalrun/cli/references`.

## Symbol fields

Each symbol needs `id`, `name`, and `kind`. Supported kinds are `module`, `namespace`, `class`, `interface`, `enum`, `type`, `function`, `method`, `constructor`, `property`, `attribute`, and `constant`.

Use these optional fields to describe the interface without supplying executable markup or an arbitrary syntax tree:

| Field                               | Meaning                                                                                                                                              |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parent`                            | ID of an existing parent symbol. Cycles aren't allowed.                                                                                              |
| `visibility`                        | `public` by default, or `private`.                                                                                                                   |
| `summary`, `description`            | Short page summary and inert Markdown description.                                                                                                   |
| `signatures`                        | Array of declaration strings, including overloads.                                                                                                   |
| `parameters`                        | Array of `{ name, type?, description?, default? }`.                                                                                                  |
| `returns`, `yields`                 | `{ type?, description? }`.                                                                                                                           |
| `raises`                            | Array of `{ name, type?, description?, default? }`.                                                                                                  |
| `examples`                          | Array of `{ title?, code }`. Examples aren't executed.                                                                                               |
| `annotation`, `required`, `default` | Field type, whether a value must be supplied, and its default source expression. Unknown requirements stay unmarked. Nullable doesn't mean optional. |
| `bases`, `constructorSignature`     | Base-type strings and a constructor declaration for a class.                                                                                         |
| `typeReferences`                    | Mapping from exact type text to an existing symbol ID. Only eligible targets become links; Shoalrun doesn't guess short-name matches.                |
| `seeAlso`                           | Existing symbol IDs for related reference links.                                                                                                     |
| `source`                            | `{ path, line? }` with a relative provenance path and optional positive line number.                                                                 |

The snapshot can also include a SHA-256 `sourceDigest`. Unknown fields are rejected. Snapshots are limited to 10,000 symbols and 32 MiB; individual text fields have schema limits.

## Descriptions, type links, and source links

Descriptions don't run MDX or expand project directives. Raw HTML is stripped. Use `[Record](symbol:example.Record)` for a symbol link within the same catalog and publication. External links support HTTPS and mailto; relative links and images aren't supported.

Explicit type references create links in parameter, return, yield, base-class, exception, and field information. Signatures remain copyable code. The Python adapter resolves supported local annotation targets statically and keeps unknown or external targets unlinked.

Set `sourceLink.baseUrl` to a repository URL ending at the directory that contains the relative source paths. Include an immutable commit or release in that URL. A source path `sdk/models.py` with line `12` is appended as `/sdk/models.py#L12`. Shoalrun doesn't fetch or publish source files. Without this setting, source links are omitted.

## Python adapter limits

The packaged adapter requires Python 3.11 or newer and `griffelib==2.4.1`. Its requirements file pins the dependency and archive hash. The source root must contain the requested local module and can't contain symlinks. Extraction rejects roots exceeding 10,000 Python source files or 32 MiB.

Extraction doesn't enable runtime inspection, extensions, external discovery, or alias resolution. The adapter skips aliases and underscore-prefixed members except constructors. It doesn't expand inherited members or execute decorators. Local constructors and supported simple dataclass constructors supply class signatures; unsupported cases stay unspecified. Factory defaults appear as `<factory>` in constructor signatures and retain the source expression in field details.

## HTML, Markdown, and agents

HTML shows symbol context, declarations, member tables, and detailed sections. The tables use local horizontal scrolling instead of shrinking the text on small screens; keyboard readers can focus the scroll region. Copy controls need JavaScript. Grouped pages and complete references keep their content readable without those controls.

Markdown and content exports retain declarations, descriptions, field facts, examples, and links with their resource identity and publication scope. They omit the site's styling and Copy buttons. Agents can read generated pages through discovery tools or content delivery without running the extractor. A caller can select the complete page for export or PDF preparation by its document ID; enabling that page doesn't prebuild PDFs.

## Related reading

### Next steps

- [Generate code API references](https://www.shoalrun.com/api-docs/code-references.md) — Extract a Python snapshot and preview both grouped and complete SDK references.
