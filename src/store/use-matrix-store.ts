import { create } from "zustand";
import { isBannerFormModule, listingConfigService } from "@/services/listing-config.service";

interface MatrixState {
  categoryId: string | null;
  buildingTypeId: string | null;
  propertyTypeId: string | null;
  configs: any[];
  unsavedChanges: Record<string, any>;
  isFetching: boolean;
  isSaving: boolean;

  setHierarchy: (
    categoryId: string | null,
    buildingTypeId: string | null,
    propertyTypeId: string | null,
  ) => void;
  fetchConfigs: () => Promise<void>;
  updateConfig: (moduleId: string, field: string, value: any) => void;
  saveConfigs: () => Promise<void>;
  saveModuleRows: (rows: Array<Record<string, unknown>>) => Promise<void>;
  resetChanges: () => void;
}

function asConfigList(data: unknown): any[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const row = data as { items?: unknown; configs?: unknown; data?: unknown };
    if (Array.isArray(row.items)) return row.items;
    if (Array.isArray(row.configs)) return row.configs;
    if (Array.isArray(row.data)) return row.data;
  }
  return [];
}

function configModuleId(row: any): string {
  return String(row?.module_id ?? row?.moduleId ?? "");
}

function readSortOrder(row: any, fallback: number) {
  const raw = row?.sort_order ?? row?.sortOrder;
  const n = Number(raw);
  return raw == null || raw === "" || !Number.isFinite(n) ? fallback : n;
}

function suggestableMessage(value: unknown) {
  if (value == null || value === "") return null;
  return String(value);
}

export const useMatrixStore = create<MatrixState>((set, get) => ({
  categoryId: null,
  buildingTypeId: null,
  propertyTypeId: null,
  configs: [],
  unsavedChanges: {},
  isFetching: false,
  isSaving: false,

  setHierarchy: (categoryId, buildingTypeId, propertyTypeId) => {
    set({
      categoryId,
      buildingTypeId,
      propertyTypeId,
      unsavedChanges: {},
      configs: [],
    });
    if (categoryId && buildingTypeId && propertyTypeId) {
      get().fetchConfigs();
    }
  },

  fetchConfigs: async () => {
    const { categoryId, buildingTypeId, propertyTypeId } = get();
    if (!categoryId || !buildingTypeId || !propertyTypeId) return;

    set({ isFetching: true });
    try {
      const data = await listingConfigService.getModuleConfigs(
        categoryId,
        buildingTypeId || undefined,
        propertyTypeId || undefined,
      );
      set({
        configs: asConfigList(data),
        unsavedChanges: {},
        isFetching: false,
      });
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      console.error("Failed to fetch configs", error);
      set({
        isFetching: false,
        configs: status === 404 ? [] : get().configs,
        unsavedChanges: {},
      });
    }
  },

  updateConfig: (moduleId, field, value) => {
    set((state) => {
      const existingChange = state.unsavedChanges[moduleId] || {};
      return {
        unsavedChanges: {
          ...state.unsavedChanges,
          [moduleId]: {
            ...existingChange,
            [field]: value,
          },
        },
      };
    });
  },

  saveConfigs: async () => {
    const { unsavedChanges, configs, categoryId, buildingTypeId, propertyTypeId } = get();
    if (Object.keys(unsavedChanges).length === 0 || !categoryId || !buildingTypeId || !propertyTypeId) {
      return;
    }
    const rows = Object.entries(unsavedChanges).map(([moduleId, changes]) => {
      const server = configs.find((row) => configModuleId(row) === moduleId) || {};
      return {
        module_id: moduleId,
        ...changes,
        sort_order: readSortOrder(server, 0),
      };
    });
    await get().saveModuleRows(rows);
  },

  saveModuleRows: async (rows) => {
    const {
      unsavedChanges,
      configs,
      categoryId,
      buildingTypeId,
      propertyTypeId,
      fetchConfigs,
    } = get();
    if (!categoryId || !buildingTypeId || !propertyTypeId || rows.length === 0) return;

    set({ isSaving: true });
    try {
      const modules = asConfigList(await listingConfigService.getFormModules());
      const bannerIds = new Set(
        modules.filter((mod) => isBannerFormModule(mod)).map((mod) => String(mod.id)),
      );
      const merged = new Map<string, Record<string, unknown>>();
      for (const [moduleId, changes] of Object.entries(unsavedChanges)) {
        if (bannerIds.has(moduleId)) continue;
        merged.set(moduleId, { module_id: moduleId, ...(changes as Record<string, unknown>) });
      }
      for (const row of rows) {
        const moduleId = String(row.module_id || "");
        if (!moduleId || bannerIds.has(moduleId)) continue;
        merged.set(moduleId, { ...(merged.get(moduleId) || {}), ...row, module_id: moduleId });
      }

      const payload = [...merged.values()].map((changes) => {
        const moduleId = String(changes.module_id);
        const server = configs.find((row) => configModuleId(row) === moduleId) || {};
        return {
          category_id: categoryId,
          building_type_id: buildingTypeId,
          property_type_id: propertyTypeId,
          module_id: moduleId,
          is_visible: changes.is_visible ?? server.is_visible ?? true,
          is_mandatory: changes.is_mandatory ?? server.is_mandatory ?? false,
          is_suggestable: changes.is_suggestable ?? server.is_suggestable ?? false,
          suggestable_message: suggestableMessage(
            changes.suggestable_message ?? server.suggestable_message,
          ),
          sort_order: readSortOrder(changes, readSortOrder(server, 0)),
        };
      });

      if (payload.length) {
        await listingConfigService.upsertModuleConfig(payload);
      }

      set({ unsavedChanges: {}, isSaving: false });
      await fetchConfigs();
    } catch (error) {
      console.error("Failed to save configs", error);
      set({ isSaving: false });
      throw error;
    }
  },

  resetChanges: () => {
    set({ unsavedChanges: {} });
  },
}));
