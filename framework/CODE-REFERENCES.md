# Code API references

Code API references describe a library's classes, functions, methods, fields, parameters, return values, and exceptions. OpenAPI references describe HTTP endpoints. Guides explain how to accomplish tasks; code references explain the interfaces used to accomplish them.

Shoalrun consumes a versioned JSON snapshot and generates native reference pages. The pages participate in navigation, search, publication selection, reader filters, customer-profile pruning, Markdown output, content exports, and PDF exports. They use the site's theme and a compact code-reference layout with signatures and member tables.

## Generate Python references

The optional Python adapter reads local source with Griffe. It doesn't import the documented package or enable runtime inspection, extensions, or external alias resolution. It requires Python 3.11 or newer and the pinned `griffelib` dependency. Normal Shoalrun builds consume the JSON snapshot and don't require Python.

From a checkout of this package:

```sh
python3.11 -m venv .venv-reference
.venv-reference/bin/python -m pip install --require-hashes -r adapters/python/requirements.txt
.venv-reference/bin/python adapters/python/shoalrun_reference.py \
  --root examples/code-references/python --module orchard \
  --out examples/code-references/reference.json
shoalrun references check examples/code-references/reference.json
shoalrun build examples/code-references/docs.config.yaml site-dist
```

Use `--style google`, `--style numpy`, or `--style sphinx` for the docstring convention. Review the generated snapshot before publishing it. Public source declarations and their docstrings can contain sensitive information even when extraction doesn't execute code.

The adapter emits locally defined symbols, skips aliases and underscore-prefixed members except constructors, and rejects symlinks in its declared source root. It doesn't expand inherited members, execute decorators, resolve external re-exports, or infer undocumented behavior. Its example SDK stores records in memory and doesn't contact a live service.

## Generate TypeScript references

The optional TypeScript adapter follows the public exports of one entry module, including local re-exports. It reads source or declaration files with the TypeScript compiler API; it doesn't import, execute, or emit documented code. Install `typescript@5.9.3` explicitly in the project that supplies the compiler configuration. The adapter supports TypeScript 5.9.x and rejects other compiler versions.

From that project, run:

```sh
node node_modules/@shoalrun/cli/adapters/typescript/shoalrun-reference.mjs \
  --project tsconfig.json --entry src/index.ts --module example.sdk \
  --out reference.json
shoalrun references check reference.json
```

`--entry` resolves relative to the compiler configuration. `--root` defaults to its directory and bounds emitted declarations and relative provenance paths; an entry or exported declaration outside that root fails. The configuration may be outside an explicitly supplied root. `--out` resolves relative to the current working directory. Extraction reports TypeScript errors rather than publishing an incomplete entry point. It doesn't install dependencies, run project plugins, or fetch remote declarations.

Functions, overloads, classes, interfaces, type aliases, enums, and constants retain signatures. Object/interface fields and methods become child symbols. JSDoc descriptions, `@param`, `@returns`, and `@example` supply prose. Private/protected members and `@internal`/`@private` symbols are omitted. Local type references link eligible exports. Inherited members aren't expanded; union alternatives remain in their full alias declaration. Namespace exports and other unsupported declarations fail explicitly. See [the adapter guide](adapters/typescript/README.md) for limits.

Normal site builds still read the saved JSON and don't need TypeScript. Refresh explicitly after changing the public source or JSDoc, then validate and review the generated reference. Type extraction doesn't prove runtime behavior.

## Configure a catalog

```yaml
codeReferences:
  sdk:
    source: { kind: file, path: ./reference.json }
    pathPrefix: /reference/code
    symbols:
      orchard.client.Client:
        documentId: reference.client
        slug: /reference/client
navigation:
  - { id: client, doc: reference.client }
```

Paths resolve relative to the file that declares them and must stay inside the project root. Generated pages use `type: code-reference`. The `programmingLanguage` in a snapshot is distinct from a publication's language, such as `en`.

Set `symbols.<symbol-id>.documentId` and `slug` to keep deliberate public identities and URLs. Without these settings, Shoalrun generates deterministic IDs and routes from the catalog and symbol IDs. Moving or renaming a symbol changes those defaults.

Use `include` and `exclude` lists of exact symbol IDs to select public symbols. Private symbols and descendants of private symbols aren't published. `metadata` supplies ordinary page metadata; `symbols.<id>.metadata` overrides it for one symbol. A symbol's explicit `shared` or `requires` classification replaces the catalog's classification. Each symbol's feature requirements are evaluated separately; classification isn't inherited from its parent symbol. Project frontmatter defaults and enforced settings still apply.

For independent product versions, replace `source` with explicit source bindings:

```yaml
codeReferences:
  sdk:
    publications:
      - product: sdk
        channel: production
        version: v1
        language: en
        source: { kind: file, path: ./reference-v1.json }
      - product: sdk
        channel: production
        version: v2
        language: en
        source: { kind: file, path: ./reference-v2.json }
```

Declare those products and versions in `publications` as usual. Each binding uses its own snapshot. Links and member tables include only eligible pages in the same catalog and publication.

