import path from 'node:path';
import { realpathSync } from 'node:fs';
// Real paths, resolved through the nearest existing parent so paths not yet created compare correctly.
export const canonical = (file: string): string => {
  const resolved = path.resolve(file);
  try { return realpathSync(resolved); }
  catch {
    const parent = path.dirname(resolved);
    return parent === resolved ? resolved : path.join(canonical(parent), path.basename(resolved));
  }
};
export const within = (directory: string, file: string) => {
  const relative = path.relative(directory, file);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
};
// The build deletes its output directory, so that directory must not hold the project or anything the build reads.
export function checkOutputDirectory(destination: string, projectRoot: string, contentDir: string, inputs: string[]) {
  const target = canonical(destination);
  for (const [label, directory] of [['project directory', projectRoot], ['content directory', contentDir]]) {
    if (within(target, canonical(directory))) throw new Error(`Output directory ${target} is or contains the ${label} ${canonical(directory)}; the build deletes its output, so choose a separate directory such as ${path.join(canonical(projectRoot), 'dist')}`);
  }
  if (within(canonical(contentDir), target)) throw new Error(`Output directory ${target} is inside the content directory; later builds would read its Markdown as pages`);
  const input = inputs.map(canonical).find(file => within(target, file));
  if (input) throw new Error(`Output directory ${target} contains build input ${input}; the build deletes its output, so choose a separate directory`);
}
