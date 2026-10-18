import { getEncoding } from 'js-tiktoken';

export const markdownTokenEncoding = 'cl100k_base';
let encoding: ReturnType<typeof getEncoding> | undefined;
// Treat special-token spellings in documentation as ordinary text.
export const markdownTokens = (value: string) => (encoding ??= getEncoding(markdownTokenEncoding)).encode(value, [], []).length;
export const markdownSize = (value: string) => ({ markdownBytes: Buffer.byteLength(value, 'utf8'), markdownTokens: markdownTokens(value), markdownTokenEncoding });
