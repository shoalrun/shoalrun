import type { HeaderConfig, FooterConfig, SiteLink } from './content.js';

export function validateHeader(value: unknown): HeaderConfig {
  if (value === undefined) return { links: [] };
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('site.header must be a mapping');
  const { links = [], ...extra } = value as Record<string, unknown>;
  if (Object.keys(extra).length) throw new Error(`site.header does not accept ${Object.keys(extra).join(', ')}`);
  if (!Array.isArray(links)) throw new Error('site.header.links must be a list');
  return {
    links: links.map((link, index) => {
      const where = `site.header.links[${index}]`;
      const { style = 'link', ...rest } = (link && typeof link === 'object' && !Array.isArray(link) ? link : {}) as Record<string, unknown>;
      const checked = validateSiteLink(link, where, rest);
      if (style !== 'link' && style !== 'button' && style !== 'primary') throw new Error(`${where}.style must be link, button, or primary`);
      return { ...checked, style };
    })
  };
}

// Header and footer links share one rule: a label and a site path, http(s) URL, or mailto link.
function validateSiteLink(link: unknown, where: string, fields = link as Record<string, unknown>): SiteLink {
  if (!link || typeof link !== 'object' || Array.isArray(link)) throw new Error(`${where} must be a mapping`);
  const { label, href, ...rest } = fields;
  if (Object.keys(rest).length) throw new Error(`${where} does not accept ${Object.keys(rest).join(', ')}`);
  if (typeof label !== 'string' || !label.trim()) throw new Error(`${where}.label is required`);
  if (typeof href !== 'string' || !/^(\/|https?:\/\/|mailto:)/.test(href)) throw new Error(`${where}.href must be a site path, http(s) URL, or mailto link`);
  return { label, href };
}

export function validateFooter(value: unknown): FooterConfig | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('site.footer must be a mapping');
  const { columns = [], links = [], text, ...extra } = value as Record<string, unknown>;
  if (Object.keys(extra).length) throw new Error(`site.footer does not accept ${Object.keys(extra).join(', ')}`);
  if (!Array.isArray(columns)) throw new Error('site.footer.columns must be a list');
  if (!Array.isArray(links)) throw new Error('site.footer.links must be a list');
  if (text !== undefined && (typeof text !== 'string' || !text.trim())) throw new Error('site.footer.text must be non-empty text');
  const footer: FooterConfig = {
    columns: columns.map((column, index) => {
      const where = `site.footer.columns[${index}]`;
      if (!column || typeof column !== 'object' || Array.isArray(column)) throw new Error(`${where} must be a mapping`);
      const { title, links: columnLinks, ...rest } = column as Record<string, unknown>;
      if (Object.keys(rest).length) throw new Error(`${where} does not accept ${Object.keys(rest).join(', ')}`);
      if (typeof title !== 'string' || !title.trim()) throw new Error(`${where}.title is required`);
      if (!Array.isArray(columnLinks) || !columnLinks.length) throw new Error(`${where}.links must list at least one link`);
      return { title, links: columnLinks.map((link, linkIndex) => validateSiteLink(link, `${where}.links[${linkIndex}]`)) };
    }),
    links: links.map((link, index) => validateSiteLink(link, `site.footer.links[${index}]`)),
    ...(typeof text === 'string' ? { text } : {})
  };
  if (!footer.columns.length && !footer.links.length && !footer.text) throw new Error('site.footer needs columns, links, or text');
  return footer;
}
