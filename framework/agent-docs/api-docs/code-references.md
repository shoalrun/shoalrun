---
id: guide.code-api-references
title: Generate code API references
summary: Turn Python source and docstrings into SDK reference pages, with
  separate, grouped, or complete-page layouts.
type: how-to
area: api
subarea: api-generation
canonical: /api-docs/code-references
---

# Generate code API references

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Document an API > Generate code API references

**Updated: 2026-11-07.**

**Available since: 1.0.0.**

A code API reference describes a library's classes, functions, methods, fields, parameters, return values, and exceptions. A guide explains how to accomplish a task; the reference explains what a programmer can call, what to pass, and what comes back. [OpenAPI references](https://www.shoalrun.com/publish/api-references.md) describe HTTP endpoints instead.

Shoalrun reads a converter's JSON snapshot and renders native reference pages. The optional Python adapter extracts local source and docstrings with Griffe. The [TypeScript adapter](https://www.shoalrun.com/api-docs/typescript-references.md) follows a public entry point's declarations and JSDoc. Other languages can supply a converter that writes the same [snapshot format](https://www.shoalrun.com/api-docs/code-reference-settings.md). A Kotlin-shaped snapshot is supported; a Kotlin extractor isn't bundled.

## Before you start

Use an existing documentation project with `@shoalrun/cli` installed, as in [Getting started](https://www.shoalrun.com/start.md). Run the commands below from that project's directory. Extraction needs Python 3.11 or newer and an explicit dependency installation. Normal site builds read the snapshot and don't need Python.

The adapter doesn't import the documented package, execute its code, enable Griffe extensions, or inspect installed modules. Review public source declarations and docstrings before publishing: static extraction doesn't establish that their content is safe to disclose.

## Add Python source

Create `src/sample.py`. This fictional example returns a local dictionary and doesn't contact a service:

```python title="src/sample.py"
class Client:
    """Retrieve records for an application."""

    def fetch(self, record_id: str) -> dict[str, str]:
        """Retrieve a record by its stable identifier.

        Args:
            record_id: Identifier of the record to retrieve.

        Returns:
            A mapping containing the record identifier.
        """
        return {"id": record_id}
```

Keep the source root limited to the package you're documenting. The adapter rejects symlinks inside that root, including links to files outside it.

## Extract and validate a snapshot

Create an isolated Python environment and install the adapter's pinned requirements:

```sh
python3.11 -m venv .venv-reference
.venv-reference/bin/python -m pip install --require-hashes \
  -r node_modules/@shoalrun/cli/adapters/python/requirements.txt
mkdir -p reference
.venv-reference/bin/python node_modules/@shoalrun/cli/adapters/python/shoalrun_reference.py \
  --root ./src --module sample --style google --out ./reference/python.json
npx --no-install shoalrun references check ./reference/python.json
```

Use `--style google`, `numpy`, or `sphinx` to match the docstring convention. The adapter preserves signatures, supported docstring sections, local source locations, and resolved local type references. It skips aliases and underscore-prefixed members except constructors. It doesn't expand inherited members, execute decorators, or resolve external re-exports. Review the JSON before building.

The check reports `status: "ok"`, the programming language, and the symbol count. Duplicate IDs, missing referenced symbols, cyclic ownership, and invalid fields fail validation. A missing Python dependency stops extraction; Shoalrun doesn't install it during a site build.

## Register the catalog and navigation

Add these settings to `docs.config.yaml`, retaining the project's existing site and publication settings:

```yaml title="docs.config.yaml"
codeReferences:
  sdk:
    source: { kind: file, path: ./reference/python.json }
    layout: classes
    singlePage:
      documentId: reference.sdk.complete
      slug: /reference/sdk/all
      title: Complete SDK reference
    symbols:
      sample.Client:
        documentId: reference.sdk.client
        slug: /reference/sdk/client
navigation:
  - { id: sdk-client, doc: reference.sdk.client }
  - { id: sdk-complete, doc: reference.sdk.complete }
```

If navigation already exists, append those entries to the appropriate group. References use ordinary `doc:` entries. Explicit document IDs and slugs preserve intentional public identities. Generated defaults follow the catalog and symbol IDs. Renaming a source symbol changes its default identity.

## Choose the reading layout

Use `layout` to control how much detail readers see on a parent page. Individual symbol URLs stay available in every layout. Group the class or module pages in navigation when you want fewer menu entries.

| Layout    | What readers see                                                                                            |
| --------- | ----------------------------------------------------------------------------------------------------------- |
| `symbols` | Separate symbol pages with linked member tables. This is the default.                                       |
| `classes` | Class pages include member details inline. Module pages include their direct functions and class overviews. |
| `modules` | A module page includes details for its classes, functions, and fields. Submodules form separate groups.     |

`singlePage` independently adds a complete reference for the catalog. It works with any layout. Set `symbolPages: false` alongside it to publish only the complete page. Update navigation and links to that page, and add redirects for previously published symbol URLs. Omit it or set `singlePage: false` to disable it. In a grouped or complete page, links to included symbols jump to their sections; other links retain individual symbol URLs. See the [configuration reference](https://www.shoalrun.com/api-docs/code-reference-settings.md) for defaults and metadata options.

## Build and verify

Build the site, then serve the same output:

```sh
npx --no-install shoalrun build docs.config.yaml site-dist
npx --no-install shoalrun serve site-dist --port 8770
```

Open `http://127.0.0.1:8770/reference/sdk/client/` and `/reference/sdk/all/`. The class page should include `fetch` details. The complete page should include the module, class, and method. Read their Markdown copies at `/reference/sdk/client.md` and `/reference/sdk/all.md` and verify that signatures, parameter descriptions, and return information remain readable.

Regenerate the snapshot after changing source or docstrings, then validate and rebuild. A site build doesn't rerun the converter. The packaged `examples/code-references` project has a larger sample SDK with models, async methods, overloads, pagination, and exceptions.

## Versions, profiles, and delivery

Bind different snapshots to explicit product/channel/version/language publications when releases have different interfaces. `programmingLanguage: python` describes the source language; publication `language: en` describes the documentation language.

Catalog and per-symbol metadata can declare reader filters, `shared`, and `requires`. Use the same profile for build and export. Grouped and complete pages include only symbols eligible in their publication and build selection; they don't grant access to excluded symbols. See [Publications](https://www.shoalrun.com/publish/publications.md), [Customer editions](https://www.shoalrun.com/publish/deployment-profiles.md), and the [reference](https://www.shoalrun.com/api-docs/code-reference-settings.md) for the configuration.

## HTML, Markdown, and agents

HTML uses compact declaration blocks, linked types, field/default tables, and symbol sections. Tables scroll horizontally on narrow screens and can receive keyboard focus. Copy controls use JavaScript; reading the reference, following symbol links, and scrolling a table don't require it. A full reference is an ordinary generated page, so browser Find can search its content.

Markdown retains declarations, descriptions, tables, examples, and symbol links. It doesn't include Copy controls or the website styling. Content exports preserve typed resource links and scope; PDF workflows can select a grouped page or the complete reference by document ID. With the default `symbolPages: true`, generated symbols remain independently addressable even when they're also shown inline elsewhere. Setting `symbolPages: false` removes those separate pages and delivery resources; symbols remain sections on the complete page.

Agents can discover and read the generated pages through the site's indexes and read-only tools, or use the normal content-delivery API. They don't need Python or browser scripts to read published references. Source extraction describes declared interfaces; it doesn't execute examples or prove runtime behavior.

## A real TypeScript example

Shoalrun uses code API references to document its own [public content client](https://www.shoalrun.com/content-delivery/sdk/all.md). Compare the generated `ContentSnapshot` interface with the [integration guide](https://www.shoalrun.com/content-delivery/client.md): the reference follows public TypeScript declarations and JSDoc, while the guide explains the workflow and trust boundaries. The site builds from a saved converter snapshot rather than executing the client or running extraction during every build.

## Related reading

### Next steps

- [Generate TypeScript API references](https://www.shoalrun.com/api-docs/typescript-references.md) — Generate references from public TypeScript declarations and JSDoc.

### Reference while working

- [Add an OpenAPI API](https://www.shoalrun.com/publish/api-references.md) — Generate HTTP endpoint references when an OpenAPI contract describes the interface.

- [Code API reference settings](https://www.shoalrun.com/api-docs/code-reference-settings.md) — Check catalog settings, snapshot fields, and converter limits.
