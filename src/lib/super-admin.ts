export function normalizeRoleKey(name?: string | null) {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

export function isSuperAdminRoleName(name?: string | null) {
  const key = normalizeRoleKey(name);
  if (!key) return false;
  return (
    key === 'super_admin' ||
    key === 'superadmin' ||
    key.includes('super_admin') ||
    key.startsWith('superadmin')
  );
}

function roleNamesFromUser(user: unknown): string[] {
  if (!user || typeof user !== 'object') return [];
  const row = user as Record<string, unknown>;
  const names: string[] = [];

  for (const field of ['role', 'roleName', 'role_name', 'roleScope', 'role_scope', 'activeRole'] as const) {
    if (typeof row[field] === 'string') names.push(row[field] as string);
  }

  const roles = row.roles;
  if (Array.isArray(roles)) {
    for (const role of roles) {
      if (typeof role === 'string') {
        names.push(role);
        continue;
      }
      if (!role || typeof role !== 'object') continue;
      const item = role as Record<string, unknown>;
      for (const field of ['name', 'slug', 'key', 'code'] as const) {
        if (typeof item[field] === 'string') names.push(item[field] as string);
      }
    }
  }
  return names;
}

function userHasSuperAdminFlag(user: unknown) {
  if (!user || typeof user !== 'object') return false;
  const row = user as Record<string, unknown>;
  return (
    row.isSuperAdmin === true ||
    row.is_super_admin === true ||
    row.superAdmin === true ||
    row.super_admin === true
  );
}

function roleNamesFromJwt(token?: string | null): string[] {
  if (!token) return [];
  try {
    const parts = token.split('.');
    if (parts.length < 2) return [];
    const json = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = json.length % 4 === 0 ? '' : '='.repeat(4 - (json.length % 4));
    const payload = JSON.parse(atob(json + pad)) as Record<string, unknown>;
    const names: string[] = [];
    for (const field of ['role', 'roleName', 'role_name', 'roleScope', 'activeRole'] as const) {
      if (typeof payload[field] === 'string') names.push(payload[field] as string);
    }
    if (Array.isArray(payload.roles)) {
      for (const role of payload.roles) {
        if (typeof role === 'string') names.push(role);
        else if (role && typeof role === 'object' && typeof (role as { name?: unknown }).name === 'string') {
          names.push((role as { name: string }).name);
        }
      }
    }
    if (payload.isSuperAdmin === true || payload.is_super_admin === true) {
      names.push('super_admin');
    }
    return names;
  } catch {
    return [];
  }
}

export function permissionSetHas(
  permissions: Iterable<string> | Set<string> | undefined,
  key: string,
) {
  const perms =
    permissions instanceof Set ? permissions : new Set(permissions ? [...permissions] : []);
  if (perms.has(key) || perms.has('ALL:ALL') || perms.has('*:*')) return true;
  const [moduleName] = key.split(':');
  if (moduleName && perms.has(`${moduleName}:*`)) return true;
  return false;
}

export function isSuperAdmin(input: {
  activeRole?: string | null;
  user?: unknown;
  permissions?: Iterable<string> | Set<string>;
  accessToken?: string | null;
}) {
  if (permissionSetHas(input.permissions, 'ALL:ALL')) return true;
  if (userHasSuperAdminFlag(input.user)) return true;
  if (isSuperAdminRoleName(input.activeRole)) return true;
  if (typeof document !== 'undefined') {
    const cookieRole = document.cookie
      .split('; ')
      .find((part) => part.startsWith('active_role='))
      ?.slice('active_role='.length);
    if (cookieRole && isSuperAdminRoleName(decodeURIComponent(cookieRole))) return true;
  }
  if (roleNamesFromUser(input.user).some(isSuperAdminRoleName)) return true;
  return roleNamesFromJwt(input.accessToken).some(isSuperAdminRoleName);
}
