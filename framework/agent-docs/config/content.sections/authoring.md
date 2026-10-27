---
id: reference.config-content
title: Authoring and content settings
summary: Configure authoring guidance, page defaults, reusable content, reading
  paths, and reader views.
type: reference
area: publishing
subarea: publishing-configuration
canonical: /config/content
---

# Authoring and content settings

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Reference > Configuration reference > Authoring and content

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/config/content.md)

**Page reading path** — these links apply to the full page.

**Read first**

- [Organize project configuration](https://www.shoalrun.com/configuration.md) — Learn how files combine and how to validate configuration changes.

Configure authoring guidance, page defaults, reusable content, reading paths, and reader views. These keys belong in `docs.config.yaml` or an included configuration file. For file composition and validation commands, see [Configure your project](https://www.shoalrun.com/configuration.md). Use the [configuration index](https://www.shoalrun.com/config.md) to find another setting.

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
