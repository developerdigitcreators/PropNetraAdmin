import { axiosClient } from '@/lib/axios-client';

export type RecycleBinActor = {
  id: string;
  name: string;
  email: string;
  contact: string;
  profilePhotoUrl: string;
};

export type RecycleBinItem = {
  id: string;
  moduleName: string;
  displayModule: string;
  entityLabel: string;
  remark: string;
  deletedAt: string | null;
  revokeUntil: string | null;
  hardDeleteAt: string | null;
  canRestore: boolean;
  canPermanentDelete: boolean;
  deletedBy: RecycleBinActor | null;
};

export type RecycleBinDetail = RecycleBinItem & {
  snapshot: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function pickBoolean(fallback: boolean, ...values: unknown[]): boolean {
  for (const value of values) {
    if (typeof value === 'boolean') return value;
    if (value === 1 || value === '1' || value === 'true') return true;
    if (value === 0 || value === '0' || value === 'false') return false;
  }
  return fallback;
}

function asArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  const obj = asRecord(data);
  if (!obj) return [];
  if (Array.isArray(obj.items)) return obj.items;
  if (Array.isArray(obj.records)) return obj.records;
  if (Array.isArray(obj.recycleBin)) return obj.recycleBin;
  if (Array.isArray(obj.data)) return obj.data;
  return [];
}

function normalizeActor(raw: unknown): RecycleBinActor | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = pickString(row.id, row.userId, row.user_id);
  const name = pickString(row.name, row.fullName, row.full_name);
  const email = pickString(row.email);
  const contact = pickString(row.contact, row.phone, row.mobile);
  const profilePhotoUrl = pickString(
    row.profilePhotoUrl,
    row.profile_photo_url,
    row.photoUrl,
    row.photo_url,
    row.avatar,
    row.avatarUrl,
  );
  if (!id && !name && !email) return null;
  return { id, name, email, contact, profilePhotoUrl };
}

function normalizeItem(raw: unknown): RecycleBinItem | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = pickString(row.id);
  if (!id) return null;
  const moduleName = pickString(row.moduleName, row.module_name, row.module);
  const displayModule =
    pickString(row.displayModule, row.display_module, row.moduleLabel, row.module_label) ||
    moduleName
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  return {
    id,
    moduleName,
    displayModule: displayModule || 'Record',
    entityLabel: pickString(row.entityLabel, row.entity_label, row.label, row.name, row.title),
    remark: pickString(row.remark, row.reason, row.deleteRemark, row.delete_remark),
    deletedAt: pickString(row.deletedAt, row.deleted_at, row.createdAt, row.created_at) || null,
    revokeUntil:
      pickString(row.revokeUntil, row.revoke_until, row.restoreUntil, row.restore_until) || null,
    hardDeleteAt:
      pickString(
        row.hardDeleteAt,
        row.hard_delete_at,
        row.permanentDeleteAt,
        row.permanent_delete_at,
      ) || null,
    canRestore: pickBoolean(
      true,
      row.canRestore,
      row.can_restore,
      row.canRevoke,
      row.can_revoke,
    ),
    canPermanentDelete: pickBoolean(
      false,
      row.canPermanentDelete,
      row.can_permanent_delete,
      row.canHardDelete,
      row.can_hard_delete,
    ),
    deletedBy: normalizeActor(row.deletedBy ?? row.deleted_by ?? row.deleter),
  };
}

function normalizeDetail(raw: unknown): RecycleBinDetail | null {
  const item = normalizeItem(raw);
  if (!item) return null;
  const row = asRecord(raw);
  const snapshot =
    row?.snapshot ??
    row?.original ??
    row?.originalRecord ??
    row?.original_record ??
    row?.payload ??
    null;
  return { ...item, snapshot };
}

export function recycleBinApiError(err: unknown, fallback: string): string {
  const e = err as {
    response?: { data?: { message?: unknown; error?: unknown } };
    message?: string;
  };
  const nested = e?.response?.data;
  const fromError =
    nested && typeof nested === 'object' && 'error' in nested
      ? (nested as { error?: { message?: unknown } }).error?.message
      : undefined;
  const msg = fromError ?? nested?.message ?? nested?.error;
  if (Array.isArray(msg)) return msg.filter(Boolean).join(', ');
  if (typeof msg === 'string' && msg.trim()) return msg;
  return e?.message || fallback;
}

export const recycleBinService = {
  list: async (): Promise<RecycleBinItem[]> => {
    const response = await axiosClient.get('/admin/recycle-bin');
    return asArray(response.data)
      .map(normalizeItem)
      .filter((row): row is RecycleBinItem => !!row);
  },

  get: async (id: string): Promise<RecycleBinDetail | null> => {
    const response = await axiosClient.get(`/admin/recycle-bin/${id}`);
    return normalizeDetail(response.data);
  },

  restore: async (id: string): Promise<void> => {
    await axiosClient.post(`/admin/recycle-bin/${id}/restore`);
  },

  removePermanently: async (id: string): Promise<void> => {
    await axiosClient.delete(`/admin/recycle-bin/${id}`);
  },
};
