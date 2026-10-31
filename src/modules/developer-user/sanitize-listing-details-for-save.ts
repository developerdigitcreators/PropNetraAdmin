/** Subset of app sanitizeListingDetails — developer / DBF admin save. */
import { parseDeveloperSingleImageUrl } from "@/lib/developer-single-image-field";

export function sanitizeListingDetailsForSave(
  data: Record<string, unknown> = {},
): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (
      key.startsWith("_") ||
      key === "tableRows" ||
      key === "form_progress" ||
      key === "reject_remarks" ||
      key === "resumeTab" ||
      key === "showAvailableUnit" ||
      key === "show_available_unit_info" ||
      key === "showAvailableUnitInfo"
    ) {
      continue;
    }
    if (value === undefined) continue;
    cleaned[key] = value;
  }
  if (
    Array.isArray(cleaned.dev_available_units) &&
    (cleaned.dev_available_units as unknown[]).length > 0
  ) {
    delete cleaned.dev_price_range;
    delete cleaned.dev_bhk_types;
    delete cleaned.dev_area;
    delete cleaned.dev_floor_plans;
  }
  if (cleaned.brokerage_share !== true) delete cleaned.brokerage_share_percent;
  if (cleaned.mandate_deal !== true) delete cleaned.mandate_deal_percent;
  for (const key of ["dev_site_layout", "dev_specification"]) {
    if (!(key in cleaned)) continue;
    if (!parseDeveloperSingleImageUrl(cleaned[key])) delete cleaned[key];
  }
  return cleaned;
}
