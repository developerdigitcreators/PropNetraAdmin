import { axiosClient } from '@/lib/axios-client';

export type ReviewTab = 'unverified' | 'verified' | 'rejected';

export type RejectListingReviewPayload = {
  rejectPropertyName?: boolean;
  rejectLocation?: boolean;
  rejectMicroMarket?: boolean;
  propertyNameRemark?: string;
  locationRemark?: string;
  microMarketRemark?: string;
  propertyName?: string;
  propertyNameId?: string;
  locationName?: string;
  locationId?: string;
  microMarketName?: string;
  microMarketId?: string;
  suggestion?: {
    propertyName?: string;
    propertyNameId?: string;
    location?: string;
    locationId?: string;
    microMarket?: string;
    microMarketId?: string;
  };
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
  resubmitted?: boolean;
  resubmission?: {
    count?: number;
    resubmittedAt?: string;
    previousPropertyName?: string | null;
    previousLocation?: string | null;
    previousMicroMarket?: string | null;
    rejectRemarks?: {
      propertyName?: string;
      location?: string;
      microMarket?: string;
    } | null;
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
  property_name?: {
    id?: string;
    name?: string;
    status?: string;
    image_url?: string | null;
    property_type_id?: string | null;
  } | null;
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
  propertyTypeId?: string;
  propertyNameImageUrl?: string;
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

export type CreateFormOption = {
  id: string;
  name: string;
  is_active?: boolean;
  phase?: number | null;
  [key: string]: unknown;
};

export type CreateFormFieldOption = {
  label: string;
  value: string;
};

export type CreateFormField = {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  options?: CreateFormFieldOption[];
  placeholder?: string;
  moduleKey?: string;
  raw?: Record<string, unknown>;
};

export type CreateFormSchema = {
  fields: CreateFormField[];
  modules: { key: string; label: string; fields: CreateFormField[] }[];
  raw: unknown;
};

export type CreateFormProperty = {
  id: string;
  name: string;
  cityId?: string;
  cityName?: string;
  propertyTypeId?: string;
};

export type CreateFormPrefillLocation = {
  id: string;
  name: string;
};

export type CreateFormPrefill = {
  locationId: string;
  locationName: string;
  microMarketId: string;
  microMarketName: string;
  locations: CreateFormPrefillLocation[];
  cityId?: string;
  cityName?: string;
};

export type CreateVerifiedListingPayload = {
  category_id: string;
  building_type_id: string;
  property_type_id: string;
  property_name_id: string;
  location_id: string;
  micro_market_id: string;
  price?: number | null;
  price_on_request?: boolean;
  details?: Record<string, unknown>;
  lead_contact_name: string;
  lead_contact_phone: string;
  connected_staff_user_id: string;
  floor_pricing?: Array<{
    floor_number: number;
    price?: number | null;
    is_sold?: boolean;
  }>;
};

export type StaffAssignee = {
  id: string;
  name: string;
  contact: string;
};

export type MyListingsTab = 'admin_verified' | 'app_postings';

export type MyListingItem = {
  id: string;
  title: string;
  categoryName: string | null;
  buildingTypeName: string | null;
  propertyTypeName: string | null;
  priceLabel: string;
  status: string;
  isActive: boolean;
  isVerified: boolean;
  expiresAt: string | null;
  daysLeft: number | null;
  expiringSoon: boolean;
  interestCount: number;
  leadContactName: string | null;
  leadContactPhone: string | null;
  connectedStaff: { id: string; name: string; contact: string } | null;
  ownerUser: { id: string; name: string; contact: string } | null;
  actions: { canRenew: boolean; canToggleActive: boolean };
  createdAt: string;
  updatedAt: string;
};

export type MyListingDetail = MyListingItem & {
  propertyName: string | null;
  locationName: string | null;
  microMarketName: string | null;
  cityName: string | null;
  publishedAt: string | null;
  dynamicData: Record<string, unknown>;
  buildingType: { id: string; name: string } | null;
  propertyType: { id: string; name: string } | null;
  form: { dynamicData: Record<string, unknown> };
};

export type MyListingsResponse = {
  items: MyListingItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  tab: MyListingsTab;
  isSuperAdmin: boolean;
  filters: {
    categories: Array<{ id: string; name: string; total: number }>;
    buildingTypes: Array<{ id: string; name: string; total: number }>;
    propertyTypes: Array<{ id: string; name: string; total: number }>;
  };
};

export type MyListingsSummary = {
  expiringSoonCount: number;
  newInterestCount: number;
  totalActionable: number;
};

export type ListingInterestUser = {
  id: string;
  name: string;
  contact: string | null;
  email: string | null;
  profilePhotoUrl: string | null;
  kinds: string[];
  firstInterestedAt: string;
  lastInterestedAt: string;
};

export type ListingInterestDetails = {
  listing: { id: string; title: string };
  lead: { name: string | null; phone: string | null };
  connectedStaff: { id: string; name: string; contact: string } | null;
  interestedUsers: ListingInterestUser[];
  remarks: Array<{
    id: string;
    body: string;
    author: { id: string; name: string } | null;
    createdAt: string;
  }>;
};

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const nested = (value as { data?: unknown }).data;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return nested as Record<string, unknown>;
  }
  return value as Record<string, unknown>;
}

