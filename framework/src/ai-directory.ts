import { mkdir, realpath } from 'node:fs/promises';
import path from 'node:path';

export async function aiDirectory(directory: string): Promise<string> {
  const root = path.resolve(directory);
  const target = path.join(root, 'ai');
  await mkdir(target, { recursive: true });
  const real = await realpath(root);
  const inside = await realpath(target);
  if (inside !== real && !inside.startsWith(real + path.sep)) throw new Error('The ai directory leaves the site directory');
  return target;
}
