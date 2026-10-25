---
id: guide.audit
title: Audit a docs project
summary: Run project tests and local API representation checks with one CI command.
type: how-to
area: quality
subarea: quality-audits
canonical: /publish/audit
---

# Audit a docs project

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish > Audit a docs project

**Updated: 2026-10-24.**

Parent page: [Full Markdown page](/publish/audit.md)

**Page reading path** — these links apply to the full page.

**Next steps**

- [Evaluate agent tasks against your docs](https://www.shoalrun.com/publish/evals.md) — Add task definitions and reviewed result reports to the audit.

- [Use Manni with Shoalrun](https://www.shoalrun.com/publish/manni.md) — Add conditional editorial metadata checks through an audit hook.

Run `shoalrun audit` from a project directory before publishing. The command combines tests that your project configures with Shoalrun's build and API representation checks. It reports each result as JSON and exits with code `1` if any result fails.

From `framework/`, this example needs no extra setup after `npm run build`:

```sh
node dist/cli.js audit example/docs.config.yaml
```

With no `audit` setting, Shoalrun runs the API source and focused-contract audits and builds the site. No project test commands run until you configure them.

## Read the report

The default example produces this shape (counts and source paths depend on the project):

```json
{
  "status": "ok",
  "results": [
    {
      "id": "api:payments:default",
      "status": "ok",
      "findings": [],
      "details": { "source": "/path/to/openapi.yaml", "operations": 1, "rendered": 1, "namedExamples": 7 }
    },
    { "id": "build", "status": "ok", "findings": [], "details": { "documents": 3 } },
    { "id": "focused-contracts", "status": "ok", "findings": [], "details": { "contracts": 1 } }
  ]
}
```

Configured tests have IDs such as `test:project-tests`. Additional API publications use IDs such as `api:payments:publication-0`. A failing result has `status: "error"` and one or more `findings`, each with a `target` and `message`. The top-level status becomes `error`, and the process exits with code `1`. Config or command-line errors occur before a report can be produced; the CLI writes `{"status":"error","message":"..."}` to standard error instead.

Shoalrun audits each configured local OpenAPI source, including sources that are not published. It checks operation IDs, unique HTML field anchors, and named examples in both representations. The build checks project content and writes a temporary site. If the build succeeds, the focused-contract audit checks each generated contract and its Markdown link. If the build fails, the report keeps test and API results and adds a `build` finding; it cannot run the focused-contract audit.

The temporary site is removed after the audit. Like a normal build, this command also writes the generated frontmatter reference and schema to `.shoalrun/` beside the config. Add `.shoalrun/` to your project's `.gitignore`.

These checks cover the rules Shoalrun implements and any tests you supply. A passing audit does not establish the factual accuracy of prose, full OpenAPI semantic fidelity, accessibility conformance, or live deployment behavior. Use the [post-deploy checker](https://www.shoalrun.com/publish/deployment-check.md) for HTTP behavior on a hosted site.
