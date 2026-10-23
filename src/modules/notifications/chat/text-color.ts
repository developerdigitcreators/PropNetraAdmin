/** Hex colors stored as `{#rrggbb}text{/#}` in the WhatsApp-style marker body. */

export const TEXT_COLOR_SWATCHES = [
  { hex: '#111827', label: 'Black' },
  { hex: '#6B7280', label: 'Gray' },
  { hex: '#DC2626', label: 'Red' },
  { hex: '#EA580C', label: 'Orange' },
  { hex: '#CA8A04', label: 'Gold' },
  { hex: '#16A34A', label: 'Green' },
  { hex: '#2563EB', label: 'Blue' },
  { hex: '#7C3AED', label: 'Purple' },
  { hex: '#DB2777', label: 'Pink' },
  { hex: '#0891B2', label: 'Teal' },
] as const;

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
const RGB_RE = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i;

function expandHex(hex: string): string {
  if (hex.length !== 3) return hex.toLowerCase();
  return hex
    .split('')
    .map((ch) => `${ch}${ch}`)
    .join('')
    .toLowerCase();
}

export function normalizeHex(color?: string | null): string | null {
  if (!color) return null;
  const value = color.trim();
  const hex = HEX_RE.exec(value);
  if (hex) return `#${expandHex(hex[1])}`;
  const rgb = RGB_RE.exec(value);
  if (!rgb) return null;
  const toHex = (n: string) =>
    Math.max(0, Math.min(255, Number(n))).toString(16).padStart(2, '0');
  return `#${toHex(rgb[1])}${toHex(rgb[2])}${toHex(rgb[3])}`;
}

export function wrapColorMarkers(text: string, hex: string): string {
  const leading = /^\s*/.exec(text)?.[0] ?? '';
  const trailing = /\s*$/.exec(text)?.[0] ?? '';
  const core = text.slice(leading.length, text.length - trailing.length);
  if (!core) return text;
  return `${leading}{#${hex.slice(1)}}${core}{/#}${trailing}`;
}
