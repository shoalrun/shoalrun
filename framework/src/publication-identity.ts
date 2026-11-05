/** Publication identity shared by compiler, retrieval and delivery runtimes. */
export type PublicationCoordinate = { product?: string; channel: string; version: string; language: string };

/** Productless keys deliberately retain the original serialized identity. */
export function publicationKey(value: PublicationCoordinate): string {
  return [value.channel, value.version, value.language, ...(value.product === undefined ? [] : [value.product])].join('|');
}

export function documentKey(id: string, value: PublicationCoordinate): string {
  return `${id}|${publicationKey(value)}`;
}

export function samePublication(left: PublicationCoordinate, right: PublicationCoordinate): boolean {
  return left.product === right.product && left.channel === right.channel && left.version === right.version && left.language === right.language;
}

export function parsePublicationKey(value: string): PublicationCoordinate {
  const parts = value.split('|');
  if ((parts.length !== 3 && parts.length !== 4) || parts.some(part => !part)) throw new Error(`Invalid publication identity ${value}`);
  const [channel, version, language, product] = parts;
  return { channel, version, language, ...(product === undefined ? {} : { product }) };
}
