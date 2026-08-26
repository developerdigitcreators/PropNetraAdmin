'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AddonFormDialog } from '@/modules/subscriptions/addon-form-dialog';
import {
  subscriptionApiError,
  subscriptionsService,
  type AddonCatalogItem,
  type UpdateAddonPayload,
} from '@/services/subscriptions.service';
import { Package, Edit2, Loader2 } from 'lucide-react';

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

        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
            <Package className="h-6 w-6 text-primary" />
            Subscription Add-ons
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure NetraCoin packs and boost pricing. Keep Builder / Priority disabled until ready.
          </p>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
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
                {addons.map((addon) => (
                  <tr key={addon.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{addon.type}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{addon.displayName}</div>
                      {addon.description ? (
                        <div className="mt-0.5 text-xs text-gray-500">{addon.description}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{addon.coinCost}</td>
                    <td className="px-4 py-3">{addon.quantity}</td>
                    <td className="px-4 py-3">
                      <Badge variant={addon.enabled ? 'default' : 'outline'}>
                        {addon.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
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
                {!addons.length ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                      No add-ons found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}

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
