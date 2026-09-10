'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlanFormDialog } from '@/modules/subscriptions/plan-form-dialog';
import {
  formatInrFromPaise,
  subscriptionApiError,
  subscriptionsService,
  type SubscriptionPlanItem,
  type UpdatePlanPayload,
} from '@/services/subscriptions.service';
import { Check, CreditCard, Edit2, Loader2, RefreshCw, X } from 'lucide-react';

function LimitRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-2.5 last:border-0">
      <div className="min-w-0">
        <p className="text-sm text-gray-700">{label}</p>
        {hint ? <p className="text-xs text-gray-400">{hint}</p> : null}
      </div>
      <p className="shrink-0 text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function FeatureChip({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
        enabled
          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
          : 'bg-gray-50 text-gray-400 ring-1 ring-gray-100'
      }`}
    >
      {enabled ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      {label}
    </span>
  );
}

function PlanCard({
  plan,
  canUpdate,
  onEdit,
}: {
  plan: SubscriptionPlanItem;
  canUpdate: boolean;
  onEdit: () => void;
}) {
  const limits = plan.limits;
  const viewsUnlimited =
    limits?.listingViewsDaily == null && limits?.listingViewsMonthly == null;

  return (
    <div className="flex h-full flex-col rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{plan.displayName}</h2>
          <p className="mt-0.5 font-mono text-xs text-gray-400">{plan.code}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {plan.code !== 'FREE_LIFETIME' ? (
            <>
              <Badge variant={plan.isActive ? 'default' : 'outline'}>
                {plan.isActive ? 'Active' : 'Inactive'}
              </Badge>
              <Badge variant={plan.showOnApp ? 'secondary' : 'outline'}>
                {plan.showOnApp ? 'Show on app' : 'Hidden on app'}
              </Badge>
            </>
          ) : null}
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Yearly subscription (exclusive of GST)
        </p>
        <p className="mt-1 text-2xl font-bold text-gray-900">
          {formatInrFromPaise(plan.pricePaise)}
        </p>
        {plan.pricePaise != null && plan.pricePaise > 0 ? (
          <p className="mt-1 text-sm text-gray-600">
            Total with GST 18%:{" "}
            {formatInrFromPaise(
              plan.pricePaise + Math.round((plan.pricePaise * 18) / 100),
            )}
          </p>
        ) : null}
        {plan.promoPricePaise != null ? (
          <p className="mt-1 text-sm text-emerald-700">
            Intro offer: {formatInrFromPaise(plan.promoPricePaise)}
            {plan.promoWindowDays != null ? ` for first ${plan.promoWindowDays} days` : ''}
            {" · "}
            with GST{" "}
            {formatInrFromPaise(
              plan.promoPricePaise +
                Math.round((plan.promoPricePaise * 18) / 100),
            )}
          </p>
        ) : null}
        {plan.trialDays != null ? (
          <p className="mt-1 text-sm text-gray-600">Trial: {plan.trialDays} days</p>
        ) : null}
      </div>

      <div className="mt-4 flex-1">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Usage limits
        </p>
        {limits ? (
          <div>
            <LimitRow
              label="Resale / Rent contact reveals"
              hint="How many owner numbers a user can unlock"
              value={`${limits.listingContactsDaily} per day · ${limits.listingContactsMonthly} per month`}
            />
            <LimitRow
              label="Active Resale / Rent posts"
              hint="Max live listings at once"
              value={String(limits.activeResaleRentPosts)}
            />
            <LimitRow
              label="Buy requirement contact reveals"
              value={`${limits.buyReqContactsDaily} per day · ${limits.buyReqContactsMonthly} per month`}
            />
            <LimitRow
              label="Active buy requirement posts"
              value={String(limits.activeBuyReqPosts)}
            />
            <LimitRow
              label="Listing views"
              value={
                viewsUnlimited
                  ? 'Unlimited'
                  : `${limits.listingViewsDaily ?? 0} per day · ${limits.listingViewsMonthly ?? 0} per month`
              }
            />
          </div>
        ) : (
          <p className="text-sm text-gray-500">No limits configured.</p>
        )}
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Features
        </p>
        <div className="flex flex-wrap gap-2">
          <FeatureChip enabled={plan.flags.addonsEnabled} label="Add-ons & top-ups" />
          <FeatureChip enabled={plan.flags.listingBoostEnabled} label="Listing boost" />
          <FeatureChip enabled={plan.flags.listingPriorityEnabled} label="Listing priority" />
          <FeatureChip
            enabled={plan.flags.builderContactsEnabled}
            label="Builder contact packs"
          />
        </div>
      </div>

      <div className="mt-5 border-t pt-4">
        {canUpdate ? (
          <Button variant="outline" className="w-full gap-2" onClick={onEdit}>
            <Edit2 className="h-4 w-4" />
            Edit plan
          </Button>
        ) : (
          <p className="text-center text-xs text-gray-400">No edit access</p>
        )}
      </div>
    </div>
  );
}

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
  const [resyncing, setResyncing] = useState(false);

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

  const handleResyncRazorpay = async () => {
    if (!canUpdate || resyncing) return;
    setResyncing(true);
    setError('');
    try {
      setPlans(await subscriptionsService.resyncYearlyRazorpayPlans());
    } catch (err) {
      setError(
        subscriptionApiError(
          err,
          'Failed to resync Razorpay yearly plans (needed so autopay includes GST).',
        ),
      );
    } finally {
      setResyncing(false);
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

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
              <CreditCard className="h-6 w-6 text-primary" />
              Subscription Plans
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-gray-500">
              Manage what each partner plan includes — pricing in rupees (exclusive of GST),
              contact reveal limits, active post caps, and optional features. After deploy or
              price changes, resync Razorpay yearly plans so renewals include GST.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canUpdate ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleResyncRazorpay()}
                disabled={loading || resyncing}
              >
                {resyncing ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 size-3.5" />
                )}
                Resync Razorpay (GST)
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void fetchPlans()}
              disabled={loading}
            >
              <RefreshCw className="mr-1.5 size-3.5" />
              Refresh
            </Button>
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
          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                canUpdate={canUpdate}
                onEdit={() => openEdit(plan)}
              />
            ))}
            {!plans.length ? (
              <div className="col-span-full rounded-xl border bg-white px-4 py-10 text-center text-gray-500">
                No plans found. Start the backend so seeds can create default plans.
              </div>
            ) : null}
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
