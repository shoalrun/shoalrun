// Built-in semantic connection. Credentials and query embeddings stay server-side.
import * as lexical from './search-lexical.js';
const endpoint = new URL('../__shoalrun/search', import.meta.url).pathname;
let endpointMissing = false;
export const prepare = lexical.prepare;

export async function search(query, context) {
  const fallback = () => lexical.search(query, context);
  context.signal?.throwIfAborted();
  if (endpointMissing || query.trim().length < 3) return fallback();
  // Debounce requests before spending query-embedding credits. Every listener
  // is removed on completion, including when a keystroke cancels this request.
  await new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); context.signal?.removeEventListener('abort', abort); reject(context.signal.reason); };
    const timer = setTimeout(() => { context.signal?.removeEventListener('abort', abort); resolve(); }, 200);
    context.signal?.addEventListener('abort', abort, { once: true });
  });
  context.signal?.throwIfAborted();
  try {
    const signal = AbortSignal.any([AbortSignal.timeout(4000), ...(context.signal ? [context.signal] : [])]);
    const response = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variant: context.variant, limit: context.limit, readerSelection: context.readerSelection }), signal
    });
    if (response.status === 404) endpointMissing = true;
    if (!response.ok) return fallback();
    const body = await response.json();
    context.signal?.throwIfAborted();
    return Array.isArray(body.results) ? body.results : fallback();
  } catch {
    context.signal?.throwIfAborted();
    return fallback();
  }
}
