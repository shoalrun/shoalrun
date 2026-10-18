import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { D2 } from '@d2lang/d2';
import { render as renderPele } from 'pele';
import type { Palette } from './palettes.js';
import { diagramSvg } from './diagram-svg.js';

export type DiagramAsset = { route: string; svg: string };

// Rendered SVGs are cached by source, renderer version, and render settings.
function packageVersion(name: string): string {
  for (let directory = path.dirname(fileURLToPath(import.meta.resolve(name))); ; directory = path.dirname(directory)) {
    try {
      const manifest = JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8'));
      if (manifest.name === name) return String(manifest.version);
    } catch { /* Keep looking in the parent directory. */ }
    if (path.dirname(directory) === directory) throw new Error(`Cannot find the installed ${name} version`);
  }
}
// Fixed render settings; they are part of the cache key, so changing one redraws every cached diagram.
const renderSettings = { d2: { lightTheme: 0, darkTheme: 200 }, mermaid: { renderer: 'pele', fontSize: 16, autoDirection: false, links: false, images: false } } as const;
let rendererVersions: Record<string, string> | undefined;
const cachedSvg = (file: string) => readFile(file, 'utf8').catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return undefined; throw error; });

// Reserve enough room for the bundled preset fonts, including a live preset
// switch. Custom fonts still need visual review, as with custom diagram CSS.
const metricSource = readFileSync(new URL('../styles/fonts/share/metrics.json', import.meta.url), 'utf8');
const fontMetrics = Object.values(JSON.parse(metricSource)) as Array<{ widths: Record<string, number> }>;
const metricDigest = createHash('sha256').update(metricSource).digest('hex');
const measurer = { width(text: string, size: number, _style: number) {
  return [...text].reduce((sum, character) => sum + Math.max(...fontMetrics.map(font => font.widths[character] ?? 1)) * size, 0);
} };

function assetTheme(svg: string, colors?: Record<string, string>): string {
  if (!colors) return svg;
  const variables: Record<string, string> = { bg: colors.surface, fg: colors.ink, muted: colors.muted, line: colors.muted, surface: colors['field-surface'], 'surface-alt': colors.surface, border: colors['field-border'], accent: colors.accent };
  return svg.replace('style="', `style="${Object.entries(variables).map(([name, value]) => `--pele-${name}:${value}`).join(';')};`);
}

export const peleLicenseFile = path.resolve(path.dirname(fileURLToPath(import.meta.resolve('pele'))), '../LICENSE');

export async function resolveDiagramTrees(trees: any[], cacheDirectory?: string, basePath = '', palette?: Palette): Promise<DiagramAsset[]> {
  const assets = new Map<string, string>();
  const peleSources = new Map<string, string>();
  let d2: D2 | undefined;
  const visit = async (node: any): Promise<void> => {
    if (node.type === 'docDiagram') {
      rendererVersions ??= { d2: packageVersion('@d2lang/d2'), mermaid: packageVersion('pele') };
      const identity = node.engine === 'mermaid' ? [rendererVersions.mermaid, renderSettings.mermaid, metricDigest, palette?.light, palette?.dark] : [];
      const hash = createHash('sha256').update(JSON.stringify([node.engine, node.layout, node.source, ...identity])).digest('hex').slice(0, 20);
      const route = `${basePath}/assets/diagrams/${node.engine}-${hash}-light.svg`;
      const darkRoute = `${basePath}/assets/diagrams/${node.engine}-${hash}-dark.svg`;
      if (!assets.has(route)) {
        const key = createHash('sha256').update(JSON.stringify([node.engine, node.layout, node.source, rendererVersions[node.engine], renderSettings[node.engine as keyof typeof renderSettings], ...(node.engine === 'mermaid' ? [metricDigest] : [])])).digest('hex').slice(0, 24);
        const cached = cacheDirectory ? [path.join(cacheDirectory, `${key}-light.svg`), path.join(cacheDirectory, `${key}-dark.svg`)] : [];
        let [svg, darkSvg] = await Promise.all(cached.map(cachedSvg));
        if (svg === undefined || darkSvg === undefined) {
          try {
            if (node.engine === 'd2') {
              d2 ??= new D2();
              const compiled = await d2.compile(node.source, { layout: node.layout });
              svg = await d2.render(compiled.diagram, { ...compiled.renderOptions, themeID: renderSettings.d2.lightTheme, darkThemeID: undefined });
              darkSvg = await d2.render(compiled.diagram, { ...compiled.renderOptions, themeID: renderSettings.d2.darkTheme, darkThemeID: undefined });
            } else {
              svg = renderPele(node.source, { ...renderSettings.mermaid, measurer, idPrefix: `diagram-${hash}` }).svg;
              darkSvg = svg;
            }
            if (cacheDirectory) {
              await mkdir(cacheDirectory, { recursive: true });
              await Promise.all([writeFile(cached[0], svg), writeFile(cached[1], darkSvg)]);
            }
          } catch (error) {
            throw new Error(`${node.file}: failed to render ${node.engine} diagram "${node.title}": ${error instanceof Error ? error.message : String(error)}`);
          }
        }
        if (node.engine === 'mermaid') {
          // Validate generated and cached SVG before publishing or inlining it.
          diagramSvg(svg!, node.title, 'validate');
          peleSources.set(route, svg!);
        }
        assets.set(route, node.engine === 'mermaid' ? assetTheme(svg!, palette?.light) : svg!);
        assets.set(darkRoute, node.engine === 'mermaid' ? assetTheme(darkSvg!, palette?.dark) : darkSvg!);
      }
      if (node.engine === 'mermaid') node.diagramSvg = peleSources.get(route);
      node.url = route;
      node.darkUrl = darkRoute;
    }
    for (const child of node.children ?? []) await visit(child);
  };
  try {
    for (const tree of trees) await visit(tree);
  } finally {
    await d2?.dispose();
  }
  return [...assets].map(([route, svg]) => ({ route, svg }));
}
