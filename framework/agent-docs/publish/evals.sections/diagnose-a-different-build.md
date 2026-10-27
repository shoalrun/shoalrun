---
id: guide.evals
title: Evaluate agent tasks against your docs
summary: Define realistic tasks, record reviewed answers from your own agent,
  and check the results against a documentation build.
type: how-to
area: quality
subarea: quality-evaluations
canonical: /publish/evals
---

# Evaluate agent tasks against your docs

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Publish > Evaluate agent tasks against your docs

**Updated: 2026-10-26.**

Parent page: [Full Markdown page](/publish/evals.md)

Use evaluation tasks to check whether an agent can accomplish important work using your documentation. Shoalrun defines task and result formats, prepares report templates, and checks those reports during an audit. You run your own agent and arrange human or external review of its answers. Shoalrun does not launch agents, choose a model, or grade prose.

You need a built docs site, a few realistic tasks, and an agent or manual workflow for running them. The ordinary build does not execute evaluations or call a model. Evaluations are opt-in audit checks.

## Diagnose a different build

Save a file inventory alongside an evaluation build:

```sh
shoalrun eval snapshot site-dist > evaluated-build.json
shoalrun eval snapshot rebuilt-site > current-build.json
shoalrun eval compare current-build.json --since evaluated-build.json
```

The comparison lists added, changed, and removed file paths. It exits 0 for identical snapshots and 1 for differences or invalid input. Each inventory binds relative file paths and SHA-256 byte digests to the same build digest used by evaluation reports. It contains no answers or grades.

New report templates include this inventory in `buildFiles`. When a report is stale, `eval check` includes the file comparison in `details.buildChanges`. Older reports still receive the exact-build check, but cannot identify which earlier files differ. Editing the stored digest or deleting changed files is not a new evaluation.

For local review of a hosted build, download and retain that exact output, task file, and report template. Run the tasks against the downloaded site and check the completed report against it. Rebuilding the source on another operating system can change rendered assets; a report about the downloaded build does not automatically cover that rebuild. Archive the source revision and build inventory with the run. A successful build capture records no evaluation pass.
