export const maskContact = (v?: string | null) => {
  const d = String(v || '').replace(/\D/g, '');
  if (!d) return '';
  return 'X'.repeat(Math.max(d.length, 6));
};
