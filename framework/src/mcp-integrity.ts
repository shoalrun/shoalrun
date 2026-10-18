import { createHash } from 'node:crypto';
export const mcpRuntimePath = '/mcp-runtime.json';
export const mcpDataPath = '/__shoalrun/mcp-data';
export const fingerprint = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
