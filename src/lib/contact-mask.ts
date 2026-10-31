export const maskContact = (v?: string | null) => {
  const d = String(v || '').replace(/\D/g, '');
  if (!d) return '';
  return 'X'.repeat(Math.max(d.length, 6));
};

/** Mask unit numbers and other short secrets (length preserved). */
export const maskSecret = (v?: string | null) => {
  const t = String(v ?? '').trim();
  if (!t) return '';
  return 'X'.repeat(Math.max(t.length, 4));
};
