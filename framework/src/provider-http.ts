// Shared by the embedding and chat providers: one place for timeouts, retries, and keeping the key out of errors.

export type Transport = { fetch?: typeof fetch; retries?: number; retryDelayMs?: number; signal?: AbortSignal };

export function providerError(value: unknown, secrets: Array<string | undefined> = []): string {
  let message = String(value instanceof Error ? value.message : value);
  for (const secret of secrets.filter((item): item is string => Boolean(item))) {
    message = message.split(secret).join('[redacted]');
    message = message.split(encodeURIComponent(secret)).join('[redacted]');
  }
  return message.replace(/Bearer\s+[^\s,;"']+/gi, 'Bearer [redacted]').slice(0, 200);
}

export function throwIfCancelled(signal?: AbortSignal): void { signal?.throwIfAborted(); }

export async function retryPause(milliseconds: number, signal?: AbortSignal): Promise<void> {
  throwIfCancelled(signal);
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, milliseconds);
    const abort = () => { clearTimeout(timer); reject(signal?.reason); };
    signal?.addEventListener('abort', abort, { once: true });
  });
}

async function failureDetail(response: Response): Promise<string> {
  try {
    const body = await response.json() as { detail?: unknown; message?: unknown; error?: { message?: unknown } | string };
    const error = typeof body.error === 'string' ? body.error : body.error?.message;
    return String(body.detail ?? body.message ?? error ?? '').slice(0, 200);
  } catch { return ''; }
}

// POST JSON with a timeout, retrying rate limits, server errors, and network failures. Neither the key nor the request body
// appears in an error message.
export async function postJson(label: string, url: string, headers: Record<string, string>, body: unknown, transport: Transport): Promise<unknown> {
  const send = transport.fetch ?? fetch;
  const retries = transport.retries ?? 3;
  const secret = headers.authorization?.replace(/^Bearer\s+/i, '');
  for (let attempt = 0; ; attempt++) {
    throwIfCancelled(transport.signal);
    const delay = () => retryPause((transport.retryDelayMs ?? 1000) * 2 ** attempt, transport.signal);
    let response: Response;
    try {
      response = await send(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal: AbortSignal.any([AbortSignal.timeout(60_000), ...(transport.signal ? [transport.signal] : [])]) });
    } catch (error) {
      throwIfCancelled(transport.signal);
      if (attempt < retries) { await delay(); continue; }
      throw new Error(`${label} request failed: ${providerError(error, [secret])}`);
    }
    throwIfCancelled(transport.signal);
    if (response.ok) return response.json();
    if ((response.status === 429 || response.status >= 500) && attempt < retries) { await delay(); continue; }
    const detail = await failureDetail(response);
    throw new Error(`${label} returned ${response.status}${detail ? `: ${providerError(detail, [secret])}` : ''}`);
  }
}
