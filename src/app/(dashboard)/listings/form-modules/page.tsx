'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { PermissionGuard } from '@/components/common/permission-guard';
import { isBannerFormModule, listingConfigApiError, listingConfigService } from '@/services/listing-config.service';
import { SortableTableBody } from '@/components/common/sortable-list';
import { AdminDataTable } from '@/components/common/admin-data-table';
import { AdminListToolbar } from '@/components/common/admin-list-toolbar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Edit2, Trash2, Layers, ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { DeleteRemarkDialog } from '@/components/common/delete-remark-dialog';
import { useDialogUnsavedGuard } from '@/hooks/use-unsaved-changes-guard';

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
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [bannerLink, setBannerLink] = useState('');
  const [bannerBusy, setBannerBusy] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const baselineRef = useRef('');
  const formSnapshot = useMemo(() => JSON.stringify(formData), [formData]);
  const dirty =
    isModalOpen &&
    baselineRef.current !== '' &&
    formSnapshot !== baselineRef.current;
  const { requestClose, dialog: unsavedDialog } = useDialogUnsavedGuard(dirty);

  const handleModalOpenChange = async (next: boolean) => {
    if (isSubmitting) return;
    if (!next) {
      const ok = await requestClose();
      if (ok) setIsModalOpen(false);
      return;
    }
    setIsModalOpen(true);
  };

  const sortedModules = useMemo(
    () =>
      [...modules].sort(
        (a, b) =>
          Number(a.sort_order ?? a.sortOrder ?? 0) -
          Number(b.sort_order ?? b.sortOrder ?? 0),
      ),
    [modules],
  );

  const fetchModules = async () => {
    setIsLoading(true);
    try {
      const data = await listingConfigService.getFormModules();
      const list = Array.isArray(data) ? data : [];
      setModules(
        list.map((item: any, index: number) => ({
          ...item,
          sort_order: Number(item.sort_order ?? item.sortOrder ?? index + 1),
        })),
      );
    } catch (err) {
      console.error('Failed to fetch modules', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
    listingConfigService
      .getFormBanner()
      .then((banner) => {
        setBannerUrl(banner.imageUrl);
        setBannerLink(banner.link || '');
      })
      .catch((err) => console.error('Failed to load form banner', err));
  }, []);

  const handleOpenModal = (item: any = null) => {
    setEditingItem(item);
    const next = item
      ? {
          key: item.key,
          label: item.label,
          admin_name: item.admin_name || '',
          is_common: item.is_common ?? false,
        }
      : { key: '', label: '', admin_name: '', is_common: false };
    setFormData(next);
    baselineRef.current = JSON.stringify(next);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (item: any) => {
    setEditingItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleReorder = async (ordered: Array<any & { sortOrder: number }>) => {
    const previous = modules;
    setModules(
      ordered.map((item) => ({ ...item, sort_order: item.sortOrder })),
    );
    try {
      await Promise.all(
        ordered.map((item) =>
          listingConfigService.updateFormModule(item.id, {
            sort_order: item.sortOrder,
            label: item.label,
          }),
        ),
      );
    } catch (err) {
      console.error('Reorder failed', err);
      setModules(previous);
    }
  };

  const handleSave = async () => {
    if (!formData.label || (!isBannerFormModule(editingItem) && !formData.key)) return;
    setIsSubmitting(true);
    try {
      const bannerModule = isBannerFormModule(editingItem);
      const payload: any = bannerModule
        ? { label: formData.label }
        : {
            key: formData.key,
            label: formData.label,
            admin_name: formData.admin_name,
            is_common: formData.is_common,
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

  const handleDelete = async (remark: string) => {
    if (!editingItem) return;
    setIsSubmitting(true);
    try {
      await listingConfigService.deleteFormModule(editingItem.id, remark);
      setIsDeleteModalOpen(false);
      fetchModules();
    } catch (err) {
      console.error('Delete failed', err);
      alert('Failed to delete. Ensure it is not in use.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePickBanner = async (file: File | undefined) => {
    if (!file) return;
    setBannerBusy(true);
    try {
      const url = await listingConfigService.uploadFormBanner(file);
      setBannerUrl(url);
    } catch (err) {
      console.error('Banner upload failed', err);
      alert(listingConfigApiError(err, 'Failed to upload banner.'));
    } finally {
      setBannerBusy(false);
      if (bannerInputRef.current) bannerInputRef.current.value = '';
    }
  };

  const handleSaveBannerLink = async () => {
    setBannerBusy(true);
    try {
      await listingConfigService.updateFormBanner({ link: bannerLink.trim() || null });
    } catch (err) {
      console.error('Banner link save failed', err);
      alert(listingConfigApiError(err, 'Failed to save banner link.'));
    } finally {
      setBannerBusy(false);
    }
  };

  const handleClearBanner = async () => {
    setBannerBusy(true);
    try {
      await listingConfigService.clearFormBanner();
      setBannerUrl(null);
    } catch (err) {
      console.error('Banner clear failed', err);
      alert(listingConfigApiError(err, 'Failed to remove banner.'));
    } finally {
      setBannerBusy(false);
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
          <AdminListToolbar
            onRefresh={() => {
              void fetchModules();
              void listingConfigService.getFormBanner().then((banner) => {
                setBannerUrl(banner.imageUrl);
                setBannerLink(banner.link || '');
              }).catch(console.error);
            }}
            refreshDisabled={isLoading}
          >
            {canCreate ? (
              <Button onClick={() => handleOpenModal()} className="bg-primary text-white hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" /> Add Section
              </Button>
            ) : null}
          </AdminListToolbar>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3">
          <div className="flex min-w-0 items-center gap-4">
            {bannerUrl ? (
              <img src={bannerUrl} alt="Form banner" className="h-16 w-40 rounded-md border bg-gray-50 object-cover" />
            ) : (
              <div className="flex h-16 w-40 items-center justify-center rounded-md border border-dashed bg-gray-50 text-xs text-gray-400">
                No image
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-2">
              <div>
                <p className="font-medium text-gray-900">Banner</p>
                <p className="text-xs text-gray-500">One image for every listing form. Link is the tap target, not the image file.</p>
              </div>
              <div className="flex max-w-md items-center gap-2">
                <Input
                  value={bannerLink}
                  onChange={(e) => setBannerLink(e.target.value)}
                  placeholder="https://example.com (optional tap link)"
                  disabled={!canUpdate || bannerBusy}
                  className="h-9"
                />
                {canUpdate ? (
                  <>
                    <Button variant="outline" size="sm" disabled={bannerBusy} onClick={() => void handleSaveBannerLink()}>
                      Save link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={bannerBusy || !bannerLink}
                      onClick={() => {
                        setBannerBusy(true);
                        listingConfigService
                          .updateFormBanner({ link: null })
                          .then(() => setBannerLink(''))
                          .catch((err) => {
                            console.error('Banner link clear failed', err);
                            alert(listingConfigApiError(err, 'Failed to clear banner link.'));
                          })
                          .finally(() => setBannerBusy(false));
                      }}
                    >
                      Clear link
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void handlePickBanner(e.target.files?.[0])}
            />
            {canUpdate ? (
              <Button variant="outline" disabled={bannerBusy} onClick={() => bannerInputRef.current?.click()}>
                {bannerBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImageIcon className="w-4 h-4 mr-2" />}
                Add Banner
              </Button>
            ) : null}
            {canUpdate && bannerUrl ? (
              <Button variant="outline" disabled={bannerBusy} onClick={() => void handleClearBanner()} className="text-red-600 hover:text-red-700">
                Remove
              </Button>
            ) : null}
          </div>
        </div>

        <AdminDataTable
          page={1}
          limit={Math.max(sortedModules.length, 1)}
          total={sortedModules.length}
          totalPages={1}
          onPageChange={() => undefined}
          onPageSizeChange={() => undefined}
          loading={isLoading}
          isEmpty={!sortedModules.length}
          emptyMessage="No sections found."
          syncKey={sortedModules.length}
        >
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-700">Display Name</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Sort order</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Admin Name</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Common</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
              </tr>
            </thead>
            {sortedModules.length ? (
              <SortableTableBody
                items={sortedModules}
                disabled={!canUpdate}
                onReorder={handleReorder}
                renderRow={(item, { dragHandle }) => {
                  const bannerModule = isBannerFormModule(item);
                  return (
                    <>
                      <td className="px-6 py-4 font-medium text-gray-900">{item.label}</td>
                      <td className="px-6 py-4">{dragHandle}</td>
                      <td className="px-6 py-4 text-gray-500">{item.admin_name || '—'}</td>
                      <td className="px-6 py-4">
                        {bannerModule ? <Badge variant="secondary" className="bg-amber-50 text-amber-700">Banner</Badge> : item.is_common ? <Badge variant="secondary" className="bg-blue-50 text-blue-700">Common</Badge> : <Badge variant="outline" className="text-gray-500">Specific</Badge>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {bannerModule ? null : (
                            <Button variant="ghost" size="sm" onClick={() => router.push(`/listings/form-modules/${item.id}/fields`)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="Manage Fields">
                              <Layers className="w-4 h-4 mr-1" /> Manage Fields
                            </Button>
                          )}
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
                    </>
                  );
                }}
              />
            ) : (
              <tbody />
            )}
          </table>
        </AdminDataTable>

        {/* Create/Edit Module Modal */}
        <Dialog open={isModalOpen} onOpenChange={(next) => void handleModalOpenChange(next)}>
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
              {isBannerFormModule(editingItem) ? null : (
                <>
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
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => void handleModalOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSubmitting || !formData.label || (!isBannerFormModule(editingItem) && !formData.key)}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {unsavedDialog}

        <DeleteRemarkDialog
          open={isDeleteModalOpen}
          onOpenChange={setIsDeleteModalOpen}
          title={editingItem?.label ? `Delete ${editingItem.label}?` : 'Delete section?'}
          itemName={editingItem?.label}
          submitting={isSubmitting}
          onConfirm={handleDelete}
        />
      </div>
    </PermissionGuard>
  );
}
