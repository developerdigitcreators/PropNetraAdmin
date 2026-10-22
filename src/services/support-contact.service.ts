import { axiosClient } from '@/lib/axios-client';

export type SupportContact = {
  companyName: string;
  phone: string;
  email: string;
  whatsapp: string;
  address: string;
  latitude: string;
  longitude: string;
  mapLink: string;
};

export const emptySupportContact = (): SupportContact => ({
  companyName: '',
  phone: '',
  email: '',
  whatsapp: '',
  address: '',
  latitude: '',
  longitude: '',
  mapLink: '',
});

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

export function normalizeSupportContact(raw: unknown): SupportContact {
  const row = asRecord(raw) ?? {};
  const nested = asRecord(row.contact) ?? asRecord(row.supportContact) ?? row;
  return {
    companyName: pickString(nested.companyName, nested.company_name, nested.name),
    phone: pickString(nested.phone, nested.mobile, nested.contact),
    email: pickString(nested.email),
    whatsapp: pickString(nested.whatsapp, nested.whatsApp, nested.whats_app),
    address: pickString(nested.address),
    latitude: pickString(nested.latitude, nested.lat),
    longitude: pickString(nested.longitude, nested.lng, nested.long),
    mapLink: pickString(nested.mapLink, nested.map_link, nested.mapUrl, nested.map_url),
  };
}

function coordOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function supportContactApiError(err: unknown, fallback: string): string {
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
  if (typeof e?.message === 'string' && e.message.trim()) return e.message;
  return fallback;
}

export const supportContactService = {
  async get(): Promise<SupportContact> {
    const response = await axiosClient.get('/admin/support/contact');
    return normalizeSupportContact(response.data);
  },

  async update(payload: SupportContact): Promise<SupportContact> {
    const latitude = coordOrNull(payload.latitude);
    const longitude = coordOrNull(payload.longitude);
    const response = await axiosClient.put('/admin/support/contact', {
      companyName: payload.companyName.trim(),
      phone: payload.phone.trim(),
      email: payload.email.trim(),
      whatsapp: payload.whatsapp.trim(),
      address: payload.address.trim(),
      latitude,
      longitude,
      mapLink: payload.mapLink.trim(),
    });
    return normalizeSupportContact(response.data);
  },
};
