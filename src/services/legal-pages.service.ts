import { axiosClient } from '@/lib/axios-client';

export type LegalSlug = 'terms' | 'privacy';

export type LegalPage = {
  slug: LegalSlug;
  title: string;
  isPublished: boolean;
  updatedAt: string | null;
  sectionCount?: number;
};

const SLUGS: LegalSlug[] = ['terms', 'privacy'];

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

function asNumber(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const v = value.toLowerCase().trim();
    if (['true', '1', 'on', 'yes', 'published'].includes(v)) return true;
    if (['false', '0', 'off', 'no', 'unpublished', 'draft'].includes(v)) return false;
  }
  return fallback;
}

function asSlug(value: unknown): LegalSlug | null {
  const raw = pickString(value).toLowerCase().replace(/[\s-]+/g, '_');
  if (raw === 'terms' || raw === 'terms_and_conditions' || raw === 'terms_of_service') {
    return 'terms';
  }
  if (raw === 'privacy' || raw === 'privacy_policy') return 'privacy';
  return null;
}

function asArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  const obj = asRecord(data);
  if (!obj) return [];
  if (Array.isArray(obj.items)) return obj.items;
  if (Array.isArray(obj.pages)) return obj.pages;
  if (Array.isArray(obj.data)) return obj.data;
  return [];
}

export function normalizeLegalPage(raw: unknown, fallbackSlug?: LegalSlug): LegalPage | null {
  const row = asRecord(raw);
  if (!row) return null;
  const slug = asSlug(row.slug ?? row.key ?? row.type ?? row.id ?? row.page) ?? fallbackSlug ?? null;
  if (!slug) return null;
  const sectionCount = asNumber(row.sectionCount ?? row.section_count ?? row.sectionsCount);
  return {
    slug,
    title: pickString(row.title, row.name),
    isPublished: asBool(
      row.isPublished ?? row.is_published ?? row.published ?? row.isActive ?? row.is_active,
      false,
    ),
    updatedAt: pickString(row.updatedAt, row.updated_at) || null,
    ...(sectionCount != null ? { sectionCount } : {}),
  };
}

export function emptyLegalPage(slug: LegalSlug): LegalPage {
  return {
    slug,
    title: slug === 'terms' ? 'Terms & Conditions' : 'Privacy Policy',
    isPublished: false,
    updatedAt: null,
  };
}

export function legalApiError(err: unknown, fallback: string): string {
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

export const legalPagesService = {
  async list(): Promise<LegalPage[]> {
    const response = await axiosClient.get('/admin/legal');
    const bySlug = new Map<LegalSlug, LegalPage>();
    for (const row of asArray(response.data)) {
      const page = normalizeLegalPage(row);
      if (page) bySlug.set(page.slug, page);
    }
    const obj = asRecord(response.data);
    if (obj) {
      for (const slug of SLUGS) {
        if (bySlug.has(slug)) continue;
        const nested = normalizeLegalPage(obj[slug], slug);
        if (nested) bySlug.set(slug, nested);
      }
    }
    return SLUGS.map((slug) => bySlug.get(slug) ?? emptyLegalPage(slug));
  },

  async get(slug: LegalSlug): Promise<LegalPage> {
    const response = await axiosClient.get(`/admin/legal/${slug}`);
    return normalizeLegalPage(response.data, slug) ?? emptyLegalPage(slug);
  },

  async update(
    slug: LegalSlug,
    payload: { title?: string; isPublished?: boolean },
  ): Promise<LegalPage> {
    const response = await axiosClient.put(`/admin/legal/${slug}`, payload);
    return (
      normalizeLegalPage(response.data, slug) ?? {
        ...emptyLegalPage(slug),
        ...payload,
        title: payload.title ?? emptyLegalPage(slug).title,
        isPublished: payload.isPublished ?? false,
      }
    );
  },
};

export function htmlToPlainPreview(html: string, max = 120): string {
  if (!html?.trim()) return '—';
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '—';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
