---
id: cookbook.welcome-email
title: Welcome email workflows
summary: Choose an acceptance check or follow the same message through delivery.
type: cookbook
canonical: /cookbooks/welcome-email
---

# Welcome email workflows

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Recipes and cookbooks > Cookbooks > Email simulation

**Updated: 2026-09-30.**

An accepted request is the first checkpoint. Choose how far you want to follow the message. Both paths use a local simulation that sends no email.

Each recipe includes the setup command, inputs, and success check. You need a Shoalrun checkout, cURL, and Node.js. The demo runs on your own computer at `127.0.0.1:8787`.

## Choose your outcome

What do you need to confirm?. Choose one recipe.

- [Confirm the request was accepted — Queue a welcome email](https://www.shoalrun.com/recipes/queue-email.md)

  Use when: You are testing the request payload and only need an acceptance check.

  You need: A running local demo, cURL, and Node.js.

  You will have: A queued response and a message ID. Delivery is still unknown.

- [Follow the email through delivery — Send a welcome email and confirm delivery](https://www.shoalrun.com/recipes/send-welcome-email.md)

  Use when: You need to distinguish acceptance, delivery, and a delivery failure.

  You need: A running local demo, cURL, and Node.js.

  You will have: A delivery status tied to the message you queued, with a failure check.

The delivery path includes the queue step, so choose one path. Use **Link to this path** to share your selection, **Download Markdown** to keep the instructions, or **Print this path** for a paper copy. Shared links contain your recipe choice only; they do not contain a message ID.

## Related reading

### Go deeper

- [Compose and maintain recipes](https://www.shoalrun.com/author/recipe-drafts.md) — See how the recipe connects declared ingredient inputs and outputs.

### Related topics

- [Send a welcome email and confirm delivery](https://www.shoalrun.com/recipes/send-welcome-email.md) — Compare the complete delivery path with the acceptance-only path.
