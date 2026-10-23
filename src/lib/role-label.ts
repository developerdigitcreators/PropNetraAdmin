/** `super_admin` → `Super Admin`; leaves already-formatted labels intact. */
export function humanizeRoleName(name?: string | null) {
  const raw = (name || '').trim();
  if (!raw) return '';
  if (!/[_-]/.test(raw) && raw !== raw.toLowerCase()) return raw;
  return raw
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}
