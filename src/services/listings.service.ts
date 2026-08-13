import { axiosClient } from '@/lib/axios-client';

export type ReviewTab = 'unverified' | 'verified' | 'rejected';

export type RejectListingReviewPayload = {
  rejectPropertyName?: boolean;
  rejectLocation?: boolean;
  rejectMicroMarket?: boolean;
  propertyNameRemark?: string;
  locationRemark?: string;
  microMarketRemark?: string;
};

export type ListingHighlightRef = {
  id?: string | null;
  name?: string | null;
  status?: string | null;
} | string | null;

export type ListingReviewHighlights = {
  newPropertyName?: ListingHighlightRef;
  newLocation?: ListingHighlightRef;
  newMicroMarket?: ListingHighlightRef;
};

export type ListingReviewItem = {
  id: string;
  status?: string | null;
  form?: Record<string, unknown> | null;
  highlights?: ListingReviewHighlights | null;
  rejectRemarks?: {
    propertyName?: string;
    location?: string;
    microMarket?: string;
    [key: string]: unknown;
  } | null;
  catalogSave?: ListingCatalogSave | null;
  actions?: {
    canToggleForSaleTitle?: boolean;
    canSavePropertyName?: boolean;
    canSaveLocation?: boolean;
    canSaveMicroMarket?: boolean;
    catalogSaved?: boolean;
    canApprove?: boolean;
    canReject?: boolean;
    canGoLive?: boolean;
    canToggleActive?: boolean;
  } | null;
  isActive?: boolean;
  category?: { id?: string; name?: string } | string | null;
  property_type?: { id?: string; name?: string } | null;
  propertyType?: { id?: string; name?: string } | string | null;
  property_name?: { id?: string; name?: string; status?: string } | null;
  location?: { id?: string; name?: string; status?: string } | null;
  price?: number | string | null;
  price_on_request?: boolean;
  displayTitle?: string | null;
  showForSaleInLocation?: boolean;
  allowCustomName?: boolean;
  createdAt?: string;
  created_at?: string;
  user?: { name?: string; email?: string } | null;
  submittedBy?: { name?: string; email?: string } | null;
  [key: string]: unknown;
};

export type ApproveListingReviewPayload = {
  showForSaleInLocation?: boolean;
};

export type CatalogSaveField = {
  originalName?: string | null;
  originalId?: string | null;
  savedId?: string | null;
  savedName?: string | null;
  savedBy?: string | null;
  savedAt?: string | null;
  previousSavedName?: string | null;
  previousSavedId?: string | null;
};

export type ListingCatalogSave = {
  propertyName?: CatalogSaveField | null;
  location?: CatalogSaveField | null;
  microMarket?: CatalogSaveField | null;
};

export type SaveListingCatalogPayload = {
  savePropertyName?: boolean;
  saveLocation?: boolean;
  propertyName?: string;
  propertyNameId?: string;
  locationName?: string;
  locationId?: string;
  saveMicroMarket?: boolean;
  microMarketId?: string;
  microMarketName?: string;
};

export type ListingReviewQueueResult = {
  items: ListingReviewItem[];
  total: number;
  page: number;
  limit: number;
  tab?: ReviewTab;
  totalPages?: number;
  propertyTypeBreakdown?: Array<{
    propertyTypeId?: string | null;
    propertyTypeName: string;
    total: number;
    totalPages: number;
  }>;
  filters?: ReviewQueueFiltersResponse;
  selectedFilters?: ReviewQueueSelectedFilters;
};

export type ReviewQueueSelectedFilters = {
  categoryId: string | null;
  buildingTypeId: string | null;
  propertyTypeId: string | null;
};

export type ReviewQueueDropdownFilter = { id: string; name: string; total: number };

export type ReviewQueueFiltersResponse = {
  categories: Array<{ categoryId: string; categoryName: string; total: number }>;
  buildingTypes: Array<{ buildingTypeId: string; buildingTypeName: string; total: number }>;
  propertyTypes: Array<{
    propertyTypeId: string;
    propertyTypeName: string;
    total: number;
    totalPages: number;
  }>;
};

