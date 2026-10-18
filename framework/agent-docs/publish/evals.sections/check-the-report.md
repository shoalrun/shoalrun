---
id: guide.evals
title: Evaluate agent tasks against your docs
summary: Define realistic tasks, record reviewed answers from your own agent,
  and check the results against a documentation build.
type: how-to
canonical: /publish/evals
---

# Evaluate agent tasks against your docs

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish > Evaluate agent tasks against your docs

**Updated: 2026-10-15.**

Parent page: [Full Markdown page](/publish/evals.md)

Use evaluation tasks to check whether an agent can accomplish important work using your documentation. Shoalrun defines task and result formats, prepares report templates, and checks those reports during an audit. You run your own agent and arrange human or external review of its answers. Shoalrun does not launch agents, choose a model, or grade prose.

You need a built docs site, a few realistic tasks, and an agent or manual workflow for running them. The ordinary build does not execute evaluations or call a model. Evaluations are opt-in audit checks.

## Check the report

```sh
shoalrun eval check site-dist --tasks evals/tasks.yaml --report evals/results.json
```

The command prints JSON and exits 1 on failure. It checks schema versions and fields, unique task and criterion IDs, the two digests, timestamps, runner and review details, declared tool access, criterion coverage, and whether each citation identifies a published page in the selected publication. Required tasks must pass. Missing or failed optional tasks appear in the outcomes without blocking, but malformed results, bad citations, or unsupported passing claims still fail validation.

Shoalrun verifies that cited pages exist; it does not verify that their text supports an answer. Reported tool use and grades are assertions supplied by the runner and reviewer. A passing report does not establish broad agent reliability or factual correctness.
