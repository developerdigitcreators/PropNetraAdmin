'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { PermissionGuard } from '@/components/common/permission-guard';
import { listingConfigService } from '@/services/listing-config.service';
import { moduleOptionsService } from '@/services/module-options.service';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Edit2, Trash2, AlertTriangle, Settings2, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { SortableGrid } from '@/components/common/sortable-list';
import React from 'react';

const FieldOptionsRenderer = ({ field, canManageOptions }: { field: any, canManageOptions: boolean }) => {
  const [options, setOptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<any>(null);
  const [formData, setFormData] = useState({ label: '', value: '', sort_order: 1 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadOptions = async () => {
    setIsLoading(true);
    try {
      const data = await moduleOptionsService.getOptionsForField(field.id);
      const list = Array.isArray(data) ? data : [];
      setOptions([...list].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
    } catch (err) {
      console.error('Failed to load options', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadOptions(); }, [field.id]);

  const handleReorder = async (ordered: Array<any & { sortOrder: number }>) => {
    const updates = ordered.filter((item) => {
      const prev = options.find((o) => o.id === item.id);
      return (prev?.sort_order || 0) !== item.sortOrder;
    });

    setOptions(ordered.map((item) => ({ ...item, sort_order: item.sortOrder })));

    try {
      await Promise.all(
        updates.map((item) =>
          moduleOptionsService.updateOption(item.id, {
            sort_order: item.sortOrder,
            field_id: field.id,
          }),
        ),
      );
    } catch (err) {
      console.error('Failed to reorder options', err);
      await loadOptions();
      throw err;
    }
  };

  const handleOpenForm = (opt: any = null) => {
    setEditingOption(opt);
    if (opt) {
      setFormData({ label: opt.option_label || opt.label, value: opt.option_value || opt.value, sort_order: opt.sort_order || 1 });
    } else {
      setFormData({ label: '', value: '', sort_order: (options.length > 0 ? Math.max(...options.map(o => o.sort_order || 0)) + 1 : 1) });
    }
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!formData.label) return;
    setIsSubmitting(true);
    try {
      const payload: any = { option_label: formData.label, sort_order: Number(formData.sort_order), field_id: field.id };
      if (editingOption) {
        await moduleOptionsService.updateOption(editingOption.id, payload);
      } else {
        await moduleOptionsService.createOption(payload);
      }
      setIsFormOpen(false);
      loadOptions();
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this option?')) return;
    try {
      await moduleOptionsService.deleteOption(id);
      loadOptions();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm mt-2">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-gray-900 text-sm">Options for "{field.label}"</h4>
        {canManageOptions && !isFormOpen && (
          <Button onClick={() => handleOpenForm()} size="sm" variant="outline" className="h-8 text-xs text-primary border-primary hover:bg-primary-light">
            <Plus className="w-3 h-3 mr-1" /> Add Option
          </Button>
        )}
      </div>

      {!isFormOpen ? (
        isLoading ? (
          <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : options.length === 0 ? (
          <p className="text-center text-sm text-gray-500 p-4 border border-dashed rounded-lg bg-gray-50">No options defined yet.</p>
        ) : (
          <SortableGrid
            items={options}
            disabled={!canManageOptions}
            onReorder={handleReorder}
            renderItem={(opt, { dragHandle }) => (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 group hover:border-gray-300 transition-colors h-full">
                <div className="min-w-0 pr-2">
                  <p className="font-medium text-sm text-gray-900 truncate">{opt.option_label || opt.label}</p>
                  {(opt.option_value || opt.value) && (
                    <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">
                      Val: {opt.option_value || opt.value}
                    </p>
                  )}
                  {opt.status === 'pending' && (
                    <Badge variant="outline" className="mt-1 text-[10px] text-orange-600 bg-orange-50 border-orange-200 py-0 h-4">
                      Pending
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {dragHandle}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canManageOptions && (
                      <Button variant="ghost" size="sm" onClick={() => handleOpenForm(opt)} className="h-7 w-7 p-0">
                        <Edit2 className="w-3 h-3 text-gray-500" />
                      </Button>
                    )}
                    {canManageOptions && (
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(opt.id)} className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          />
        )
      ) : (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h5 className="font-medium text-sm text-gray-900 mb-3">{editingOption ? 'Edit Option' : 'Add Option'}</h5>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Display Label</label>
              <Input value={formData.label} onChange={e => setFormData({...formData, label: e.target.value})} placeholder="e.g. Fully Furnished" className="bg-white h-9 text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setIsFormOpen(false)} className="h-8">Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={isSubmitting || !formData.label} className="h-8">
              {isSubmitting && <Loader2 className="w-3 h-3 mr-2 animate-spin" />} Save Option
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function FormFieldsPage() {
  const { permissions } = useAuthStore();
  const router = useRouter();
  const params = useParams();
  const moduleId = params.id as string;

  const [fields, setFields] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Options State
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null);
  const [currentField, setCurrentField] = useState<any>(null);
  const [fieldOptions, setFieldOptions] = useState<any[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  
  const [editingOption, setEditingOption] = useState<any>(null);
  const [isOptionFormOpen, setIsOptionFormOpen] = useState(false);
  const [optionFormData, setOptionFormData] = useState({ label: '', value: '', sort_order: 1 });

  // Form State
  const [formData, setFormData] = useState<any>({ key: '', label: '', field_type: 'select' });

  const [moduleLabel, setModuleLabel] = useState('Fields Management');

  const fetchFields = async () => {
    setIsLoading(true);
    try {
      const data = await listingConfigService.getFormFields(moduleId);
      setFields(Array.isArray(data) ? data : []);
      
      const modules = await listingConfigService.getFormModules();
      const mod = modules.find((m: any) => m.id === moduleId);
      if (mod) setModuleLabel(mod.label);
    } catch (err) {
      console.error('Failed to fetch fields', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (moduleId) fetchFields();
  }, [moduleId]);

  const handleOpenModal = (item: any = null) => {
    setEditingItem(item);
    if (item) {
      setFormData({ 
        key: item.key, 
        label: item.label, 
        field_type: item.field_type
      });
    } else {
      setFormData({ key: '', label: '', field_type: 'select' });
    }
    setIsModalOpen(true);
  };

  const handleOpenDelete = (item: any) => {
    setEditingItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.key || !formData.label) return;
    setIsSubmitting(true);
    try {
      const payload: any = { 
        label: formData.label, 
        field_type: formData.field_type 
      };

      if (editingItem) {
        await listingConfigService.updateFormField(editingItem.id, payload);
      } else {
        await listingConfigService.createFormField(moduleId, payload);
      }
      setIsModalOpen(false);
      fetchFields();
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingItem) return;
    setIsSubmitting(true);
    try {
      await listingConfigService.deleteFormField(editingItem.id);
      setIsDeleteModalOpen(false);
      fetchFields();
    } catch (err) {
      console.error('Delete failed', err);
      alert('Failed to delete. Ensure it is not in use.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Remove old options management functions as they are handled by FieldOptionsRenderer

  const canCreate = permissions.has('form_modules:create');
  const canUpdate = permissions.has('form_modules:update');
  const canDelete = permissions.has('form_modules:delete');

  const canManageOptions = permissions.has('module_options:create') || permissions.has('module_options:update');

  const requiresOptions = (type: string) => {
    return ['select', 'multi_select', 'radio', 'checkbox', 'creatable_select'].includes(type);
  };

  return (
    <PermissionGuard permission="form_modules:read" fallback={<div className="p-12 text-center text-gray-500">You do not have permission to view form modules.</div>}>
      <div className="space-y-6 pb-24">
        <Breadcrumb items={[{ label: 'Form Modules', href: '/listings/form-modules' }, { label: moduleLabel }]} />
        <Button variant="ghost" onClick={() => router.push('/listings/form-modules')} className="text-gray-500 hover:text-gray-900 -ml-2 mb-2">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sections
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{moduleLabel} Fields</h1>
            <p className="text-gray-500 mt-1">Manage the specific inputs that belong to this section.</p>
          </div>
        </div>

        <div className="space-y-4 mt-6">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : fields.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">No fields found for this section.</div>
          ) : (
            fields.map(item => (
              <div key={item.id} className="bg-gray-50/30 rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-5 flex items-center justify-between border-b border-gray-100 bg-white">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{item.label}</h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span>Type: <span className="font-medium text-gray-700 capitalize">{item.field_type.replace('_', ' ')}</span></span>
                      {item.key && <span>• Key: <span className="font-mono text-xs text-gray-600 bg-gray-100 px-1 py-0.5 rounded">{item.key}</span></span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canUpdate && (
                      <Button variant="ghost" size="sm" onClick={() => handleOpenModal(item)} className="text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100">
                        <Edit2 className="w-4 h-4 mr-2" /> Edit Field
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDelete(item)} className="text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 px-3">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {requiresOptions(item.field_type) && (
                  <div className="px-5 pb-5 pt-3 bg-gray-50/50">
                    <FieldOptionsRenderer field={item} canManageOptions={canManageOptions} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Create/Edit Field Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit' : 'Add'} Field</DialogTitle>
              <DialogDescription>Configure the dynamic input field.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Label</label>
                <Input value={formData.label} onChange={e => setFormData({...formData, label: e.target.value})} placeholder="e.g. Furnishing Status" />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Field Type</label>
                <Select value={formData.field_type} onValueChange={v => setFormData({...formData, field_type: v})}>
                  <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text (Short/Long)</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="select">Select (Dropdown)</SelectItem>
                    <SelectItem value="multi_select">Multi Select</SelectItem>
                    <SelectItem value="checkbox">Checkbox</SelectItem>
                    <SelectItem value="file_upload">File Upload</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSubmitting || !formData.label}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Field Modal */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent>
            <DialogHeader className="hidden">
              <DialogTitle>Delete</DialogTitle>
              <DialogDescription>Confirm</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center text-center pt-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete {editingItem?.label}?</h3>
              <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete this field? This cannot be undone.</p>
              <div className="flex w-full gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Delete
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Removed Manage Options Modal, using inline expandable rows instead */}
      </div>
    </PermissionGuard>
  );
}