function asQueueResult(data: unknown): ListingReviewQueueResult {
  if (Array.isArray(data)) {
    return { items: data as ListingReviewItem[], total: data.length, page: 1, limit: data.length };
  }
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const items = Array.isArray(obj.items)
      ? (obj.items as ListingReviewItem[])
      : Array.isArray(obj.listings)
        ? (obj.listings as ListingReviewItem[])
        : Array.isArray(obj.data)
          ? (obj.data as ListingReviewItem[])
          : [];
    return {
      items,
      total: typeof obj.total === 'number' ? obj.total : items.length,
      page: typeof obj.page === 'number' ? obj.page : 1,
      limit: typeof obj.limit === 'number' ? obj.limit : items.length,
      tab:
        obj.tab === 'verified' ? 'verified' : obj.tab === 'rejected' ? 'rejected' : 'unverified',
      totalPages:
        typeof obj.totalPages === 'number'
          ? obj.totalPages
          : typeof obj.total === 'number' && typeof obj.limit === 'number' && obj.limit > 0
            ? Math.ceil(obj.total / obj.limit)
            : Math.ceil(items.length / Math.max(1, (typeof obj.limit === 'number' ? obj.limit : items.length))),
      propertyTypeBreakdown: Array.isArray(obj.propertyTypeBreakdown)
        ? (obj.propertyTypeBreakdown as any[]).map((r) => ({
            propertyTypeId: typeof r.propertyTypeId === 'string' ? r.propertyTypeId : null,
            propertyTypeName: typeof r.propertyTypeName === 'string' ? r.propertyTypeName : '—',
            total: typeof r.total === 'number' ? r.total : 0,
            totalPages:
              typeof r.totalPages === 'number'
                ? r.totalPages
                : typeof r.total === 'number' && typeof obj.limit === 'number' && obj.limit > 0
                  ? Math.ceil(r.total / obj.limit)
                  : 0,
          }))
        : undefined,
      filters:
        obj.filters && typeof obj.filters === 'object'
          ? {
              categories: Array.isArray((obj.filters as any).categories)
                ? ((obj.filters as any).categories as any[]).map((r) => ({
                    categoryId: typeof r.categoryId === 'string' ? r.categoryId : '',
                    categoryName: typeof r.categoryName === 'string' ? r.categoryName : '—',
                    total: typeof r.total === 'number' ? r.total : 0,
                  }))
                : [],
              buildingTypes: Array.isArray((obj.filters as any).buildingTypes)
                ? ((obj.filters as any).buildingTypes as any[]).map((r) => ({
                    buildingTypeId:
                      typeof r.buildingTypeId === 'string' ? r.buildingTypeId : '',
                    buildingTypeName:
                      typeof r.buildingTypeName === 'string' ? r.buildingTypeName : '—',
                    total: typeof r.total === 'number' ? r.total : 0,
                  }))
                : [],
              propertyTypes: Array.isArray((obj.filters as any).propertyTypes)
                ? ((obj.filters as any).propertyTypes as any[]).map((r) => ({
                    propertyTypeId:
                      typeof r.propertyTypeId === 'string' ? r.propertyTypeId : '',
                    propertyTypeName:
                      typeof r.propertyTypeName === 'string' ? r.propertyTypeName : '—',
                    total: typeof r.total === 'number' ? r.total : 0,
                    totalPages: typeof r.totalPages === 'number' ? r.totalPages : 0,
                  }))
                : [],
            }
          : undefined,
      selectedFilters:
        obj.selectedFilters && typeof obj.selectedFilters === 'object'
          ? {
              categoryId:
                typeof (obj.selectedFilters as any).categoryId === 'string'
                  ? (obj.selectedFilters as any).categoryId
                  : null,
              buildingTypeId:
                typeof (obj.selectedFilters as any).buildingTypeId === 'string'
                  ? (obj.selectedFilters as any).buildingTypeId
                  : null,
              propertyTypeId:
                typeof (obj.selectedFilters as any).propertyTypeId === 'string'
                  ? (obj.selectedFilters as any).propertyTypeId
                  : null,
            }
          : undefined,
    };
  }
  return { items: [], total: 0, page: 1, limit: 20 };
}

function highlightName(value: ListingHighlightRef): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.name || '';
}

