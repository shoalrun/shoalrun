import { ContentDeliveryError } from './content-delivery-contract.js';
export function freeze<T>(value: T): T { if (value && typeof value === 'object') { Object.freeze(value); for (const child of Object.values(value)) freeze(child); } return value; }
export async function sha256(bytes: Uint8Array): Promise<string> { return [...new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes as BufferSource))].map(byte => byte.toString(16).padStart(2, '0')).join(''); }
export async function readBounded(response: Response, limit: number, signal: AbortSignal): Promise<Uint8Array> {
  const declared = response.headers.get('content-length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > limit)) {
    await response.body?.cancel().catch(() => {});
    throw new ContentDeliveryError('invalid_content', 'Response exceeds the content size limit.');
  }
  const reader = response.body?.getReader(); if (!reader) return new Uint8Array();
  const abort = () => { void reader.cancel(signal.reason).catch(() => {}); }; signal.addEventListener('abort', abort, { once: true });
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) { signal.throwIfAborted(); const next = await reader.read(); signal.throwIfAborted(); if (next.done) break; size += next.value.byteLength; if (size > limit) { await reader.cancel(); throw new ContentDeliveryError('invalid_content', 'Response exceeds the content size limit.'); } chunks.push(next.value); }
  } finally { signal.removeEventListener('abort', abort); reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; } return bytes;
}
