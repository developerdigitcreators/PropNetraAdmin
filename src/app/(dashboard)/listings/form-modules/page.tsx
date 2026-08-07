'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { PermissionGuard } from '@/components/common/permission-guard';
import { listingConfigService } from '@/services/listing-config.service';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Edit2, Trash2, AlertTriangle, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/common/breadcrumb';

export default function FormModulesPage() {
  const { permissions } = useAuthStore();
  const router = useRouter();
  const [modules, setModules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<any>({ key: '', label: '', admin_name: '', is_common: false });

  const fetchModules = async () => {
    setIsLoading(true);
    try {
      const data = await listingConfigService.getFormModules();
      setModules(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch modules', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  const handleOpenModal = (item: any = null) => {
    setEditingItem(item);
    if (item) {
      setFormData({ 
        key: item.key, 
        label: item.label, 
        admin_name: item.admin_name || '',
        is_common: item.is_common ?? false
      });
    } else {
      setFormData({ key: '', label: '', admin_name: '', is_common: false });
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
        key: formData.key, 
        label: formData.label, 
        admin_name: formData.admin_name,
        is_common: formData.is_common 
      };

      if (editingItem) {
        await listingConfigService.updateFormModule(editingItem.id, payload);
      } else {
        await listingConfigService.createFormModule(payload);
      }
      setIsModalOpen(false);
      fetchModules();
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
      await listingConfigService.deleteFormModule(editingItem.id);
      setIsDeleteModalOpen(false);
      fetchModules();
    } catch (err) {
      console.error('Delete failed', err);
      alert('Failed to delete. Ensure it is not in use.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canCreate = permissions.has('form_modules:create');
  const canUpdate = permissions.has('form_modules:update');
  const canDelete = permissions.has('form_modules:delete');

  return (
    <PermissionGuard permission="form_modules:read" fallback={<div className="p-12 text-center text-gray-500">You do not have permission to view form modules.</div>}>
      <div className="space-y-6 pb-24">
        <Breadcrumb items={[{ label: 'Form Modules' }]} />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Form Modules (Sections)</h1>
            <p className="text-gray-500 mt-1">Manage sections (e.g., Area Details, Amenities) which group multiple form fields.</p>
          </div>
          {canCreate && (
            <Button onClick={() => handleOpenModal()} className="bg-primary text-white hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" /> Add Section
            </Button>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-700">Display Name</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Admin Name</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Common</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td></tr>
              ) : modules.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500">No sections found.</td></tr>
              ) : (
                modules.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-medium text-gray-900">{item.label}</td>
                    <td className="px-6 py-4 text-gray-500">{item.admin_name || '—'}</td>
                    <td className="px-6 py-4">
                      {item.is_common ? <Badge variant="secondary" className="bg-blue-50 text-blue-700">Common</Badge> : <Badge variant="outline" className="text-gray-500">Specific</Badge>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/listings/form-modules/${item.id}/fields`)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="Manage Fields">
                          <Layers className="w-4 h-4 mr-1" /> Manage Fields
                        </Button>
                        {canUpdate && (
                          <Button variant="ghost" size="sm" onClick={() => handleOpenModal(item)} className="text-gray-500 hover:text-gray-700">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="sm" onClick={() => handleOpenDelete(item)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Create/Edit Module Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit' : 'Add'} Section</DialogTitle>
              <DialogDescription>Configure the section group.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Display Name (Label)</label>
                <Input value={formData.label} onChange={e => setFormData({...formData, label: e.target.value})} placeholder="e.g. Area Details" />
                <p className="text-xs text-gray-500">This is what app users will see.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Name</label>
                <Input value={formData.admin_name} onChange={e => setFormData({...formData, admin_name: e.target.value})} placeholder="e.g. Area Config v2" />
                <p className="text-xs text-gray-500">Internal name to help admins identify this section.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Key</label>
                <Input value={formData.key} onChange={e => setFormData({...formData, key: e.target.value})} placeholder="e.g. area_details" disabled={!!editingItem} />
                <p className="text-xs text-gray-500">Unique identifier. Cannot be changed once created.</p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <label className="text-sm font-medium">Is Common?</label>
                  <p className="text-xs text-gray-500">Show this section for ALL property types?</p>
                </div>
                <Switch checked={formData.is_common} onCheckedChange={c => setFormData({...formData, is_common: c})} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSubmitting || !formData.key || !formData.label}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Module Modal */}
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
              <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete this section? This cannot be undone.</p>
              <div className="flex w-full gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Delete
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
}
