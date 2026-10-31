/** Shared admin plan display labels — list + user profile. */
export type PlanChip = { label: string; className: string };

const CHIP = {
  basicPartner: {
    label: 'Basic Partner',
    className: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  freeLifetimePartner: {
    label: 'Free Lifetime Partner',
    className: 'bg-slate-100 text-slate-800 border-slate-300',
  },
  defaultPartner: {
    label: 'Default Partner',
    className: 'bg-slate-100 text-slate-800 border-slate-300',
  },
  networkPartner: {
    label: 'Network Partner',
    className: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  proPartner: {
    label: 'Pro Partner',
    className: 'bg-amber-50 text-amber-900 border-amber-200',
  },
  elitePartner: {
    label: 'Elite Partner',
    className: 'bg-violet-50 text-violet-900 border-violet-200',
  },
  developerFree: {
    label: 'Developer Free',
    className: 'bg-rose-50 text-rose-900 border-rose-200',
  },
  developerPaid: {
    label: 'Developer Paid',
    className: 'bg-rose-50 text-rose-800 border-rose-300',
  },
  developerMonthly: {
    label: 'Developer (Monthly)',
    className: 'bg-rose-50 text-rose-800 border-rose-300',
  },
  developerQuarterly: {
    label: 'Developer (Quarterly)',
    className: 'bg-rose-50 text-rose-800 border-rose-300',
  },
  developerHalfYearly: {
    label: 'Developer (Half Yearly)',
    className: 'bg-rose-50 text-rose-800 border-rose-300',
  },
  dbfFree: {
    label: 'Direct Builder Free',
    className: 'bg-teal-50 text-teal-900 border-teal-200',
  },
  dbfPaid: {
    label: 'Direct Builder Paid',
    className: 'bg-teal-50 text-teal-800 border-teal-300',
  },
} as const;

export const PLAN_CHIP: Record<string, PlanChip> = {
  free: CHIP.basicPartner,
  'free trial': CHIP.basicPartner,
  free_trial: CHIP.basicPartner,
  'trial free': CHIP.basicPartner,
  trial_free: CHIP.basicPartner,
  'basic partner': CHIP.basicPartner,
  basic_partner: CHIP.basicPartner,
  'lifetime free': CHIP.freeLifetimePartner,
  lifetime_free: CHIP.freeLifetimePartner,
  'free lifetime': CHIP.freeLifetimePartner,
  free_lifetime: CHIP.freeLifetimePartner,
  'free lifetime partner': CHIP.freeLifetimePartner,
  free_lifetime_partner: CHIP.freeLifetimePartner,
  'default partner': CHIP.freeLifetimePartner,
  default_partner: CHIP.freeLifetimePartner,
  network: CHIP.networkPartner,
  'network paid': CHIP.networkPartner,
  network_paid: CHIP.networkPartner,
  'network partner': CHIP.networkPartner,
  network_partner: CHIP.networkPartner,
  pro: CHIP.proPartner,
  'pro partner': CHIP.proPartner,
  pro_partner: CHIP.proPartner,
  elite: CHIP.elitePartner,
  'elite partner': CHIP.elitePartner,
  elite_partner: CHIP.elitePartner,
  developer_free: CHIP.developerFree,
  'developer (free)': CHIP.developerFree,
  developer_paid: CHIP.developerPaid,
  'developer (yearly)': CHIP.developerPaid,
  'developer yearly': CHIP.developerPaid,
  developer_monthly: CHIP.developerMonthly,
  'developer (monthly)': CHIP.developerMonthly,
  developer_quarterly: CHIP.developerQuarterly,
  'developer (quarterly)': CHIP.developerQuarterly,
  developer_half_yearly: CHIP.developerHalfYearly,
  'developer (half yearly)': CHIP.developerHalfYearly,
  'developer (half-yearly)': CHIP.developerHalfYearly,
  dbf_free: CHIP.dbfFree,
  'direct builder free': CHIP.dbfFree,
  'direct builder floor (free)': CHIP.dbfFree,
  dbf_paid: CHIP.dbfPaid,
  'direct builder paid': CHIP.dbfPaid,
  'direct builder floor': CHIP.dbfPaid,
};

function humanizePlanText(raw: string) {
  return raw
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function planLabelFromCode(planCode?: string | null): string | null {
  const code = String(planCode || '').trim().toUpperCase();
  switch (code) {
    case 'FREE':
    case 'FREE_TRIAL':
      return CHIP.basicPartner.label;
    case 'FREE_LIFETIME':
      return CHIP.freeLifetimePartner.label;
    case 'NETWORK':
    case 'NETWORK_PAID':
      return CHIP.networkPartner.label;
    case 'PRO':
      return CHIP.proPartner.label;
    case 'ELITE':
      return CHIP.elitePartner.label;
    case 'DEVELOPER_FREE':
      return CHIP.developerFree.label;
    case 'DEVELOPER_PAID':
      return CHIP.developerPaid.label;
    case 'DEVELOPER_MONTHLY':
      return CHIP.developerMonthly.label;
    case 'DEVELOPER_QUARTERLY':
      return CHIP.developerQuarterly.label;
    case 'DEVELOPER_HALF_YEARLY':
      return CHIP.developerHalfYearly.label;
    case 'DBF_FREE':
      return CHIP.dbfFree.label;
    case 'DBF_PAID':
      return CHIP.dbfPaid.label;
    default:
      return null;
  }
}

export function resolvePlanChip(
  label?: string | null,
  planCode?: string | null,
): PlanChip | null {
  const fromCode = planLabelFromCode(planCode);
  if (fromCode) {
    const key = fromCode.toLowerCase();
    return (
      PLAN_CHIP[key] || {
        label: fromCode,
        className: 'border-gray-200 bg-gray-50 text-gray-700',
      }
    );
  }
  const raw = String(label || planCode || '').trim();
  if (!raw) return null;
  const key = raw.toLowerCase().replace(/_/g, ' ');
  const codeKey = String(planCode || '').toLowerCase();
  return (
    PLAN_CHIP[key] ||
    PLAN_CHIP[codeKey] ||
    PLAN_CHIP[codeKey.replace(/_/g, ' ')] || {
      label: humanizePlanText(raw),
      className: 'border-gray-200 bg-gray-50 text-gray-700',
    }
  );
}

/** User Detail / tracking: Developer & Direct Builder show app-style Free vs Paid badges. */
export function resolveSubscriptionTrackingPlanChip(
  planCode?: string | null,
): PlanChip | null {
  const code = String(planCode || '').trim().toUpperCase();
  if (!code) return null;
  if (code === 'DBF_FREE') return CHIP.dbfFree;
  if (code === 'DBF_PAID') return CHIP.dbfPaid;
  if (code === 'DEVELOPER_FREE') return CHIP.developerFree;
  if (code.startsWith('DEVELOPER_')) return CHIP.developerPaid;
  return null;
}

/** Partner tier filter (network / pro / elite) — same chips as app profile badge. */
export function resolvePartnerBadgeChip(
  filterValue?: string | null,
): PlanChip | null {
  switch (String(filterValue || '').trim().toLowerCase()) {
    case 'network':
      return CHIP.networkPartner;
    case 'pro':
      return CHIP.proPartner;
    case 'elite':
      return CHIP.elitePartner;
    default:
      return null;
  }
}

export function isPaidPlanCode(planCode?: string | null): boolean {
  const c = String(planCode || '').toUpperCase();
  return c === 'NETWORK_PAID' || c === 'NETWORK' || c === 'PRO' || c === 'ELITE';
}

export function isFreePlanCode(planCode?: string | null): boolean {
  const c = String(planCode || '').toUpperCase();
  return c === 'FREE_TRIAL' || c === 'FREE_LIFETIME' || c === 'FREE';
}

/** Subscription Tracking plan dropdown options per user role filter. */
export const SUBSCRIPTION_TRACKING_PLANS_BY_ROLE: Record<
  string,
  { code: string; label: string }[]
> = {
  agent: [
    { code: 'FREE_TRIAL', label: 'Free Trial' },
    { code: 'FREE_LIFETIME', label: 'Free Lifetime Partner' },
    { code: 'NETWORK_PAID', label: 'Network Paid' },
    { code: 'PRO', label: 'Pro' },
    { code: 'ELITE', label: 'Elite' },
  ],
  direct_builder: [
    { code: 'DBF_FREE', label: 'Direct Builder Free' },
    { code: 'DBF_PAID', label: 'Direct Builder Paid' },
  ],
  developer: [
    { code: 'DEVELOPER_FREE', label: 'Developer Free' },
    { code: 'DEVELOPER_MONTHLY', label: 'Developer Monthly' },
    { code: 'DEVELOPER_QUARTERLY', label: 'Developer Quarterly' },
    { code: 'DEVELOPER_HALF_YEARLY', label: 'Developer Half Yearly' },
    { code: 'DEVELOPER_PAID', label: 'Developer Yearly' },
  ],
};

export function subscriptionTrackingPlanLabel(code: string): string {
  const fromCode = planLabelFromCode(code);
  if (fromCode) return fromCode;
  return String(code || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Prefer API planCode; map legacy display names (e.g. Default Partner) to codes. */
export function resolveSubscriptionTrackingPlanCode(
  planCode?: string | null,
  currentPlan?: string | null,
): string {
  const rawCode = String(planCode || '').trim();
  if (rawCode && /^[A-Za-z0-9_]+$/.test(rawCode)) {
    return rawCode.toUpperCase();
  }
  const rawPlan = String(currentPlan || '').trim();
  if (rawPlan && /^[A-Za-z0-9_]+$/.test(rawPlan)) {
    return rawPlan.toUpperCase();
  }
  const key = rawPlan.toLowerCase().replace(/_/g, ' ');
  if (
    key === 'default partner' ||
    key === 'lifetime free' ||
    key === 'network partner (free lifetime)'
  ) {
    return 'FREE_LIFETIME';
  }
  if (key === 'trial free' || key === 'free trial') return 'FREE_TRIAL';
  return rawCode.toUpperCase() || rawPlan.toUpperCase();
}
