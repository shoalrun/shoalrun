---
id: recipe.queue-email
title: Queue a welcome email
summary: Submit the welcome template and confirm the API accepted the request.
type: recipe
canonical: /recipes/queue-email
---

# Queue a welcome email

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Recipes and cookbooks > Recipes > Queue a welcome email

**Updated: 2026-09-30.**

Use this path to check request acceptance. For delivery status and failure handling, follow [the complete delivery recipe](https://www.shoalrun.com/recipes/send-welcome-email.md).

## Before you start

Start the local simulation from the Shoalrun repository root in a separate terminal:

```sh
node framework/example-configs/notifications/demo.mjs
```

Keep it running. Have cURL and Node.js available, and use a scratch directory for `queued.json`; the command replaces that file. The demo sends no email.

## Queue the message

```sh
export API_BASE=http://127.0.0.1:8787/v1
curl --fail-with-body --silent --show-error \
  --request POST "$API_BASE/messages/email" \
  --header 'Content-Type: application/json' \
  --data '{"to":"reader@example.com","template":"welcome","variables":{"firstName":"Avery"}}' \
  --output queued.json --write-out 'HTTP %{http_code}\n'
cat queued.json
MESSAGE_ID=$(node -p "JSON.parse(require('fs').readFileSync('queued.json', 'utf8')).id")
printf '\nMessage ID: %s\n' "$MESSAGE_ID"
```

## Check the outcome

The HTTP status is 202, the response says `status: queued`, and the returned `id` is nonempty. Keep that ID if you will check delivery later. A failed POST needs its own diagnostic; do not reuse an ID from an earlier attempt. Acceptance leaves delivery unknown.
