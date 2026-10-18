import type { ChatResult } from './chat.js';
import { z } from 'zod';

export function requireCompleteOutput(reply: ChatResult): void {
  if (['length', 'max_tokens', 'max_output_tokens'].includes(reply.finishReason?.toLowerCase() ?? '')) {
    throw new Error(`Model output was truncated (${reply.finishReason}); no candidate or action was accepted. Increase the output allowance or reduce the task.`);
  }
}

export function parseStructuredOutput<T extends z.ZodType>(reply: ChatResult, schema: T, options: { allowJsonFence?: boolean } = {}): z.output<T> {
  requireCompleteOutput(reply);
  let value: unknown;
  const text = reply.text.trim();
  const fenced = options.allowJsonFence ? /^```(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n```$/.exec(text) : undefined;
  try { value = JSON.parse(fenced ? fenced[1] : text); }
  catch { throw new Error('Invalid structured model response: expected JSON only'); }
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new Error(`Invalid structured model response: ${parsed.error.issues.slice(0, 5).map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`);
  return parsed.data;
}
