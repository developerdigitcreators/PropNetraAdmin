'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { DbfModeCard } from '@/modules/subscriptions/dbf-mode-card';
import {
  billingPeriodLabel,
  billingPeriodUnit,
  formatInrFromPaise,
  type SubscriptionPlanItem,
} from '@/services/subscriptions.service';
import { Check, Edit2, Loader2, X } from 'lucide-react';
import { useViewerSwitches, viewerQuotaLabel } from '@/modules/subscriptions/use-viewer-switches';

const PERIOD_ORDER = ['monthly', 'quarterly', 'half_yearly', 'yearly'];

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
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

function Chip({ enabled, label }: { enabled: boolean; label: string }) {
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

function withGst(paise: number) {
  return paise + Math.round((paise * 18) / 100);
}

function DeveloperPlanCard({
  plan,
  canUpdate,
  showViewerContacts,
  activeBusy,
  onToggleActive,
  onEdit,
}: {
  plan: SubscriptionPlanItem;
  canUpdate: boolean;
  showViewerContacts: boolean;
  activeBusy: boolean;
  onToggleActive: (next: boolean) => void;
  onEdit: () => void;
}) {
  const limits = plan.limits;
  const isFree = plan.code === 'DEVELOPER_FREE';
  const unit = billingPeriodUnit(plan.billingPeriod);

  return (
    <div className="flex h-full flex-col rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {isFree ? 'Free' : billingPeriodLabel(plan.billingPeriod)}
          </h2>
          <p className="mt-0.5 font-mono text-xs text-gray-400">
            {plan.displayName} Â· {plan.code}
          </p>
        </div>
        {!isFree ? (
          <div className="flex flex-col items-end gap-1">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
              <span>{plan.isActive ? 'Active' : 'Inactive'}</span>
              <Switch
                checked={plan.isActive}
                disabled={!canUpdate || activeBusy}
                onCheckedChange={(next) => onToggleActive(Boolean(next))}
              />
            </label>
            <Badge variant={plan.showOnApp ? 'secondary' : 'outline'}>
              {plan.showOnApp ? 'Show on app' : 'Hidden on app'}
            </Badge>
          </div>
        ) : null}
      </div>

      {!isFree ? (
        <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Per {unit} (exclusive of GST) Â· autopay
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {formatInrFromPaise(plan.pricePaise)}
          </p>
          {plan.pricePaise ? (
            <p className="mt-1 text-sm text-gray-600">
              With GST 18%: {formatInrFromPaise(withGst(plan.pricePaise))}
            </p>
          ) : null}
          {plan.promoPricePaise != null ? (
            <p className="mt-1 text-sm text-emerald-700">
              Intro: {formatInrFromPaise(plan.promoPricePaise)}
              {plan.promoWindowDays != null ? ` for first ${plan.promoWindowDays} days` : ''}
            </p>
          ) : null}
          <p className="mt-1 text-sm text-gray-500">
            Dummy price:{' '}
            {plan.dummyPricePaise != null ? (
              <span className="line-through">{formatInrFromPaise(plan.dummyPricePaise)}</span>
            ) : (
              'â€”'
            )}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-gray-500">
          Applies before Paid mode and during the free period.
        </p>
      )}

      <div className="mt-4 flex-1">
        {limits ? (
          <div>
            <Row
              label="Project posts"
              hint="Max live projects. Empty on edit means no cap."
              value={limits.activeDeveloperPosts == null ? 'No cap' : String(limits.activeDeveloperPosts)}
            />
            {showViewerContacts ? (
              <Row
                label="Listing viewer contacts"
                hint="Agent numbers revealed from recent viewers"
                value={viewerQuotaLabel(limits.viewerRevealDaily, limits.viewerRevealMonthly)}
              />
            ) : null}
            <Row label="Cities included" value={String(limits.includedCities)} />
          </div>
        ) : (
          <p className="text-sm text-gray-500">No limits configured.</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Chip enabled={Boolean(limits?.developerGroupChatEnabled)} label="Group messages" />
        <Chip enabled={Boolean(limits?.launchReelsEnabled)} label="Launch Reels" />
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

export function DeveloperPlansTab({
  plans,
  loading,
  canUpdate,
  activeBusyCode,
  onToggleActive,
  onEdit,
}: {
  plans: SubscriptionPlanItem[];
  loading: boolean;
  canUpdate: boolean;
  activeBusyCode: string | null;
  onToggleActive: (plan: SubscriptionPlanItem, next: boolean) => void;
  onEdit: (plan: SubscriptionPlanItem) => void;
}) {
  const free = plans.filter((p) => p.code === 'DEVELOPER_FREE');
  const paid = plans
    .filter((p) => p.code !== 'DEVELOPER_FREE')
    .sort(
      (a, b) =>
        PERIOD_ORDER.indexOf(String(a.billingPeriod || 'yearly')) -
        PERIOD_ORDER.indexOf(String(b.billingPeriod || 'yearly')),
    );
  const ordered = [...free, ...paid];
  const viewerSwitches = useViewerSwitches();

  return (
    <div className="space-y-5">
      <DbfModeCard canUpdate={canUpdate} track="developer" />
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {ordered.map((plan) => (
            <DeveloperPlanCard
              key={plan.id}
              plan={plan}
              canUpdate={canUpdate}
              showViewerContacts={viewerSwitches.developer}
              activeBusy={activeBusyCode === plan.code}
              onToggleActive={(next) => onToggleActive(plan, next)}
              onEdit={() => onEdit(plan)}
            />
          ))}
          {!ordered.length ? (
            <div className="col-span-full rounded-xl border bg-white px-4 py-10 text-center text-gray-500">
              No Developer plans found. Restart the backend so seeds create them.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
