---
id: guide.configuration
title: Organize project configuration
summary: Learn how Shoalrun resolves config files, layers presets, tracks path
  origins, and applies page defaults before building publications.
type: how-to
area: publishing
subarea: publishing-configuration
canonical: /configuration
---

# Organize project configuration

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Get started > Configure your project

**Updated: 2026-10-19.**

Parent page: [Full Markdown page](/configuration.md)

`docs.config.yaml` connects your content, presentation, and publication settings. Start with one file, then extract sections or share defaults when several projects need them. This guide explains how those choices interact and how to inspect the result.

Use the [configuration reference](https://www.shoalrun.com/config.md) to look up individual fields. Use [example projects](https://www.shoalrun.com/config/examples.md) for complete configurations you can copy.

## Understand where paths point

Resolution records a source file for every configuration value. Relative paths often use that source rather than the entry file or your shell's current directory.

| Path                                   | Base directory                                    |
| -------------------------------------- | ------------------------------------------------- |
| `extends` and `$include`               | The YAML file containing the directive            |
| `site.contentDir`                      | The entry config's directory, even when inherited |
| `site.customCss`, `site.favicon`       | The file supplying that path value                |
| API `source.path`                      | The file supplying that path value                |
| Snippet `file`, custom template `body` | The file supplying that path value                |
| Page frontmatter `image`               | The page file's directory                         |

In the running example, `site.customCss: ./brand.css` still finds `shared/brand.css` after the project overrides `site.title`. The two keys keep separate origins.

Moving a path into `config/api.yaml` may require changing `./apis/service.yaml` to `../apis/service.yaml`. Inspect the exact path key with `config explain` after moving it. `config resolve` retains relative strings; it does not rewrite every file path into an absolute path.

Some grouped settings use the origin of their containing block: custom search uses `outputs.html.search`, fonts use `theme.fonts`, and share images use `outputs.html.shareImages`. Overriding part of such a block can change its path base. Keep a block's relative paths and related overrides together, and inspect that block's source when debugging.

CLI output arguments have their own meaning. In these examples, `dist` is relative to the working directory where you run `build`.