function asOptionList(data: unknown): CreateFormOption[] {
  const list = Array.isArray(data)
    ? data
    : Array.isArray((data as { data?: unknown })?.data)
      ? ((data as { data: unknown[] }).data)
      : Array.isArray((data as { items?: unknown })?.items)
        ? ((data as { items: unknown[] }).items)
        : [];
  return list
    .map((raw) => {
      const row = asObject(raw);
      const id = pickStr(row.id);
      const name = pickStr(row.name, row.label, row.display_name, row.displayName);
      if (!id || !name) return null;
      return {
        ...row,
        id,
        name,
        is_active: row.is_active !== false && row.isActive !== false,
        phase:
          typeof row.phase === 'number'
            ? row.phase
            : typeof row.phase === 'string' && row.phase.trim()
              ? Number(row.phase)
              : null,
      } as CreateFormOption;
    })
    .filter((row): row is CreateFormOption => !!row);
}

function normalizeFieldOptions(raw: unknown): CreateFormFieldOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === 'string' || typeof item === 'number') {
        const value = String(item);
        return { label: value, value };
      }
      const row = asObject(item);
      const value = pickStr(
        row.value,
        row.option_value,
        row.optionValue,
        row.id,
        row.key,
        row.label,
        row.name,
      );
      const label = pickStr(
        row.label,
        row.option_label,
        row.optionLabel,
        row.name,
        row.display_name,
        value,
      );
      if (!value) return null;
      return { label: label || value, value };
    })
    .filter((row): row is CreateFormFieldOption => !!row);
}

function collectModulesRaw(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  const root = asObject(data);
  const nestedSchema = asObject(root.schema);
  const nestedForm = asObject(root.form);
  const candidates = [
    root.modules,
    root.formModules,
    root.form_modules,
    root.priceModules,
    root.price_modules,
    root.sections,
    root.steps,
    nestedSchema.modules,
    nestedSchema.formModules,
    nestedForm.modules,
    nestedForm.formModules,
    root.data,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) return candidate;
  }
  // Single module object with fields
  if (
    Array.isArray(root.fields) ||
    Array.isArray(root.form_fields) ||
    Array.isArray(root.formFields)
  ) {
    return [root];
  }
  return [];
}

