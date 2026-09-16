/** Shared admin plan display labels — list + user profile. */
export type PlanChip = { label: string; className: string };

const CHIP = {
  basicPartner: {
    label: 'Basic Partner',
    className: 'bg-sky-50 text-sky-800 border-sky-200',
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
} as const;

export const PLAN_CHIP: Record<string, PlanChip> = {
  free: CHIP.basicPartner,
  'free trial': CHIP.basicPartner,
  free_trial: CHIP.basicPartner,
  'trial free': CHIP.basicPartner,
  trial_free: CHIP.basicPartner,
  'basic partner': CHIP.basicPartner,
  basic_partner: CHIP.basicPartner,
  'lifetime free': CHIP.defaultPartner,
  lifetime_free: CHIP.defaultPartner,
  'free lifetime': CHIP.defaultPartner,
  free_lifetime: CHIP.defaultPartner,
  'default partner': CHIP.defaultPartner,
  default_partner: CHIP.defaultPartner,
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
      return CHIP.defaultPartner.label;
    case 'NETWORK':
    case 'NETWORK_PAID':
      return CHIP.networkPartner.label;
    case 'PRO':
      return CHIP.proPartner.label;
    case 'ELITE':
      return CHIP.elitePartner.label;
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

export function isPaidPlanCode(planCode?: string | null): boolean {
  const c = String(planCode || '').toUpperCase();
  return c === 'NETWORK_PAID' || c === 'NETWORK' || c === 'PRO' || c === 'ELITE';
}

export function isFreePlanCode(planCode?: string | null): boolean {
  const c = String(planCode || '').toUpperCase();
  return c === 'FREE_TRIAL' || c === 'FREE_LIFETIME' || c === 'FREE';
}
