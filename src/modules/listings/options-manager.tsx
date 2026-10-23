'use client';

import { useState, useEffect } from 'react';
import { moduleOptionsService } from '@/services/module-options.service';
import { listingConfigService } from '@/services/listing-config.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeleteRemarkDialog } from '@/components/common/delete-remark-dialog';

export function OptionsManager() {
  const [modules, setModules] = useState<any[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  
  const [options, setOptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // New option state
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');
  const [optionToDelete, setOptionToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    listingConfigService.getFormModules()
      .then(data => {
        // Filter to only modules that might need options (e.g. select, multi_select, radio)
        const selectableModules = data.filter((m: any) => 
          ['select', 'multi_select', 'radio'].includes(m.field_type)
        );
        setModules(selectableModules);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedModuleId) {
      setOptions([]);
      return;
    }
    
    setIsLoading(true);
    moduleOptionsService.getOptionsForModule(selectedModuleId)
      .then(setOptions)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [selectedModuleId]);

  const handleAddOption = async () => {
    if (!newLabel || !newValue || !selectedModuleId) return;
    
    try {
      const payload = {
        module_id: selectedModuleId,
        option_label: newLabel,
        option_value: newValue,
        sort_order: options.length + 1,
        is_active: true
      };
      
      const res = await moduleOptionsService.createOption(payload);
      setOptions(prev => [...prev, ...res]); // Assuming API returns created options array based on swagger
      setNewLabel('');
      setNewValue('');
    } catch (error) {
      console.error('Failed to create option', error);
    }
  };

  const handleDelete = async (remark: string) => {
    if (!optionToDelete?.id) return;
    setDeleting(true);
    try {
      await moduleOptionsService.deleteOption(optionToDelete.id, remark);
      setOptions((prev) => prev.filter((opt) => opt.id !== optionToDelete.id));
      setOptionToDelete(null);
    } catch (error) {
      console.error('Failed to delete option', error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select a Form Module to configure options</label>
        <Select value={selectedModuleId} onValueChange={(val) => { if (val) setSelectedModuleId(val) }}>
          <SelectTrigger className="w-full md:w-1/2 h-11 bg-gray-50 border-gray-200">
            <SelectValue placeholder="Choose module (e.g. Amenities)" />
          </SelectTrigger>
          <SelectContent>
            {modules.map(m => (
              <SelectItem key={m.id} value={m.id}>{m.label} ({m.field_type})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedModuleId && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row gap-4 items-end bg-gray-50/50">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Display Label</label>
              <Input 
                value={newLabel} 
                onChange={(e) => setNewLabel(e.target.value)} 
                placeholder="e.g. Swimming Pool" 
                className="bg-white"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Internal Value</label>
              <Input 
                value={newValue} 
                onChange={(e) => setNewValue(e.target.value)} 
                placeholder="e.g. swimming_pool" 
                className="bg-white"
              />
            </div>
            <Button onClick={handleAddOption} className="bg-primary hover:bg-primary/90 text-white" disabled={!newLabel || !newValue}>
              <Plus className="w-4 h-4 mr-2" />
              Add Option
            </Button>
          </div>

          <div className="p-0">
            {isLoading ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
            ) : options.length === 0 ? (
              <div className="p-12 text-center text-gray-500 text-sm">
                No options configured for this module yet.
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-gray-700">Display Label</th>
                    <th className="px-6 py-3 font-semibold text-gray-700">Internal Value</th>
                    <th className="px-6 py-3 font-semibold text-gray-700 w-24 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {options.map((opt) => (
                    <tr key={opt.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{opt.option_label}</td>
                      <td className="px-6 py-4 text-gray-500 font-mono text-xs">{opt.option_value}</td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setOptionToDelete(opt)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
      <DeleteRemarkDialog
        open={Boolean(optionToDelete)}
        onOpenChange={(open) => !open && setOptionToDelete(null)}
        title="Delete option?"
        itemName={optionToDelete?.option_label}
        submitting={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
