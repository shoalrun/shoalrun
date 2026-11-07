---
id: guide.typescript-code-references
title: Generate TypeScript API references
summary: Extract a public TypeScript entry point into native SDK reference pages.
type: how-to
area: api
subarea: api-generation
canonical: /api-docs/typescript-references
---

# Generate TypeScript API references

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Document an API > Generate TypeScript API references

**Updated: 2026-11-07.**

**Available since: 1.1.0.**

Use the TypeScript adapter to document a library's public functions, interfaces, classes, fields, and methods. It follows one entry module's exports and local re-exports, reads JSDoc, and writes a saved JSON snapshot. Shoalrun renders that snapshot as [code API references](https://www.shoalrun.com/api-docs/code-references.md). Extraction doesn't execute the library or prove its runtime behavior.

## Before you begin

Start with a Shoalrun project and a reviewed TypeScript entry point. The compiler package must include `adapters/typescript/shoalrun-reference.mjs`. Install the maintained compiler API version explicitly in the project that supplies the TypeScript configuration:

```sh
npm install --save-dev --save-exact typescript@5.9.3
```

The adapter supports TypeScript 5.9.x. Other compiler versions fail with a dependency message. Use local files, keep the extraction root narrow, and choose a stable module ID before publishing links.

## Extract the public entry point

Run from the project directory. Replace the example entry and module ID with your own:

```sh
node node_modules/@shoalrun/cli/adapters/typescript/shoalrun-reference.mjs \
  --project tsconfig.json \
  --entry src/index.ts \
  --module example.sdk \
  --out reference.json
npx --no-install shoalrun references check reference.json
```

The entry resolves relative to the TypeScript configuration. The output resolves relative to your current directory. `--root DIRECTORY` optionally narrows the declaration boundary; by default it uses the configuration's directory. Exported declarations outside that root fail extraction. The configuration can remain outside an explicitly selected root.

The adapter accepts source or declaration files, including a built `.d.ts` entry. It retains public overloads, optional methods, readonly properties, merged interface signatures, constructor overloads, type links, and JSDoc descriptions, parameters, returns, and examples. Unknown declarations or unresolved imports fail rather than silently disappearing. Inherited members aren't expanded. Other JSDoc tags aren't converted into runtime constraints.

## Review visibility and defaults

Private, protected, JavaScript private fields, and `@internal` or `@private` declarations are omitted where they can be represented separately. A structural type or copied default containing excluded declarations stops extraction when publishing it would expose those details. Some conditional type expansions also fail because their visibility can't be verified. Expose a named public type or a public value instead of weakening the checks.

Source defaults are copied as expressions, including strings; they aren't evaluated. Review the snapshot for values and prose you don't intend to publish. These are documentation visibility controls, and they don't authenticate a deployment or sanitize arbitrary source text.

Extraction doesn't install dependencies, fetch remote references, run project plugins, or execute documented modules. The local compiler and configuration are trusted inputs. Graph accounting covers compiler options and external type dependency bytes in the source digest. Limits of 10,000 source files and 32 MiB are checked after the compiler loads the graph; they aren't execution or memory isolation.

The output can't overwrite a compiler input, including through symlinks. After successful extraction and validation, the adapter replaces the snapshot atomically. Keep source and snapshots in separate paths.

## Render the snapshot

Add a catalog to the project config:

```yaml
codeReferences:
  sdk:
    source: { kind: file, path: ./reference.json }
    layout: classes
    singlePage:
      documentId: reference.sdk.complete
      slug: /sdk/all
      title: Complete SDK reference
```

Choose `symbols`, `classes`, or `modules` for the grouped presentation. `singlePage` adds an optional complete reference. Set `symbolPages: false` to publish only that page; otherwise individual symbol URLs remain available. Configure explicit document IDs and slugs for symbols whose public identities must survive renames. Add the complete reference or selected class/module pages to navigation by document ID. The [catalog settings](https://www.shoalrun.com/api-docs/code-reference-settings.md) describe source bindings, metadata, and routing.

## Check the result

Build the site and review the generated HTML and Markdown. Check overloads, optional and readonly markers, type links, inline members, and copied defaults against the public declarations. Verify that excluded names and values are absent from the snapshot and every grouped or complete page. Refresh the saved snapshot after public source or JSDoc changes; normal site builds don't run extraction.

Shoalrun's own [content client reference](https://www.shoalrun.com/content-delivery/sdk/all.md) is a real example. Its [integration guide](https://www.shoalrun.com/content-delivery/client.md) explains the workflow and trust boundaries alongside the generated declarations.

## HTML, Markdown, and agents

The saved snapshot supplies declarations, descriptions, member tables, examples, and type links to both representations. HTML adds presentation and Copy controls; Markdown retains the reference content without browser scripts. Agents discover the generated pages and keep their product, version, and language scope through the site's normal content delivery. Readers need neither TypeScript nor the source repository to use published references.

## Related reading

### Reference while working

- [Code API reference settings](https://www.shoalrun.com/api-docs/code-reference-settings.md) — Configure snapshot catalogs, grouping, publication scope, and stable routes.
