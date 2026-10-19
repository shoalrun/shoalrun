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

## Host the chat on Vercel

The chat can run as a Vercel function on the same deployment as the site. It is optional, and a build never adds it unless you ask. Add `--chat` to the Vercel build:

```sh
shoalrun vercel build docs.config.yaml .vercel/output --chat
```

The build indexes the site and puts the index inside the function's own directory, never in the public static files. It writes the chat settings, without any key, and copies the code the function needs. The function answers at `/__shoalrun/ask`. If the function cannot be added, the build fails with a reason. Check for:

- A missing `chat` or `retrieval.embeddings` section.
- A missing `chat.budget.store`.
- An embedding key unavailable during the build.

### What the function needs

The function refuses to start without a shared budget store, because counters kept by each server instance would limit nothing. You name the environment variables that hold your keys, and the config never holds a value.

| Variable                                                               | Used for                                                                            |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `VOYAGE_API_KEY` (or the variable `retrieval.embeddings.keyEnv` names) | Embedding the passages at build time, and each question at run time.                |
| The variable `chat.keyEnv` names                                       | The chat model.                                                                     |
| `JEV_API_KEY` (or the variable `chat.rerank.keyEnv` names)             | A configured relevance scorer. Without its key, that scorer counts as down.         |
| The two variables `chat.budget.store` names                            | The shared store. Vercel KV adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` for you. |
| The variable `chat.challenge.secretEnv` names                          | The Turnstile secret.                                                               |

Only requests to the site's own addresses are accepted: the production host from `site.origin`, the deployment's own addresses, and any listed in `SHOALRUN_ASK_HOSTS`. The caller is read from the `x-vercel-forwarded-for` header. Each caller gets a per-minute limit in the shared store, on top of the daily budget.

The hosted chat shows only answers that cite the docs. When the model's answer cites no passage, the reader gets the closest pages instead. An answer gets 100 seconds. After that, the reader sees a message to try again, before Vercel stops the function at 120 seconds.

### Check visitors with Turnstile

`chat.challenge` turns on a Cloudflare Turnstile check. The browser gets a one-time token, and the function asks Cloudflare whether it is real. A failed check is refused before any model is called.

```yaml title="docs.config.yaml"
chat:
  challenge: { provider: turnstile, siteKey: 0x4AAAAAAAexample, secretEnv: TURNSTILE_SECRET_KEY }
```

The site key is public and goes in the config. The secret goes in the environment variable. A check that fails, times out, or has no secret refuses the request, so an outage can't let scripts through. Without `chat.challenge`, the function logs a warning, because only the daily caps then stand in the way of a script.

The default `adaptive` mode requests a challenge when usage crosses a threshold:

- A caller is asked once they have used `freeQuestions` model answers in a day. The default is 3.
- Everyone is asked once the site has used `busyShare` of its daily budget. The default is 0.5.
- A budget store that can't be read means "ask", so an outage never removes the check.

When challenged, the panel runs the check and resends the question. It shows "Checking that you are a person…" while waiting.

A successful check creates a signed, browser-script-inaccessible cookie tied to the caller’s address. The signing key is derived from the Turnstile secret. The pass lasts 15 minutes, so follow-up questions need no new challenge during that time.

| Setting         | What it does                                                                                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `when`          | `adaptive` (the default) asks only when needed. `always` checks every conversation. It runs in the background when the panel opens, so the first question doesn't wait. |
| `freeQuestions` | Model answers a caller gets before being asked. The default is 3.                                                                                                       |
| `busyShare`     | The share of the daily budget at which everyone is asked. A number above 0 and at most 1. The default is 0.5.                                                           |

Cloudflare publishes test keys for development. They work on any address and accept only their own test token, so a test site key needs the matching test secret. Use them for preview deployments, so you never have to register preview addresses.

### Record questions

`chat.log` enables question recording in the shared store and shows readers a notice. It redacts common personal details before saving; redaction is best effort, so treat the log as sensitive.

| Setting         | What it does                                                                  |
| --------------- | ----------------------------------------------------------------------------- |
| `retentionDays` | How long a day's records are kept. The default is 30.                         |
| `maxPerDay`     | The most records kept for one day. The newest are kept. The default is 2,000. |
| `answers`       | Whether the answer text is recorded too. The default is `true`.               |
| `notice`        | The text shown to readers. It must be 300 characters or fewer.                |

Each day has its own list, and the list expires after `retentionDays`. Read the hosted log with the same report as the local one:

```sh
shoalrun ask-log --kv --config docs.config.yaml --days 30
```

The command reads the store's address and token from the environment variables the config names. Recording a question never delays or changes the answer, and a failed write is logged and dropped.

Each recorded hosted answer has a **Delete logged question** button. The reader can remove that one record even while chat is paused. Its unguessable deletion code also appears under the answer so the reader can save it for a later request. Deleting a record does not delete the docs answer from the conversation. Earlier records made before deletion codes were added expire under the retention rule.

For a later request, send the saved code to the same site's answer endpoint:

```sh
curl -X DELETE https://docs.example.com/__shoalrun/ask \
  -H 'Content-Type: application/json' \
  --data '{"receipt":"2026-09-26.0123456789abcdef0123456789abcdef"}'
```

The response says whether that record was deleted or had already expired. Keep the code private: anyone holding it can remove that one record.

### Change the panel's words

`chat.panel` sets the text on the chat panel. Every setting is optional, and a setting you leave out keeps its default.

| Setting       | What it does                              | Default                            |
| ------------- | ----------------------------------------- | ---------------------------------- |
| `title`       | The panel heading.                        | `Ask the docs`                     |
| `placeholder` | The hint in the question box.             | `Ask about these docs`             |
| `intro`       | The line shown before the first question. | `Ask a question about these docs.` |

Each is text of 150 characters or fewer. For example, `panel: { placeholder: Ask about Acme }`.

### Turn the chat off

Choose between removing the function and pausing it:

- **Off for a deployment.** A build has the chat only when you pass `--chat`. Your deploy script decides when to pass it, for example from an environment variable, so removing that variable and redeploying removes the chat.
- **Off right now.** `shoalrun chat pause --config docs.config.yaml` sets a flag in the store. Each running function checks it about every five seconds, so no redeploy is needed. Readers get a "paused" message and no model is called. `shoalrun chat resume` clears the flag, and `shoalrun chat status` shows the state. A store that can't be read counts as paused.

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

## Related reading

### Related topics

- [Check a deployed site](https://www.shoalrun.com/publish/deployment-check.md) — Check a deployed site's headers, redirects, and Markdown negotiation.

- [Publish on Vercel](https://www.shoalrun.com/publish/vercel.md) — Deploy the site itself to Vercel before you add the chat function.
