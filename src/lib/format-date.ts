const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

function toDate(value?: string | Date | null): Date | null {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/** Display dates as `18 Dec 2026`. */
export function formatDisplayDate(value?: string | Date | null): string {
  const d = toDate(value);
  if (!d) return '—';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Display datetimes as `18 Dec 2026, 5:11 PM`. */
export function formatDisplayDateTime(value?: string | Date | null): string {
  const d = toDate(value);
  if (!d) return '—';
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  return `${formatDisplayDate(d)}, ${h12}:${String(minutes).padStart(2, '0')} ${ampm}`;
}
