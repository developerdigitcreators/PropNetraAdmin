'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlanFormDialog } from '@/modules/subscriptions/plan-form-dialog';
import {
  subscriptionApiError,
  subscriptionsService,
  type SubscriptionPlanItem,
  type UpdatePlanPayload,
} from '@/services/subscriptions.service';
import { CreditCard, Edit2, Loader2 } from 'lucide-react';

export default function SubscriptionPlansPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canUpdate = hasPermission('subscriptions', 'update');

  const [plans, setPlans] = useState<SubscriptionPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<SubscriptionPlanItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setPlans(await subscriptionsService.listPlans());
    } catch (err) {
      setPlans([]);
      setError(subscriptionApiError(err, 'Failed to load subscription plans.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const openEdit = (plan: SubscriptionPlanItem) => {
    setEditing(plan);
    setFormError('');
    setFormOpen(true);
  };

  const handleSave = async (payload: UpdatePlanPayload) => {
    if (!editing) return;
    setSaving(true);
    setFormError('');
    try {
      await subscriptionsService.updatePlan(editing.code, payload);
      setFormOpen(false);
      setEditing(null);
      await fetchPlans();
    } catch (err) {
      setFormError(subscriptionApiError(err, 'Failed to save plan.'));
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
            { label: 'Subscription Plans' },
          ]}
        />

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
              <CreditCard className="h-6 w-6 text-primary" />
              Subscription Plans
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Edit entitlements and feature flags for Free Trial, Lifetime, Network, Pro, and Elite.
            </p>
          </div>
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
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Contacts D/M</th>
                  <th className="px-4 py-3">Active posts</th>
                  <th className="px-4 py-3">Views</th>
                  <th className="px-4 py-3">Flags</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{plan.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{plan.displayName}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {plan.limits
                        ? `${plan.limits.listingContactsDaily} / ${plan.limits.listingContactsMonthly}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {plan.limits
                        ? `R+R ${plan.limits.activeResaleRentPosts} · BR ${plan.limits.activeBuyReqPosts}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {plan.limits?.listingViewsDaily == null &&
                      plan.limits?.listingViewsMonthly == null
                        ? 'Unlimited'
                        : `${plan.limits?.listingViewsDaily ?? 0} / ${plan.limits?.listingViewsMonthly ?? 0}`}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {plan.flags.addonsEnabled ? (
                          <Badge variant="secondary">Add-ons</Badge>
                        ) : null}
                        {plan.flags.listingBoostEnabled ? (
                          <Badge variant="secondary">Boost</Badge>
                        ) : null}
                        {plan.flags.listingPriorityEnabled ? (
                          <Badge variant="secondary">Priority</Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={plan.isActive ? 'default' : 'outline'}>
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canUpdate ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(plan)}
                          className="gap-1"
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
                {!plans.length ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                      No plans found. Start the backend so seeds can create default plans.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}

        <PlanFormDialog
          open={formOpen}
          plan={editing}
          submitting={saving}
          error={formError}
          onOpenChange={setFormOpen}
          onSubmit={handleSave}
        />
      </div>
    </PermissionGuard>
  );
}
