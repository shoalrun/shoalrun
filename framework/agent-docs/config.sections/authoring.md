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

## `authoring`

Optional project guidance and read-only source locations. These settings do not choose a model or read external files during a site build.

| Key             | Meaning                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `directives`    | Nonempty project writing instructions.                                                                                          |
| `guideFiles`    | Project-relative writing-guide paths.                                                                                           |
| `exemplarFiles` | Project-relative reviewed examples.                                                                                             |
| `sourceRoots`   | Named local folders for source search. Each entry has `path`, optional `name`, and optional `include` and `exclude` glob lists. |
| `pageSources`   | Stable page IDs mapped to source file paths or globs. These seed evidence selection for known features.                         |

Source paths resolve from the root configuration directory. Source folders and page-source files may be outside the docs project; guide and exemplar paths remain inside it. URLs are not source folders. Git is not required. Your coding agent selects the evidence scope under its own permissions.

```yaml title="docs.config.yaml"
authoring:
  sourceRoots:
    - name: Application implementation
      path: ../application/src
      include: ["**/*.ts", "**/*.tsx"]
      exclude: ["**/*.test.ts"]
  pageSources:
    guide.authentication:
      - ../application/src/authentication.ts
```

Project discovery reports these configured source locations. Use your coding agent's own search and read tools, with its execution permissions, to investigate external implementation files. `docs source` reads only paths inside the project. See [authoring tools commands](https://www.shoalrun.com/author/workspace/commands.md) for current discovery and validation commands.
