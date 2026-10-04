'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DbfModeCard } from '@/modules/subscriptions/dbf-mode-card';
import {
  billingPeriodLabel,
  billingPeriodUnit,
  formatInrFromPaise,
  paiseToRupeesInput,
  rupeesInputToPaise,
  subscriptionApiError,
  subscriptionsService,
  type CityAddonPricing,
  type SubscriptionPlanItem,
} from '@/services/subscriptions.service';
import { Check, Edit2, Loader2, MapPin, X } from 'lucide-react';
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
  onEdit,
}: {
  plan: SubscriptionPlanItem;
  canUpdate: boolean;
  showViewerContacts: boolean;
  onEdit: () => void;
}) {
  const limits = plan.limits;
  const isFree = plan.code === 'DEVELOPER_FREE';
  const unit = billingPeriodUnit(plan.billingPeriod);
  const quota = (d: number | null | undefined, m: number | null | undefined) =>
    `${d ?? '∞'}/${m ?? '∞'}`;

  return (
    <div className="flex h-full flex-col rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {isFree ? 'Free' : billingPeriodLabel(plan.billingPeriod)}
          </h2>
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
            Per {unit} (exclusive of GST) · autopay
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
              value={`${limits.developerPostsDaily}/day · ${limits.developerPostsMonthly}/month`}
            />
            <Row
              label="Active posts"
              value={limits.activeDeveloperPosts == null ? 'No cap' : String(limits.activeDeveloperPosts)}
            />
            <Row
              label="Compare · Share · Brochure · Contact"
              hint="per day / per month"
              value={[
                quota(limits.devCompareDaily, limits.devCompareMonthly),
                quota(limits.devShareDaily, limits.devShareMonthly),
                quota(limits.devBrochureDaily, limits.devBrochureMonthly),
                quota(limits.devContactDaily, limits.devContactMonthly),
              ].join(' · ')}
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

function CityAddonPricingCard({ canUpdate }: { canUpdate: boolean }) {
  const PERIODS = [
    { key: 'monthly' as const, label: 'Monthly' },
    { key: 'quarterly' as const, label: 'Quarterly' },
    { key: 'half_yearly' as const, label: 'Half-yearly' },
    { key: 'yearly' as const, label: 'Yearly' },
  ];
  const [pricing, setPricing] = useState<CityAddonPricing | null>(null);
  const [defaults, setDefaults] = useState<Record<string, string>>({});
  const [cityDraft, setCityDraft] = useState<Record<string, Record<string, string>>>({});
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    subscriptionsService
      .getCityAddonPricing()
      .then((p) => {
        setPricing(p);
        setDefaults({
          monthly: paiseToRupeesInput(p.defaults.monthly),
          quarterly: paiseToRupeesInput(p.defaults.quarterly),
          half_yearly: paiseToRupeesInput(p.defaults.half_yearly),
          yearly: paiseToRupeesInput(p.defaults.yearly),
        });
      })
      .catch((err) => setError(subscriptionApiError(err, 'Failed to load city add-on pricing.')));
  }, []);

  const save = async () => {
    const nextDefaults = {
      monthly: rupeesInputToPaise(defaults.monthly || '') || 0,
      quarterly: rupeesInputToPaise(defaults.quarterly || '') || 0,
      half_yearly: rupeesInputToPaise(defaults.half_yearly || '') || 0,
      yearly: rupeesInputToPaise(defaults.yearly || '') || 0,
    };
    if (Object.values(nextDefaults).some((n) => n < 100)) {
      setError('Enter GST-exclusive default prices for all four durations (₹).');
      return;
    }
    const cities = Object.entries(cityDraft)
      .map(([cityId, prices]) => ({
        cityId,
        monthly: rupeesInputToPaise(prices.monthly || '') || undefined,
        quarterly: rupeesInputToPaise(prices.quarterly || '') || undefined,
        half_yearly: rupeesInputToPaise(prices.half_yearly || '') || undefined,
        yearly: rupeesInputToPaise(prices.yearly || '') || undefined,
      }))
      .filter((c) => c.monthly || c.quarterly || c.half_yearly || c.yearly);
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const next = await subscriptionsService.setCityAddonPricing({
        defaults: nextDefaults,
        cities,
      });
      setPricing(next);
      setCityDraft({});
      setSaved(true);
    } catch (err) {
      setError(subscriptionApiError(err, 'Failed to save city add-on pricing.'));
    } finally {
      setSaving(false);
    }
  };

  const catalog = (pricing?.citiesCatalog || []).filter((c) => {
    const hay = `${c.cityName} ${c.stateName}`.toLowerCase();
    return !q.trim() || hay.includes(q.trim().toLowerCase());
  });

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
        <MapPin className="h-5 w-5 text-primary" />
        City add-ons
      </h2>
      <p className="mt-1 max-w-3xl text-sm text-gray-500">
        One add-on card in the app. Price is GST-exclusive per city × duration (Monthly / Quarterly /
        Half-yearly / Yearly). Checkout adds GST and shows the breakup. Once a city is bought,
        autopay is on and that city cannot be purchased again.
      </p>
      {!pricing && !error ? (
        <Loader2 className="mt-4 h-5 w-5 animate-spin text-primary" />
      ) : (
        <>
          <p className="mt-4 text-sm font-medium text-gray-800">Default prices (₹, before GST)</p>
          <div className="mt-2 grid max-w-3xl gap-3 sm:grid-cols-4">
            {PERIODS.map((p) => (
              <div key={p.key} className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">{p.label}</label>
                <Input
                  type="number"
                  min={1}
                  value={defaults[p.key] || ''}
                  disabled={!canUpdate}
                  onChange={(e) => setDefaults((prev) => ({ ...prev, [p.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div className="mt-5">
            <p className="text-sm font-medium text-gray-800">Per-city override (optional)</p>
            <Input
              className="mt-2 max-w-sm"
              placeholder="Search city or state"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="mt-3 max-h-80 overflow-auto rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-gray-50 text-xs text-gray-600">
                  <tr>
                    <th className="px-3 py-2">City</th>
                    {PERIODS.map((p) => (
                      <th key={p.key} className="px-3 py-2">
                        {p.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {catalog.slice(0, 80).map((city) => {
                    const draft = cityDraft[city.cityId];
                    return (
                      <tr key={city.cityId} className="border-t border-gray-100">
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-900">{city.cityName}</div>
                          <div className="text-xs text-gray-500">{city.stateName}</div>
                        </td>
                        {PERIODS.map((p) => (
                          <td key={p.key} className="px-2 py-1.5">
                            <Input
                              type="number"
                              min={1}
                              className="h-8"
                              disabled={!canUpdate}
                              value={
                                draft?.[p.key] ??
                                paiseToRupeesInput(city.prices[p.key])
                              }
                              onChange={(e) =>
                                setCityDraft((prev) => ({
                                  ...prev,
                                  [city.cityId]: {
                                    ...(prev[city.cityId] || {}),
                                    [p.key]: e.target.value,
                                  },
                                }))
                              }
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-1 text-xs text-gray-400">Showing {Math.min(80, catalog.length)} of {catalog.length} cities.</p>
          </div>
        </>
      )}
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {saved ? <p className="mt-3 text-sm text-emerald-700">Saved.</p> : null}
      {canUpdate && pricing ? (
        <Button className="mt-4" onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save prices
        </Button>
      ) : null}
    </div>
  );
}

export function DeveloperPlansTab({
  plans,
  loading,
  canUpdate,
  onEdit,
}: {
  plans: SubscriptionPlanItem[];
  loading: boolean;
  canUpdate: boolean;
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
      <CityAddonPricingCard canUpdate={canUpdate} />
    </div>
  );
}
