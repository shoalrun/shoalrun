import type { IncomingMessage, ServerResponse } from 'node:http';

export type FunctionRuntime = {
  schemaVersion: 1;
  settings: Record<string, unknown>;
  variant?: { channel: string; version: string; language: string };
  hosts?: string[];
  callerHeader?: string;
  maxRequestsPerMinute?: number;
  searchStore?: { provider: 'upstash'; urlEnv: string; tokenEnv: string };
};

export type AskFunction = (request: Request) => Promise<Response>;

export function allowedHosts(runtime: FunctionRuntime, env: NodeJS.ProcessEnv): string[] {
  return [...new Set([...(runtime.hosts ?? []), env.VERCEL_URL, env.VERCEL_BRANCH_URL, env.VERCEL_PROJECT_PRODUCTION_URL, ...(env.SHOALRUN_ASK_HOSTS?.split(',') ?? [])].map(host => host?.trim().toLowerCase()).filter((host): host is string => Boolean(host)))];
}

const failure = (status: number, message: string): Response => new Response(JSON.stringify({ error: message }), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

// Vercel's Node runtime calls `(req, res)`. This turns that into a Web request and back. Starting up happens on the first request, and a
// failed start is tried again on the next one. The reader never sees why it failed; the reason goes to the function log.
export function nodeAdapter(load: () => Promise<AskFunction>, limits = { bodyBytes: 32_768 }): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  let ready: Promise<AskFunction> | undefined;
  const write = async (res: ServerResponse, response: Response) => {
    res.statusCode = response.status;
    response.headers.forEach((value, name) => { if (name !== 'set-cookie') res.setHeader(name, value); });
    const cookies = response.headers.getSetCookie();
    if (cookies.length) res.setHeader('set-cookie', cookies);
    res.end(Buffer.from(await response.arrayBuffer()));
  };
  return async (req, res) => {
    try {
      const handler = await (ready ??= load().catch(error => { ready = undefined; throw error; }));
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of req) {
        size += (chunk as Buffer).length;
        if (size > limits.bodyBytes) { await write(res, failure(413, 'The request is too large.')); return; }
        chunks.push(chunk as Buffer);
      }
      const headers = new Headers();
      for (const [name, value] of Object.entries(req.headers)) for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) headers.append(name, item);
      const method = req.method ?? 'GET';
      const request = new Request(`https://${req.headers.host ?? 'localhost'}${req.url ?? '/'}`, { method, headers, ...(method === 'GET' || method === 'HEAD' ? {} : { body: Buffer.concat(chunks) }) });
      await write(res, await handler(request));
    } catch (error) {
      console.error(`The answer function failed: ${(error as Error).message}`);
      if (!res.headersSent) await write(res, failure(503, 'The chat is unavailable right now.'));
    }
  };
}
