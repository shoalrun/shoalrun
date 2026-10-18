import type { AskResult } from './ask.js';
import type { AskEvent } from './ask-log.js';
import type { Session } from './turnstile.js';
import type { ChatMessage } from './chat.js';
import type { DailyBudget, SharedRateLimit } from './budget.js';
import { randomBytes } from 'node:crypto';
import { validLogReceipt } from './ask-log-kv.js';

// A Web-standard `Request` in and `Response` out, so the same handler serves the local preview and, later, a Vercel, Cloudflare, or
// Netlify function. It owns the checks any endpoint that spends money needs: who may call it, how big a request may be, and how
// often. What answers the question is passed in, so the handler never sees a key.
export type AskHandlerOptions = {
  answer(question: string, history: ChatMessage[], context: { modelAllowed: boolean; signal: AbortSignal }): Promise<AskResult>;
  // Daily caps on questions that reach the model. It needs `clientKey` to tell callers apart; without it, every caller shares one cap.
  budget?: DailyBudget;
  // True while the chat is switched off. It is checked first, before the body is read, and answers 503 with `paused: true` so the panel can say so.
  paused?: () => Promise<boolean>;
  // `public` sends a reader only what they need: the answer, its sources, and the warnings. The default sends everything, for a local preview that shows how an answer was made. A hosted chat must use `public`, because notes and routing name models and carry provider messages.
  response?: 'full' | 'public';
  // A per-minute limit shared across server instances. When set, it replaces the in-memory limit, which counts only what one instance sees.
  rateLimiter?: Pick<SharedRateLimit, 'take'>;
  // Checked after the request is validated and before anything is answered or counted. A body field `turnstileToken` carries the browser's token. It returns false to refuse.
  // A pass from a check already done. A request with a valid one skips the challenge, and a request that passes the challenge is given one.
  session?: Session;
  // Decides whether this caller must pass the challenge now. Without it, every caller without a pass must. A rejection counts as "must".
  challengeNeeded?: (caller: string) => Promise<boolean>;
  challenge?: (input: { token?: string; ip: string; request: Request }) => Promise<boolean>;
  // Called with each question and its result, for a log. It can never change or delay the reader's answer beyond its own time, and its failures are ignored.
  record?: (event: AskEvent) => void | Promise<void>;
  deleteRecord?: (receipt: string) => Promise<boolean>;
  // Host header values this server answers to. The list is read on every request, so a server can add its address once it listens. A page on another site, or a DNS name that has been pointed at this machine, is
  // refused, so a web page cannot make the local server spend your API credits.
  hosts: string[];
  maxRequestsPerMinute?: number;
  clientKey?: (request: Request) => string;
  exposeErrors?: boolean;
  // The longest an answer may take. A host that stops a function at a fixed time sets this below that limit, so the reader gets this
  // server's message instead of the host's error page. The slot stays taken, because the model may already have been paid.
  answerTimeoutMs?: number;
  now?: () => number;
};

// A `clientKey` that reads the caller's address from a header the host sets, such as `x-vercel-forwarded-for` on Vercel or
// `cf-connecting-ip` on Cloudflare. Use only a header your host sets itself. On a host that passes the header through, a caller can
// forge it and start a fresh personal cap, though the site-wide cap still holds. A missing header shares one key.
export const clientKeyFromHeader = (name: string) => (request: Request): string => request.headers.get(name)?.split(',')[0].trim() || 'unknown';

export const askLimits = { requestBytes: 16_384, question: 500, historyMessages: 10, historyMessage: 2000 };

class AnswerTimeout extends Error {}

const json = (status: number, body: unknown, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });

export function createAskHandler(options: AskHandlerOptions): (request: Request) => Promise<Response> {
  const limit = options.maxRequestsPerMinute ?? 20;
  const now = options.now ?? Date.now;
  const seen = new Map<string, number[]>();

  return async request => {
    if (request.method !== 'POST' && !(request.method === 'DELETE' && options.deleteRecord)) return json(405, { error: 'Use POST.' }, { Allow: options.deleteRecord ? 'POST, DELETE' : 'POST' });
    const hosts = new Set(options.hosts.map(item => item.toLowerCase()));
    const host = request.headers.get('host')?.toLowerCase();
    const origin = request.headers.get('origin');
    let originHost: string | undefined;
    try { originHost = origin ? new URL(origin).host.toLowerCase() : undefined; } catch { return json(403, { error: 'This request is not allowed.' }); }
    // A request from a browser always carries an Origin, and one from curl carries none. A cross-site page can send a text/plain
    // POST without a preflight, so the JSON content type below is a second check, not the only one.
    if (!host || !hosts.has(host) || (originHost !== undefined && !hosts.has(originHost))) return json(403, { error: 'This request is not allowed.' });
    if (!/^application\/json\b/i.test(request.headers.get('content-type') ?? '')) return json(415, { error: 'Send application/json.' });

    if (request.method === 'DELETE') {
      const raw = await request.text();
      if (Buffer.byteLength(raw) > 1024) return json(413, { error: 'The request is too large.' });
      let body: { receipt?: unknown };
      try { body = JSON.parse(raw); } catch { return json(400, { error: 'The request body is not valid JSON.' }); }
      if (!body || typeof body.receipt !== 'string' || !validLogReceipt(body.receipt)) return json(400, { error: 'A valid deletion receipt is required.' });
      if (options.rateLimiter) {
        const taken = await options.rateLimiter.take(options.clientKey?.(request) ?? 'shared');
        if (!taken.allowed) return json(429, { error: 'Too many requests. Wait a moment and try again.' }, { 'Retry-After': String(taken.retryAfterSeconds) });
      }
      try { return json(200, { deleted: await options.deleteRecord!(body.receipt) }); }
      catch { return json(503, { error: 'The question could not be deleted right now. Try again later.' }); }
    }

    if (options.paused && await options.paused().catch(() => true)) return json(503, { error: 'The chat is paused right now. Please try again later.', paused: true }, { 'Retry-After': '300' });
    const declared = Number(request.headers.get('content-length') ?? 0);
    if (declared > askLimits.requestBytes) return json(413, { error: 'The request is too large.' });
    const raw = await request.text();
    if (Buffer.byteLength(raw) > askLimits.requestBytes) return json(413, { error: 'The request is too large.' });
    let body: { question?: unknown; history?: unknown; turnstileToken?: unknown };
    try { body = JSON.parse(raw); } catch { return json(400, { error: 'The request body is not valid JSON.' }); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json(400, { error: 'The request body must be an object.' });
    const question = typeof body.question === 'string' ? body.question.trim() : '';
    if (!question) return json(400, { error: 'Ask a question.' });
    if (question.length > askLimits.question) return json(400, { error: `Keep the question under ${askLimits.question} characters.` });
    const history: ChatMessage[] = [];
    if (body.history !== undefined) {
      if (!Array.isArray(body.history) || body.history.length > askLimits.historyMessages) return json(400, { error: `History holds at most ${askLimits.historyMessages} messages.` });
      for (const message of body.history as Array<{ role?: unknown; content?: unknown }>) {
        if (!message || (message.role !== 'user' && message.role !== 'assistant') || typeof message.content !== 'string') return json(400, { error: 'Each history message needs a user or assistant role and text.' });
        // An earlier answer can be long. Only its start is kept as context, so a follow-up is never refused for the length of what came before.
        history.push({ role: message.role, content: message.content.slice(0, askLimits.historyMessage) });
      }
    }

    const key = options.clientKey?.(request) ?? 'shared';
    let passHeaders: Record<string, string> = {};
    const held = Boolean(options.session?.valid(request.headers.get('cookie'), key));
    if (options.challenge && !held && (!options.challengeNeeded || await options.challengeNeeded(key).catch(() => true))) {
      const passed = await options.challenge({ token: typeof body.turnstileToken === 'string' ? body.turnstileToken : undefined, ip: key, request }).catch(() => false);
      if (passed && options.session) passHeaders = { 'Set-Cookie': options.session.header(key, new URL(request.url).protocol === 'https:') };
      if (!passed) return json(403, { error: 'The check did not pass. Reload the page and try again.', challenge: true });
    }
    // From here the visitor has passed, so every reply carries their pass when they were just given one.
    const reply = (status: number, body: unknown, headers: Record<string, string> = {}) => json(status, body, { ...passHeaders, ...headers });
    const current = now();
    if (options.rateLimiter) {
      const taken = await options.rateLimiter.take(key);
      if (!taken.allowed) return reply(429, { error: 'Too many questions. Wait a moment and try again.' }, { 'Retry-After': String(taken.retryAfterSeconds) });
    }
    const recent = options.rateLimiter ? [] : (seen.get(key) ?? []).filter(time => current - time < 60_000);
    if (!options.rateLimiter && recent.length >= limit) {
      seen.set(key, recent);
      return reply(429, { error: 'Too many questions. Wait a moment and try again.' }, { 'Retry-After': String(Math.max(1, Math.ceil((60_000 - (current - recent[0])) / 1000))) });
    }
    if (!options.rateLimiter) {
      seen.set(key, [...recent, current]);
      // Callers who stopped asking would otherwise stay in the map for the life of the process.
      if (seen.size > 10_000) for (const [caller, times] of seen) if (!times.some(time => current - time < 60_000)) seen.delete(caller);
    }

    let timer: NodeJS.Timeout | undefined;
    const controller = new AbortController();
    try {
      // A slot is taken before the question is answered, and given back if no model call was needed. If answering fails, the slot stays
      // taken, because the model may already have been paid.
      const reservation = options.budget ? await options.budget.reserveWithReceipt(key) : undefined;
      const answering = options.answer(question, history, { modelAllowed: !options.budget || Boolean(reservation), signal: controller.signal });
      let result: AskResult;
      if (options.answerTimeoutMs) {
        answering.catch(() => {});
        result = await Promise.race([answering, new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(new AnswerTimeout()); reject(new AnswerTimeout()); }, options.answerTimeoutMs); })]);
      } else result = await answering;
      if (options.budget && reservation && result.usage.chatCalls === 0) await options.budget.releaseReservation(reservation);
      const recordedAt = new Date(now());
      const receipt = options.record && options.response === 'public' ? `${recordedAt.toISOString().slice(0, 10)}.${randomBytes(16).toString('hex')}` : undefined;
      if (options.record) await Promise.resolve().then(() => options.record!({ id: receipt, question, history, result, elapsedMs: now() - current, now: () => recordedAt })).catch(() => {});
      if (options.response === 'public') return reply(200, { answer: result.answer, decision: result.decision, sources: result.sources, uncited: result.uncited, unsupportedCode: result.unsupportedCode, unsupportedClaims: result.unsupportedClaims.map(claim => ({ text: claim.text })), ...(receipt ? { deletionReceipt: receipt } : {}) });
      return reply(200, { answer: result.answer, decision: result.decision, mode: result.mode, sources: result.sources, notes: result.notes, jevBest: result.jevBest, standalone: result.standalone, uncited: result.uncited, unsupportedCode: result.unsupportedCode, verified: result.verified, unsupportedClaims: result.unsupportedClaims, routing: result.routing, cached: result.cached, usage: result.usage, timings: result.timings });
    } catch (error) {
      if (error instanceof AnswerTimeout) return reply(504, { error: 'The answer took too long. Try again in a moment.' });
      return reply(502, { error: options.exposeErrors ? (error as Error).message : 'The assistant is unavailable right now. Try again shortly.' });
    } finally { if (timer) clearTimeout(timer); }
  };
}
