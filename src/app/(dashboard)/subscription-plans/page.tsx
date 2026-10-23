'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlanFormDialog } from '@/modules/subscriptions/plan-form-dialog';
import { PlanPopupBannerDialog } from '@/modules/subscriptions/plan-popup-banner-dialog';
import { DbfModeCard } from '@/modules/subscriptions/dbf-mode-card';
import { DeveloperPlansTab } from '@/modules/subscriptions/developer-plans-tab';
import { useViewerSwitches, viewerQuotaLabel } from '@/modules/subscriptions/use-viewer-switches';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  formatInrFromPaise,
  subscriptionApiError,
  subscriptionsService,
  type SubscriptionPlanItem,
  type UpdatePlanPayload,
} from '@/services/subscriptions.service';
import { Check, CreditCard, Edit2, Image as ImageIcon, Loader2, RefreshCw, X } from 'lucide-react';

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

function DummyPriceLine({ paise }: { paise: number | null }) {
  return (
    <p className="mt-1 text-sm text-gray-500">
      Dummy price:{' '}
      {paise != null ? <span className="line-through">{formatInrFromPaise(paise)}</span> : '—'}
    </p>
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
        <DummyPriceLine paise={plan.dummyPricePaise} />
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
            <LimitRow
              label="Developer projects"
              hint="Page views · Compare · Share · Brochure · Contact (per day / per month)"
              value={[
                [limits.devViewDaily, limits.devViewMonthly],
                [limits.devCompareDaily, limits.devCompareMonthly],
                [limits.devShareDaily, limits.devShareMonthly],
                [limits.devBrochureDaily, limits.devBrochureMonthly],
                [limits.devContactDaily, limits.devContactMonthly],
              ]
                .map(([d, m]) => `${d ?? '∞'}/${m ?? '∞'}`)
                .join(' · ')}
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

function DbfPlanCard({
  plan,
  canUpdate,
  showViewerContacts,
  onEdit,
}: {
  plan: SubscriptionPlanItem;
  canUpdate: boolean;
  showViewerContacts: boolean;
  onEdit: () => void;
}) {
  const limits = plan.limits;
  const isFree = plan.code === 'DBF_FREE';
  const viewsUnlimited =
    limits?.listingViewsDaily == null && limits?.listingViewsMonthly == null;

  return (
    <div className="flex h-full flex-col rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {isFree ? 'Post Free Limit' : 'Post Plan Limit'}
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {isFree ? 'Applies before Paid mode (and during the free period)' : 'Applies in Paid mode'}
          </p>
          <p className="mt-0.5 font-mono text-xs text-gray-400">
            {plan.displayName} · {plan.code}
          </p>
        </div>
        {!isFree ? (
          <div className="flex flex-col items-end gap-1">
            <Badge variant={plan.isActive ? 'default' : 'outline'}>
              {plan.isActive ? 'Active' : 'Inactive'}
            </Badge>
            <Badge variant={plan.showOnApp ? 'secondary' : 'outline'}>
              {plan.showOnApp ? 'Show on app' : 'Hidden on app'}
            </Badge>
          </div>
        ) : null}
      </div>

      {!isFree ? (
        <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Yearly subscription (exclusive of GST) · autopay
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {formatInrFromPaise(plan.pricePaise)}
          </p>
          {plan.pricePaise != null && plan.pricePaise > 0 ? (
            <p className="mt-1 text-sm text-gray-600">
              Total with GST 18%:{' '}
              {formatInrFromPaise(plan.pricePaise + Math.round((plan.pricePaise * 18) / 100))}
            </p>
          ) : null}
          {plan.promoPricePaise != null ? (
            <p className="mt-1 text-sm text-emerald-700">
              Intro offer: {formatInrFromPaise(plan.promoPricePaise)}
              {plan.promoWindowDays != null ? ` for first ${plan.promoWindowDays} days` : ''}
              {' · '}with GST{' '}
              {formatInrFromPaise(
                plan.promoPricePaise + Math.round((plan.promoPricePaise * 18) / 100),
              )}
            </p>
          ) : null}
          <DummyPriceLine paise={plan.dummyPricePaise} />
        </div>
      ) : null}

      <div className="mt-4 flex-1">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Post limits
        </p>
        {limits ? (
          <div>
            <LimitRow
              label="Direct Builder Floor posts"
              hint="New posts a user can publish"
              value={`${limits.dbfPostsDaily} per day · ${limits.dbfPostsMonthly} per month`}
            />
            <LimitRow
              label="Active posts"
              hint="Max live listings at once"
              value={limits.activeDbfPosts == null ? 'No cap' : String(limits.activeDbfPosts)}
            />
            <LimitRow
              label="Listing views"
              value={
                viewsUnlimited
                  ? 'Unlimited'
                  : `${limits.listingViewsDaily ?? 0} per day · ${limits.listingViewsMonthly ?? 0} per month`
              }
            />
            {showViewerContacts ? (
              <LimitRow
                label="Listing viewer contacts"
                hint="Agent numbers revealed from recent viewers"
                value={viewerQuotaLabel(limits.viewerRevealDaily, limits.viewerRevealMonthly)}
              />
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No limits configured.</p>
        )}
      </div>

      <div className="mt-5 border-t pt-4">
        {canUpdate ? (
          <Button variant="outline" className="w-full gap-2" onClick={onEdit}>
            <Edit2 className="h-4 w-4" />
            Edit limits
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
  const canReadPlans = hasPermission('subscriptions', 'read') || canUpdate;

  const [plans, setPlans] = useState<SubscriptionPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<SubscriptionPlanItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [resyncing, setResyncing] = useState(false);
  const [tab, setTab] = useState<'agent' | 'dbf' | 'developer'>('agent');
  const [cityAddonDirty, setCityAddonDirty] = useState(false);
  const { dialog: unsavedDialog, confirmLeave } = useUnsavedChangesGuard({ dirty: cityAddonDirty });
  const viewerSwitches = useViewerSwitches();
  const agentPlans = plans.filter((p) => p.audience === 'agent');
  const dbfPlans = plans.filter((p) => p.audience === 'dbf');
  const developerPlans = plans.filter((p) => p.audience === 'developer');

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
      const updated = await subscriptionsService.updatePlan(editing.code, payload);
      if (updated) {
        setPlans((prev) => prev.map((p) => (p.code === updated.code ? updated : p)));
      }
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
            {canReadPlans ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBannerOpen(true)}
              >
                <ImageIcon className="mr-1.5 size-3.5" />
                + Add banner
              </Button>
            ) : null}
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

        <Tabs
          value={tab}
          onValueChange={async (v) => {
            const next = v === 'dbf' || v === 'developer' ? v : 'agent';
            if (next === tab || !(await confirmLeave())) return;
            setCityAddonDirty(false);
            setTab(next);
          }}
        >
          <TabsList>
            <TabsTrigger value="agent">Agent subscription</TabsTrigger>
            <TabsTrigger value="dbf">Direct Builder Floor</TabsTrigger>
            <TabsTrigger value="developer">Developer</TabsTrigger>
          </TabsList>

          <TabsContent value="agent" className="pt-4">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                {agentPlans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    canUpdate={canUpdate}
                    onEdit={() => openEdit(plan)}
                  />
                ))}
                {!agentPlans.length ? (
                  <div className="col-span-full rounded-xl border bg-white px-4 py-10 text-center text-gray-500">
                    No plans found. Start the backend so seeds can create default plans.
                  </div>
                ) : null}
              </div>
            )}
          </TabsContent>

          <TabsContent value="dbf" className="space-y-5 pt-4">
            <DbfModeCard canUpdate={canUpdate} />
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                {dbfPlans.map((plan) => (
                  <DbfPlanCard
                    key={plan.id}
                    plan={plan}
                    canUpdate={canUpdate}
                    showViewerContacts={viewerSwitches.dbf}
                    onEdit={() => openEdit(plan)}
                  />
                ))}
                {!dbfPlans.length ? (
                  <div className="col-span-full rounded-xl border bg-white px-4 py-10 text-center text-gray-500">
                    No Direct Builder Floor plans found. Restart the backend so seeds create
                    DBF_FREE and DBF_PAID.
                  </div>
                ) : null}
              </div>
            )}
          </TabsContent>

          <TabsContent value="developer" className="pt-4">
            <DeveloperPlansTab
              plans={developerPlans}
              loading={loading}
              canUpdate={canUpdate}
              onEdit={openEdit}
              onDirtyChange={setCityAddonDirty}
            />
          </TabsContent>
        </Tabs>

        <PlanFormDialog
          open={formOpen}
          plan={editing}
          submitting={saving}
          error={formError}
          onOpenChange={setFormOpen}
          onSubmit={handleSave}
        />
        <PlanPopupBannerDialog
          open={bannerOpen}
          onOpenChange={setBannerOpen}
          canUpdate={canUpdate}
        />
      </div>
      {unsavedDialog}
    </PermissionGuard>
  );
}
