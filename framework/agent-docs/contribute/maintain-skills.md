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

Navigation section: [Project updates](https://www.shoalrun.com/.well-known/shoalrun/navigation/project-updates-50f26fe22670.txt) (ID: project-updates). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Project updates](https://www.shoalrun.com/status.md) > Project > Maintain bundled skills

**Updated: 2026-09-30.**

Shoalrun's portable skills live in `framework/skills/`. To use them on a site, see [use the bundled agent skills](https://www.shoalrun.com/contribute/agent-skills.md). This page covers changing the workflows shipped with Shoalrun.

## Validate a skill change

Edit the relevant `SKILL.md` and any supporting files in its folder. Keep commands consistent with the [CLI reference](https://www.shoalrun.com/cli.md) and verify the workflow against a temporary project. From the repository root, with [skill-validator](https://github.com/agent-ecosystem/skill-validator) installed, run:

```sh
skill-validator check --strict framework/skills/shoalrun-setup
skill-validator check --strict framework/skills/shoalrun-author
skill-validator check --strict framework/skills/shoalrun-recipes
skill-validator check --strict framework/skills/shoalrun-walkthrough
```

Validation checks the skill structure. Review its instructions and execute the affected workflow as well.

## Refresh the documentation bundle

The CLI's `docs search` and `docs read` commands consult generated files under `framework/agent-docs/`:

- `documents.json` maps stable page IDs to publication variants and Markdown paths.
- `search-index.json` contains searchable page records.
- The `.md` files contain complete generated pages.

The authored source is `docs/content/`. After changing those sources, run from the repository root:

```sh
npm run agent-docs:build
npm test
```

Commit the generated changes with the source changes. The suite compares the bundle with a fresh site build, including its search index and page content.

## Related reading

### Related topics

- [Use the bundled agent skills](https://www.shoalrun.com/contribute/agent-skills.md) — Use the workflows in a documentation project.
