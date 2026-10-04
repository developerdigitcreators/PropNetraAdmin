'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
  billingPeriodLabel,
  billingPeriodUnit,
  isDbfPlanCode,
  isDeveloperPlanCode,
  isPaidSubscriptionPlan,
  paiseToRupeesInput,
  rupeesInputToPaise,
  type PlanLimits,
  type SubscriptionPlanItem,
  type UpdatePlanPayload,
  type VerifiedContactLimits,
} from '@/services/subscriptions.service';
import { useDialogUnsavedGuard } from '@/hooks/use-unsaved-changes-guard';
import { useViewerSwitches } from './use-viewer-switches';
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
    addonListingContactsDaily: 0,
    addonBuyReqContactsDaily: 0,
    addonBuilderContactsDaily: 0,
    addonResaleBundlesMonthly: 0,
    addonBuyReqBundlesMonthly: 0,
    addonBuilderBundlesMonthly: 0,
    dbfPostsDaily: 0,
    dbfPostsMonthly: 0,
    activeDbfPosts: null,
    devCompareDaily: 0,
    devCompareMonthly: 0,
    devShareDaily: 0,
    devShareMonthly: 0,
    devBrochureDaily: 0,
    devBrochureMonthly: 0,
    devContactDaily: 0,
    devContactMonthly: 0,
    devViewDaily: null,
    devViewMonthly: null,
    viewerRevealDaily: 0,
    viewerRevealMonthly: 0,
    developerPostsDaily: 0,
    developerPostsMonthly: 0,
    activeDeveloperPosts: null,
    includedCities: 1,
    developerGroupChatEnabled: false,
    launchReelsEnabled: false,
  };
}

const DEV_FEATURE_FIELDS: Array<{
  label: string;
  daily: keyof PlanLimits;
  monthly: keyof PlanLimits;
}> = [
  { label: 'Compare', daily: 'devCompareDaily', monthly: 'devCompareMonthly' },
  { label: 'Share (without link)', daily: 'devShareDaily', monthly: 'devShareMonthly' },
  { label: 'Brochure download', daily: 'devBrochureDaily', monthly: 'devBrochureMonthly' },
  { label: 'Developer contact reveal', daily: 'devContactDaily', monthly: 'devContactMonthly' },
];

const AGENT_DEV_FEATURE_FIELDS: typeof DEV_FEATURE_FIELDS = [
  { label: 'Developer project page views', daily: 'devViewDaily', monthly: 'devViewMonthly' },
  ...DEV_FEATURE_FIELDS,
];

const VERIFIED_CONTACT_ROWS: Array<{
  label: string;
  daily: keyof VerifiedContactLimits;
  monthly: keyof VerifiedContactLimits;
}> = [
  { label: 'Resale', daily: 'verifiedResaleContactsDaily', monthly: 'verifiedResaleContactsMonthly' },
  { label: 'Rent', daily: 'verifiedRentContactsDaily', monthly: 'verifiedRentContactsMonthly' },
  {
    label: 'Buy Requirement',
    daily: 'verifiedBuyReqContactsDaily',
    monthly: 'verifiedBuyReqContactsMonthly',
  },
];

