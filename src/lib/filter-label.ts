/** Display label with item count, e.g. "Gurgaon (12)". */
export function withCount(label: string, count: number): string {
  return `${label} (${count})`;
}

/** Tab label with total + new breakdown, e.g. "Unverified (Free) (5) (2)". */
export function withTotalNew(
  label: string,
  total: number,
  neu = 0,
): string {
  if (neu > 0) return `${label} (${total}) (${neu})`;
  return `${label} (${total})`;
}
