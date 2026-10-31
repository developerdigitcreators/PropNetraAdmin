'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { AdminDataTable } from '@/components/common/admin-data-table';
import { AdminListToolbar } from '@/components/common/admin-list-toolbar';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { AddonFormDialog } from '@/modules/subscriptions/addon-form-dialog';
import {
  subscriptionApiError,
  subscriptionsService,
  type AddonCatalogItem,
  type UpdateAddonPayload,
} from '@/services/subscriptions.service';
import { useClientPagedRows } from '@/hooks/use-client-paged-rows';
import { useViewerSwitches, viewerAddonVisible } from '@/modules/subscriptions/use-viewer-switches';
import { Package, Edit2 } from 'lucide-react';

const AUTOMATIC_ADDON_TYPES = new Set(['LISTING_PRIORITY']);

function isAutomaticAddon(type: string) {
  return AUTOMATIC_ADDON_TYPES.has(type);
}

export default function SubscriptionAddonsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canUpdate = hasPermission('subscriptions', 'update');

  const [addons, setAddons] = useState<AddonCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<AddonCatalogItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [activeBusyType, setActiveBusyType] = useState<string | null>(null);
  const viewerSwitches = useViewerSwitches();
  const visibleAddons = addons.filter((a) => viewerAddonVisible(a.type, viewerSwitches));

  const {
    page,
    limit,
    total,
    totalPages,
    pageRows,
    onPageChange,
    onPageSizeChange,
  } = useClientPagedRows(visibleAddons);

  const fetchAddons = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setAddons(await subscriptionsService.listAddons());
    } catch (err) {
      setAddons([]);
      setError(subscriptionApiError(err, 'Failed to load add-ons.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAddons();
  }, [fetchAddons]);

  const handleToggleEnabled = async (addon: AddonCatalogItem, next: boolean) => {
    if (!canUpdate || activeBusyType || isAutomaticAddon(addon.type)) return;
    setActiveBusyType(addon.type);
    setError('');
    setAddons((prev) => prev.map((a) => (a.type === addon.type ? { ...a, enabled: next } : a)));
    setEditing((current) =>
      current?.type === addon.type ? { ...current, enabled: next } : current,
    );
    try {
      const updated = await subscriptionsService.updateAddon(addon.type, { enabled: next });
      if (updated) {
        setAddons((prev) => prev.map((a) => (a.type === updated.type ? updated : a)));
        setEditing((current) => (current?.type === updated.type ? updated : current));
      }
    } catch (err) {
      setAddons((prev) =>
        prev.map((a) => (a.type === addon.type ? { ...a, enabled: addon.enabled } : a)),
      );
      setEditing((current) =>
        current?.type === addon.type ? { ...current, enabled: addon.enabled } : current,
      );
      setError(subscriptionApiError(err, 'Failed to update add-on status.'));
    } finally {
      setActiveBusyType(null);
    }
  };

  const openEdit = (addon: AddonCatalogItem) => {
    setEditing(addon);
    setFormError('');
    setFormOpen(true);
  };

  const handleSave = async (payload: UpdateAddonPayload) => {
    if (!editing) return;
    setSaving(true);
    setFormError('');
    try {
      await subscriptionsService.updateAddon(editing.type, payload);
      setFormOpen(false);
      setEditing(null);
      await fetchAddons();
    } catch (err) {
      setFormError(subscriptionApiError(err, 'Failed to save add-on.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PermissionGuard permission="subscriptions:read">
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/' },
            { label: 'Subscription Add-ons' },
          ]}
        />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
              <Package className="h-6 w-6 text-primary" />
              Subscription Add-ons
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Configure NetraCoin packs and boost pricing. Listing priority is automatic for top
              paid referrers (not a purchasable add-on).
            </p>
          </div>
          <AdminListToolbar
            onRefresh={() => void fetchAddons()}
            refreshDisabled={loading}
          />
        </div>

        <AdminDataTable
          page={page}
          limit={limit}
          total={total}
          totalPages={totalPages}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          loading={loading}
          error={error || null}
          isEmpty={!pageRows.length}
          emptyMessage="No add-ons found."
          syncKey={pageRows.length}
        >
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Coins</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((addon) => (
                <tr key={addon.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{addon.type}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{addon.displayName}</div>
                    {addon.description ? (
                      <div className="mt-0.5 text-xs text-gray-500">{addon.description}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {isAutomaticAddon(addon.type) ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      addon.coinCost
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isAutomaticAddon(addon.type) ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      addon.quantity
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isAutomaticAddon(addon.type) ? (
                      <span className="text-xs text-gray-400">Automatic</span>
                    ) : (
                      <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                        <span>{addon.enabled ? 'Active' : 'Inactive'}</span>
                        <Switch
                          checked={addon.enabled}
                          disabled={!canUpdate || activeBusyType === addon.type}
                          onCheckedChange={(next) => void handleToggleEnabled(addon, Boolean(next))}
                        />
                      </label>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canUpdate ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => openEdit(addon)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    ) : (
                      <span className="text-xs text-gray-400">No edit access</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminDataTable>

        <AddonFormDialog
          open={formOpen}
          addon={editing}
          submitting={saving}
          error={formError}
          onOpenChange={setFormOpen}
          onSubmit={handleSave}
        />
      </div>
    </PermissionGuard>
  );
}
