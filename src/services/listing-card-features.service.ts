import { axiosClient } from '@/lib/axios-client';
import { listingConfigApiError } from '@/services/listing-config.service';

export type CardFeatureOption = {
  id: string;
  name: string;
  categoryId?: string;
  buildingTypeId?: string;
};

export type CardFeatureRow = {
  id: string | null;
  fieldId: string;
  moduleName: string;
  fieldLabel: string;
  displayLabel: string;
  maxSelections: number | null;
  isVisible: boolean;
  sortOrder: number;
  iconUrl: string | null;
};

export type CardFeatureContexts = {
  categories: CardFeatureOption[];
  buildingTypes: CardFeatureOption[];
  propertyTypes: CardFeatureOption[];
};

const multipartConfig = {
  headers: { 'Content-Type': undefined as unknown as string },
  transformRequest: [
    (data: unknown, headers: unknown) => {
      if (headers && typeof headers === 'object') {
        delete (headers as Record<string, unknown>)['Content-Type'];
      }
      return data;
    },
  ],
  timeout: 60000,
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  if (!record) return [];
  for (const key of ['items', 'rows', 'data', 'list']) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  return [];
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function optionFrom(raw: unknown, parent?: { categoryId?: string; buildingTypeId?: string }): CardFeatureOption | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = str(row.id);
  const name = str(row.label) || str(row.name);
  if (!id || !name) return null;
  const categoryId =
    str(row.categoryId) || str(row.category_id) || parent?.categoryId || undefined;
  const buildingTypeId =
    str(row.buildingTypeId) ||
    str(row.building_type_id) ||
    parent?.buildingTypeId ||
    undefined;
  return { id, name, categoryId, buildingTypeId };
}

function collectOptions(
  value: unknown,
  parent?: { categoryId?: string; buildingTypeId?: string },
): CardFeatureOption[] {
  return asList(value)
    .map((row) => optionFrom(row, parent))
    .filter((row): row is CardFeatureOption => Boolean(row));
}

export function normalizeCardFeatureContexts(raw: unknown): CardFeatureContexts {
  const body = asRecord(raw) || {};
  const categories = collectOptions(body.categories ?? body.category);
  const buildingTypes = [...collectOptions(body.buildingTypes ?? body.building_types)];
  const propertyTypes = [...collectOptions(body.propertyTypes ?? body.property_types)];

  for (const category of asList(body.categories)) {
    const cat = asRecord(category);
    const categoryId = str(cat?.id);
    if (!categoryId) continue;
    const nestedBuildings = asList(cat?.buildingTypes ?? cat?.building_types);
    for (const building of nestedBuildings) {
      const option = optionFrom(building, { categoryId });
      if (option && !buildingTypes.some((row) => row.id === option.id)) {
        buildingTypes.push({ ...option, categoryId });
      }
      const bld = asRecord(building);
      const buildingTypeId = str(bld?.id);
      for (const property of asList(bld?.propertyTypes ?? bld?.property_types)) {
        const prop = optionFrom(property, { categoryId, buildingTypeId });
        if (prop && !propertyTypes.some((row) => row.id === prop.id)) {
          propertyTypes.push({ ...prop, categoryId, buildingTypeId });
        }
      }
    }
  }

  return { categories, buildingTypes, propertyTypes };
}

function rowsSource(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const body = asRecord(raw);
  if (!body) return [];
  const nested = asList(body.items ?? body.rows ?? body.fields);
  if (nested.length) return nested;
  if (str(body.fieldId) || str(body.field_id)) return [body];
  return [];
}

export function normalizeCardFeatureRows(raw: unknown): CardFeatureRow[] {
  const list = rowsSource(raw);

  return list
    .map((entry, index): CardFeatureRow | null => {
      const row = asRecord(entry);
      if (!row) return null;
      const fieldId = str(row.fieldId) || str(row.field_id);
      if (!fieldId) return null;
      const savedId = str(row.id);
      const id = savedId || null;
      const sort = Number(row.sortOrder ?? row.sort_order);
      return {
        id,
        fieldId,
        moduleName:
          str(row.moduleName) ||
          str(row.module_name) ||
          str(asRecord(row.module)?.label) ||
          str(asRecord(row.module)?.name) ||
          '—',
        fieldLabel:
          str(row.fieldLabel) ||
          str(row.field_label) ||
          str(row.label) ||
          str(row.name) ||
          fieldId,
        displayLabel: str(row.displayLabel) || str(row.display_label),
        maxSelections: (() => {
          const value = Number(row.maxSelections ?? row.max_selections);
          return Number.isFinite(value) && value > 0 ? value : null;
        })(),
        isVisible: Boolean(row.isVisible ?? row.is_visible),
        sortOrder: Number.isFinite(sort) ? sort : index,
        iconUrl: str(row.iconUrl) || str(row.icon_url) || null,
      };
    })
    .filter((row): row is CardFeatureRow => Boolean(row))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.fieldLabel.localeCompare(b.fieldLabel));
}

export const listingCardFeaturesService = {
  getContexts: async (): Promise<CardFeatureContexts> => {
    const response = await axiosClient.get('/admin/listing-card-features/contexts');
    return normalizeCardFeatureContexts(response.data);
  },

  getFeatures: async (params: {
    categoryId: string;
    buildingTypeId: string;
    propertyTypeId: string;
  }): Promise<CardFeatureRow[]> => {
    const response = await axiosClient.get('/admin/listing-card-features', { params });
    return normalizeCardFeatureRows(response.data);
  },

  saveFeatures: async (payload: {
    categoryId: string;
    buildingTypeId: string;
    propertyTypeId: string;
    items: Array<{
      fieldId: string;
      sortOrder: number;
      isVisible: boolean;
      displayLabel: string;
    }>;
  }): Promise<CardFeatureRow[]> => {
    const response = await axiosClient.put('/admin/listing-card-features', payload);
    return normalizeCardFeatureRows(response.data);
  },

  uploadIcon: async (id: string, file: File): Promise<CardFeatureRow | null> => {
    const form = new FormData();
    form.append('file', file);
    const response = await axiosClient.post(
      `/admin/listing-card-features/${id}/icon`,
      form,
      multipartConfig,
    );
    const rows = normalizeCardFeatureRows(
      Array.isArray(response.data) ? response.data : [response.data],
    );
    return rows[0] || null;
  },

  deleteIcon: async (id: string): Promise<void> => {
    await axiosClient.delete(`/admin/listing-card-features/${id}/icon`);
  },

  errorMessage: (err: unknown, fallback: string) => listingConfigApiError(err, fallback),
};
