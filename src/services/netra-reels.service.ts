import { axiosClient } from '@/lib/axios-client';
import { deleteWithRemark } from '@/lib/delete-with-remark';

export type ReelPlatform = 'youtube' | 'instagram' | 'unknown';

export type NetraReel = {
  id: string;
  sourceUrl: string;
  title: string;
  caption: string;
  thumbnailUrl: string;
  isActive: boolean;
  sortOrder: number;
  platform: ReelPlatform;
  embedUrl: string;
  videoUrl: string;
  externalId: string;
  createdAt?: string;
  updatedAt?: string;
};

export type NetraReelPreview = {
  sourceUrl: string;
  platform: ReelPlatform;
  title: string;
  caption: string;
  thumbnailUrl: string;
  embedUrl: string;
  videoUrl: string;
  externalId: string;
};

export type CreateNetraReelPayload = {
  sourceUrl: string;
  title?: string;
  caption?: string;
  thumbnailUrl?: string;
  isActive?: boolean;
};

export type UpdateNetraReelPayload = Partial<CreateNetraReelPayload> & {
  sortOrder?: number;
};

export type ParsedReelSource = {
  platform: ReelPlatform;
  externalId: string;
  embedUrl: string;
  thumbnailUrl: string;
  kind: 'shorts' | 'video' | 'reel' | 'post' | '';
};

const YOUTUBE_THUMB = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

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

function asBool(value: unknown, fallback = true): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const v = value.toLowerCase().trim();
    if (['true', '1', 'on', 'active', 'yes'].includes(v)) return true;
    if (['false', '0', 'off', 'inactive', 'no'].includes(v)) return false;
  }
  return fallback;
}

function asArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  const obj = asRecord(data);
  if (!obj) return [];
  if (Array.isArray(obj.items)) return obj.items as T[];
  if (Array.isArray(obj.reels)) return obj.reels as T[];
  if (Array.isArray(obj.data)) return obj.data as T[];
  return [];
}

export function netraReelsApiError(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: unknown; error?: unknown } }; message?: string };
  const msg = e?.response?.data?.message ?? e?.response?.data?.error;
  if (Array.isArray(msg)) return msg.filter(Boolean).join(', ');
  if (typeof msg === 'string' && msg.trim()) return msg;
  return e?.message || fallback;
}

export function parseReelSource(rawUrl: string): ParsedReelSource | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '');
  const path = url.pathname.replace(/\/+$/, '');

  if (host === 'youtu.be' || host === 'youtube.com' || host === 'music.youtube.com' || host === 'youtube-nocookie.com') {
    let id = url.searchParams.get('v') || '';
    let kind: ParsedReelSource['kind'] = 'video';
    const shorts = path.match(/\/shorts\/([A-Za-z0-9_-]{6,})/);
    const embed = path.match(/\/embed\/([A-Za-z0-9_-]{6,})/);
    const live = path.match(/\/live\/([A-Za-z0-9_-]{6,})/);
    if (host === 'youtu.be') id = path.split('/').filter(Boolean)[0] || id;
    if (shorts) {
      id = shorts[1];
      kind = 'shorts';
    } else if (embed) {
      id = embed[1];
    } else if (live) {
      id = live[1];
    }
    if (!id) return null;
    return {
      platform: 'youtube',
      externalId: id,
      kind,
      embedUrl: `https://www.youtube.com/embed/${id}`,
      thumbnailUrl: YOUTUBE_THUMB(id),
    };
  }

  if (host === 'instagram.com' || host === 'instagr.am') {
    const match = path.match(/\/(reel|reels|p|tv)\/([A-Za-z0-9_-]+)/);
    if (!match) return null;
    const type = match[1] === 'p' || match[1] === 'tv' ? match[1] : 'reel';
    const code = match[2];
    return {
      platform: 'instagram',
      externalId: code,
      kind: type === 'p' || type === 'tv' ? 'post' : 'reel',
      embedUrl: `https://www.instagram.com/${type === 'tv' ? 'tv' : type === 'p' ? 'p' : 'reel'}/${code}/embed`,
      thumbnailUrl: '',
    };
  }

  return null;
}

export function isSupportedReelUrl(url: string): boolean {
  const platform = parseReelSource(url)?.platform;
  return platform === 'youtube' || platform === 'instagram';
}

