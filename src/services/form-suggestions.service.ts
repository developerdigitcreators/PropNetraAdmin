import { axiosClient } from '@/lib/axios-client';
import { deleteWithRemark } from '@/lib/delete-with-remark';

export type FormSuggestion = {
  id: string;
  label: string;
  categoryId: string;
  sortOrder: number;
  isActive: boolean;
};

export type CatalogOption = { id: string; name: string };

export type FormSuggestionPropertyType = {
  id: string;
  name: string;
  label: string;
  categoryId: string;
  categoryName: string;
};

export type FormSuggestionWrite = {
  label?: string;
  sort_order?: number;
  is_active?: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function asBool(value: unknown, fallback = true): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const v = value.toLowerCase().trim();
    if (['true', '1', 'on', 'active', 'yes'].includes(v)) return true;
    if (['false', '0', 'off', 'inactive', 'no'].includes(v)) return false;
  }
  return fallback;
}

function asArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  const obj = asRecord(data);
  if (!obj) return [];
  if (Array.isArray(obj.items)) return obj.items;
  if (Array.isArray(obj.suggestions)) return obj.suggestions;
  if (Array.isArray(obj.data)) return obj.data;
  return [];
}

export function formSuggestionApiError(err: unknown, fallback: string): string {
  const e = err as {
    response?: { status?: number; data?: { message?: unknown; error?: unknown } };
    message?: string;
  };
  if (e?.response?.status === 409) {
    const nested = e.response.data;
    const fromError =
      nested && typeof nested === 'object' && 'error' in nested
        ? (nested as { error?: { message?: unknown } }).error?.message
        : undefined;
    const msg = fromError ?? nested?.message ?? nested?.error;
    if (typeof msg === 'string' && msg.trim()) return msg;
    return 'A suggestion with this label already exists.';
  }
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

export function normalizeFormSuggestion(raw: unknown, index = 0): FormSuggestion | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = pickString(row.id);
  const label = pickString(row.label, row.name);
  if (!id || !label) return null;
  return {
    id,
    label,
    categoryId: pickString(row.categoryId, row.category_id),
    sortOrder: Number(row.sortOrder ?? row.sort_order ?? index + 1) || index + 1,
    isActive: asBool(row.isActive ?? row.is_active, true),
  };
}

function mapOptions(data: unknown): CatalogOption[] {
  return asArray(data)
    .map((raw) => {
      const row = asRecord(raw);
      if (!row) return null;
      const id = pickString(row.id);
      const name = pickString(row.name, row.label);
      return id && name ? { id, name } : null;
    })
    .filter((row): row is CatalogOption => !!row);
}

function mapPropertyTypes(data: unknown): FormSuggestionPropertyType[] {
  return asArray(data)
    .map((raw) => {
      const row = asRecord(raw);
      if (!row) return null;
      const id = pickString(row.id);
      const name = pickString(row.name);
      const label = pickString(row.label, row.name);
      if (!id || !label) return null;
      return {
        id,
        name,
        label,
        categoryId: pickString(row.categoryId, row.category_id),
        categoryName: pickString(row.categoryName, row.category_name),
      };
    })
    .filter((row): row is FormSuggestionPropertyType => !!row);
}

function mapList(data: unknown): FormSuggestion[] {
  return asArray(data)
    .map((row, index) => normalizeFormSuggestion(row, index))
    .filter((row): row is FormSuggestion => !!row)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
}

export const formSuggestionsService = {
  listPropertyTypes: async (): Promise<FormSuggestionPropertyType[]> => {
    const response = await axiosClient.get('/admin/form-suggestions/property-types');
    return mapPropertyTypes(response.data);
  },

  listPropertyNames: async (propertyTypeId: string): Promise<FormSuggestion[]> => {
    const response = await axiosClient.get('/admin/form-suggestions/property-names', {
      params: { propertyTypeId },
    });
    return mapList(response.data);
  },

  listLocations: async (): Promise<FormSuggestion[]> => {
    const response = await axiosClient.get('/admin/form-suggestions/locations');
    return mapList(response.data);
  },

  propertyNameOptions: async (propertyTypeId: string): Promise<CatalogOption[]> => {
    const response = await axiosClient.get('/admin/form-suggestions/property-names/options', {
      params: { propertyTypeId },
    });
    return mapOptions(response.data);
  },

  locationOptions: async (): Promise<CatalogOption[]> => {
    const response = await axiosClient.get('/admin/form-suggestions/locations/options');
    return mapOptions(response.data);
  },

  createPropertyNames: async (payload: {
    property_type_id: string;
    property_name_ids: string[];
  }): Promise<void> => {
    await axiosClient.post('/admin/form-suggestions/property-names', payload);
  },

  createLocations: async (payload: { location_ids: string[] }): Promise<void> => {
    await axiosClient.post('/admin/form-suggestions/locations', payload);
  },

  updatePropertyName: async (id: string, payload: FormSuggestionWrite): Promise<FormSuggestion | null> => {
    const response = await axiosClient.put(`/admin/form-suggestions/property-names/${id}`, payload);
    return normalizeFormSuggestion(response.data);
  },

  updateLocation: async (id: string, payload: FormSuggestionWrite): Promise<FormSuggestion | null> => {
    const response = await axiosClient.put(`/admin/form-suggestions/locations/${id}`, payload);
    return normalizeFormSuggestion(response.data);
  },

  removePropertyName: async (id: string, remark: string): Promise<void> => {
    await deleteWithRemark(`/admin/form-suggestions/property-names/${id}`, remark);
  },

  removeLocation: async (id: string, remark: string): Promise<void> => {
    await deleteWithRemark(`/admin/form-suggestions/locations/${id}`, remark);
  },
};
