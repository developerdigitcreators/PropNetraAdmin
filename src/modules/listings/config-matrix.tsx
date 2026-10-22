'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useMatrixStore } from '@/store/use-matrix-store';
import { isBannerFormModule, listingConfigService } from '@/services/listing-config.service';
import { SortableTableBody } from '@/components/common/sortable-list';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

export function ConfigMatrix() {
  const {
    categoryId,
    buildingTypeId,
    propertyTypeId,
    configs,
    unsavedChanges,
    updateConfig,
    saveModuleRows,
    isFetching,
    isSaving,
  } = useMatrixStore();
  const [formModules, setFormModules] = useState<any[]>([]);
  const [orderError, setOrderError] = useState('');

  useEffect(() => {
    listingConfigService.getFormModules().then((data) => {
      const list = Array.isArray(data) ? data : [];
      setFormModules(list.filter((mod) => !isBannerFormModule(mod)));
    }).catch(console.error);
  }, []);

  if (!categoryId || !buildingTypeId || !propertyTypeId) {
    return (
      <div className="bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-12 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Complete Selection Required</h3>
        <p className="text-sm text-gray-500">Please select a Category, Building Type, and Property Type to view and edit configurations.</p>
      </div>
    );
  }

  if (isFetching && configs.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-12 flex justify-center items-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  const serverConfigFor = (moduleId: string) =>
    configs.find((row) => String(row.module_id ?? row.moduleId) === moduleId) || {};

  const sortOrderFor = (mod: any) => {
    const server = serverConfigFor(mod.id);
    const saved = server.sort_order ?? server.sortOrder;
    if (saved != null && saved !== '' && Number.isFinite(Number(saved))) return Number(saved);
    return Number(mod.sort_order ?? mod.sortOrder ?? 0);
  };

  const getDisplayConfig = (mod: any) => {
    const serverConfig = serverConfigFor(mod.id);
    const unsaved = unsavedChanges[mod.id] || {};
    return {
      is_visible: serverConfig.is_visible ?? true,
      is_mandatory: serverConfig.is_mandatory ?? false,
      is_suggestable: serverConfig.is_suggestable ?? false,
      suggestable_message: serverConfig.suggestable_message ?? '',
      sort_order: sortOrderFor(mod),
      ...unsaved,
    };
  };

  const ranked = formModules
    .map((mod) => ({ ...mod, id: String(mod.id) }))
    .sort(
      (a, b) =>
        sortOrderFor(a) - sortOrderFor(b) ||
        String(a.label || '').localeCompare(String(b.label || '')),
    );
  const visibleRows = ranked.filter((mod) => getDisplayConfig(mod).is_visible);
  const hiddenRows = ranked.filter((mod) => !getDisplayConfig(mod).is_visible);

  const persistVisibility = async (mod: any, nextVisible: boolean) => {
    setOrderError('');
    const current = getDisplayConfig(mod);
    const nextOrder = nextVisible
      ? visibleRows.reduce((max, row) => Math.max(max, Number(getDisplayConfig(row).sort_order) || 0), 0) + 1
      : current.sort_order;
    try {
      await saveModuleRows([
        {
          module_id: mod.id,
          is_visible: nextVisible,
          sort_order: nextOrder,
        },
      ]);
    } catch {
      setOrderError('Failed to update visibility.');
    }
  };

  const renderCells = (mod: any, dragHandle?: ReactNode) => {
    const conf = getDisplayConfig(mod);
    return (
      <>
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            {dragHandle}
            <div>
              <p className="font-medium text-gray-900">{mod.label}</p>
              <p className="text-xs text-gray-500 font-mono mt-0.5">{mod.key}</p>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
          <Switch
            checked={conf.is_visible}
            disabled={isSaving}
            onCheckedChange={(val) => void persistVisibility(mod, Boolean(val))}
          />
        </td>
        <td className="px-6 py-4 text-center">
          <Switch
            checked={conf.is_mandatory}
            onCheckedChange={(val) => updateConfig(mod.id, 'is_mandatory', val)}
            disabled={!conf.is_visible || isSaving}
          />
        </td>
        <td className="px-6 py-4 text-center">
          <Switch
            checked={conf.is_suggestable}
            onCheckedChange={(val) => updateConfig(mod.id, 'is_suggestable', val)}
            disabled={!conf.is_visible || isSaving}
          />
        </td>
        <td className="px-6 py-4">
          <Input
            value={conf.suggestable_message || ''}
            onChange={(e) => updateConfig(mod.id, 'suggestable_message', e.target.value)}
            placeholder="e.g. Try verifying property..."
            disabled={!conf.is_suggestable || isSaving}
            className="h-9 bg-gray-50"
          />
        </td>
      </>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {orderError ? (
        <p className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm text-red-600">{orderError}</p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-gray-700 w-1/4">Form Module</th>
              <th className="px-6 py-4 font-semibold text-gray-700 text-center">Visible</th>
              <th className="px-6 py-4 font-semibold text-gray-700 text-center">Mandatory</th>
              <th className="px-6 py-4 font-semibold text-gray-700 text-center">Suggestable</th>
              <th className="px-6 py-4 font-semibold text-gray-700 w-1/4">Suggest Message</th>
            </tr>
          </thead>
          {visibleRows.length === 0 && hiddenRows.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No Form Modules found. Please run the backend seeder.
                </td>
              </tr>
            </tbody>
          ) : (
            <>
              <SortableTableBody
                items={visibleRows}
                disabled={isSaving}
                onReorder={async (ordered) => {
                  setOrderError('');
                  try {
                    await saveModuleRows(
                      ordered.map((mod) => {
                        const conf = getDisplayConfig(mod);
                        return {
                          module_id: mod.id,
                          is_visible: true,
                          is_mandatory: conf.is_mandatory,
                          is_suggestable: conf.is_suggestable,
                          suggestable_message: conf.suggestable_message,
                          sort_order: mod.sortOrder,
                        };
                      }),
                    );
                  } catch {
                    setOrderError('Failed to save module order.');
                    throw new Error('Failed to save module order.');
                  }
                }}
                renderRow={(mod, { dragHandle }) => renderCells(mod, dragHandle)}
              />
              {hiddenRows.length > 0 ? (
                <tbody className="divide-y divide-gray-100">
                  {hiddenRows.map((mod) => (
                    <tr key={mod.id} className="bg-gray-50/60 text-gray-500">
                      {renderCells(mod)}
                    </tr>
                  ))}
                </tbody>
              ) : null}
            </>
          )}
        </table>
      </div>
    </div>
  );
}
