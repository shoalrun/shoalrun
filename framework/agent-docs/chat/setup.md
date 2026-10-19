---
id: guide.set-up-chat
title: Set up local documentation chat
summary: Build a passage index, configure a chat service, and verify cited
  answers locally.
type: how-to
area: discovery
subarea: discovery-chat
subjectLifecycle: experimental
canonical: /chat/setup
---

# Set up local documentation chat

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Search and chat > Documentation chat > Set up locally

**Updated: 2026-10-19.**

**Status: Experimental.**

Set up a local chat panel, then check that its answers cite the right documentation. Start in the root of a Shoalrun project that already builds, with the CLI available in your terminal.

You need a chat-service account and its API key. Meaning-based retrieval also needs an embedding provider and key. These commands make provider requests; they do not deploy your site.

For keyword-only retrieval, omit `retrieval` from the example below and omit `--embed` from the indexing command. You still need the passage index and a chat service.

## Set up and try the chat

This example uses Voyage for embeddings and an OpenAI-compatible chat endpoint through OpenRouter. Choose providers and model IDs available to your accounts.

1. ## Configure the providers

   Add these sections to `docs.config.yaml`. Store `VOYAGE_API_KEY` and `OPENROUTER_API_KEY` in your terminal environment, not in the YAML file.

   ```yaml title="docs.config.yaml"
   retrieval:
     embeddings:
       provider: voyage
       model: voyage-4-large
       dimension: 1024
       queryModel: voyage-4-lite

   chat:
     provider: openai
     model: deepseek/deepseek-v4-flash
     baseUrl: https://openrouter.ai/api/v1
     keyEnv: OPENROUTER_API_KEY
   ```

2. ## Build and index the documentation

   Build the site, then split its Markdown pages into passages. `--embed` sends those passages to the configured embedding provider.

   ```sh
   shoalrun build docs.config.yaml site-dist
   shoalrun index site-dist --embed --config docs.config.yaml
   ```

3. ## Ask a question from the terminal

   Replace the sample question with one that your own pages answer.

   ```sh
   shoalrun ask site-dist "how do I reset my password" --config docs.config.yaml
   ```

   Check the answer's citations and open the source pages. Confirm that the sources support the answer, rather than accepting citations alone as proof.

4. ## Open the local panel

   Start the server and open the address it prints. Ask the same question in the panel and follow its source links. Stop the server with **Ctrl+C** when finished.

   ```sh
   shoalrun serve site-dist --ask --config docs.config.yaml
   ```

## If something goes wrong

A missing-key error names the environment variable to set in the same terminal. For missing or stale sources, rebuild the site and run `index` again. Keyword-only retrieval can miss questions that use different wording from the pages.

This minimal setup has no relevance scorer to decline out-of-scope questions. Before broader use, review [answer checks](https://www.shoalrun.com/chat/checks.md) and [hosting limits](https://www.shoalrun.com/chat/host.md).

To record local questions, add `--log` with a path outside the site output. Logging is optional; read [question logging](https://www.shoalrun.com/chat/host.md) before enabling it. The [CLI reference](https://www.shoalrun.com/cli.md) defines the other flags and report fields.

## Related reading

### Reference while working

- [Retrieval and chat settings](https://www.shoalrun.com/chat/settings.md) — Look up provider fields, environment variables, and answer settings. (Status: experimental.)

### Related topics

- [How documentation answers work](https://www.shoalrun.com/chat.md) — Understand the layers behind cited answers before choosing additional services. (Status: experimental.)
