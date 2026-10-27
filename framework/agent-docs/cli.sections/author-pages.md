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

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Reference > CLI reference

**Updated: 2026-10-27.**

Parent page: [Full Markdown page](/cli.md)

The public `@shoalrun/cli` package supplies the `shoalrun` command. It needs Node.js 22.12 or newer. Follow [Getting started](https://www.shoalrun.com/start.md) to install it from npm, then run commands as `npx --no-install shoalrun <command>`. Framework contributors can build the source checkout and run `node framework/dist/cli.js <command>` from its root.

Commands that return data print JSON to standard output. On an error, the CLI prints `{"status":"error","message":"..."}` to standard error and exits with code 1. A config argument defaults to `docs.config.yaml` in the current directory unless noted.

[Diagrams](https://www.shoalrun.com/author/components/diagrams.md) render without a browser: Pele handles Mermaid syntax, and D2 handles D2 source. Development installs include Puppeteer for browser UI tests; production package installs do not need it.

## Author pages

### `scaffold`

Short form, from inside a project:

```sh
shoalrun scaffold <template> -n <target-file> [options]
```

For example, `shoalrun scaffold guide -n content/pagination.mdx` uses the built-in `guide` template and derives the page ID `guide.pagination`.

Explicit form:

```sh
shoalrun scaffold <template> <config> <target-file> --id ID --title TITLE --summary SUMMARY --slug SLUG [options]
```

The short form finds `docs.config.yaml` in the current directory or a parent, and derives the ID, title, summary, and slug from the target path. `--new` is the same as `-n`.

| Option                                   | Meaning                                                                                                                                  |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `--config FILE`                          | Config file to use (short form only).                                                                                                    |
| `--id`, `--title`, `--summary`, `--slug` | Page values. Required in the explicit form; they override derived values in the short form.                                              |
| `--channel`, `--version`, `--language`   | Publication. Defaults come from `publications.defaults`; the combination must be enabled.                                                |
| `--operation ID`                         | A stable operation ID for the page. Repeat it for several. It must be an operation declared in `apis.*.operations`, not a generated one. |

The target must be a `.md` or `.mdx` file inside the content directory, and must not exist yet. The slug must start with `/`. The new page has draft access. Prints the template, page ID, file path, publication, and access. See [templates](https://www.shoalrun.com/author/templates.md) for how values are derived.

### `docs context`, `docs plan`, and `docs apply`

These commands support a reviewable edit to existing pages and loaded YAML config files:

```sh
shoalrun docs context guide.welcome [--config docs.config.yaml]
shoalrun docs plan --request-file edit-request.json --out edit-plan.json [--config docs.config.yaml]
shoalrun docs apply edit-plan.json [--config docs.config.yaml] --check
shoalrun docs apply edit-plan.json [--config docs.config.yaml]
```

`docs context` reports a stable page ID's authored sources and digests, navigation placements, relationships, and configuration owners. It also returns configured authoring directives and guide and exemplar paths. It does not return a generated API reference as an authored page.

The request file contains full replacement text for each existing file, relative to the project config directory:

```json
{
  "edits": [
    { "file": "content/welcome.mdx", "content": "---\nid: guide.welcome\n...\n---\n\nRevised page text.\n" }
  ]
}
```

`docs plan` records the exact replacements and a SHA-256 digest of each original file. Each request edit can also include `baseDigest`, the lowercase SHA-256 digest of the UTF-8 source text used to write the candidate. If the current source differs, planning fails. Include this digest from the source your agent read before drafting. It refuses to overwrite an existing plan. The plan can be reviewed as JSON or with a diff tool. Edits can replace existing `.md`/`.mdx` files in the content directory and YAML files loaded by the config. Symlink targets and paths outside the project are rejected.

`docs apply --check` verifies the original digests, copies the project to a temporary directory, inserts the proposed text, and builds the candidate site. It reports affected published document IDs and routes without changing the source. Run `docs apply` without `--check` to repeat validation and write the files. A stale digest or failed build stops the write. The command does not run configured `audit.tests`, commit, deploy, or establish that technical claims are correct. Run `shoalrun audit` and review the rendered pages before publication.

### `ingredient draft` and `recipe draft`

```sh
shoalrun ingredient draft --spec FILE --out FILE [--config FILE] [--check]
shoalrun recipe draft --spec FILE --out FILE [--config FILE] [--check]
```

`ingredient draft` takes a spec naming one explicitly configured API operation and a named inline request example. It copies the generated cURL request and first inline 2xx response example into a draft `type: ingredient` page. It supports outgoing requests in the default publication. `recipe draft` takes a project-owned spec with ordered ingredient file paths and assembles a draft `type: recipe` page for a customer goal. It rejects duplicate ingredient IDs and publication mismatches. Ingredients can declare `workflow.inputs`, `workflow.outputs`, `workflow.prerequisites`, and `workflow.check`; recipe specs can declare initial `inputs` and a final `outcome`. The assembler checks handoffs, rejects missing inputs and duplicate output names, and includes shared prerequisites once. Neither command executes a request or uses a model. See [assemble recipes from ingredients](https://www.shoalrun.com/author/recipe-drafts.md) for YAML fields and review workflow.

With `--check`, either command prints the proposed MDX and reports `would-create`, `unchanged`, or `would-change`; it writes nothing and does not build a preview. Without it, the command creates the output file and refuses to overwrite an existing one. A person or agent finishes and verifies the complete recipe before publication.
