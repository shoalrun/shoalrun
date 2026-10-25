import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { parseFragment } from 'parse5';

export const exportDigest = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
export type ExportAsset = { path: string; mediaType: string; bytes: number; digest: string };
const media: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.txt': 'text/plain', '.csv': 'text/csv', '.json': 'application/json', '.yaml': 'application/yaml', '.yml': 'application/yaml' };
const within = (root: string, file: string) => file === root || file.startsWith(root + path.sep);

// External SVG files still must be passive and self-contained. Never fetch nested resources.
export function validateExportSvg(svg: string): void {
  const fragment: any = parseFragment(svg);
  const allowed = new Set('svg g defs marker path rect circle ellipse line polyline polygon text tspan title desc linearGradient radialGradient stop clipPath pattern symbol use style filter feGaussianBlur feOffset feBlend feColorMatrix feFlood feComposite feMerge feMergeNode mask'.split(' '));
  const visit = (node: any) => {
    if (node.nodeName === '#text' || node.nodeName === '#comment') return;
    if (!allowed.has(node.tagName)) throw new Error(`Unsupported passive SVG element ${node.tagName ?? node.nodeName}`);
    for (const attr of node.attrs ?? []) {
      if (attr.name === 'base' || attr.prefix && !['xmlns', 'xlink', 'xml'].includes(attr.prefix)) throw new Error('SVG base URLs and unsupported namespaces are not allowed');
      if (attr.name === 'style' && /\\|@import|expression\s*\(|javascript:/i.test(attr.value)) throw new Error('SVG styles must be passive');
      if (/^on/i.test(attr.name)) throw new Error('SVG event handlers are not allowed in exports');
      if (attr.name === 'href' && !attr.value.startsWith('#')) throw new Error('External SVG references are not supported in exports');
      if (/url\(/i.test(attr.value.replace(/url\(\s*["']?#[^\s)"']+["']?\s*\)/g, ''))) throw new Error('External SVG styles are not supported in exports');
    }
    if (node.tagName === 'style') {
      const css = (node.childNodes ?? []).map((child: any) => child.value ?? '').join('');
      const withoutEmbeddedFonts = css.replace(/url\(\s*["']?data:(?:application\/(?:font-woff|x-font-ttf|x-font-opentype)|font\/(?:woff2?|ttf|otf));base64,[A-Za-z0-9+/=]+["']?\s*\)/g, '');
      if (/\\|@import|expression\s*\(|javascript:|url\(/i.test(withoutEmbeddedFonts.replace(/url\(\s*["']?#[^\s)"']+["']?\s*\)/g, ''))) throw new Error('SVG styles must not load resources or execute code');
    }
    for (const child of node.childNodes ?? []) visit(child);
  };
  const roots = fragment.childNodes.filter((node: any) => node.nodeName !== '#comment' && (node.nodeName !== '#text' || node.value.trim()));
  if (roots.length !== 1 || roots[0].tagName !== 'svg') throw new Error('Expected one passive SVG image');
  visit(roots[0]);
}

export class ExportAssets {
  readonly artifacts = new Map<string, string | Buffer>();
  readonly records = new Map<string, ExportAsset>();
  private registered = new Map<string, { file?: string; content?: string | Buffer; extension: string }>();
  private roots: string[] = [];
  constructor(readonly publicBase: string) {}
  async allow(roots: string[]) { this.roots = await Promise.all(roots.map(root => realpath(root))); }
  register(url: string, value: { file?: string; content?: string | Buffer; extension?: string }) {
    const key = url.split(/[?#]/)[0];
    const extension = value.extension ?? path.extname(value.file ?? key).toLowerCase();
    const prior = this.registered.get(key);
    if (prior && (prior.file !== value.file || prior.content !== value.content)) throw new Error(`Ambiguous export asset ${key}`);
    this.registered.set(key, { ...value, extension });
  }
  async resolve(url: string, sourceFile: string): Promise<ExportAsset | undefined> {
    const parsed = new URL(url, 'https://export.invalid/');
    const key = url.split(/[?#]/)[0];
    let resource = this.registered.get(key);
    if (!resource) {
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/)/i.test(url)) return undefined;
      let decoded: string;
      try { decoded = decodeURIComponent(key); } catch { throw new Error(`Invalid export asset URL ${url}`); }
      resource = { file: path.resolve(path.dirname(sourceFile), decoded), extension: path.extname(decoded).toLowerCase() };
    }
    const type = media[resource.extension];
    if (!type) throw new Error(`Unsupported export asset type ${resource.extension || '(none)'}: ${key}`);
    let bytes: Buffer;
    if (resource.file) {
      const file = await realpath(resource.file);
      if (!this.roots.some(root => within(root, file))) throw new Error(`Export asset escapes the configured asset roots: ${key}`);
      if (file.split(path.sep).some(part => /^\.env(?:\.|$)|^\.git$|^(?:PROJECT|DEPLOYMENT)\.local\.md$|^AGENTS\.override\.md$/i.test(part))) throw new Error('Private local files cannot be exported as assets');
      bytes = await readFile(file);
    } else bytes = Buffer.isBuffer(resource.content) ? resource.content : Buffer.from(resource.content!);
    if (resource.extension === '.svg') validateExportSvg(bytes.toString('utf8'));
    const digest = exportDigest(bytes);
    const output = `assets/${digest}${resource.extension}`;
    const record = { path: output, mediaType: type, bytes: bytes.length, digest };
    this.artifacts.set(output, bytes); this.records.set(output, record);
    return record;
  }
}