export const listingsService = {
  getReviewQueue: async (
    tab: ReviewTab = 'unverified',
    page = 1,
    limit = 50,
    filters?: {
      categoryId?: string | null;
      buildingTypeId?: string | null;
      propertyTypeId?: string | null;
    },
  ): Promise<ListingReviewQueueResult> => {
    const params: Record<string, unknown> = { tab, page, limit };
    if (filters?.categoryId) params.categoryId = filters.categoryId;
    if (filters?.buildingTypeId) params.buildingTypeId = filters.buildingTypeId;
    if (filters?.propertyTypeId) params.propertyTypeId = filters.propertyTypeId;

    const response = await axiosClient.get('/admin/listings/review', { params });
    return asQueueResult(response.data);
  },

  approveReview: async (id: string, payload: ApproveListingReviewPayload = {}): Promise<void> => {
    await axiosClient.post(`/admin/listings/review/${id}/approve`, payload);
  },

  saveToDb: async (id: string, payload: SaveListingCatalogPayload): Promise<void> => {
    await axiosClient.post(`/admin/listings/review/${id}/save-to-db`, payload);
  },

  rejectReview: async (id: string): Promise<void> => {
    await axiosClient.post(`/admin/listings/review/${id}/reject`);
  },

  rejectReviewWithRemark: async (
    id: string,
    payload: RejectListingReviewPayload,
  ): Promise<void> => {
    await axiosClient.post(`/admin/listings/review/${id}/reject`, payload);
  },

  setForSaleTitle: async (id: string, enabled: boolean): Promise<void> => {
    await axiosClient.put(`/admin/listings/${id}/for-sale-title`, { enabled });
  },

  setListingActive: async (id: string, active: boolean): Promise<void> => {
    await axiosClient.put(`/admin/listings/review/${id}/active`, { active });
  },
};

export function getListingCategoryName(item: ListingReviewItem): string {
  const form = item.form as Record<string, unknown> | null | undefined;
  const fromForm = form?.category;
  if (typeof fromForm === 'string' && fromForm) return fromForm;
  if (fromForm && typeof fromForm === 'object' && 'name' in fromForm) {
    const name = (fromForm as { name?: string }).name;
    if (name) return name;
  }
  if (typeof item.category === 'string') return item.category;
  if (item.category && typeof item.category === 'object') return item.category.name || '—';
  return '—';
}

export function getListingPropertyTypeName(item: ListingReviewItem): string {
  const form = item.form as Record<string, unknown> | null | undefined;
  if (typeof form?.propertyType === 'string' && form.propertyType) return form.propertyType;
  if (item.property_type?.name) return item.property_type.name;
  if (typeof item.propertyType === 'string') return item.propertyType;
  if (item.propertyType && typeof item.propertyType === 'object') {
    return item.propertyType.name || '—';
  }
  return '—';
}

export function getListingPrice(item: ListingReviewItem): string {
  const form = item.form as Record<string, unknown> | null | undefined;
  const price = item.price ?? form?.price;
  if (form?.priceOnRequest || item.price_on_request) return 'On request';
  if (price == null || price === '') return '—';
  const num = Number(price);
  if (Number.isFinite(num)) return `₹ ${num.toLocaleString('en-IN')}`;
  return String(price);
}

export function getHighlightedPropertyName(item: ListingReviewItem): string {
  const form = item.form as Record<string, unknown> | null | undefined;
  return (
    highlightName(item.highlights?.newPropertyName ?? null) ||
    (typeof form?.propertyName === 'string' ? form.propertyName : '') ||
    item.property_name?.name ||
    ''
  );
}

export function getHighlightedLocationName(item: ListingReviewItem): string {
  const form = item.form as Record<string, unknown> | null | undefined;
  return (
    highlightName(item.highlights?.newLocation ?? null) ||
    (typeof form?.location === 'string' ? form.location : '') ||
    item.location?.name ||
    ''
  );
}

export function getHighlightedMicroMarketId(item: ListingReviewItem): string {
  const mm = item.highlights?.newMicroMarket;
  if (mm && typeof mm === 'object' && typeof mm.id === 'string' && mm.id) return mm.id;
  // fallback: try any id present in form.dynamicData
  const dynamic = (item.form?.dynamicData as Record<string, unknown> | undefined) || {};
  const id =
    (typeof dynamic.micromarket_id === 'string' && dynamic.micromarket_id) ||
    (typeof dynamic.micro_market_id === 'string' && dynamic.micro_market_id) ||
    '';

  // Another fallback: listing has micromarket_id at top-level (spread from entity).
  const listingMmId = (item as any).micromarket_id;
  if (typeof listingMmId === 'string' && listingMmId) return listingMmId;

  // Or sometimes backend includes *_id inside form.
  const formAny = item.form as Record<string, unknown> | null | undefined;
  const formMmId = formAny?.micromarket_id || formAny?.micro_market_id;
  if (typeof formMmId === 'string' && formMmId) return formMmId;

  return id;
}