function emptyVerifiedLimits(): VerifiedContactLimits {
  return {
    verifiedResaleContactsDaily: null,
    verifiedResaleContactsMonthly: null,
    verifiedRentContactsDaily: null,
    verifiedRentContactsMonthly: null,
    verifiedBuyReqContactsDaily: null,
    verifiedBuyReqContactsMonthly: null,
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
  const [verifiedLimits, setVerifiedLimits] =
    useState<VerifiedContactLimits>(emptyVerifiedLimits());
  const [localError, setLocalError] = useState('');
  const baselineRef = useRef('');

  const isDbf = plan ? isDbfPlanCode(plan.code) || plan.audience === 'dbf' : false;
  const isDbfFree = plan?.code === 'DBF_FREE';
  const isDeveloper = plan ? isDeveloperPlanCode(plan.code) || plan.audience === 'developer' : false;
  const isDeveloperFree = plan?.code === 'DEVELOPER_FREE';
  const isTrackFree = isDbfFree || isDeveloperFree;
  const showPricing = plan ? isPaidSubscriptionPlan(plan.code) && !isTrackFree : false;
  const isLifetimeFree = plan?.code === 'FREE_LIFETIME';
  const showVisibilityToggles = !isLifetimeFree && !isTrackFree;
  const periodUnit = isDeveloper ? billingPeriodUnit(plan?.billingPeriod) : 'year';
  const periodName = isDeveloper ? billingPeriodLabel(plan?.billingPeriod) : 'Yearly';

  const snapshot = useMemo(
    () =>
      JSON.stringify({
        displayName,
        sortOrder,
        isActive,
        showOnApp,
        trialDays,
        priceRupees,
        promoPriceRupees,
        promoWindowDays,
        addonsEnabled,
        listingBoostEnabled,
        listingPriorityEnabled,
        builderContactsEnabled,
        unlimitedViews,
        limits,
        verifiedLimits,
      }),
    [
      displayName,
      sortOrder,
      isActive,
      showOnApp,
      trialDays,
      priceRupees,
      promoPriceRupees,
      promoWindowDays,
      addonsEnabled,
      listingBoostEnabled,
      listingPriorityEnabled,
      builderContactsEnabled,
      unlimitedViews,
      limits,
      verifiedLimits,
    ],
  );

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
    const next = { ...emptyLimits(), ...(plan.limits || {}) };
    if (next.listingBoostHours == null || Number.isNaN(Number(next.listingBoostHours))) {
      next.listingBoostHours = 24;
    }
    setLimits(next);
    const unlimited =
      next.listingViewsDaily == null && next.listingViewsMonthly == null;
    setUnlimitedViews(unlimited);
    const nextVerified = { ...emptyVerifiedLimits(), ...plan.verifiedContactLimits };
    setVerifiedLimits(nextVerified);
    baselineRef.current = JSON.stringify({
      displayName: plan.displayName,
      sortOrder: plan.sortOrder,
      isActive: plan.isActive,
      showOnApp: plan.showOnApp,
      trialDays: plan.trialDays != null ? String(plan.trialDays) : '',
      priceRupees: paiseToRupeesInput(plan.pricePaise),
      promoPriceRupees: paiseToRupeesInput(plan.promoPricePaise),
      promoWindowDays:
        plan.promoWindowDays != null ? String(plan.promoWindowDays) : '',
      addonsEnabled: plan.flags.addonsEnabled,
      listingBoostEnabled: plan.flags.listingBoostEnabled,
      listingPriorityEnabled: plan.flags.listingPriorityEnabled,
      builderContactsEnabled: plan.flags.builderContactsEnabled,
      unlimitedViews: unlimited,
      limits: { ...next },
      verifiedLimits: { ...nextVerified },
    });
  }, [open, plan]);

  const dirty = open && baselineRef.current !== '' && snapshot !== baselineRef.current;
  const { requestClose, dialog } = useDialogUnsavedGuard(dirty);

  const handleOpenChange = async (next: boolean) => {
    if (submitting) return;
    if (!next) {
      const ok = await requestClose();
      if (ok) onOpenChange(false);
      return;
    }
    onOpenChange(true);
  };

  const setLimitField = (key: keyof PlanLimits, value: string) => {
    const n = value === '' ? 0 : Number(value);
    setLimits((prev) => ({ ...prev, [key]: Number.isFinite(n) ? n : 0 }));
  };

  const setActiveDbfPosts = (value: string) => {
    const n = value.trim() === '' ? null : Number(value);
    setLimits((prev) => ({
      ...prev,
      activeDbfPosts: n == null || !Number.isFinite(n) ? null : n,
    }));
  };

  const setNullableLimit = (key: keyof PlanLimits, value: string) => {
    const n = value.trim() === '' ? null : Number(value);
    setLimits((prev) => ({
      ...prev,
      [key]: n == null || !Number.isFinite(n) ? null : Math.max(0, Math.floor(n)),
    }));
  };

  const setVerifiedLimit = (key: keyof VerifiedContactLimits, value: string) => {
    const n = value.trim() === '' ? null : Number(value);
    setVerifiedLimits((prev) => ({
      ...prev,
      [key]: n == null || !Number.isFinite(n) ? null : Math.max(0, Math.floor(n)),
    }));
  };

  const handleSubmit = () => {
    if (!displayName.trim()) {
      setLocalError('Display name is required.');
      return;
    }
    if (isDeveloper && limits.developerPostsMonthly < limits.developerPostsDaily) {
      setLocalError('Monthly post limit cannot be lower than the daily limit.');
      return;
    }
    if (!isDbf) {
      const bad = (isDeveloper ? DEV_FEATURE_FIELDS : AGENT_DEV_FEATURE_FIELDS).find(({ daily, monthly }) => {
        const d = limits[daily] as number | null;
        const m = limits[monthly] as number | null;
        return d != null && m != null && m < d;
      });
      if (bad) {
        setLocalError(`${bad.label}: monthly limit cannot be lower than the daily limit.`);
        return;
      }
    }
    if (isDbf && limits.dbfPostsMonthly < limits.dbfPostsDaily) {
      setLocalError('Monthly post limit cannot be lower than the daily limit.');
      return;
    }
    if (
      (isDbf || isDeveloper) &&
      limits.viewerRevealDaily != null &&
      limits.viewerRevealMonthly != null &&
      limits.viewerRevealMonthly < limits.viewerRevealDaily
    ) {
      setLocalError('Viewer contact reveals: monthly limit cannot be lower than the daily limit.');
      return;
    }
    setLocalError('');
    if (isDeveloper) {
      onSubmit({
        displayName: displayName.trim(),
        sortOrder,
        isActive: isDeveloperFree ? Boolean(plan?.isActive) : isActive,
        showOnApp: isDeveloperFree ? Boolean(plan?.showOnApp) : showOnApp,
        pricePaise: showPricing ? rupeesInputToPaise(priceRupees) : null,
        promoPricePaise: showPricing ? rupeesInputToPaise(promoPriceRupees) : null,
        promoWindowDays: showPricing && promoWindowDays !== '' ? Number(promoWindowDays) : null,
        entitlements: {
          developerPostsDaily: limits.developerPostsDaily,
          developerPostsMonthly: limits.developerPostsMonthly,
          activeDeveloperPosts: limits.activeDeveloperPosts,
          devCompareDaily: limits.devCompareDaily,
          devCompareMonthly: limits.devCompareMonthly,
          devShareDaily: limits.devShareDaily,
          devShareMonthly: limits.devShareMonthly,
          devBrochureDaily: limits.devBrochureDaily,
          devBrochureMonthly: limits.devBrochureMonthly,
          devContactDaily: limits.devContactDaily,
          devContactMonthly: limits.devContactMonthly,
          viewerRevealDaily: limits.viewerRevealDaily,
          viewerRevealMonthly: limits.viewerRevealMonthly,
          includedCities: Math.max(1, Math.floor(limits.includedCities || 1)),
          developerGroupChatEnabled: limits.developerGroupChatEnabled,
          launchReelsEnabled: limits.launchReelsEnabled,
          ...verifiedLimits,
        },
      });
      return;
    }
    const entitlements: UpdatePlanPayload['entitlements'] = isDbf
      ? {
          dbfPostsDaily: limits.dbfPostsDaily,
          dbfPostsMonthly: limits.dbfPostsMonthly,
          activeDbfPosts: limits.activeDbfPosts,
          viewerRevealDaily: limits.viewerRevealDaily,
          viewerRevealMonthly: limits.viewerRevealMonthly,
          listingViewsDaily: unlimitedViews ? null : limits.listingViewsDaily ?? 0,
          listingViewsMonthly: unlimitedViews ? null : limits.listingViewsMonthly ?? 0,
          ...verifiedLimits,
        }
      : {
          ...limits,
          listingViewsDaily: unlimitedViews ? null : limits.listingViewsDaily ?? 0,
          listingViewsMonthly: unlimitedViews ? null : limits.listingViewsMonthly ?? 0,
          ...verifiedLimits,
        };
    if (isDbf) {
      onSubmit({
        displayName: displayName.trim(),
        sortOrder,
        isActive: isDbfFree ? Boolean(plan?.isActive) : isActive,
        showOnApp: isDbfFree ? Boolean(plan?.showOnApp) : showOnApp,
        pricePaise: showPricing ? rupeesInputToPaise(priceRupees) : null,
        promoPricePaise: showPricing ? rupeesInputToPaise(promoPriceRupees) : null,
        promoWindowDays: showPricing && promoWindowDays !== '' ? Number(promoWindowDays) : null,
        entitlements,
      });
      return;
    }
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

  const viewerSwitches = useViewerSwitches();
  const viewerRevealSection = (
    <Section
      title="Listing viewer contacts"
      description="How many viewer numbers the owner can reveal. There is no viewer-contact add-on — only this plan quota (admin-controlled)."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <NumField
          label="Reveals per day"
          value={limits.viewerRevealDaily == null ? '' : String(limits.viewerRevealDaily)}
          onChange={(v) => setNullableLimit('viewerRevealDaily', v)}
          placeholder="Unlimited"
        />
        <NumField
          label="Reveals per month"
          value={limits.viewerRevealMonthly == null ? '' : String(limits.viewerRevealMonthly)}
          onChange={(v) => setNullableLimit('viewerRevealMonthly', v)}
          placeholder="Unlimited"
        />
      </div>
      <p className="text-xs text-gray-500">
        Leave empty for unlimited. 0 = cannot reveal contacts. Revealing the same viewer again on the same day is free.
      </p>
    </Section>
  );

  return (
    <>
    <Dialog open={open} onOpenChange={(next) => void handleOpenChange(next)}>
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
              title={`Pricing (₹ per ${periodUnit}, exclusive of GST)`}
              description={`Enter GST-exclusive prices. Customers pay base + GST (default 18%) and autopay renews every ${periodUnit}. After changing prices, resync Razorpay plans so autopay includes GST.`}
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <NumField
                  label={`${periodName} price (₹, exclusive of GST)`}
                  value={priceRupees}
                  onChange={setPriceRupees}
                  placeholder="1189"
                  prefix="₹"
                />
                <NumField
                  label="Intro offer price (₹, exclusive of GST)"
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
              {(() => {
                const exclusive = Number(priceRupees);
                if (!Number.isFinite(exclusive) || exclusive <= 0) return null;
                const exclusivePaise = Math.round(exclusive * 100);
                const gstPaise = Math.round((exclusivePaise * 18) / 100);
                const total = (exclusivePaise + gstPaise) / 100;
                const promo = Number(promoPriceRupees);
                let promoLine: string | null = null;
                if (Number.isFinite(promo) && promo > 0) {
                  const pPaise = Math.round(promo * 100);
                  const pGst = Math.round((pPaise * 18) / 100);
                  promoLine = `Intro total with GST 18% = ₹${(
                    (pPaise + pGst) /
                    100
                  ).toLocaleString('en-IN')}`;
                }
                return (
                  <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-900">
                    <p>
                      Total with GST 18% = ₹
                      {total.toLocaleString('en-IN')} (Base ₹
                      {exclusive.toLocaleString('en-IN')} + GST ₹
                      {(gstPaise / 100).toLocaleString('en-IN')})
                    </p>
                    {promoLine ? <p className="mt-1">{promoLine}</p> : null}
                  </div>
                );
              })()}
            </Section>
          ) : null}

          {isDeveloper ? (
            <>
              <Section
                title={
                  isDeveloperFree
                    ? 'Post Free Limit (applies before Paid mode)'
                    : 'Post Plan Limit (applies in Paid mode)'
                }
                description="Developer project posts. Leave “Max active posts” empty for no cap."
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <NumField
                    label="Posts per day"
                    value={String(limits.developerPostsDaily)}
                    onChange={(v) => setLimitField('developerPostsDaily', v)}
                  />
                  <NumField
                    label="Posts per month"
                    value={String(limits.developerPostsMonthly)}
                    onChange={(v) => setLimitField('developerPostsMonthly', v)}
                  />
                  <NumField
                    label="Max active posts"
                    value={
                      limits.activeDeveloperPosts == null ? '' : String(limits.activeDeveloperPosts)
                    }
                    onChange={(v) => setNullableLimit('activeDeveloperPosts', v)}
                    placeholder="No cap"
                  />
                </div>
              </Section>
              <Section
                title="Developer project limits"
                description="Compare, share, brochure and contact limits on other developers' projects."
              >
                {DEV_FEATURE_FIELDS.map(({ label, daily, monthly }) => (
                  <div key={daily} className="grid gap-3 sm:grid-cols-2">
                    <NumField
                      label={`${label} per day`}
                      value={limits[daily] == null ? '' : String(limits[daily])}
                      onChange={(v) => setNullableLimit(daily, v)}
                      placeholder="Unlimited"
                    />
                    <NumField
                      label={`${label} per month`}
                      value={limits[monthly] == null ? '' : String(limits[monthly])}
                      onChange={(v) => setNullableLimit(monthly, v)}
                      placeholder="Unlimited"
                    />
                  </div>
                ))}
                <p className="text-xs text-gray-500">Leave empty for unlimited. 0 = feature blocked.</p>
              </Section>
              {viewerSwitches.developer ? viewerRevealSection : null}
              <Section
                title="Launch Connect"
                description="Launch Update city group chat and Launch Reels. Extra cities beyond the included ones are paid city add-ons."
              >
                <NumField
                  label="Cities included"
                  value={String(limits.includedCities)}
                  onChange={(v) => setLimitField('includedCities', v)}
                />
                <FlagRow
                  label="Group messages (Launch Update)"
                  hint="Post in own city groups; agents get a push"
                  checked={limits.developerGroupChatEnabled}
                  onChange={(v) => setLimits((prev) => ({ ...prev, developerGroupChatEnabled: v }))}
                />
                <FlagRow
                  label="Launch Reels"
                  hint="Publish project reels to agents"
                  checked={limits.launchReelsEnabled}
                  onChange={(v) => setLimits((prev) => ({ ...prev, launchReelsEnabled: v }))}
                />
              </Section>
            </>
          ) : isDbf ? (
            <>
              <Section
                title={
                  isDbfFree
                    ? 'Post Free Limit (applies before Paid mode)'
                    : 'Post Plan Limit (applies in Paid mode)'
                }
                description={
                  isDbfFree
                    ? 'Used while Direct Builder Floor Paid mode has never been turned on, and for existing users during the free period.'
                    : 'Used for Direct Builder Floor users who bought the plan after Paid mode is on.'
                }
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <NumField
                    label="Posts per day"
                    value={String(limits.dbfPostsDaily)}
                    onChange={(v) => setLimitField('dbfPostsDaily', v)}
                  />
                  <NumField
                    label="Posts per month"
                    value={String(limits.dbfPostsMonthly)}
                    onChange={(v) => setLimitField('dbfPostsMonthly', v)}
                  />
                  <NumField
                    label="Max active posts"
                    value={limits.activeDbfPosts == null ? '' : String(limits.activeDbfPosts)}
                    onChange={setActiveDbfPosts}
                    placeholder="No cap"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Leave “Max active posts” empty for no cap.
                </p>
              </Section>
              {viewerSwitches.dbf ? viewerRevealSection : null}
              <Section title="Listing views">
                <FlagRow
                  label="Unlimited listing views"
                  hint="When off, set daily/monthly view caps"
                  checked={unlimitedViews}
                  onChange={setUnlimitedViews}
                />
                {!unlimitedViews ? (
                  <div className="grid gap-3 sm:grid-cols-2">
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
                  </div>
                ) : null}
              </Section>
            </>
          ) : (
          <>
          {viewerSwitches.agent ? viewerRevealSection : null}
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
              {!isLifetimeFree ? (
                <>
                  <FlagRow
                    label="Listing boost"
                    hint="Paid boost to top of search"
                    checked={listingBoostEnabled}
                    onChange={setListingBoostEnabled}
                  />
                  {listingBoostEnabled ? (
                    <div className="sm:col-span-2">
                      <NumField
                        label="Listing boost duration (hours)"
                        value={String(limits.listingBoostHours ?? 24)}
                        onChange={(v) => setLimitField('listingBoostHours', v)}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        How long a boost lasts when this plan buys/uses listing boost.
                      </p>
                    </div>
                  ) : null}
                </>
              ) : null}
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

          {addonsEnabled ? (
            <Section
              title="Addon credit daily limits"
              description="Separate from plan reveals above. Each pack credit type has its own daily spend cap."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <NumField
                  label="Listing contact credits / day"
                  value={String(limits.addonListingContactsDaily ?? 0)}
                  onChange={(v) => setLimitField('addonListingContactsDaily', v)}
                />
                <NumField
                  label="Buy-req contact credits / day"
                  value={String(limits.addonBuyReqContactsDaily ?? 0)}
                  onChange={(v) => setLimitField('addonBuyReqContactsDaily', v)}
                />
                <NumField
                  label="Builder contact credits / day"
                  value={String(limits.addonBuilderContactsDaily ?? 0)}
                  onChange={(v) => setLimitField('addonBuilderContactsDaily', v)}
                />
              </div>
              <p className="text-xs text-gray-500">
                0 = addon credits for that type cannot be used that day (plan quota still applies).
              </p>
            </Section>
          ) : null}

          {addonsEnabled ? (
            <Section
              title="Monthly add-on pack purchase caps"
              description="1 purchase of a pack = 1 bundle. Caps reset each calendar month."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <NumField
                  label="Resale / listing packs / month"
                  value={String(limits.addonResaleBundlesMonthly ?? 0)}
                  onChange={(v) =>
                    setLimitField('addonResaleBundlesMonthly', v)
                  }
                />
                <NumField
                  label="Buy-req packs / month"
                  value={String(limits.addonBuyReqBundlesMonthly ?? 0)}
                  onChange={(v) =>
                    setLimitField('addonBuyReqBundlesMonthly', v)
                  }
                />
                <NumField
                  label="Builder packs / month"
                  value={String(limits.addonBuilderBundlesMonthly ?? 0)}
                  onChange={(v) =>
                    setLimitField('addonBuilderBundlesMonthly', v)
                  }
                />
              </div>
              <p className="text-xs text-gray-500">
                0 = unlimited pack purchases this month.
              </p>
            </Section>
          ) : null}

          <Section
            title="Developer project limits"
            description="Independent daily and monthly limits for developer projects. A full 3-project compare counts as 1. Repeating the same action on the same project the same day is free. No add-on credits apply."
          >
            {AGENT_DEV_FEATURE_FIELDS.map(({ label, daily, monthly }) => (
              <div key={daily} className="grid gap-3 sm:grid-cols-2">
                <NumField
                  label={`${label} per day`}
                  value={limits[daily] == null ? '' : String(limits[daily])}
                  onChange={(v) => setNullableLimit(daily, v)}
                  placeholder="Unlimited"
                />
                <NumField
                  label={`${label} per month`}
                  value={limits[monthly] == null ? '' : String(limits[monthly])}
                  onChange={(v) => setNullableLimit(monthly, v)}
                  placeholder="Unlimited"
                />
              </div>
            ))}
            <p className="text-xs text-gray-500">Leave empty for unlimited. 0 = feature blocked.</p>
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
            </div>
          </Section>
          </>
          )}

          <Section
            title="Verified listing contact limits (hidden from users)"
            description="Used only when a user reveals the contact on a Realty Avenue (verified) listing. Same listing again the same day is free. Not shown anywhere in the app. No add-on."
          >
            <div className="grid grid-cols-[minmax(0,8rem)_1fr_1fr] items-center gap-x-3 gap-y-2">
              <span />
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Daily
              </span>
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Monthly
              </span>
              {VERIFIED_CONTACT_ROWS.map((row) => (
                <div key={row.label} className="contents">
                  <span className="text-sm font-medium text-gray-700">{row.label}</span>
                  {[row.daily, row.monthly].map((key) => (
                    <Input
                      key={key}
                      type="number"
                      min={0}
                      step={1}
                      aria-label={`${row.label} ${key.endsWith('Daily') ? 'daily' : 'monthly'}`}
                      placeholder="Unlimited"
                      value={verifiedLimits[key] == null ? '' : String(verifiedLimits[key])}
                      onChange={(e) => setVerifiedLimit(key, e.target.value)}
                    />
                  ))}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500">Leave empty for unlimited. 0 = blocked.</p>
          </Section>

          {(localError || error) && (
            <p className="text-sm text-red-600">{localError || error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => void handleOpenChange(false)}
              disabled={submitting}
            >
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
    {dialog}
    </>
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
