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

**Updated: 2026-10-26.**

**Status: Experimental.**

Parent page: [Full Markdown page](/chat/host.md)

Host chat after [testing it locally](https://www.shoalrun.com/chat/setup.md). The Vercel function runs beside the documentation site and needs shared usage limits. You can also add a visitor challenge, question logging, and an immediate pause switch.

Before building the hosted function, have these ready:

- Chat and embedding configuration, with the provider keys available in the required environments.
- A shared store that speaks the Upstash REST API.
- A Vercel project and the public address in `site.origin`.

The normal site build does not add this function. Hosted provider requests can incur costs.

## Cap the daily spend

`chat.budget` limits how many questions can reach a chat model each day. These are question limits, not a currency cap; one question can involve several model calls, and embedding or scoring requests are separate.

```yaml title="docs.config.yaml"
chat:
  budget: { perCaller: 40, perDay: 1000 }
```

| Setting     | What it does                                                                         |
| ----------- | ------------------------------------------------------------------------------------ |
| `perCaller` | The most questions one caller can send to the model in a day.                        |
| `perDay`    | The most the whole site can send in a day. It must be at least `perCaller`.          |
| `store`     | Where the counters live. Leave it out for memory, or name a shared store. See below. |

A request reserves one slot before answering. If no chat-model call is made, the slot is returned. Cached answers and excerpts can still be served when the model budget is spent; retrieval or scoring can have their own provider costs.

A question that needs a new answer gets links to the closest pages instead. Counters reset at midnight UTC.

Each function instance keeps its own cache in memory, so a repeat can still reach the model when another instance answered it first. [Answer cards](https://www.shoalrun.com/chat/prepared-answers.md) can serve common questions without a new chat-model answer when you generate them into the function's private index before deployment.

### Identify callers

The handler tells callers apart with the `clientKey` function you give it, such as one that reads the address from a request header. It stores only a hash of the value. Without `clientKey`, every caller shares one cap. If the counter store fails, the model counts as spent, so an outage can't open it up.

### Use a shared store

With no `store`, the counters live in memory. They reset when the server restarts and aren't shared between processes, which suits the local preview. A serverless host runs many instances, so it needs a store they all share. `store` names one that speaks the Upstash REST API, which Upstash Redis and Vercel KV both provide.

```yaml title="docs.config.yaml"
chat:
  budget:
    perCaller: 40
    perDay: 1000
    store: { provider: upstash, urlEnv: KV_REST_API_URL, tokenEnv: KV_REST_API_TOKEN }
```

`urlEnv` and `tokenEnv` name the environment variables that hold the address and token, and the config never holds either. A missing variable, a slow store, or a store that returns an error counts as a spent budget. The chat then shows the closest pages and never opens up. Shoalrun prints the reason once to the server log. The store address must use `https`, and a request that takes more than two seconds fails without a retry.

For a caller key on a host, use `clientKeyFromHeader` with a header the host sets, such as `x-vercel-forwarded-for`. On a host that passes that header through, a caller can forge it and start a fresh personal cap. The site-wide cap still holds.

Because a slot is taken before the answer and not counted after, questions that arrive together can't all get past a cap. If answering fails, the slot stays taken, because the model may already have been paid.
