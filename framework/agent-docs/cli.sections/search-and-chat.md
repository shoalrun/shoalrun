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

## Search and chat

These commands are optional. They read a site you have already built, and a normal `shoalrun build` never runs them. See [Search and chat](https://www.shoalrun.com/search-and-chat.md) for the distinctions between site search, passage retrieval, and answers.

### `index`

```sh
shoalrun index <site-directory> [--embed [--config FILE] [--provider voyage|openai] [--model MODEL] [--dimension N] [--base-url URL] [--key-env NAME]]
```

Optional. Run it after `shoalrun build`. The build doesn't need it, and skipping it changes nothing about your site. It splits a built site into passages and writes `ai/chunks.json` in that directory. It reads `documents.json`, each page's Markdown twin, and `search-index.json` when present, and replaces any earlier file. It prints JSON with the page count, passage count, and output path. It fails when the directory has no `documents.json`, or when a page's Markdown path leaves the site directory.

Without `--embed`, the command makes no network requests. With `--embed`, it also sends each passage to an embedding API and writes `ai/embeddings.json` and `ai/embeddings.bin`. Shoalrun has no default provider or model. The [`retrieval.embeddings`](https://www.shoalrun.com/chat/settings.md) setting in your config chooses them. The command finds `docs.config.yaml` in the current directory or a parent, or you can name a file with `--config`. The flags override the config. Pass both `--provider` and `--model` and the command needs no config at all.

| Option        | Value                                                                                                                                                                       |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--provider`  | `voyage` reads `VOYAGE_API_KEY`. `openai` calls OpenAI's embeddings API, or any server that copies it, such as Ollama, vLLM, or a LiteLLM proxy. It reads `OPENAI_API_KEY`. |
| `--model`     | The embedding model ID.                                                                                                                                                     |
| `--dimension` | The vector size. Voyage accepts 256, 512, 1024 (the default), or 2048. Other models need it unless Shoalrun knows the model's size.                                         |
| `--base-url`  | `openai` only. An OpenAI-style server, such as `http://localhost:11434/v1` for Ollama. The default is `https://api.openai.com/v1`.                                          |
| `--key-env`   | The name of the environment variable that holds the key. Servers on `localhost` need no key.                                                                                |

All embedding options need `--embed`. A rerun embeds only passages whose text changed. The JSON summary then adds an `embeddings` object with the model, dimension, and counts of embedded and reused passages.

See [Passage index](https://www.shoalrun.com/chat/passage-index.md) for the chunking rules and file formats.

### `serve --search`

```sh
shoalrun serve <site-directory> --search --config docs.config.yaml [--port PORT]
```

Optional local preview for a custom browser search provider. Run `shoalrun build` and `shoalrun index` first. The server adds `/__shoalrun/search`, which returns page and section links from lexical passage retrieval or combines it with semantic retrieval when current vectors exist. It reads query embedding settings from `retrieval.embeddings` and the key from the environment. It runs only on a loopback address and accepts same-origin JSON requests. It does not add the chat panel or call a chat model. A site needs a [custom provider](https://www.shoalrun.com/author/search.md) to call the endpoint; the built-in search provider continues to use `/search-index.json`.

The local `serve --search` command is a preview server. The optional Vercel `--chat` build packages the same search handler as `/__shoalrun/search`, alongside `/__shoalrun/ask`, with shared rate and embedding budgets.

### `ask`

```sh
shoalrun ask <site-directory> "<question>" [--config FILE] [--model MODEL] [--passages N] [--reader-view FACET=CHOICE[,CHOICE]]... [--channel C --version V --language L] [--no-rerank] [--no-direct] [--no-escalate] [--no-cards] [--json]
```

Optional. It answers one question from your built docs, with citations. It needs a site that you have run [`shoalrun index`](https://www.shoalrun.com/cli.md#index) on, and a [`chat`](https://www.shoalrun.com/chat/settings.md) section in your config. The build doesn't need any of this, and skipping it changes nothing about your site. Quote the question.

The command searches the passages, using vector search too when the site has vectors, and optionally reorders the best results with Jev. Then it decides. If the docs don't cover the question, it says so and makes no call to the model. Otherwise it sends the best passages to the model and prints the answer, followed by a `Sources` list. Each source is a passage the answer cites, with a link. A citation to a passage that wasn't sent is removed, and an answer with no citation prints a warning on standard error. Text in the passages is treated as untrusted and can't instruct the model. Code that isn't in the passages, and sentences that the cited docs don't support, are listed as notes. See [How an answer is checked](https://www.shoalrun.com/chat/checks.md).

Standard error also shows how the answer was made: the search mode, the decision, the Jev score, the model, the tokens, and the time. Any layer that failed, such as Jev or the query embedding, is listed as a note, and the answer falls back to plain search. `--json` prints the full result as JSON instead, including every passage the model saw and the support score of every checked sentence.

| Option                                 | Value                                                                                        |
| -------------------------------------- | -------------------------------------------------------------------------------------------- |
| `--config`                             | The config to read. The default is `docs.config.yaml` in the current directory or a parent.  |
| `--model`                              | Overrides `chat.model`.                                                                      |
| `--passages`                           | Overrides `chat.passages`.                                                                   |
| `--reader-view`                        | Overrides `chat.readerView`, as `facet=choice[,choice]`. Repeat it for more than one filter. |
| `--channel`, `--version`, `--language` | The publication to search. Needed only when the site has more than one.                      |
| `--no-rerank`                          | Skips Jev even when `chat.rerank` is set.                                                    |
| `--no-direct`                          | Always uses the model, even when `chat.direct` would show an excerpt.                        |
| `--no-escalate`                        | Skips the escalation model even when `chat.escalate` is set.                                 |
| `--no-cards`                           | Skips answer cards even when `chat.cards` is set.                                            |
| `--json`                               | Prints the result as JSON.                                                                   |

The command answers one question at a time. It reads `OPENAI_API_KEY`, or the variable that `chat.keyEnv` names, and `JEV_API_KEY`, or the variable that `chat.rerank.keyEnv` names, when you use a scorer. It fails with a clear message when the chat section, the chat key, or `ai/chunks.json` is missing. Without the scorer's key, the scorer counts as down, as [chat settings](https://www.shoalrun.com/chat/settings.md) explain.

### `answers`

```sh
shoalrun answers <site-directory> --questions FILE [--config FILE] [--model MODEL] [--reader-view FACET=CHOICE[,CHOICE]]...
```

Optional. It builds [answer cards](https://www.shoalrun.com/chat/prepared-answers.md) from a list of questions and writes `ai/answers.json`. The list is YAML or JSON: plain strings, or mappings with `question` and `aliases`. It needs a site that you have indexed with `--embed`, and the same `chat` config as `ask`. This build step uses embeddings and the configured scorer. It calls the chat model for questions that pass the coverage gate. It never reuses a direct excerpt or another card. It embeds kept questions and aliases, then keeps only answers that passed every check. It prints JSON with the number of cards, the questions it skipped and why, and the output path. It replaces any earlier file, so keep the question list in your repository and rerun it after the docs change.

### `ask-log`

```sh
shoalrun ask-log (<log-file> | --kv --config FILE [--days N]) [--min-repeats N] [--limit N] [--cards-out FILE] [--json]
```

Optional. It reads a log made by `serve --ask --log` and prints the report described in [Keep a record of questions](https://www.shoalrun.com/chat/host.md). `--limit` sets how many rows each list shows, and `--json` prints the full report as JSON.

### `chat`

```sh
shoalrun chat pause|resume|status --config FILE
```

Optional. It switches a hosted chat off and on through the store that `chat.budget.store` names. See [Turn the chat off](https://www.shoalrun.com/chat/host.md).

### `serve --ask`

```sh
shoalrun serve <site-directory> --ask [--config FILE] [--model MODEL] [--log FILE] [--public-preview] [--reader-view FACET=CHOICE[,CHOICE]]... [--port PORT]
```

Optional. It serves a built and indexed site with a local chat panel, so you can try `shoalrun ask` in a browser. An **Ask** button appears on every page, and the panel keeps the conversation so follow-up questions work. Each answer has a "How this answer was made" line with the search mode, the decision, the Jev score, the tokens, and the time. A sentence that fails the claims check, or code that isn't in the docs, appears under the answer as a warning.

`--public-preview` shows the reader-facing panel with the recording notice and a Turnstile check using Cloudflare's test keys. Answers still use your configured model and API credits; counters remain in memory.

This is a local preview and nothing more:

- It runs only on a loopback address (`127.0.0.1`, `localhost`, or `::1`), because every question spends your API credits. It refuses `--host 0.0.0.0` and any other address.
- `serve --ask` adds the panel and the `/__shoalrun/ask` endpoint for local preview. `shoalrun vercel build --chat` adds the hosted panel and function. Ordinary `build` and `dev` do not add chat.
- The endpoint refuses requests from other web sites and from unknown host names, requires JSON, caps the request size, and allows 20 questions a minute.

It reads the same `chat` and `retrieval` config as `ask`, and the keys from the environment. Stop it with the usual interrupt.