## Bring another converter

A converter for Kotlin or another language can emit the same snapshot format. Shoalrun doesn't need to load that converter during compilation. Run it explicitly in your own build workflow, validate its output, and point a catalog at the resulting file.

The contract is [schemas/code-reference.schema.json](schemas/code-reference.schema.json). A minimal snapshot looks like this:

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
    "returns": { "type": "String", "description": "The greeting." }
  }]
}
```

This illustrates the converter contract; it isn't a bundled Kotlin extractor. Supported symbol kinds are module, namespace, class, interface, enum, type, function, method, constructor, property, attribute, and constant. Optional fields include `parent`, `description`, `raises`, `yields`, `examples`, `seeAlso`, relative source provenance, and a source digest. Symbol IDs must be unique, referenced IDs must exist, and parent ownership must be acyclic. `shoalrun references check` performs these semantic checks as well as schema validation. JavaScript tools can import `validateCodeReference` from `@shoalrun/cli/references`.

Descriptions use inert Markdown, with raw HTML stripped. They don't run MDX or expand project directives. Use `[Record](symbol:orchard.models.Record)` to link a symbol in the same catalog and publication. External links support HTTPS and mailto; relative links and images aren't supported. Use code examples for runnable-looking snippets; extraction doesn't execute or verify those examples.

## Types, fields, and source links

Converters can supply `typeReferences`, mapping the exact type text to a symbol ID in the same snapshot. Shoalrun links those types in parameter, return, yield, base-class, exception, and field descriptions only when the target is published in the same catalog and publication. Excluded targets stay plain text. Signatures retain copyable code. Shoalrun doesn't guess targets from short names.

Field symbols can supply `annotation`, `required`, and `default`. A nullable field can still be required; `required` describes whether a value must be supplied, not whether the type admits null. Unknown requirements stay unmarked. Defaults are source expressions, not evaluated values.

Class symbols can supply `bases` and `constructorSignature`. The Python adapter extracts local constructors and synthesizes simple local dataclass constructors; it leaves unsupported cases unspecified. Dataclass factory defaults appear as `<factory>` in the constructor signature and retain their source expression in the field details.

To show **View source**, configure a catalog's `sourceLink.baseUrl` with an HTTPS repository URL ending at the directory that contains the snapshot's relative source paths. Include the desired immutable commit or release in that URL. For example, a base URL ending in `/blob/<commit>/src` and a source path of `sdk/models.py` produce `/blob/<commit>/src/sdk/models.py#L12` for line 12. Query strings, fragments, and embedded credentials aren't accepted in the base URL. Shoalrun doesn't download source or publish source files automatically. Source links are omitted when no base URL is configured.

## Choose separate or grouped pages

Configure each catalog independently:

```yaml
codeReferences:
  sdk:
    source: { kind: file, path: ./reference.json }
    layout: classes
    singlePage:
      documentId: reference.sdk.complete
      slug: /reference/sdk/all
      title: Complete SDK reference
navigation:
  - { id: complete-reference, doc: reference.sdk.complete }
```

`layout` accepts:

| Value | Reading experience |
| --- | --- |
| `symbols` | Separate symbol pages with linked member tables. This is the default. |
| `classes` | Class pages include member details inline. Module pages include their direct functions and class overviews. |
| `modules` | Module pages include details for the classes, functions, and fields in that module. Submodules have their own grouping. |

Individual symbol pages and URLs remain available in every layout by default. Choose class or module pages for the main navigation when you want fewer navigation entries. Grouping controls the reading experience; it doesn't remove the underlying symbol pages or change their content-delivery identities.

`singlePage` independently adds a complete reference for the catalog, containing every eligible symbol in the selected publication. It works with any layout. Omit it or set `singlePage: false` to disable it. Within a grouped or complete page, links to symbols included on that page jump to their sections. Links to other symbols retain their individual URLs. Generated heading anchors distinguish repeated headings, such as Parameters and Returns.

Set `symbolPages: false` alongside `singlePage` to publish only the complete reference. Individual symbols remain sections on that page and do not become separate HTML pages, Markdown pages, search records, or content-delivery resources. Omitting `singlePage` with this option fails validation. Update navigation and document links to the complete page, and configure redirects for previously published symbol URLs. Section Markdown resources remain available for focused reads.

The complete page defaults to document ID `reference.<catalog>.complete` and slug `<pathPrefix>/all`. You can configure its `documentId`, `slug`, `title`, `summary`, and `metadata`. Its metadata inherits the catalog's settings; an explicit `shared` or `requires` classification replaces the catalog classification. Strictly classified projects must classify the complete page as well as the symbols.

Each combined page contains only symbols already allowed by its publication, profile grants, visibility, and build audience selection. Enabling a complete page doesn't grant access to excluded content. If no symbols are eligible, no empty complete page is emitted. Complete and grouped pages support the same HTML, Markdown, content export, and PDF workflows as other reference pages. Their default outline depth is two; explicit frontmatter settings can override it.
