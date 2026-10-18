---
id: recipe.send-welcome-email
title: Send a welcome email and confirm delivery
summary: Follow one message from an accepted request through delivery, and
  inspect a simulated failure.
type: recipe
canonical: /recipes/send-welcome-email
---

# Send a welcome email and confirm delivery

> Documentation index: [llms.min.txt](https://www.shoalrun.com/llms.min.txt) · Document manifest: [documents.json](https://www.shoalrun.com/documents.json)

Navigation section: [Docs](https://www.shoalrun.com/.well-known/shoalrun/navigation/docs-50f26fe22670.txt) (ID: docs). [All sections and pages](https://www.shoalrun.com/llms.min.txt)

Breadcrumbs: [Docs](https://www.shoalrun.com/what-is-shoalrun.md) > Write documentation > Recipes and cookbooks > Recipes > Send a welcome email and confirm delivery

**Updated: 2026-09-30.**

Follow one message from an accepted request through delivery, and inspect a simulated failure.

## Before you start

- `API_BASE`: Set `export API_BASE=http://127.0.0.1:8787/v1` in your command terminal.
- From the Shoalrun repository root, run `node framework/example-configs/notifications/demo.mjs` in a separate terminal and keep it running. If it is already running, reuse it.
- Use a scratch directory for queued.json and delivery.json. These commands replace those files.
- Have cURL and Node.js available in your command terminal.

## Queue the welcome email

- Use `API_BASE` from **Before you start**: The demo API base URL set in your terminal.

Send the `welcome` template to the demo recipient. The demo stores a simulated message and sends no email.

```sh
curl --fail-with-body --silent --show-error \
  --request POST "$API_BASE/messages/email" \
  --header 'Content-Type: application/json' \
  --data '{"to":"reader@example.com","template":"welcome","variables":{"firstName":"Avery"}}' \
  --output queued.json --write-out 'HTTP %{http_code}\n'
cat queued.json
MESSAGE_ID=$(node -p "JSON.parse(require('fs').readFileSync('queued.json', 'utf8')).id")
printf '\nMessage ID: %s\n' "$MESSAGE_ID"
```

A successful response looks like `{"id":"msg_…","status":"queued"}`. If the POST fails, inspect its HTTP status and response before continuing. Do not reuse a message ID from an earlier attempt.

Save `MESSAGE_ID`: The id returned in queued.json; use this exact value for the delivery check.

**Continue when:** The POST returns HTTP 202, status is queued, and MESSAGE_ID is nonempty. This confirms acceptance only.

## Check delivery for that message

- Use `API_BASE` from **Before you start**: Use the same environment as the queue request.
- Use `MESSAGE_ID` from **Queue the welcome email**: Put the returned ID into the status URL; do not substitute the example ID.

Look up the message using the ID saved in the previous step:

```sh
curl --fail-with-body --silent --show-error \
  "$API_BASE/messages/$MESSAGE_ID" \
  --output delivery.json --write-out 'HTTP %{http_code}\n'
cat delivery.json
```

The local demo returns `queued` on the first lookup. Run the lookup once more to see its terminal status. This deterministic transition is part of the simulation; a real provider needs its own polling interval and timeout.

| Status or error    | What to do next                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `queued`           | The request was accepted; delivery is still pending. In this demo, repeat the lookup once.                          |
| `delivered`        | Check that `id` matches `MESSAGE_ID`. The delivery check is complete.                                               |
| `failed`           | Inspect `failureReason`. Correct the cause before creating another message; do not keep polling a terminal failure. |
| HTTP 404           | Check the saved ID and API base URL. Restarting the demo clears its messages.                                       |
| Connection refused | Start the demo and check that it is listening on port 8787.                                                         |

To exercise failure handling, repeat the queue step with `blocked@example.com`, save its new message ID, and check that ID twice. The demo returns `failed` with `failureReason: recipient_rejected`.

Save `deliveryStatus`: The status returned for MESSAGE_ID in delivery.json.

**Continue when:** The response id equals MESSAGE_ID and status is delivered. Queued and failed do not satisfy this recipe's goal.

## Check the outcome

The final response contains the same message ID you saved and `status: delivered`. You have verified the simulated delivery flow. The local demo sends no email; a real provider reporting delivery still does not prove the recipient read it.

## Related reading

### Related topics

- [Welcome email workflows](https://www.shoalrun.com/cookbooks/welcome-email.md) — Compare the complete delivery path with the acceptance-only path.
