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

## Prepare a report for the built site

```sh
shoalrun build docs.config.yaml site-dist
shoalrun eval prepare site-dist --tasks evals/tasks.yaml --out evals/results.json
```

Create the `evals` directory first. Preparation refuses to overwrite an existing report; use a new output filename for another run.

The template contains a task-file digest, a documentation-build digest, a per-file `buildFiles` inventory, a timestamp, empty runner details, and each task marked `skipped`. It records no passing results and does not run the tasks. A template with skipped required tasks fails the check until you complete the run and review.

The task digest uses normalized definitions, so whitespace-only changes do not invalidate a run. Prompt, criteria, tools, or required-status changes do. The build digest covers published output files, including HTML, Markdown, indexes, discovery, and assets. It excludes `build-info.json`, private `ai/` artifacts, and `.shoalrun/` state. File touches do not invalidate otherwise identical output; changed published bytes do. Other published metadata, including build IDs embedded in manifests, remains covered even when it reflects deployment provenance.
