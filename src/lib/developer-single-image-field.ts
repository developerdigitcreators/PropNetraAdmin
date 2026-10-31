/** Parse `site_layout` / `dev_specification` values from API (string, object, legacy array). */
export function parseDeveloperSingleImageUrl(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    const first = value[0];
    if (typeof first === "string" && first.trim()) return first.trim();
    if (first && typeof first === "object" && "url" in (first as object)) {
      const u = (first as { url?: string }).url;
      if (typeof u === "string" && u.trim()) return u.trim();
    }
    return "";
  }
  if (value && typeof value === "object") {
    const row = value as { imageUrl?: string; images?: unknown[] };
    if (typeof row.imageUrl === "string" && row.imageUrl.trim()) return row.imageUrl.trim();
    if (Array.isArray(row.images)) {
      const first = row.images[0];
      if (typeof first === "string" && first.trim()) return first.trim();
    }
  }
  return "";
}
