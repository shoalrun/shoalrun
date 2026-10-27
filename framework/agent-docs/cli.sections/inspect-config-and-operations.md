---
id: reference.cli
title: CLI reference
summary: Commands, arguments, defaults, output, and errors.
type: reference
area: authoring
subarea: authoring-command-line
canonical: /cli
---

# CLI reference

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Reference](https://www.shoalrun.com/.well-known/shoalrun/navigation/reference-tab-50f26fe22670.txt) (ID: reference-tab). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Reference](https://www.shoalrun.com/cli.md) > Commands > CLI reference

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/cli.md)

The public `@shoalrun/cli` package supplies the `shoalrun` command. It needs Node.js 22.12 or newer. Follow [Getting started](https://www.shoalrun.com/start.md) to install it from npm, then run commands as `npx --no-install shoalrun <command>`. Framework contributors can build the source checkout and run `node framework/dist/cli.js <command>` from its root.

Commands that return data print JSON to standard output. On an error, the CLI prints `{"status":"error","message":"..."}` to standard error and exits with code 1. A config argument defaults to `docs.config.yaml` in the current directory unless noted.

[Diagrams](https://www.shoalrun.com/author/components/diagrams.md) render without a browser: Pele handles Mermaid syntax, and D2 handles D2 source. Development installs include Puppeteer for browser UI tests; production package installs do not need it.

## Inspect config and operations

These commands print configuration and API operation details for inspection.

| Command                                                                               | Prints                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shoalrun config validate [config]`                                                   | `status`, the config `digest`, the number of files read, and a `contrast` result for the palette and modes the site shows. Fails with the build's contrast messages when a color pair fails. |
| `shoalrun config resolve [config]`                                                    | The fully merged config `value`, its `digest`, and the list of files read.                                                                                                                   |
| `shoalrun config graph [config]`                                                      | The root file and every file it includes or extends.                                                                                                                                         |
| `shoalrun config explain <key> [config]`                                              | The value at a dotted key, such as `site.title` or `navigation.0.id`, the file that set it, and the files it overrode.                                                                       |
| `shoalrun operation inspect <id> [config] [--channel C] [--version V] [--language L]` | Each publication where a stable operation ID has a reference page.                                                                                                                           |

`operation inspect` compiles the whole project without writing a site. When the operation isn't found in the selected publications, it prints `"status": "missing-variant"` and still exits with code 0. Put flags after the optional config path. An unknown or repeated flag fails before the project is compiled.
