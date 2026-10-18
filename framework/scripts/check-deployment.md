# Check a deployed Shoalrun site

After publishing a site, run the provider-neutral HTTP check against its origin:

```sh
npm run deploy:check -- https://docs.example.com/
```

The command reads the deployed `documents.json` and checks every listed page. It requests HTML and negotiated Markdown at the page URL, requests the direct `.md` URL, compares the two Markdown bodies, and checks content types, `Vary`, `Content-Location`, and alternate `Link` headers. It also checks `/llms.txt`, `/resource-headers.json`, an API catalog when declared, and that unknown HTML and Markdown requests return 404. Each failed check is printed with its route. The process exits with status 1 for site failures and 2 for invalid input.

Pass the site origin, including a trailing slash. The checker currently assumes Shoalrun's root-path URLs; deployment under a base path is a separate roadmap item. The checker does not modify the site. Run it against a deployed URL before release; a local build alone cannot verify the host's routing and response headers.

For an optional hosted chat, add `--chat`. The checker reads `chat.json` and sends safe requests to the answer endpoint: GET must return 405, a foreign Origin must return 403, and an empty same-origin JSON question must return 400 before any model call. If the chat is already paused, add `--chat-paused` as well to expect its 503 response. The checker never changes the pause flag.
