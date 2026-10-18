import { toRecord, type AskEvent, type LogRecord } from './ask-log.js';
import type { RestRedis } from './budget-store.js';

// The question log for a hosted site: the same redacted records as the local file, kept in the key-value store with a lifetime. Each day has
// its own list, so retention is automatic: a day's list expires after `retentionDays`, counted from the last question of that day. A cap
// on entries a day keeps the newest ones and bounds what the store holds. A failed write is ignored and never reaches the reader.
export type KvLogOptions = { retentionDays: number; maxPerDay: number; answers?: boolean; now?: () => Date; onError?: (error: Error) => void };

export const logKey = (day: string) => `asklog:${day}`;
const dayOf = (date: Date) => date.toISOString().slice(0, 10);
const receiptPattern = /^([0-9]{4}-[0-9]{2}-[0-9]{2})\.([a-f0-9]{32})$/;

// A receipt is a bearer capability. It names one daily list and one random record, without retaining an address or identity.
export function validLogReceipt(receipt: string): boolean {
  const match = receiptPattern.exec(receipt);
  return Boolean(match && !Number.isNaN(Date.parse(`${match[1]}T00:00:00Z`)));
}

export async function deleteKvLogRecord(redis: Pick<RestRedis, 'command'>, receipt: string): Promise<boolean> {
  if (!validLogReceipt(receipt)) throw new Error('Invalid question deletion receipt');
  const day = receipt.slice(0, 10);
  const lines = await redis.command(['LRANGE', logKey(day), '0', '-1']);
  if (!Array.isArray(lines)) throw new Error('The question log could not be read');
  const line = lines.find(raw => {
    try { return JSON.parse(String(raw)).id === receipt; } catch { return false; }
  });
  if (line === undefined) return false;
  return Number(await redis.command(['LREM', logKey(day), '1', String(line)])) === 1;
}

export function kvLogSink(redis: Pick<RestRedis, 'pipeline'>, options: KvLogOptions): (event: AskEvent) => Promise<void> {
  if (!Number.isSafeInteger(options.retentionDays) || options.retentionDays < 1) throw new Error('retentionDays must be a whole number of 1 or more');
  if (!Number.isSafeInteger(options.maxPerDay) || options.maxPerDay < 1) throw new Error('maxPerDay must be a whole number of 1 or more');
  const now = options.now ?? (() => new Date());
  return async event => {
    try {
      const at = event.now?.() ?? now();
      const record = toRecord({ ...event, now: () => at }, { answers: options.answers });
      const key = logKey(dayOf(at));
      // Newest first, trimmed to the cap, with the list's lifetime set to the retention period from this write.
      await redis.pipeline([['LPUSH', key, JSON.stringify(record)], ['LTRIM', key, '0', String(options.maxPerDay - 1)], ['EXPIRE', key, String(options.retentionDays * 86_400)]]);
    } catch (error) { options.onError?.(error as Error); }
  };
}

// The records for the last `days` days, oldest first. A line that cannot be read is skipped.
export async function readKvLog(redis: Pick<RestRedis, 'pipeline'>, days: number, now: () => Date = () => new Date()): Promise<LogRecord[]> {
  if (!Number.isSafeInteger(days) || days < 1 || days > 366) throw new Error('days must be a whole number from 1 to 366');
  const today = now();
  const keys = Array.from({ length: days }, (_, back) => logKey(dayOf(new Date(today.getTime() - back * 86_400_000)))).reverse();
  const lists = await redis.pipeline(keys.map(key => ['LRANGE', key, '0', '-1']));
  const records: LogRecord[] = [];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const line of [...list].reverse()) {
      try { const record = JSON.parse(String(line)) as LogRecord; if (record?.v === 1 && typeof record.question === 'string') records.push(record); } catch { /* skip */ }
    }
  }
  return records;
}
