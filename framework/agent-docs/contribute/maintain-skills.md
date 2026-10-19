---
id: guide.maintain-skills
title: Maintain bundled skills
summary: Update Shoalrun's agent workflows and the generated documentation they consult.
type: how-to
audiences:
  - maintainers
canonical: /contribute/maintain-skills
---

# Maintain bundled skills

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Contribute > Maintain bundled skills

**Updated: 2026-10-19.**

Shoalrun's portable skills live in `framework/skills/` in the framework repository. This page covers changes to the workflows shipped with Shoalrun. To use them in your documentation project, see [use the bundled agent skills](https://www.shoalrun.com/contribute/agent-skills.md).

## Validate a skill change

Edit the relevant `SKILL.md` and supporting files in its folder. Keep commands consistent with the [CLI reference](https://www.shoalrun.com/cli.md). From the framework repository root, prepare the pinned validator dependencies and check every packaged skill:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r framework/scripts/requirements-skills.txt
export SKILL_VALIDATOR_PYTHON="$PWD/.venv/bin/python"
npm run skills:check
```

The check uses a pinned copy of OpenAI's skill-creator validator. A missing validator dependency or invalid skill fails the command. It checks skill metadata and unfinished placeholders; it does not prove that the instructions work. Execute the affected workflow in a temporary project and review its results as well. Preserve unrelated edits when testing an editing workflow.

## Build and review the documentation export

The source documentation lives in the separate `shoalrun/docs` repository. Use its installed framework package. Prepare its Python validator environment as described in that repository's README, then run from the docs repository root:

```sh
npm run docs:build
npm run docs:check
npm run docs:preview
```

Review the changed HTML and Markdown. The checks reuse the existing build, validate the site's skill, and run AFdocs and strict discovery checks. Read the full reports, including findings that do not fail the required checks.

Export the reviewed build from the docs repository root:

```sh
npm run agent-docs:build
```

Commit the reviewed documentation source and record its full Git commit hash before importing the export. Keep the source revision and validation evidence together. Do not hand-edit the generated Markdown.

## Import the reviewed snapshot

The framework's `docs search` and `docs read` commands use `framework/agent-docs/`. The snapshot contains complete Markdown pages, a document manifest, a search index, and provenance identifying the source docs commit.

From the framework repository root, replace the export path and `FULL_DOCS_COMMIT` with the reviewed values:

```sh
npm run agent-docs:import -- /path/to/docs/agent-docs --source-commit FULL_DOCS_COMMIT
npm test
```

The importer verifies export digests and provenance before replacing the bundle. Confirm the changed guide is available through the CLI's `docs read` command. Commit the framework snapshot separately from the docs source, keeping its source revision pinned. Package publication and website deployment remain separate actions.

## Related reading

### Related topics

- [Use the bundled agent skills](https://www.shoalrun.com/contribute/agent-skills.md) — Use the workflows in a documentation project.
