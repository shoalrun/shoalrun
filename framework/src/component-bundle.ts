import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const api = fileURLToPath(new URL('./components.js', import.meta.url));
export async function bundleComponent(entry: string, platform: 'node' | 'browser') {
  const result = await build({
    absWorkingDir: path.dirname(entry), entryPoints: [entry], bundle: true, write: false,
    platform, format: platform === 'node' ? 'cjs' : 'esm', target: platform === 'node' ? 'node22' : 'es2022',
    jsx: 'automatic', minify: platform === 'browser', legalComments: 'inline',
    define: platform === 'browser' ? { 'process.env.NODE_ENV': '"production"' } : {},
    metafile: true, logLevel: 'silent',
    plugins: [{ name: 'shoalrun-components-api', setup(context) {
      context.onResolve({ filter: /^@shoalrun\/cli\/components$/ }, () => ({ path: api }));
    } }]
  }).catch(error => { throw new Error(`${entry}: component compilation failed: ${error.errors?.map((item: any) => `${item.location?.file ?? entry}:${item.location?.line ?? 1}: ${item.text}`).join('; ') ?? error.message}`); });
  const dependencies = Object.keys(result.metafile!.inputs).map(file => path.resolve(path.dirname(entry), file));
  for (const file of [...dependencies]) {
    if (!file.split(path.sep).includes('node_modules')) continue;
    let directory = path.dirname(file);
    while (directory !== path.dirname(directory) && path.basename(directory) !== 'node_modules') {
      const metadata = path.join(directory, 'package.json');
      if (await readFile(metadata).then(() => true, () => false)) { dependencies.push(metadata); break; }
      directory = path.dirname(directory);
    }
  }
  return { code: result.outputFiles![0].text, dependencies: [...new Set(dependencies)] };
}