export function getHighlightedMicroMarketName(item: ListingReviewItem): string {
  const mmHighlight = item.highlights?.newMicroMarket;
  if (typeof mmHighlight === 'string') return mmHighlight;
  if (mmHighlight && typeof mmHighlight === 'object' && typeof mmHighlight.name === 'string') {
    if (mmHighlight.name) return mmHighlight.name;
  }

  // Backend toModerationQueueItem provides `form.micromarket` as name
  const form = item.form as Record<string, unknown> | null | undefined;
  const formName =
    (form?.micromarket && typeof form.micromarket === 'string' ? form.micromarket : '') ||
    (form?.micro_market && typeof form.micro_market === 'string' ? form.micro_market : '');

  if (formName) return formName;

  // Fallback: top-level (if present)
  const top = (item as any).micromarket?.name;
  if (typeof top === 'string' && top) return top;

  return '';
}

export function isPropertyNamePending(item: ListingReviewItem): boolean {
  const pn = item.highlights?.newPropertyName;
  if (typeof pn === 'string') return !!pn;
  if (pn && typeof pn === 'object') {
    return pn.status === 'pending_review' || pn.status === 'pending';
  }
  return item.property_name?.status === 'pending_review';
}

export function isLocationPending(item: ListingReviewItem): boolean {
  const loc = item.highlights?.newLocation;
  if (typeof loc === 'string') return !!loc;
  if (loc && typeof loc === 'object') {
    return loc.status === 'pending_review' || loc.status === 'pending';
  }
  return item.location?.status === 'pending_review';
}

export function hasCatalogSave(item: ListingReviewItem): boolean {
  if (item.actions?.catalogSaved) return true;
  const cs = item.catalogSave;
  return !!(cs?.propertyName?.savedId || cs?.location?.savedId || cs?.microMarket?.savedId);
}

export function getCatalogSavedName(
  item: ListingReviewItem,
  field: 'propertyName' | 'location' | 'microMarket',
): string {
  return item.catalogSave?.[field]?.savedName || '';
}

export function getCatalogSavedId(
  item: ListingReviewItem,
  field: 'propertyName' | 'location' | 'microMarket',
): string {
  return item.catalogSave?.[field]?.savedId || '';
}

export function isMicroMarketPending(item: ListingReviewItem): boolean {
  const mm = item.highlights?.newMicroMarket;
  if (mm && typeof mm === 'object') return mm.status === 'pending';
  return false;
}

export function isForSaleTitleEnabled(item: ListingReviewItem): boolean {
  if (typeof item.showForSaleInLocation === 'boolean') return item.showForSaleInLocation;
  return false;
}

export function canToggleForSaleTitle(item: ListingReviewItem): boolean {
  if (typeof item.actions?.canToggleForSaleTitle === 'boolean') {
    return item.actions.canToggleForSaleTitle;
  }
  return !!item.allowCustomName;
}

export function getSubmittedBy(item: ListingReviewItem): string {
  const form = item.form as Record<string, unknown> | null | undefined;
  const fromForm = form?.submittedBy;
  if (fromForm && typeof fromForm === 'object' && 'name' in fromForm) {
    const name = (fromForm as { name?: string }).name;
    if (name) return name;
  }
  if (item.user?.name) return item.user.name;
  const submitted = item.submittedBy;
  if (submitted && typeof submitted === 'object' && 'name' in submitted && submitted.name) {
    return String(submitted.name);
  }
  return '—';
}

/** Normalize camelCase / snake_case / numbered keys to snake_case for matching. */
function normalizeDetailKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Za-z])(\d+)/g, '$1_$2')
    .replace(/__+/g, '_')
    .toLowerCase();
}

