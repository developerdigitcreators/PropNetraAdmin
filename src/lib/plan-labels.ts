/** Shared admin plan display labels — list + user profile. */
export type PlanChip = { label: string; className: string };

const CHIP = {
  trialFree: {
    label: 'Trial Free',
    className: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  lifetimeFree: {
    label: 'Lifetime Free',
    className: 'bg-slate-100 text-slate-800 border-slate-300',
  },
  networkPaid: {
    label: 'Network Paid',
    className: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  pro: {
    label: 'Pro',
    className: 'bg-amber-50 text-amber-900 border-amber-200',
  },
  elite: {
    label: 'Elite',
    className: 'bg-violet-50 text-violet-900 border-violet-200',
  },
} as const;

export const PLAN_CHIP: Record<string, PlanChip> = {
  free: CHIP.trialFree,
  'free trial': CHIP.trialFree,
  free_trial: CHIP.trialFree,
  'trial free': CHIP.trialFree,
  trial_free: CHIP.trialFree,
  'lifetime free': CHIP.lifetimeFree,
  lifetime_free: CHIP.lifetimeFree,
  network: CHIP.networkPaid,
  'network paid': CHIP.networkPaid,
  network_paid: CHIP.networkPaid,
  'network partner': CHIP.networkPaid,
  network_partner: CHIP.networkPaid,
  pro: CHIP.pro,
  'pro partner': CHIP.pro,
  pro_partner: CHIP.pro,
  elite: CHIP.elite,
  'elite partner': CHIP.elite,
  elite_partner: CHIP.elite,
};

export function planLabelFromCode(planCode?: string | null): string | null {
  const code = String(planCode || '').trim().toUpperCase();
  switch (code) {
    case 'FREE_TRIAL':
      return 'Trial Free';
    case 'FREE_LIFETIME':
      return 'Lifetime Free';
    case 'NETWORK_PAID':
      return 'Network Paid';
    case 'PRO':
      return 'Pro';
    case 'ELITE':
      return 'Elite';
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
    return PLAN_CHIP[key] || { label: fromCode, className: 'border-gray-200 bg-gray-50 text-gray-700' };
  }
  const raw = String(label || planCode || '').trim();
  if (!raw) return null;
  const key = raw.toLowerCase().replace(/_/g, ' ');
  const codeKey = String(planCode || '').toLowerCase();
  return (
    PLAN_CHIP[key] ||
    PLAN_CHIP[codeKey] ||
    PLAN_CHIP[codeKey.replace(/_/g, ' ')] || {
      label: raw,
      className: 'border-gray-200 bg-gray-50 text-gray-700',
    }
  );
}

export function isPaidPlanCode(planCode?: string | null): boolean {
  const c = String(planCode || '').toUpperCase();
  return c === 'NETWORK_PAID' || c === 'PRO' || c === 'ELITE';
}

export function isFreePlanCode(planCode?: string | null): boolean {
  const c = String(planCode || '').toUpperCase();
  return c === 'FREE_TRIAL' || c === 'FREE_LIFETIME' || c === 'FREE';
}
