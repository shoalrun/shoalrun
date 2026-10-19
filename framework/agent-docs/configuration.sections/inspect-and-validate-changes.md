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

## Inspect and validate changes

Think of `config explain` as asking where one site setting came from. It shows the value Shoalrun will use, the file that supplied it, and any earlier value it replaced. For example, `site.title` tells you which file named the site. `navigation.0.doc` tells you which page is first in the menu and which file put it there.

Use these commands while reorganizing configuration:

| Command                                      | What it establishes                                                        |
| -------------------------------------------- | -------------------------------------------------------------------------- |
| `config resolve docs.config.yaml`            | Effective values, a digest of those values, and loaded YAML dependencies   |
| `config explain site.title docs.config.yaml` | The value, source file, and replacement history for one key                |
| `config graph docs.config.yaml`              | The entry file and a flat list of loaded YAML dependencies                 |
| `config validate docs.config.yaml`           | Successful configuration loading and theme contrast checks                 |
| `build docs.config.yaml dist`                | Whether content, navigation, APIs, routes, and output can compile together |

Prefix each command with `node "$SHOALRUN_CLI"`. For `explain`, the key comes before the config filename. Use numeric segments to inspect lists, such as `navigation.0.doc`. Dotted names represent traversal, so a literal key containing a dot cannot be addressed unambiguously through this CLI syntax.

`graph` reports dependencies, not an edge-by-edge visual graph. Its list covers loaded configuration files, not every content or API input. The resolved digest hashes effective values; it is not a digest of all referenced file contents.

A successful `config validate` does not establish that document links resolve or that an API review digest is current. Run a full build after structural changes. If a setting looks correct but behaves unexpectedly, inspect its exact key and source before editing another layer.

### Recover common configuration failures

Match the build message or symptom to the corresponding correction.

| Message or symptom                  | Next action                                                                      |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| `unknown setting`                   | Check top-level spelling and whether a fragment has an extra wrapper.            |
| `Configuration cycle`               | Follow the reported chain and remove the recursive include or preset dependency. |
| `exactly one directive is required` | Remove sibling keys beside a directive or split the change across layers.        |
| `$concat requires an array base`    | Check that the inherited setting is a list.                                      |
| `$remove has no inherited value`    | Add an actual inherited value or remove the unnecessary directive.               |
| `Unknown config path`               | Inspect `resolve`, then correct the dotted key or list index.                    |
| A list unexpectedly lost entries    | Replace a normal overlay list with `$concat` when appending was intended.        |
| A local file cannot be found        | Inspect the path's source file and the relevant path-base rule.                  |

Finish the running example with:

```sh
node "$SHOALRUN_CLI" config graph docs.config.yaml
node "$SHOALRUN_CLI" config validate docs.config.yaml
node "$SHOALRUN_CLI" build docs.config.yaml dist
```

Next, use the [configuration reference](https://www.shoalrun.com/config.md) for the feature you want to add. For content or publication failures, use [troubleshooting](https://www.shoalrun.com/publish/troubleshooting.md).