function collectFieldsRaw(mod: Record<string, unknown>): unknown[] {
  const candidates = [
    mod.fields,
    mod.form_fields,
    mod.formFields,
    mod.form_module_fields,
    mod.moduleFields,
    mod.children,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

const SKIP_CREATE_SCHEMA_KEYS = new Set([
  'category',
  'category_id',
  'building_type',
  'building_type_id',
  'property_type',
  'property_type_id',
  'property_name',
  'property_name_id',
  'location',
  'location_id',
  'micro_market',
  'micro_market_id',
  'micromarket',
  'owner_user_id',
  'owner',
]);

function normalizeCreateField(
  raw: unknown,
  moduleKey = '',
): CreateFormField | null {
  const row = asObject(raw);
  const key = pickStr(
    row.key,
    row.field_key,
    row.fieldKey,
    row.name,
    row.slug,
  );
  if (!key) return null;
  // Skip catalog/hierarchy fields that are already collected above the form.
  if (SKIP_CREATE_SCHEMA_KEYS.has(key.trim().toLowerCase().replace(/[\s-]+/g, '_'))) {
    return null;
  }
  const type = pickStr(
    row.type,
    row.field_type,
    row.fieldType,
    row.input_type,
    row.inputType,
    'text',
  ).toLowerCase();
  const label = pickStr(
    row.label,
    row.display_name,
    row.displayName,
    row.title,
    key,
  );
  const fieldId = pickStr(row.id, row.field_id, row.fieldId);
  return {
    key,
    label: label || key,
    type: type || 'text',
    required:
      row.required === true ||
      row.is_required === true ||
      row.isRequired === true ||
      row.is_mandatory === true ||
      row.isMandatory === true,
    options: normalizeFieldOptions(
      row.options ??
        row.choices ??
        row.values ??
        row.module_options ??
        row.moduleOptions,
    ),
    placeholder: pickStr(row.placeholder, row.hint) || undefined,
    moduleKey: moduleKey || pickStr(row.module_key, row.moduleKey) || undefined,
    raw: fieldId ? { ...row, id: fieldId } : row,
  };
}

function normalizeModule(raw: unknown): { key: string; label: string; fields: CreateFormField[] } | null {
  const row = asObject(raw);
  const key = pickStr(row.key, row.module_key, row.moduleKey, row.name, row.id);
  const label = pickStr(row.label, row.display_name, row.displayName, row.name, key);
  const fields = collectFieldsRaw(row)
    .map((field) => normalizeCreateField(field, key))
    .filter((field): field is CreateFormField => !!field);
  if (!key && fields.length === 0) return null;
  // Hide modules with no renderable fields (pure catalog modules)
  if (fields.length === 0) return null;
  return { key: key || 'module', label: label || key || 'Module', fields };
}

export function normalizeCreateSchema(data: unknown): CreateFormSchema {
  const root = asObject(data);
  const modulesRaw = collectModulesRaw(data);
  const modules = modulesRaw
    .map(normalizeModule)
    .filter((mod): mod is { key: string; label: string; fields: CreateFormField[] } => !!mod);

  const topFieldsRaw = Array.isArray(root.fields)
    ? root.fields
    : Array.isArray(root.form_fields)
      ? root.form_fields
      : Array.isArray(root.formFields)
        ? root.formFields
        : [];
  const topFields = topFieldsRaw
    .map((field) => normalizeCreateField(field))
    .filter((field): field is CreateFormField => !!field);

  // Keep price/price_on_request in schema if present — UI still has dedicated controls,
  // but they should not be the only reason modules disappear.
  const fields =
    topFields.length > 0
      ? topFields
      : modules.flatMap((mod) => mod.fields);

  return { fields, modules, raw: data };
}

async function enrichFieldOptions(fields: CreateFormField[]): Promise<CreateFormField[]> {
  return Promise.all(
    fields.map(async (field) => {
      if ((field.options?.length || 0) > 0) return field;
      const fieldId = pickStr(field.raw?.id);
      if (!fieldId) return field;
      try {
        const response = await axiosClient.get(`/admin/module-options/field/${fieldId}`);
        const options = normalizeFieldOptions(response.data);
        if (options.length === 0) return field;
        return { ...field, options };
      } catch {
        return field;
      }
    }),
  );
}

async function buildSchemaFromModuleConfigs(params: {
  categoryId: string;
  buildingTypeId: string;
  propertyTypeId: string;
}): Promise<CreateFormSchema> {
  const [modulesRes, configsRes] = await Promise.all([
    axiosClient.get('/admin/listing-config/form-modules'),
    axiosClient.get('/admin/module-configs', {
      params: {
        categoryId: params.categoryId,
        buildingTypeId: params.buildingTypeId,
        propertyTypeId: params.propertyTypeId,
      },
    }),
  ]);

  const modulesList = Array.isArray(modulesRes.data)
    ? modulesRes.data
    : Array.isArray((modulesRes.data as { data?: unknown })?.data)
      ? ((modulesRes.data as { data: unknown[] }).data)
      : [];
  const configsList = Array.isArray(configsRes.data)
    ? configsRes.data
    : Array.isArray((configsRes.data as { data?: unknown })?.data)
      ? ((configsRes.data as { data: unknown[] }).data)
      : [];

  const configByModuleId = new Map<string, Record<string, unknown>>();
  for (const conf of configsList) {
    const row = asObject(conf);
    const moduleId = pickStr(row.module_id, row.moduleId, asObject(row.module).id);
    if (moduleId) configByModuleId.set(moduleId, row);
  }

  const visibleModules = modulesList
    .map((mod) => {
      const row = asObject(mod);
      const id = pickStr(row.id);
      const key = pickStr(row.key, row.module_key, row.moduleKey, row.name, id);
      const label = pickStr(row.label, row.display_name, row.displayName, row.name, key);
      if (!id || !key) return null;
      const conf = configByModuleId.get(id);
      const isCommon = row.is_common === true || row.isCommon === true;
      const isVisible =
        conf == null
          ? isCommon
          : conf.is_visible === true || conf.isVisible === true;
      if (!isVisible) return null;
      // Skip modules that are only catalog pickers in the app flow.
      if (SKIP_CREATE_SCHEMA_KEYS.has(key.toLowerCase())) return null;
      const isMandatory =
        conf?.is_mandatory === true ||
        conf?.isMandatory === true ||
        conf?.is_required === true;
      return { id, key, label: label || key, isMandatory };
    })
    .filter(
      (mod): mod is { id: string; key: string; label: string; isMandatory: boolean } => !!mod,
    );

  const modules = await Promise.all(
    visibleModules.map(async (mod) => {
      try {
        const fieldsRes = await axiosClient.get(
          `/admin/listing-config/form-modules/${mod.id}/fields`,
        );
        const fieldsRaw = Array.isArray(fieldsRes.data)
          ? fieldsRes.data
          : Array.isArray((fieldsRes.data as { data?: unknown })?.data)
            ? ((fieldsRes.data as { data: unknown[] }).data)
            : [];
        let fields = fieldsRaw
          .map((field) => {
            const normalized = normalizeCreateField(field, mod.key);
            if (!normalized) return null;
            if (mod.isMandatory) normalized.required = true;
            return normalized;
          })
          .filter((field): field is CreateFormField => !!field);
        fields = await enrichFieldOptions(fields);
        if (fields.length === 0) return null;
        return { key: mod.key, label: mod.label, fields };
      } catch {
        return null;
      }
    }),
  );

  const resolved = modules.filter(
    (mod): mod is { key: string; label: string; fields: CreateFormField[] } => !!mod,
  );
  return {
    modules: resolved,
    fields: resolved.flatMap((mod) => mod.fields),
    raw: { modules: modulesList, configs: configsList, source: 'module-configs-fallback' },
  };
}

function normalizeCreateProperty(raw: unknown): CreateFormProperty | null {
  const row = asObject(raw);
  const id = pickStr(row.id, row.property_name_id, row.propertyNameId);
  const name = pickStr(row.name, row.property_name, row.propertyName, row.label);
  if (!id || !name) return null;
  const city = asObject(row.city);
  return {
    id,
    name,
    cityId: pickStr(row.city_id, row.cityId, city.id) || undefined,
    cityName: pickStr(row.city_name, row.cityName, city.name) || undefined,
    propertyTypeId:
      pickStr(row.property_type_id, row.propertyTypeId, asObject(row.property_type).id) ||
      undefined,
  };
}

function normalizePrefill(raw: unknown): CreateFormPrefill {
  const row = asObject(raw);
  const locationsRaw = Array.isArray(row.locations)
    ? row.locations
    : Array.isArray(row.location_options)
      ? row.location_options
      : [];
  const locations = locationsRaw
    .map((item) => {
      const loc = asObject(item);
      const id = pickStr(loc.id, loc.location_id, loc.locationId);
      const name = pickStr(loc.name, loc.location_name, loc.locationName);
      if (!id || !name) return null;
      return { id, name };
    })
    .filter((item): item is CreateFormPrefillLocation => !!item);

  const singleLoc = asObject(row.location);
  const locationId =
    pickStr(row.location_id, row.locationId, singleLoc.id) ||
    (locations.length === 1 ? locations[0].id : '');
  const locationName =
    pickStr(row.location_name, row.locationName, singleLoc.name) ||
    locations.find((l) => l.id === locationId)?.name ||
    '';

  const mm = asObject(row.micro_market ?? row.microMarket);
  const microMarketId = pickStr(
    row.micro_market_id,
    row.microMarketId,
    mm.id,
  );
  const microMarketName = pickStr(
    row.micro_market_name,
    row.microMarketName,
    mm.name,
  );
  const city = asObject(row.city);

  return {
    locationId,
    locationName,
    microMarketId,
    microMarketName,
    locations:
      locations.length > 0
        ? locations
        : locationId
          ? [{ id: locationId, name: locationName || locationId }]
          : [],
    cityId: pickStr(row.city_id, row.cityId, city.id) || undefined,
    cityName: pickStr(row.city_name, row.cityName, city.name) || undefined,
  };
}

export function listingCreateApiError(err: unknown, fallback: string): string {
  const e = err as {
    response?: { data?: { message?: unknown; error?: unknown } };
    message?: string;
  };
  const nested = e?.response?.data;
  const fromError =
    nested && typeof nested === 'object' && 'error' in nested
      ? (nested as { error?: { message?: unknown } }).error?.message
      : undefined;
  const msg = fromError ?? nested?.message ?? nested?.error;
  if (Array.isArray(msg)) return msg.filter(Boolean).join(', ');
  if (typeof msg === 'string' && msg.trim()) return msg;
  return e?.message || fallback;
}

/** Categories that appear in DB but are not product-ready for admin create yet. */
export function isCreateCategoryDisabled(option: CreateFormOption): boolean {
  const key = option.name
    .trim()
    .toLowerCase()
    .replace(/[\s/_-]+/g, ' ');
  return key.includes('developer');
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

  getCreateCategories: async (): Promise<CreateFormOption[]> => {
    const response = await axiosClient.get('/admin/listings/create-form/categories');
    return asOptionList(response.data);
  },

  getCreateBuildingTypes: async (categoryId: string): Promise<CreateFormOption[]> => {
    const response = await axiosClient.get('/admin/listings/create-form/building-types', {
      params: { categoryId },
    });
    return asOptionList(response.data);
  },

  getCreatePropertyTypes: async (
    buildingTypeId: string,
    categoryId?: string,
  ): Promise<CreateFormOption[]> => {
    const response = await axiosClient.get('/admin/listings/create-form/property-types', {
      params: { buildingTypeId, categoryId },
    });
    return asOptionList(response.data);
  },

  getCreateSchema: async (params: {
    categoryId: string;
    buildingTypeId: string;
    propertyTypeId: string;
  }): Promise<CreateFormSchema> => {
    try {
      const response = await axiosClient.get('/admin/listings/create-form/schema', {
        params,
      });
      let normalized = normalizeCreateSchema(response.data);
      if (normalized.fields.length > 0 || normalized.modules.length > 0) {
        const enrichedModules = await Promise.all(
          normalized.modules.map(async (mod) => ({
            ...mod,
            fields: await enrichFieldOptions(mod.fields),
          })),
        );
        const enrichedTop = await enrichFieldOptions(normalized.fields);
        return {
          ...normalized,
          modules: enrichedModules,
          fields:
            enrichedTop.length > 0
              ? enrichedTop
              : enrichedModules.flatMap((mod) => mod.fields),
        };
      }
    } catch {
      // Fall through to Listings Config module matrix.
    }
    return buildSchemaFromModuleConfigs(params);
  },

  searchCreateProperties: async (params: {
    q?: string;
    propertyTypeId: string;
    cityId?: string;
  }): Promise<CreateFormProperty[]> => {
    const response = await axiosClient.get('/admin/listings/create-form/properties', {
      params: {
        q: params.q?.trim() || undefined,
        propertyTypeId: params.propertyTypeId,
        cityId: params.cityId || undefined,
      },
    });
    const list = Array.isArray(response.data)
      ? response.data
      : Array.isArray((response.data as { data?: unknown })?.data)
        ? ((response.data as { data: unknown[] }).data)
        : Array.isArray((response.data as { items?: unknown })?.items)
          ? ((response.data as { items: unknown[] }).items)
          : [];
    return list
      .map(normalizeCreateProperty)
      .filter((row): row is CreateFormProperty => !!row);
  },

  getCreatePropertyPrefill: async (propertyId: string): Promise<CreateFormPrefill> => {
    const response = await axiosClient.get(
      `/admin/listings/create-form/properties/${propertyId}/prefill`,
    );
    return normalizePrefill(response.data);
  },

  createVerifiedListing: async (
    payload: CreateVerifiedListingPayload,
  ): Promise<unknown> => {
    const response = await axiosClient.post('/admin/listings/verified', payload);
    return response.data;
  },

  getStaffAssignees: async (): Promise<StaffAssignee[]> => {
    const response = await axiosClient.get('/admin/listings/staff-assignees');
    const data = response.data;
    return Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
  },

  getMyListingsSummary: async (): Promise<MyListingsSummary> => {
    const response = await axiosClient.get('/admin/listings/my-listings/summary');
    return response.data as MyListingsSummary;
  },

  getMyListings: async (params: {
    tab?: MyListingsTab;
    categoryId?: string;
    buildingTypeId?: string;
    propertyTypeId?: string;
    status?: 'active' | 'expired' | 'inactive';
    page?: number;
    limit?: number;
  }): Promise<MyListingsResponse> => {
    const response = await axiosClient.get('/admin/listings/my-listings', { params });
    return response.data as MyListingsResponse;
  },

  getMyListingDetail: async (listingId: string): Promise<MyListingDetail> => {
    const response = await axiosClient.get(`/admin/listings/my-listings/${listingId}`);
    return response.data as MyListingDetail;
  },

  getAdminListingRemarks: async (listingId: string) => {
    const response = await axiosClient.get(`/admin/listings/my-listings/${listingId}/admin-remarks`);
    return response.data as Array<{
      id: string;
      body: string;
      author: { id: string; name: string } | null;
      createdAt: string;
    }>;
  },

  getListingInterestDetails: async (listingId: string): Promise<ListingInterestDetails> => {
    const response = await axiosClient.get(
      `/admin/listings/my-listings/${listingId}/interest-details`,
    );
    return response.data as ListingInterestDetails;
  },

  addAdminListingRemark: async (listingId: string, text: string) => {
    const response = await axiosClient.post(`/admin/listings/my-listings/${listingId}/admin-remarks`, {
      text,
    });
    return response.data;
  },

  markMyListingInterestSeen: async (listingId: string) => {
    await axiosClient.post(`/admin/listings/my-listings/${listingId}/mark-interest-seen`);
  },

  setMyListingActive: async (listingId: string, active: boolean) => {
    await axiosClient.put(`/admin/listings/my-listings/${listingId}/active`, { active });
  },

  renewMyListing: async (listingId: string) => {
    const response = await axiosClient.post(`/admin/listings/my-listings/${listingId}/renew`);
    return response.data;
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

/** Custom / rejected names are not in the approved catalog — still need review. */
function isCustomCatalogStatus(status?: string | null): boolean {
  const value = String(status || '')
    .trim()
    .toLowerCase();
  if (!value) return false;
  return value !== 'approved' && value !== 'admin_added';
}

export function isPropertyNamePending(item: ListingReviewItem): boolean {
  const pn = item.highlights?.newPropertyName;
  if (typeof pn === 'string') return !!pn;
  const status =
    (pn && typeof pn === 'object' ? pn.status : null) || item.property_name?.status || '';
  return isCustomCatalogStatus(status);
}

export function isLocationPending(item: ListingReviewItem): boolean {
  const loc = item.highlights?.newLocation;
  if (typeof loc === 'string') return !!loc;
  const status =
    (loc && typeof loc === 'object' ? loc.status : null) || item.location?.status || '';
  return isCustomCatalogStatus(status);
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

export function getCatalogOriginalName(
  item: ListingReviewItem,
  field: 'propertyName' | 'location' | 'microMarket',
): string {
  return item.catalogSave?.[field]?.originalName || '';
}

export function getResubmissionPreviousName(
  item: ListingReviewItem,
  field: 'propertyName' | 'location' | 'microMarket',
): string {
  const snap = item.resubmission;
  if (!snap) return '';
  if (field === 'propertyName') return snap.previousPropertyName?.trim() || '';
  if (field === 'location') return snap.previousLocation?.trim() || '';
  return snap.previousMicroMarket?.trim() || '';
}

export function isMicroMarketPending(item: ListingReviewItem): boolean {
  const mm = item.highlights?.newMicroMarket;
  const status =
    (mm && typeof mm === 'object' ? mm.status : null) ||
    (item as { micromarket?: { status?: string } }).micromarket?.status ||
    '';
  return isCustomCatalogStatus(status);
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
  'created_by_admin_user_id',
  'connected_staff_user_id',
  'category_id',
  'building_type_id',
  'property_type_id',
  'property_name_id',
  'location_id',
  'micromarket_id',
  'micro_market_id',
  'city_id',
  'state_id',
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

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

function shouldSkipDetailKey(norm: string): boolean {
  if (SKIP_DETAIL_KEYS.has(norm)) return true;
  if (/_id$/.test(norm)) return true;
  if (norm === 'uuid' || norm.endsWith('_uuid')) return true;
  return false;
}

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

  // UUID — omit from readable detail rows
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return '';
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
    if (shouldSkipDetailKey(norm)) continue;
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
    if (!value || looksLikeUuid(value)) continue;

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
