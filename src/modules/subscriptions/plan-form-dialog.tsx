'use client';

import { useEffect, useState } from 'react';
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
  const [trialDays, setTrialDays] = useState('');
  const [pricePaise, setPricePaise] = useState('');
  const [promoPricePaise, setPromoPricePaise] = useState('');
  const [promoWindowDays, setPromoWindowDays] = useState('');
  const [addonsEnabled, setAddonsEnabled] = useState(false);
  const [listingBoostEnabled, setListingBoostEnabled] = useState(false);
  const [listingPriorityEnabled, setListingPriorityEnabled] = useState(false);
  const [builderContactsEnabled, setBuilderContactsEnabled] = useState(false);
  const [unlimitedViews, setUnlimitedViews] = useState(false);
  const [limits, setLimits] = useState<PlanLimits>(emptyLimits());
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!open || !plan) return;
    setLocalError('');
    setDisplayName(plan.displayName);
    setSortOrder(plan.sortOrder);
    setIsActive(plan.isActive);
    setTrialDays(plan.trialDays != null ? String(plan.trialDays) : '');
    setPricePaise(plan.pricePaise != null ? String(plan.pricePaise) : '');
    setPromoPricePaise(
      plan.promoPricePaise != null ? String(plan.promoPricePaise) : '',
    );
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
      isActive,
      trialDays: trialDays === '' ? null : Number(trialDays),
      pricePaise: pricePaise === '' ? null : Number(pricePaise),
      promoPricePaise: promoPricePaise === '' ? null : Number(promoPricePaise),
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
          <DialogTitle>Edit plan — {plan?.code}</DialogTitle>
          <DialogDescription>
            All limits and flags are applied to the app immediately after save.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Display name</label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Sort order</label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
              />
            </div>
          </div>

          {plan?.code === 'FREE_TRIAL' ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Trial days</label>
              <Input
                type="number"
                value={trialDays}
                onChange={(e) => setTrialDays(e.target.value)}
                placeholder="90"
              />
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Price (paise)</label>
              <Input
                type="number"
                value={pricePaise}
                onChange={(e) => setPricePaise(e.target.value)}
                placeholder="118800"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Promo price (paise)</label>
              <Input
                type="number"
                value={promoPricePaise}
                onChange={(e) => setPromoPricePaise(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Promo window days</label>
              <Input
                type="number"
                value={promoWindowDays}
                onChange={(e) => setPromoWindowDays(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2 rounded-lg border border-gray-100 p-3 sm:grid-cols-2">
            <FlagRow label="Active" checked={isActive} onChange={setIsActive} />
            <FlagRow label="Add-ons" checked={addonsEnabled} onChange={setAddonsEnabled} />
            <FlagRow
              label="Listing boost"
              checked={listingBoostEnabled}
              onChange={setListingBoostEnabled}
            />
            <FlagRow
              label="Listing priority"
              checked={listingPriorityEnabled}
              onChange={setListingPriorityEnabled}
            />
            <FlagRow
              label="Builder contacts"
              checked={builderContactsEnabled}
              onChange={setBuilderContactsEnabled}
            />
            <FlagRow
              label="Unlimited views"
              checked={unlimitedViews}
              onChange={setUnlimitedViews}
            />
          </div>

          <p className="text-sm font-semibold text-gray-800">Entitlements</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <NumField
              label="Listing contacts / day"
              value={limits.listingContactsDaily}
              onChange={(v) => setLimitField('listingContactsDaily', v)}
            />
            <NumField
              label="Listing contacts / month"
              value={limits.listingContactsMonthly}
              onChange={(v) => setLimitField('listingContactsMonthly', v)}
            />
            <NumField
              label="Active Resale+Rent posts"
              value={limits.activeResaleRentPosts}
              onChange={(v) => setLimitField('activeResaleRentPosts', v)}
            />
            <NumField
              label="Active Buy-req posts"
              value={limits.activeBuyReqPosts}
              onChange={(v) => setLimitField('activeBuyReqPosts', v)}
            />
            <NumField
              label="Buy-req contacts / day"
              value={limits.buyReqContactsDaily}
              onChange={(v) => setLimitField('buyReqContactsDaily', v)}
            />
            <NumField
              label="Buy-req contacts / month"
              value={limits.buyReqContactsMonthly}
              onChange={(v) => setLimitField('buyReqContactsMonthly', v)}
            />
            {!unlimitedViews ? (
              <>
                <NumField
                  label="Views / day"
                  value={limits.listingViewsDaily ?? 0}
                  onChange={(v) => setLimitField('listingViewsDaily', v)}
                />
                <NumField
                  label="Views / month"
                  value={limits.listingViewsMonthly ?? 0}
                  onChange={(v) => setLimitField('listingViewsMonthly', v)}
                />
              </>
            ) : null}
            <NumField
              label="Monthly coin grant"
              value={limits.monthlyCoinGrant}
              onChange={(v) => setLimitField('monthlyCoinGrant', v)}
            />
            <NumField
              label="Listing boost hours"
              value={limits.listingBoostHours}
              onChange={(v) => setLimitField('listingBoostHours', v)}
            />
          </div>

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
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md px-1 py-1">
      <span className="text-sm text-gray-700">{label}</span>
      <Switch checked={checked} onCheckedChange={(c) => onChange(Boolean(c))} />
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <Input type="number" value={value} onChange={(e) => onChange(e.target.value)} min={0} />
    </div>
  );
}
