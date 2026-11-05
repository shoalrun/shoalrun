import { createHmac, timingSafeEqual } from 'node:crypto';
import { turnstileHostname, turnstileHostnames } from './turnstile-policy.js';

// Cloudflare Turnstile: the browser gets a one-time token after a short check, and the server asks Cloudflare whether it is real before
// any model is called. A token that is missing, expired, reused, or unverifiable is refused. A failing check refuses the request, so an
// outage cannot let scripts through.
export type TurnstileOptions = { secret: string; allowedHostnames: readonly string[]; action?: string; timeoutMs?: number; fetch?: typeof fetch };

export const turnstileVerifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

const previewSecret = '1x0000000000000000000000000000000AA';
const previewToken = 'XXXX.DUMMY.TOKEN.XXXX';

// Cloudflare's published test pair returns synthetic hostname metadata rather
// than a real browser hostname. This helper is used only by loopback preview.
export function turnstilePreviewVerifier(options: Pick<TurnstileOptions, 'fetch' | 'timeoutMs'> = {}): (input: { token?: string; ip?: string }) => Promise<boolean> {
  const send = options.fetch ?? fetch;
  const verify = turnstileVerifier({ ...options, secret: previewSecret, allowedHostnames: ['example.com'], fetch: async (url, init) => {
    const response = await send(url, init);
    if (!response.ok) return response;
    const result = await response.json() as { success?: unknown; hostname?: unknown; metadata?: { result_with_testing_key?: unknown } };
    return Response.json({ success: result.success === true && result.metadata?.result_with_testing_key === true, hostname: result.hostname });
  } });
  return async input => {
    if (input.token !== previewToken) return false;
    return verify(input);
  };
}

export function turnstileVerifier(options: TurnstileOptions): (input: { token?: string; ip?: string }) => Promise<boolean> {
  if (!options.secret) throw new Error('Turnstile needs a secret key');
  const allowed = new Set(turnstileHostnames(options.allowedHostnames, 'Turnstile allowedHostnames'));
  if (options.action !== undefined && !/^[A-Za-z0-9_-]{1,32}$/.test(options.action)) throw new Error('Turnstile action must contain 1 to 32 letters, numbers, underscores, or hyphens');
  const send = options.fetch ?? fetch;
  return async ({ token, ip }) => {
    // Tokens are short. A missing or oversized one is refused without asking Cloudflare.
    if (typeof token !== 'string' || !token || token.length > 2048) return false;
    try {
      const form = new URLSearchParams({ secret: options.secret, response: token });
      if (ip && ip !== 'unknown') form.set('remoteip', ip);
      const response = await send(turnstileVerifyUrl, { method: 'POST', body: form, signal: AbortSignal.timeout(options.timeoutMs ?? 3000) });
      if (!response.ok) return false;
      const body = await response.json() as { success?: unknown; hostname?: unknown; action?: unknown };
      const hostname = turnstileHostname(body?.hostname);
      return body?.success === true && hostname !== undefined && allowed.has(hostname) && (options.action === undefined || body.action === options.action);
    } catch { return false; }
  };
}

// A short-lived pass for a visitor who has passed the check, so follow-up questions in the same conversation don't need another one. The pass is
// a cookie the browser cannot read, signed with a key derived from the Turnstile secret, and it is tied to the caller's address key, so a copy
// used from somewhere else is refused. It expires quickly, and the per-minute and daily limits still apply to whoever holds it.
export type SessionOptions = { secret: string; context?: string; maxAgeSeconds?: number; now?: () => number };

export type Session = {
  name: string;
  valid(cookieHeader: string | null, caller: string): boolean;
  header(caller: string, secure: boolean): string;
};

export function createSession(options: SessionOptions): Session {
  if (!options.secret) throw new Error('A session needs a secret');
  const now = options.now ?? Date.now;
  const maxAge = options.maxAgeSeconds ?? 900;
  const name = 'sr_ask';
  // A separate key, so the cookie signature is never the Turnstile secret itself.
  const derivation = createHmac('sha256', options.secret).update('shoalrun-ask-session');
  if (options.context !== undefined) derivation.update('\0').update(options.context);
  const key = derivation.digest();
  const sign = (expires: string, caller: string) => createHmac('sha256', key).update(`${expires}.${caller}`).digest('base64url');
  return {
    name,
    valid(cookieHeader, caller) {
      const value = cookieHeader?.split(';').map(part => part.trim()).find(part => part.startsWith(`${name}=`))?.slice(name.length + 1);
      if (!value) return false;
      const [expires, signature, extra] = value.split('.');
      if (extra !== undefined || !expires || !signature || !/^\d{1,13}$/.test(expires) || Number(expires) * 1000 < now()) return false;
      const expected = sign(expires, caller);
      return signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    },
    header(caller, secure) {
      const expires = String(Math.floor(now() / 1000) + maxAge);
      return `${name}=${expires}.${sign(expires, caller)}; Max-Age=${maxAge}; Path=/__shoalrun/ask; HttpOnly; SameSite=Strict${secure ? '; Secure' : ''}`;
    }
  };
}