export function platformLabel(platform: ReelPlatform): string {
  if (platform === 'youtube') return 'YouTube';
  if (platform === 'instagram') return 'Instagram';
  return 'Link';
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function youtubeEmbedSrc(videoId: string, opts: { autoplay?: boolean; muted?: boolean; origin?: string } = {}): string {
  const params = new URLSearchParams({
    enablejsapi: '1',
    playsinline: '1',
    rel: '0',
    modestbranding: '1',
    fs: '0',
    iv_load_policy: '3',
    controls: '0',
    disablekb: '1',
    autoplay: opts.autoplay === false ? '0' : '1',
    mute: opts.muted === false ? '0' : '1',
  });
  if (opts.origin) params.set('origin', opts.origin);
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

function inferPlatform(raw: Record<string, unknown>, sourceUrl: string, parsed: ParsedReelSource | null): ReelPlatform {
  const explicit = pickString(raw.platform, raw.source, raw.provider).toLowerCase();
  if (explicit.includes('you')) return 'youtube';
  if (explicit.includes('insta')) return 'instagram';
  if (parsed?.platform && parsed.platform !== 'unknown') return parsed.platform;
  const fromUrl = parseReelSource(sourceUrl);
  return fromUrl?.platform || 'unknown';
}

export function normalizeNetraReel(raw: unknown, index = 0): NetraReel | null {
  const obj = asRecord(raw);
  if (!obj) return null;
  const id = pickString(obj.id, obj._id);
  const sourceUrl = pickString(obj.sourceUrl, obj.source_url, obj.url, obj.link);
  if (!id && !sourceUrl) return null;

  const parsed = parseReelSource(sourceUrl);
  const platform = inferPlatform(obj, sourceUrl, parsed);
  const externalId = pickString(obj.externalId, obj.external_id, obj.videoId, obj.video_id, obj.shortCode, obj.short_code, parsed?.externalId);
  const embedUrl = pickString(obj.embedUrl, obj.embed_url, parsed?.embedUrl);
  const videoUrl = pickString(obj.videoUrl, obj.video_url, obj.playbackUrl, obj.playback_url, obj.mediaUrl, obj.media_url);
  const thumbnailUrl = pickString(obj.thumbnailUrl, obj.thumbnail_url, obj.thumbUrl, obj.thumb_url, parsed?.thumbnailUrl);
  const sortOrderRaw = obj.sortOrder ?? obj.sort_order ?? obj.order ?? index + 1;
  const sortOrder = typeof sortOrderRaw === 'number' && Number.isFinite(sortOrderRaw) ? sortOrderRaw : Number(sortOrderRaw) || index + 1;

  return {
    id: id || `temp-${index}`,
    sourceUrl,
    title: pickString(obj.title, obj.name),
    caption: pickString(obj.caption, obj.description, obj.body),
    thumbnailUrl,
    isActive: asBool(obj.isActive ?? obj.is_active ?? obj.status, true),
    sortOrder,
    platform,
    embedUrl,
    videoUrl,
    externalId,
    createdAt: pickString(obj.createdAt, obj.created_at) || undefined,
    updatedAt: pickString(obj.updatedAt, obj.updated_at) || undefined,
  };
}

export function normalizePreview(raw: unknown, sourceUrl: string): NetraReelPreview {
  const obj = asRecord(raw) || {};
  const parsed = parseReelSource(pickString(obj.sourceUrl, obj.source_url, sourceUrl) || sourceUrl);
  const url = pickString(obj.sourceUrl, obj.source_url, sourceUrl);
  const platform = inferPlatform(obj, url, parsed);
  return {
    sourceUrl: url,
    platform,
    title: pickString(obj.title, obj.name),
    caption: pickString(obj.caption, obj.description),
    thumbnailUrl: pickString(obj.thumbnailUrl, obj.thumbnail_url, parsed?.thumbnailUrl),
    embedUrl: pickString(obj.embedUrl, obj.embed_url, parsed?.embedUrl),
    videoUrl: pickString(obj.videoUrl, obj.video_url, obj.playbackUrl, obj.mediaUrl),
    externalId: pickString(obj.externalId, obj.external_id, obj.videoId, parsed?.externalId),
  };
}

function sortReels(items: NetraReel[]): NetraReel[] {
  return [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export const netraReelsService = {
  preview: async (sourceUrl: string): Promise<NetraReelPreview> => {
    const response = await axiosClient.post('/admin/netra-reels/preview', { sourceUrl });
    return normalizePreview(response.data, sourceUrl);
  },

  list: async (): Promise<NetraReel[]> => {
    const response = await axiosClient.get('/admin/netra-reels', { params: { limit: 200 } });
    return sortReels(
      asArray<unknown>(response.data)
        .map((row, index) => normalizeNetraReel(row, index))
        .filter((row): row is NetraReel => !!row),
    );
  },

  create: async (payload: CreateNetraReelPayload): Promise<NetraReel> => {
    const response = await axiosClient.post('/admin/netra-reels', payload);
    return normalizeNetraReel(response.data) || {
      id: '',
      sourceUrl: payload.sourceUrl,
      title: payload.title || '',
      caption: payload.caption || '',
      thumbnailUrl: payload.thumbnailUrl || '',
      isActive: payload.isActive !== false,
      sortOrder: 0,
      platform: parseReelSource(payload.sourceUrl)?.platform || 'unknown',
      embedUrl: parseReelSource(payload.sourceUrl)?.embedUrl || '',
      videoUrl: '',
      externalId: parseReelSource(payload.sourceUrl)?.externalId || '',
    };
  },

  update: async (id: string, payload: UpdateNetraReelPayload): Promise<NetraReel | null> => {
    const response = await axiosClient.put(`/admin/netra-reels/${id}`, payload);
    return normalizeNetraReel(response.data);
  },

  reorder: async (orderedIds: string[]): Promise<void> => {
    await axiosClient.put('/admin/netra-reels/reorder', { orderedIds });
  },

  remove: async (id: string, remark: string): Promise<void> => {
    await deleteWithRemark(`/admin/netra-reels/${id}`, remark);
  },
};