const AREA_UNIT_DISPLAY: Record<string, string> = {
  sq_yd: 'sq. yd.',
  sq_yard: 'sq. yd.',
  sqyd: 'sq. yd.',
  yard: 'sq. yd.',
  yards: 'sq. yd.',
  square_yard: 'sq. yd.',
  square_yards: 'sq. yd.',
  sq_ft: 'sq. ft.',
  sq_feet: 'sq. ft.',
  sqft: 'sq. ft.',
  ft: 'sq. ft.',
  feet: 'sq. ft.',
  square_feet: 'sq. ft.',
  square_foot: 'sq. ft.',
  sq_m: 'sq. m.',
  sqm: 'sq. m.',
};

/** Form-module / listing-create flow order (location / property name / micromarket omitted — shown in summary). */
const DETAIL_FIELD_ORDER: string[] = [
  'category',
  'building_type',
  'property_type',
  'price',
  'price_on_request',
  'bhk',
  'area',
  'area_1',
  'area_2',
  'area_3',
  'area_type',
  'area_type_1',
  'area_type_2',
  'area_type_3',
  'property_direction',
  'direction',
  'property_facing',
  'property_status',
  'furnishing_status',
  'leasing_status',
  'floor',
  'brokerage_share',
  'mandate_deal',
  'tenant_info',
  'tenant_name',
  'rent',
  'security_deposit',
  'leasing_tenure',
  'lock_in_period',
  'road_width',
  'lift',
  'additional_space',
  'amenities',
  'geo_location',
];

const SKIP_DETAIL_KEYS = new Set([
  'id',
  'user_id',
  'userid',
  'created_at',
  'updated_at',
  'createdat',
  'updatedat',
  'images',
  'media',
  'documents',
  'dynamic_data',
  'submitted_by',
  // Already in summary row
  'title',
  'display_title',
  'property_name',
  'location',
  'micromarket',
  'micro_market',
  // Consumed when merging area size + unit
  'area_size',
  'area_unit',
  'area_size_1',
  'area_unit_1',
  'area_size_2',
  'area_unit_2',
  'area_size_3',
  'area_unit_3',
]);

function titleCaseWords(input: string): string {
  return input
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function humanizeDetailToken(raw: string): string {
  const s = raw.trim();
  if (!s) return '';

  const lower = s.toLowerCase().replace(/[\s.]+/g, '_').replace(/_+$/g, '');
  if (AREA_UNIT_DISPLAY[lower]) return AREA_UNIT_DISPLAY[lower];
  if (lower === 'yes' || lower === 'true') return 'Yes';
  if (lower === 'no' || lower === 'false') return 'No';
  if (lower === 'studio') return 'Studio';
  if (lower === '6_plus_bhk') return '6+ BHK';
  const bhkMatch = lower.match(/^(\d+)_bhk$/);
  if (bhkMatch) return `${bhkMatch[1]} BHK`;

  // UUID / long ids — leave as-is
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return s;
  // Currency-looking or already spaced human text without underscores
  if (!/[_-]/.test(s)) {
    if (/^[a-z]+$/i.test(s)) return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    return s;
  }

  return titleCaseWords(s.replace(/[_-]+/g, ' '));
}

function formatDetailLabel(key: string): string {
  const normalized = normalizeDetailKey(key);
  if (normalized === 'area' || /^area_\d+$/.test(normalized)) {
    return 'Area';
  }
  if (normalized === 'area_type' || /^area_type_\d+$/.test(normalized)) {
    return 'Area Type';
  }
  if (normalized === 'bhk') return 'BHK';
  if (normalized === 'price_on_request') return 'Price On Request';
  return titleCaseWords(
    normalized
      .replace(/_/g, ' ')
      .replace(/\bmicromarket\b/g, 'Micro Market'),
  );
}

function formatDetailValue(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return Number.isFinite(value) ? value.toLocaleString('en-IN') : String(value);
  if (typeof value === 'string') return humanizeDetailToken(value);
  if (Array.isArray(value)) {
    return value
      .map((v) => {
        if (typeof v === 'object' && v && 'name' in v) {
          return humanizeDetailToken(String((v as { name?: string }).name || ''));
        }
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          return formatDetailValue(v);
        }
        return '';
      })
      .filter(Boolean)
      .join(', ');
  }
  if (typeof value === 'object' && value && 'name' in value) {
    return humanizeDetailToken(String((value as { name?: string }).name || ''));
  }
  return '';
}

