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
  actions?: {
    canToggleForSaleTitle?: boolean;
    canSavePropertyName?: boolean;
    canSaveLocation?: boolean;
    canSaveMicroMarket?: boolean;
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

export type SaveListingCatalogPayload = {
  savePropertyName?: boolean;
  saveLocation?: boolean;
  propertyName?: string;
  locationName?: string;
  saveMicroMarket?: boolean;
  microMarketId?: string;
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
  if (item.actions?.canSavePropertyName) return true;
  if (item.highlights?.newPropertyName) return true;
  return item.property_name?.status === 'pending_review';
}

export function isLocationPending(item: ListingReviewItem): boolean {
  if (item.actions?.canSaveLocation) return true;
  if (item.highlights?.newLocation) return true;
  return item.location?.status === 'pending_review';
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

function formatDetailValue(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return Number.isFinite(value) ? value.toLocaleString('en-IN') : String(value);
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === 'object' && v && 'name' in v ? String((v as { name?: string }).name || '') : String(v)))
      .filter(Boolean)
      .join(', ');
  }
  if (typeof value === 'object' && value && 'name' in value) {
    return String((value as { name?: string }).name || '');
  }
  return '';
}

/** Flatten form + dynamicData for expanded row details. */
export function getListingDetailRows(item: ListingReviewItem): { key: string; value: string }[] {
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
  if (!merged.micromarket) {
    const mm = item.micromarket;
    if (mm && typeof mm === 'object' && 'name' in mm) merged.micromarket = (mm as { name?: string }).name;
  }

  const skip = new Set([
    'id',
    'userId',
    'user_id',
    'createdAt',
    'updatedAt',
    'created_at',
    'updated_at',
    'images',
    'media',
    'documents',
  ]);

  return Object.entries(merged)
    .filter(([key, value]) => !skip.has(key) && formatDetailValue(value) !== '')
    .map(([key, value]) => ({
      key,
      value: formatDetailValue(value),
    }))
    .slice(0, 40);
}

/** @deprecated Use ListingReviewItem */
export type ListingModerationItem = ListingReviewItem;
/** @deprecated Use ApproveListingReviewPayload */
export type ResolveListingModerationPayload = ApproveListingReviewPayload;
