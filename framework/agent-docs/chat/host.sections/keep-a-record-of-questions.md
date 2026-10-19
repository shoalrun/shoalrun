---
id: guide.host-chat
title: Host and limit documentation chat
summary: Deploy chat on Vercel with shared usage limits, a visitor challenge,
  optional logs, and an off switch.
type: how-to
area: discovery
subarea: discovery-chat
subjectLifecycle: experimental
canonical: /chat/host
---

# Host and limit documentation chat

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Search and chat > Documentation chat > Host on Vercel

**Updated: 2026-10-19.**

**Status: Experimental.**

Parent page: [Full Markdown page](/chat/host.md)

Host chat after [testing it locally](https://www.shoalrun.com/chat/setup.md). The Vercel function runs beside the documentation site and needs shared usage limits. You can also add a visitor challenge, question logging, and an immediate pause switch.

Before building the hosted function, have these ready:

- Chat and embedding configuration, with the provider keys available in the required environments.
- A shared store that speaks the Upstash REST API.
- A Vercel project and the public address in `site.origin`.

The normal site build does not add this function. Hosted provider requests can incur costs.

## Keep a record of questions

`serve --ask --log FILE` optionally records local questions and results as JSON lines. Each line includes the question, decision, sources, scorer confidence, token usage, time, and answer. Use the report to look for missing documentation and recurring questions.

```sh
shoalrun serve site-dist --ask --config docs.config.yaml --log ~/shoalrun-logs/ask.jsonl
shoalrun ask-log ~/shoalrun-logs/ask.jsonl
```

The report has three lists:

- **Gaps in the docs.** Questions that were declined or hedged, most asked first, with the scorer's best score and the closest pages. Each is a page or paragraph to write, or a question the docs should say they don't cover.
- **Questions worth answering ahead of time.** Questions asked at least twice (change it with `--min-repeats`) that the model answered cleanly and no card covers. `--cards-out FILE` writes them as a list that `shoalrun answers` reads. It creates a new file and never replaces one.
- **Flagged answers.** Answers that a check flagged. Read them and add the good ones to the eval set.

It also counts how questions were answered and how many called the model. It counts questions that got only a list of pages, because the scorer was down or the daily budget was spent. Questions are grouped by their text, ignoring case and punctuation. A paraphrase counts as a different question.

### Local log privacy

Questions can contain personal details. These controls reduce exposure but do not guarantee that sensitive text is removed:

- Emails, phone and card-length numbers, keys, and the query part of a web address are replaced before the line is written. That's best effort and no guarantee.
- The file is created with owner-only permissions and rotates at 5 MB, keeping one older file.
- Shoalrun refuses a log path inside the site directory, because a deploy could publish it.
- The log holds no address or other identifier of the person who asked.
- Only chat questions are recorded. The site's search box runs in the browser and isn't.

A hosted chat that records questions should tell readers so, and should limit how long it keeps them. The Vercel function records questions when `chat.log` is configured.
