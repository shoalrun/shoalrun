// Print CSS may control layout, but resource loading uses explicit asset registrations.
// Allow known non-loading functions rather than trying to enumerate every CSS loader.
const functions = new Set(`
  var env calc min max clamp round mod rem abs sign hypot sqrt pow exp log
  sin cos tan asin acos atan atan2
  rgb rgba hsl hsla hwb lab lch oklab oklch color color-mix light-dark contrast-color
  linear-gradient repeating-linear-gradient radial-gradient repeating-radial-gradient
  conic-gradient repeating-conic-gradient
  counter counters attr symbols
  translate translatex translatey translatez translate3d scale scalex scaley scalez scale3d
  rotate rotatex rotatey rotatez rotate3d skew skewx skewy matrix matrix3d perspective
  blur brightness contrast drop-shadow grayscale hue-rotate invert opacity saturate sepia
  cubic-bezier steps linear
  repeat minmax fit-content anchor anchor-size
  circle ellipse inset polygon path rect xywh
  is where not has nth-child nth-last-child nth-of-type nth-last-of-type lang dir
  selector supports style scroll-state
`.trim().split(/\s+/));

export function validatePrintStylesheet(css: string): void {
  const fail = () => { throw new Error('PDF stylesheet must not import files, use CSS escapes, or load URLs; use supported layout/color functions and register local fonts with pdf.fonts'); };
  if (/@import\b|<\/style|\\/i.test(css)) fail();
  // Lex comments and quoted text separately so content strings aren't interpreted
  // as functions. CSS escapes are already disallowed, including in identifiers.
  for (let index = 0; index < css.length;) {
    if (css.startsWith('/*', index)) {
      const end = css.indexOf('*/', index + 2);
      if (end === -1) fail();
      index = end + 2;
    } else if (css[index] === '"' || css[index] === "'") {
      const quote = css[index++];
      while (index < css.length && css[index] !== quote) {
        if (/[\r\n\f]/.test(css[index])) fail();
        index++;
      }
      if (index === css.length) fail();
      index++;
    } else if (/[a-z_-]/i.test(css[index])) {
      const start = index++;
      while (index < css.length && /[a-z0-9_-]/i.test(css[index])) index++;
      const name = css.slice(start, index).toLowerCase();
      let next = index;
      while (next < css.length && /\s/.test(css[next])) next++;
      if (css[next] === '(' && !functions.has(name)) fail();
    } else index++;
  }
}
