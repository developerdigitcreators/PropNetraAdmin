'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  isPaidSubscriptionPlan,
  paiseToRupeesInput,
  rupeesInputToPaise,
  type PlanLimits,
  type SubscriptionPlanItem,
  type UpdatePlanPayload,
} from '@/services/subscriptions.service';
import { Loader2 } from 'lucide-react';

type PlanFormDialogProps = {
  open: boolean;
  plan: SubscriptionPlanItem | null;
  submitting: boolean;
  error: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: UpdatePlanPayload) => void;
};

function emptyLimits(): PlanLimits {
  return {
    listingContactsDaily: 0,
    listingContactsMonthly: 0,
    activeResaleRentPosts: 0,
    buyReqContactsDaily: 0,
    buyReqContactsMonthly: 0,
    activeBuyReqPosts: 0,
    listingViewsDaily: null,
    listingViewsMonthly: null,
    monthlyCoinGrant: 0,
    listingBoostHours: 24,
  };
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-gray-100 bg-gray-50/60 p-4">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {description ? (
        <p className="mt-1 text-xs leading-relaxed text-gray-500">{description}</p>
      ) : null}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export function PlanFormDialog({
  open,
  plan,
  submitting,
  error,
  onOpenChange,
  onSubmit,
}: PlanFormDialogProps) {
  const [displayName, setDisplayName] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [showOnApp, setShowOnApp] = useState(true);
  const [trialDays, setTrialDays] = useState('');
  const [priceRupees, setPriceRupees] = useState('');
  const [promoPriceRupees, setPromoPriceRupees] = useState('');
  const [promoWindowDays, setPromoWindowDays] = useState('');
  const [addonsEnabled, setAddonsEnabled] = useState(false);
  const [listingBoostEnabled, setListingBoostEnabled] = useState(false);
  const [listingPriorityEnabled, setListingPriorityEnabled] = useState(false);
  const [builderContactsEnabled, setBuilderContactsEnabled] = useState(false);
  const [unlimitedViews, setUnlimitedViews] = useState(false);
  const [limits, setLimits] = useState<PlanLimits>(emptyLimits());
  const [localError, setLocalError] = useState('');

  const showPricing = plan ? isPaidSubscriptionPlan(plan.code) : false;
  const isLifetimeFree = plan?.code === 'FREE_LIFETIME';
  const showVisibilityToggles = !isLifetimeFree;

  useEffect(() => {
    if (!open || !plan) return;
    setLocalError('');
    setDisplayName(plan.displayName);
    setSortOrder(plan.sortOrder);
    setIsActive(plan.isActive);
    setShowOnApp(plan.showOnApp);
    setTrialDays(plan.trialDays != null ? String(plan.trialDays) : '');
    setPriceRupees(paiseToRupeesInput(plan.pricePaise));
    setPromoPriceRupees(paiseToRupeesInput(plan.promoPricePaise));
    setPromoWindowDays(
      plan.promoWindowDays != null ? String(plan.promoWindowDays) : '',
    );
    setAddonsEnabled(plan.flags.addonsEnabled);
    setListingBoostEnabled(plan.flags.listingBoostEnabled);
    setListingPriorityEnabled(plan.flags.listingPriorityEnabled);
    setBuilderContactsEnabled(plan.flags.builderContactsEnabled);
    const next = plan.limits || emptyLimits();
    setLimits({ ...next });
    setUnlimitedViews(
      next.listingViewsDaily == null && next.listingViewsMonthly == null,
    );
  }, [open, plan]);

  const setLimitField = (key: keyof PlanLimits, value: string) => {
    const n = value === '' ? 0 : Number(value);
    setLimits((prev) => ({ ...prev, [key]: Number.isFinite(n) ? n : 0 }));
  };

  const handleSubmit = () => {
    if (!displayName.trim()) {
      setLocalError('Display name is required.');
      return;
    }
    setLocalError('');
    const entitlements: Partial<PlanLimits> = {
      ...limits,
      listingViewsDaily: unlimitedViews ? null : limits.listingViewsDaily ?? 0,
      listingViewsMonthly: unlimitedViews ? null : limits.listingViewsMonthly ?? 0,
    };
    onSubmit({
      displayName: displayName.trim(),
      sortOrder,
      // Lifetime free is system-managed — never flip visibility from this form.
      isActive: isLifetimeFree ? Boolean(plan?.isActive) : isActive,
      showOnApp: isLifetimeFree ? Boolean(plan?.showOnApp) : showOnApp,
      trialDays: trialDays === '' ? null : Number(trialDays),
      pricePaise: showPricing ? rupeesInputToPaise(priceRupees) : null,
      promoPricePaise: showPricing ? rupeesInputToPaise(promoPriceRupees) : null,
      promoWindowDays: promoWindowDays === '' ? null : Number(promoWindowDays),
      addonsEnabled,
      listingBoostEnabled,
      listingPriorityEnabled,
      builderContactsEnabled,
      entitlements,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit — {plan?.displayName}</DialogTitle>
          <DialogDescription>
            Changes apply in the app immediately after save. Prices are entered in{' '}
            <strong>rupees (₹)</strong>, not paise.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <Section
            title="Plan details"
            description="Name shown to users in the app and sort order on the plans screen."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <NumField
                label="Display name"
                type="text"
                value={displayName}
                onChange={setDisplayName}
              />
              <NumField
                label="Sort order"
                value={String(sortOrder)}
                onChange={(v) => setSortOrder(Number(v) || 0)}
              />
            </div>
            {showVisibilityToggles ? (
              <>
                <FlagRow
                  label="Plan is active"
                  hint="Inactive plans cannot be purchased or assigned."
                  checked={isActive}
                  onChange={setIsActive}
                />
                <FlagRow
                  label="Show on app"
                  hint="Login / Unlock Benefits shows only plans with this on. Manage Plan upgrades ignore this and show higher plans only."
                  checked={showOnApp}
                  onChange={setShowOnApp}
                />
              </>
            ) : null}
            {plan?.code === 'FREE_TRIAL' ? (
              <NumField
                label="Free trial length (days)"
                value={trialDays}
                onChange={setTrialDays}
                placeholder="90"
              />
            ) : null}
          </Section>

          {showPricing ? (
            <Section
              title="Pricing (₹ per year)"
              description="Standard yearly price and optional intro offer for new subscribers."
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <NumField
                  label="Yearly price (₹)"
                  value={priceRupees}
                  onChange={setPriceRupees}
                  placeholder="1188"
                  prefix="₹"
                />
                <NumField
                  label="Intro offer price (₹)"
                  value={promoPriceRupees}
                  onChange={setPromoPriceRupees}
                  placeholder="899"
                  prefix="₹"
                />
                <NumField
                  label="Intro offer window (days)"
                  value={promoWindowDays}
                  onChange={setPromoWindowDays}
                  placeholder="30"
                />
              </div>
            </Section>
          ) : null}

          <Section
            title="Optional features"
            description="Turn on add-on purchases, boosts, priority placement, or builder contact packs."
          >
            <div className="grid gap-1 sm:grid-cols-2">
              <FlagRow
                label="Add-ons & top-ups"
                hint="NetraCoin packs and contact credit top-ups"
                checked={addonsEnabled}
                onChange={setAddonsEnabled}
              />
              <FlagRow
                label="Listing boost"
                hint="Paid boost to top of search"
                checked={listingBoostEnabled}
                onChange={setListingBoostEnabled}
              />
              <FlagRow
                label="Listing priority"
                hint="Priority placement in results"
                checked={listingPriorityEnabled}
                onChange={setListingPriorityEnabled}
              />
              <FlagRow
                label="Builder contact packs"
                hint="Direct Builder Floor contact unlocks"
                checked={builderContactsEnabled}
                onChange={setBuilderContactsEnabled}
              />
              <FlagRow
                label="Unlimited listing views"
                hint="When off, set daily/monthly view caps below"
                checked={unlimitedViews}
                onChange={setUnlimitedViews}
              />
            </div>
          </Section>

          <Section
            title="Resale & Rent limits"
            description="Contact reveals when users unlock listing owner numbers, and max active posts."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <NumField
                label="Contact reveals per day"
                value={String(limits.listingContactsDaily)}
                onChange={(v) => setLimitField('listingContactsDaily', v)}
              />
              <NumField
                label="Contact reveals per month"
                value={String(limits.listingContactsMonthly)}
                onChange={(v) => setLimitField('listingContactsMonthly', v)}
              />
              <NumField
                label="Max active Resale / Rent posts"
                value={String(limits.activeResaleRentPosts)}
                onChange={(v) => setLimitField('activeResaleRentPosts', v)}
              />
            </div>
          </Section>

          <Section
            title="Buy requirement limits"
            description="Limits for buyer requirement posts and contact reveals."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <NumField
                label="Contact reveals per day"
                value={String(limits.buyReqContactsDaily)}
                onChange={(v) => setLimitField('buyReqContactsDaily', v)}
              />
              <NumField
                label="Contact reveals per month"
                value={String(limits.buyReqContactsMonthly)}
                onChange={(v) => setLimitField('buyReqContactsMonthly', v)}
              />
              <NumField
                label="Max active buy requirement posts"
                value={String(limits.activeBuyReqPosts)}
                onChange={(v) => setLimitField('activeBuyReqPosts', v)}
              />
            </div>
          </Section>

          <Section title="Views, coins & boost">
            <div className="grid gap-3 sm:grid-cols-2">
              {!unlimitedViews ? (
                <>
                  <NumField
                    label="Listing views per day"
                    value={String(limits.listingViewsDaily ?? 0)}
                    onChange={(v) => setLimitField('listingViewsDaily', v)}
                  />
                  <NumField
                    label="Listing views per month"
                    value={String(limits.listingViewsMonthly ?? 0)}
                    onChange={(v) => setLimitField('listingViewsMonthly', v)}
                  />
                </>
              ) : null}
              <NumField
                label="Monthly NetraCoin grant"
                value={String(limits.monthlyCoinGrant)}
                onChange={(v) => setLimitField('monthlyCoinGrant', v)}
              />
              <NumField
                label="Listing boost duration (hours)"
                value={String(limits.listingBoostHours)}
                onChange={(v) => setLimitField('listingBoostHours', v)}
              />
            </div>
          </Section>

          {(localError || error) && (
            <p className="text-sm text-red-600">{localError || error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save plan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FlagRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md px-1 py-2">
      <div className="min-w-0">
        <span className="text-sm font-medium text-gray-800">{label}</span>
        {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
      </div>
      <Switch checked={checked} onCheckedChange={(c) => onChange(Boolean(c))} />
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  placeholder,
  prefix,
  type = 'number',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  prefix?: string;
  type?: 'number' | 'text';
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        {prefix ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
            {prefix}
          </span>
        ) : null}
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          min={type === 'number' ? 0 : undefined}
          step={type === 'number' ? 'any' : undefined}
          className={prefix ? 'pl-7' : undefined}
        />
      </div>
    </div>
  );
}
