/**
 * Admin UI limits for Developer User listing edit — keep in sync with
 * `propnetra backend/src/modules/listings/constants/developer-project.ts`
 * and normalization in `developer-details.util.ts`.
 */
export const DEV_FIELD = {
  headerMedia: 'dev_header_media',
  newLaunchFrame: 'dev_new_launch_frame',
  geo: 'dev_geo_location',
  status: 'dev_status',
  possession: 'dev_possession',
  possessionMonth: 'possession_month',
  possessionYear: 'possession_year',
  about: 'dev_about',
  units: 'dev_units',
  towers: 'dev_towers',
  openSpace: 'dev_open_space',
  areaType: 'dev_area_type',
  availableUnits: 'dev_available_units',
  attachLayouts: 'dev_attach_layouts',
  charges: 'dev_charges',
  siteLayout: 'dev_site_layout',
  specification: 'dev_specification',
  gallery: 'dev_gallery',
  amenities: 'dev_amenities',
  locationAdvantage: 'dev_location_advantage',
  brochure: 'dev_brochure',
  teamMembers: 'dev_team_members',
} as const;

export const DEV_ABOUT_MAX = 5000;
/** Developer company bio on profile (not listing dev_about). */
export const DEV_COMPANY_BIO_MAX = 255;
export const DEV_PROJECT_PREFIX_MAX = 60;
export const DEV_HEADER_MAX_IMAGES = 4;
export const DEV_HEADER_MAX_VIDEOS = 1;
export const DEV_GALLERY_MAX_IMAGES = 8;
export const DEV_GALLERY_MAX_VIDEOS = 1;
export const DEV_MAX_YOUTUBE = 20;
export const DEV_MAX_LAYOUTS = 5;
export const DEV_OPEN_SPACE_MAX = 100;
export const DEV_RERA_MAX = 100;

export const DEV_BHK_OPTIONS = [
  '1 BHK',
  '2 BHK',
  '3 BHK',
  '4 BHK',
  '5 BHK',
  '6 BHK',
  '6+ BHK',
] as const;

export const DEV_EXTRA_SPACE_OPTIONS = ['Study', 'Service Room', 'Lounge', 'Store'] as const;

export const DEV_AREA_TYPES = [
  { value: 'saleable', label: 'Saleable Area' },
  { value: 'carpet', label: 'Carpet Area' },
  { value: 'super', label: 'Super Area' },
] as const;

export const DEV_CHARGE_OPTIONS = [
  { value: 'other_charges_gst', label: 'Other Charges + GST extra' },
  { value: 'gst_extra', label: 'GST Extra' },
  { value: 'gst_possession', label: 'GST & Possession Charges Extra' },
] as const;

export const DEV_STATUS_LABELS = [
  'New Launch',
  'Under Construction',
  'Ready to Move',
] as const;

export type DevAvailableUnitRow = {
  id: string;
  bhk: string;
  extraSpace1: string;
  extraSpace2: string;
  size: string;
  price: string;
};

export type DevAttachLayoutRow = {
  unitId: string;
  imageUrl: string;
};

export function applyProjectPrefixPreview(
  prefix: string | null | undefined,
  typedSuffix: string,
): string {
  const name = typedSuffix.replace(/\s+/g, ' ').trim();
  const p = String(prefix || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, DEV_PROJECT_PREFIX_MAX);
  if (!p || !name) return p ? `${p} ${name}`.trim() : name;
  const lowerName = name.toLowerCase();
  const lowerP = p.toLowerCase();
  if (lowerName === lowerP || lowerName.startsWith(`${lowerP} `)) return name;
  return `${p} ${name}`;
}

export function stripProjectPrefixForEdit(
  prefix: string | null | undefined,
  fullName: string,
): string {
  const name = fullName.replace(/\s+/g, ' ').trim();
  const p = String(prefix || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!p || !name) return name;
  const lowerName = name.toLowerCase();
  const lowerP = p.toLowerCase();
  if (lowerName === lowerP) return '';
  if (lowerName.startsWith(`${lowerP} `)) return name.slice(p.length).trim();
  return name;
}
