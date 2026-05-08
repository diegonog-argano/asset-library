// Inject a color into an SVG string by replacing fill/stroke attributes on
// shape elements. Skips fill="none" / stroke="none" so outlines and compound
// shapes don't break.
const SHAPE_SELECTOR = 'path, circle, rect, polygon, polyline, ellipse, line';

export function applyColorToSvg(svgString, color) {
  if (!svgString) return svgString;
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svg = doc.documentElement;

  if (svg.querySelector('parsererror')) return svgString;

  // Root-level fill/stroke (only replace if explicit and not "none").
  const rootFill = svg.getAttribute('fill');
  if (rootFill && rootFill !== 'none') svg.setAttribute('fill', color);
  const rootStroke = svg.getAttribute('stroke');
  if (rootStroke && rootStroke !== 'none') svg.setAttribute('stroke', color);

  for (const el of svg.querySelectorAll(SHAPE_SELECTOR)) {
    const fill = el.getAttribute('fill');
    if (fill && fill !== 'none') el.setAttribute('fill', color);
    const stroke = el.getAttribute('stroke');
    if (stroke && stroke !== 'none') el.setAttribute('stroke', color);
  }

  return new XMLSerializer().serializeToString(svg);
}

export function isValidHex(value) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}
