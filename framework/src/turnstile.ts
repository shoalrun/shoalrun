import { createHmac, timingSafeEqual } from 'node:crypto';

// Cloudflare Turnstile: the browser gets a one-time token after a short check, and the server asks Cloudflare whether it is real before
// any model is called. A token that is missing, expired, reused, or unverifiable is refused. A failing check refuses the request, so an
// outage cannot let scripts through.
export type TurnstileOptions = { secret: string; timeoutMs?: number; fetch?: typeof fetch };

export const turnstileVerifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export function turnstileVerifier(options: TurnstileOptions): (input: { token?: string; ip?: string }) => Promise<boolean> {
  if (!options.secret) throw new Error('Turnstile needs a secret key');
  const send = options.fetch ?? fetch;
  return async ({ token, ip }) => {
    // Tokens are short. A missing or oversized one is refused without asking Cloudflare.
    if (typeof token !== 'string' || !token || token.length > 2048) return false;
    try {
      const form = new URLSearchParams({ secret: options.secret, response: token });
      if (ip && ip !== 'unknown') form.set('remoteip', ip);
      const response = await send(turnstileVerifyUrl, { method: 'POST', body: form, signal: AbortSignal.timeout(options.timeoutMs ?? 3000) });
      if (!response.ok) return false;
      const body = await response.json() as { success?: unknown };
      return body?.success === true;
    } catch { return false; }
  };
}

// A short-lived pass for a visitor who has passed the check, so follow-up questions in the same conversation don't need another one. The pass is
// a cookie the browser cannot read, signed with a key derived from the Turnstile secret, and it is tied to the caller's address key, so a copy
// used from somewhere else is refused. It expires quickly, and the per-minute and daily limits still apply to whoever holds it.
export type SessionOptions = { secret: string; maxAgeSeconds?: number; now?: () => number };

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
  const key = createHmac('sha256', options.secret).update('shoalrun-ask-session').digest();
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
