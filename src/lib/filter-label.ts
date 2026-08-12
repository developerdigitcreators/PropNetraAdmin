/** Display label with item count, e.g. "Gurgaon (12)". */
export function withCount(label: string, count: number): string {
  return `${label} (${count})`;
}
