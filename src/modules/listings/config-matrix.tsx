'use client';

import { useEffect, useState } from 'react';
import { useMatrixStore } from '@/store/use-matrix-store';
import { listingConfigService } from '@/services/listing-config.service';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

export function ConfigMatrix() {
  const { categoryId, buildingTypeId, propertyTypeId, configs, unsavedChanges, updateConfig, isFetching } = useMatrixStore();
  const [formModules, setFormModules] = useState<any[]>([]);

  useEffect(() => {
    listingConfigService.getFormModules().then(setFormModules).catch(console.error);
  }, []);

  if (!categoryId || !buildingTypeId || !propertyTypeId) {
    return (
      <div className="bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-12 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Complete Selection Required</h3>
        <p className="text-sm text-gray-500">Please select a Category, Building Type, and Property Type to view and edit configurations.</p>
      </div>
    );
  }

  if (isFetching) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-12 flex justify-center items-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  // Merge server configs with unsaved changes for display
  const getDisplayConfig = (mod: any) => {
    const serverConfig = configs.find(c => c.module_id === mod.id) || {};
    const unsaved = unsavedChanges[mod.id] || {};
    return {
      is_visible: serverConfig.is_visible ?? mod.is_common,
      is_mandatory: serverConfig.is_mandatory ?? false,
      is_suggestable: serverConfig.is_suggestable ?? false,
      suggestable_message: serverConfig.suggestable_message ?? '',
      unit_default: serverConfig.unit_default ?? '',
      ...unsaved
    };
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
          <tbody className="divide-y divide-gray-100">
            {formModules.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No Form Modules found. Please run the backend seeder.
                </td>
              </tr>
            ) : (
              formModules.map((mod) => {
                const conf = getDisplayConfig(mod);
                return (
                  <tr key={mod.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{mod.label}</p>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">{mod.key}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Switch
                        checked={conf.is_visible}
                        onCheckedChange={(val) => updateConfig(mod.id, 'is_visible', val)}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Switch
                        checked={conf.is_mandatory}
                        onCheckedChange={(val) => updateConfig(mod.id, 'is_mandatory', val)}
                        disabled={!conf.is_visible}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Switch
                        checked={conf.is_suggestable}
                        onCheckedChange={(val) => updateConfig(mod.id, 'is_suggestable', val)}
                        disabled={!conf.is_visible}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <Input
                        value={conf.suggestable_message || ''}
                        onChange={(e) => updateConfig(mod.id, 'suggestable_message', e.target.value)}
                        placeholder="e.g. Try verifying property..."
                        disabled={!conf.is_suggestable}
                        className="h-9 bg-gray-50"
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