function formatAreaDisplay(sizeRaw: unknown, unitRaw: unknown): string {
  const sizeText =
    typeof sizeRaw === 'number' && Number.isFinite(sizeRaw)
      ? sizeRaw.toLocaleString('en-IN')
      : sizeRaw != null && sizeRaw !== ''
        ? String(sizeRaw).trim()
        : '';
  if (!sizeText) return '';
  const unitText =
    unitRaw == null || unitRaw === ''
      ? ''
      : humanizeDetailToken(String(unitRaw));
  return unitText ? `${sizeText} ${unitText}` : sizeText;
}

function detailSortIndex(normalizedKey: string): number {
  const idx = DETAIL_FIELD_ORDER.indexOf(normalizedKey);
  return idx === -1 ? 1000 + normalizedKey.charCodeAt(0) : idx;
}

export type ListingDetailRow = { key: string; label: string; value: string };

/** Flatten form + dynamicData for expanded row details (form flow order, human-readable). */
export function getListingDetailRows(item: ListingReviewItem): ListingDetailRow[] {
  const form = (item.form || {}) as Record<string, unknown>;
  const dynamic =
    form.dynamicData && typeof form.dynamicData === 'object'
      ? (form.dynamicData as Record<string, unknown>)
      : {};
  const merged: Record<string, unknown> = { ...dynamic };

  for (const [key, value] of Object.entries(form)) {
    if (key === 'dynamicData' || key === 'submittedBy') continue;
    if (merged[key] === undefined) merged[key] = value;
  }

  // Prefer top-level relation names when form lacks them
  if (!merged.buildingType && item.building_type && typeof item.building_type === 'object') {
    merged.buildingType = (item.building_type as { name?: string }).name;
  }

  const byNorm = new Map<string, { originalKey: string; value: unknown }>();
  for (const [key, value] of Object.entries(merged)) {
    const norm = normalizeDetailKey(key);
    if (!byNorm.has(norm)) byNorm.set(norm, { originalKey: key, value });
  }

  // Merge area size + unit → "857 sq. yd."
  const areaSuffixes = ['', '_1', '_2', '_3'];
  for (const suffix of areaSuffixes) {
    const sizeEntry = byNorm.get(`area_size${suffix}`);
    const unitEntry = byNorm.get(`area_unit${suffix}`);
    const combined = formatAreaDisplay(sizeEntry?.value, unitEntry?.value);
    if (combined) {
      const areaKey = suffix ? `area${suffix}` : 'area';
      byNorm.set(areaKey, { originalKey: areaKey, value: combined });
    }
    byNorm.delete(`area_size${suffix}`);
    byNorm.delete(`area_unit${suffix}`);
  }

  const rows: ListingDetailRow[] = [];
  for (const [norm, entry] of byNorm) {
    if (SKIP_DETAIL_KEYS.has(norm)) continue;
    // area_size_N / area_unit_N already removed; also skip bare title variants
    if (norm.startsWith('area_size') || norm.startsWith('area_unit')) continue;

    let value: string;
    if (norm === 'area' || /^area_\d+$/.test(norm)) {
      // Already formatted by formatAreaDisplay (or pass-through string)
      value =
        typeof entry.value === 'string'
          ? entry.value
          : formatDetailValue(entry.value);
    } else if (norm === 'price') {
      const num = Number(entry.value);
      value = Number.isFinite(num)
        ? `₹ ${num.toLocaleString('en-IN')}`
        : formatDetailValue(entry.value);
    } else {
      value = formatDetailValue(entry.value);
    }
    if (!value) continue;

    rows.push({
      key: entry.originalKey,
      label: formatDetailLabel(norm),
      value,
    });
  }

  rows.sort((a, b) => {
    const aNorm = normalizeDetailKey(a.key);
    const bNorm = normalizeDetailKey(b.key);
    const diff = detailSortIndex(aNorm) - detailSortIndex(bNorm);
    if (diff !== 0) return diff;
    return a.label.localeCompare(b.label);
  });

  return rows.slice(0, 40);
}

/** @deprecated Use ListingReviewItem */
export type ListingModerationItem = ListingReviewItem;
/** @deprecated Use ApproveListingReviewPayload */
export type ResolveListingModerationPayload = ApproveListingReviewPayload;
