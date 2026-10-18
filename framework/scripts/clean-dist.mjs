import { lstat, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const output = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
try {
  const entry = await lstat(output);
  if (!entry.isDirectory()) throw new Error(`Refusing to replace non-directory build output ${output}`);
  await rm(output, { recursive: true });
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
