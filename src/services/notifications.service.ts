import { axiosClient } from '@/lib/axios-client';

export const NOTIFICATION_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'listing', label: 'Listing' },
  { value: 'chat', label: 'Chat' },
  { value: 'promotional', label: 'Promotional' },
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]['value'] | string;

export type AdminNotificationUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  contact?: string | null;
};

export type AdminNotification = {
  id: string;
  title: string;
  body: string;
  type: string;
  userId?: string | null;
  userIds?: string[];
  user?: AdminNotificationUser | null;
  users?: AdminNotificationUser[];
  recipientCount?: number;
  status?: string | null;
  pushStatus?: string | null;
  pushError?: string | null;
  createdAt?: string | null;
  sentAt?: string | null;
};

export type NotificationListParams = {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
};

export type NotificationListResult = {
  items: AdminNotification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  serverPaginated: boolean;
};

export type SendNotificationPayload = {
  userId: string;
  title: string;
  body: string;
  type: string;
};

export type SendBulkNotificationPayload = {
  userIds: string[];
  title: string;
  body: string;
  type: string;
};

export type BroadcastFormat = 'text' | 'text_image';
export type BroadcastBodyFormat = 'plain' | 'markdown';
export type BroadcastLinkType = 'none' | 'post' | 'page';

export type BroadcastMedia = {
  kind: string;
  url: string;
};

export type BroadcastCta = {
  label: string;
  listingId?: string;
  screen?: string;
};

export type BroadcastPayload = {
  channelId: string;
  cityIds: string[];
  title: string;
  body: string;
  cardTitle?: string;
  cardBody?: string;
  bodyFormat?: BroadcastBodyFormat;
  format: BroadcastFormat;
  imageUrl?: string;
  media?: BroadcastMedia[];
  ctas?: BroadcastCta[];
  linkType?: BroadcastLinkType;
  listingId?: string;
  pageKey?: string;
};

export type BroadcastKeyLabel = {
  key: string;
  label: string;
};

export type BroadcastOptions = {
  channels: SystemChannel[];
  linkTypes: BroadcastKeyLabel[];
  pages: BroadcastKeyLabel[];
  mediaKinds: BroadcastKeyLabel[];
};

export type BroadcastListing = {
  id: string;
  title: string;
};

export type SystemChannel = {
  id: string;
  name: string;
  slug?: string;
  kind?: string;
};

export type BroadcastCity = {
  id: string;
  name: string;
};

export type NotificationCampaign = {
  id: string;
  title: string;
  body?: string;
  channelId?: string;
  channelName?: string;
  channelSlug?: string;
  cityIds: string[];
  cityNames: string[];
  format: string;
  status: string;
  feedItemCount: number;
  recipientCount: number;
  pushSuccessCount: number;
  errorMessage?: string | null;
  imageUrl?: string | null;
  cardTitle?: string | null;
  cardBody?: string | null;
  bodyFormat?: string | null;
  linkType?: string | null;
  listingId?: string | null;
  pageKey?: string | null;
  createdAt?: string | null;
  sentAt?: string | null;
};

export type CampaignListResult = {
  items: NotificationCampaign[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  serverPaginated: boolean;
};

export type OpsCityAlerts = {
  id?: string;
  name: string;
  count: number;
};

export type NotificationsOps = {
  cityPushKillSwitch: boolean;
  citiesWithAlertsOn: OpsCityAlerts[];
  feedLive: number;
  feedExpiredPending: number;
  campaignsSent: number;
  campaignsFailed: number;
  fcmFailedJobs: number;
  lastCleanupAt?: string | null;
  lastCleanupCount?: number | null;
};

export const PROPNETRA_UPDATES_SLUG = 'propnetra_updates';
export const MAX_BROADCAST_CITIES = 50;

const PROPNETRA_UPDATES_QUERY = {
  channel: PROPNETRA_UPDATES_SLUG,
  slug: PROPNETRA_UPDATES_SLUG,
};

export const DEFAULT_BROADCAST_LINK_TYPES: BroadcastKeyLabel[] = [
  { key: 'none', label: 'Off' },
  { key: 'post', label: 'Listing / project' },
  { key: 'page', label: 'Internal page' },
];

export const DEFAULT_BROADCAST_MEDIA_KINDS: BroadcastKeyLabel[] = [
  { key: 'image', label: 'Image' },
  { key: 'pdf', label: 'PDF' },
  { key: 'video', label: 'Video' },
];

function str(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function asUser(raw: unknown): AdminNotificationUser | null {
  if (!raw || typeof raw !== 'object') return null;
  const u = raw as Record<string, unknown>;
  return {
    id: str(u.id || u.userId || u.user_id) || undefined,
    name: (u.name as string) ?? null,
    email: (u.email as string) ?? null,
    contact: (u.contact as string) ?? (u.phone as string) ?? null,
  };
}

function asUsers(raw: unknown): AdminNotificationUser[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(asUser).filter((u): u is AdminNotificationUser => !!u);
}

export function normalizeNotification(raw: unknown): AdminNotification {
  const n = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const user = asUser(n.user || n.recipient);
  const users = asUsers(n.users || n.recipients);
  const userIds = Array.isArray(n.userIds)
    ? (n.userIds as unknown[]).map(str).filter(Boolean)
    : Array.isArray(n.user_ids)
      ? (n.user_ids as unknown[]).map(str).filter(Boolean)
      : [];
  const userId = str(n.userId || n.user_id || user?.id) || null;
  const recipientCount =
    Number(n.recipientCount ?? n.recipient_count ?? n.sentCount ?? n.sent_count) ||
    users.length ||
    userIds.length ||
    (userId ? 1 : 0);

  return {
    id: str(n.id),
    title: str(n.title),
    body: str(n.body || n.message),
    type: str(n.type || 'general'),
    userId,
    userIds,
    user,
    users,
    recipientCount,
    status: str(n.pushStatus || n.push_status || n.status) || null,
    pushStatus: str(n.pushStatus || n.push_status) || null,
    pushError: str(n.pushError || n.push_error || n.errorMessage || n.error_message) || null,
    createdAt: str(n.createdAt || n.created_at || n.sentAt || n.sent_at) || null,
    sentAt: str(n.sentAt || n.sent_at) || null,
  };
}

function asNamedList(data: unknown): BroadcastCity[] {
  const raw = Array.isArray(data)
    ? data
    : data && typeof data === 'object'
      ? ((data as Record<string, unknown>).items ||
          (data as Record<string, unknown>).cities ||
          (data as Record<string, unknown>).data ||
          [])
      : [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const r = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>;
      const id = str(r.id);
      const name = str(r.name || r.title);
      if (!id || !name) return null;
      return { id, name };
    })
    .filter((c): c is BroadcastCity => !!c);
}

function asChannels(data: unknown): SystemChannel[] {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    if (obj.id || obj.slug || obj.key) {
      return asChannels([obj]);
    }
  }
  const raw = Array.isArray(data)
    ? data
    : data && typeof data === 'object'
      ? ((data as Record<string, unknown>).items ||
          (data as Record<string, unknown>).channels ||
          (data as Record<string, unknown>).data ||
          [])
      : [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const r = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>;
      const id = str(r.id || r.channelId || r.channel_id || r.slug || r.key);
      const name = str(r.name || r.title || r.label || r.slug || r.key);
      if (!id) return null;
      return {
        id,
        name: name || id,
        slug: str(r.slug || r.key) || undefined,
        kind: str(r.kind || r.type) || undefined,
      };
    })
    .filter((c): c is SystemChannel => !!c);
}

export function isPropNetraUpdatesChannel(channel?: {
  slug?: string | null;
  name?: string | null;
} | null): boolean {
  if (!channel) return false;
  const slug = (channel.slug || '').toLowerCase().replace(/-/g, '_');
  const name = (channel.name || '').toLowerCase();
  return slug === PROPNETRA_UPDATES_SLUG || name.includes('propnetra updates');
}

export function isAdminBroadcastCampaign(campaign: NotificationCampaign): boolean {
  if (!campaign.channelSlug && !campaign.channelName) return true;
  return isPropNetraUpdatesChannel({
    slug: campaign.channelSlug,
    name: campaign.channelName,
  });
}

export function adminBroadcastChannels(channels: SystemChannel[]): SystemChannel[] {
  return channels.filter(isPropNetraUpdatesChannel);
}

function asArrayUnknown(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.rows)) return obj.rows;
  }
  return [];
}

function asKeyLabelList(raw: unknown): BroadcastKeyLabel[] {
  return asArrayUnknown(raw)
    .map((item) => {
      if (typeof item === 'string') {
        const key = item.trim();
        return key ? { key, label: key } : null;
      }
      if (!item || typeof item !== 'object') return null;
      const r = item as Record<string, unknown>;
      const key = str(r.key || r.value || r.id || r.slug);
      if (!key) return null;
      return { key, label: str(r.label || r.name || r.title) || key };
    })
    .filter((item): item is BroadcastKeyLabel => !!item);
}

function normalizeLinkTypeKey(key: string): BroadcastLinkType | string {
  const k = key.toLowerCase().trim();
  if (k === 'off' || k === 'none' || k === 'no_link' || k === 'nolink') return 'none';
  if (k === 'post' || k === 'listing' || k === 'developer_post') return 'post';
  if (k === 'page' || k === 'internal' || k === 'internal_page') return 'page';
  return k;
}

function asListings(data: unknown): BroadcastListing[] {
  return asArrayUnknown(data)
    .map((row) => {
      const r = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>;
      const id = str(r.id || r.listingId || r.listing_id);
      const title =
        str(
          r.title ||
            r.name ||
            r.displayTitle ||
            r.display_title ||
            (r.property_name && typeof r.property_name === 'object'
              ? (r.property_name as Record<string, unknown>).name
              : ''),
        ) || id;
      if (!id) return null;
      return { id, title };
    })
    .filter((item): item is BroadcastListing => !!item);
}

export function normalizeBroadcastOptions(raw: unknown): BroadcastOptions {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const nested =
    obj.options && typeof obj.options === 'object' && !Array.isArray(obj.options)
      ? (obj.options as Record<string, unknown>)
      : obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)
        ? (obj.data as Record<string, unknown>)
        : obj;
  const linkTypes = asKeyLabelList(nested.linkTypes || nested.link_types).map((item) => ({
    key: String(normalizeLinkTypeKey(item.key)),
    label: item.label,
  }));
  const pages = asKeyLabelList(nested.pages);
  const mediaKinds = asKeyLabelList(
    nested.mediaKinds || nested.media_kinds || nested.mediaTypes || nested.media_types,
  );
  const channels = adminBroadcastChannels(asChannels(nested.channels || nested.channel));
  return {
    channels,
    linkTypes: linkTypes.length ? linkTypes : DEFAULT_BROADCAST_LINK_TYPES,
    pages,
    mediaKinds: mediaKinds.length ? mediaKinds : DEFAULT_BROADCAST_MEDIA_KINDS,
  };
}

function asStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(str).filter(Boolean);
}

export function normalizeCampaign(raw: unknown): NotificationCampaign {
  const n = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const channel =
    n.channel && typeof n.channel === 'object'
      ? (n.channel as Record<string, unknown>)
      : null;
  const citiesRaw = n.cities || n.cityNames || n.city_names;
  const cityNames = Array.isArray(citiesRaw)
    ? citiesRaw
        .map((c) =>
          typeof c === 'string'
            ? c
            : c && typeof c === 'object'
              ? str((c as Record<string, unknown>).name)
              : '',
        )
        .filter(Boolean)
    : [];
  const cityIds = asStringArray(n.cityIds || n.city_ids);
  const format = str(n.format || 'text') || 'text';

  return {
    id: str(n.id),
    title: str(n.title || n.cardTitle || n.card_title),
    body: str(n.body || n.cardBody || n.card_body) || undefined,
    channelId: str(n.channelId || n.channel_id || channel?.id) || undefined,
    channelName: str(n.channelName || n.channel_name || channel?.name || channel?.slug) || undefined,
    channelSlug: str(n.channelSlug || n.channel_slug || channel?.slug || channel?.key) || undefined,
    cityIds,
    cityNames,
    format,
    status: str(n.status) || 'pending',
    feedItemCount: Number(n.feedItemCount ?? n.feed_item_count ?? 0) || 0,
    recipientCount: Number(n.recipientCount ?? n.recipient_count ?? n.pushCount ?? n.push_count ?? 0) || 0,
    pushSuccessCount:
      Number(
        n.pushSuccessCount ??
          n.push_success_count ??
          n.pushOkCount ??
          n.push_ok_count ??
          0,
      ) || 0,
    errorMessage: str(n.errorMessage || n.error_message) || null,
    imageUrl: str(n.imageUrl || n.image_url) || null,
    cardTitle: str(n.cardTitle || n.card_title) || null,
    cardBody: str(n.cardBody || n.card_body) || null,
    bodyFormat: str(n.bodyFormat || n.body_format) || null,
    linkType: str(n.linkType || n.link_type) || null,
    listingId: str(n.listingId || n.listing_id) || null,
    pageKey: str(n.pageKey || n.page_key) || null,
    createdAt: str(n.createdAt || n.created_at) || null,
    sentAt: str(n.sentAt || n.sent_at) || null,
  };
}

function asCampaignListResult(data: unknown, page: number, limit: number): CampaignListResult {
  if (Array.isArray(data)) {
    const items = data.map(normalizeCampaign);
    return {
      items,
      total: items.length,
      page: 1,
      limit: items.length || limit,
      totalPages: 1,
      serverPaginated: false,
    };
  }

  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const rawItems = obj.items || obj.campaigns || obj.data || obj.rows;
    const items = Array.isArray(rawItems) ? rawItems.map(normalizeCampaign) : [];
    const hasPaging =
      obj.total != null || obj.page != null || obj.totalPages != null || obj.limit != null;
    const total = Number(obj.total ?? obj.count ?? items.length) || items.length;
    const p = Number(obj.page ?? page) || page;
    const l = Number(obj.limit ?? obj.pageSize ?? obj.perPage ?? limit) || limit;
    const totalPages = Number(obj.totalPages ?? obj.total_pages ?? Math.max(1, Math.ceil(total / l))) || 1;
    return {
      items,
      total,
      page: p,
      limit: l,
      totalPages,
      serverPaginated: hasPaging,
    };
  }

  return { items: [], total: 0, page, limit, totalPages: 1, serverPaginated: false };
}

function asListResult(data: unknown, page: number, limit: number): NotificationListResult {
  if (Array.isArray(data)) {
    const items = data.map(normalizeNotification);
    return {
      items,
      total: items.length,
      page: 1,
      limit: items.length || limit,
      totalPages: 1,
      serverPaginated: false,
    };
  }

  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const rawItems = obj.items || obj.notifications || obj.data || obj.rows;
    const items = Array.isArray(rawItems) ? rawItems.map(normalizeNotification) : [];
    const hasPaging =
      obj.total != null || obj.page != null || obj.totalPages != null || obj.limit != null;
    const total = Number(obj.total ?? obj.count ?? items.length) || items.length;
    const p = Number(obj.page ?? page) || page;
    const l = Number(obj.limit ?? obj.pageSize ?? obj.perPage ?? limit) || limit;
    const totalPages = Number(obj.totalPages ?? obj.total_pages ?? Math.max(1, Math.ceil(total / l))) || 1;
    return {
      items,
      total,
      page: p,
      limit: l,
      totalPages,
      serverPaginated: hasPaging,
    };
  }

  return { items: [], total: 0, page, limit, totalPages: 1, serverPaginated: false };
}

export function notificationApiError(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: unknown; error?: unknown } }; message?: string };
  const msg = e?.response?.data?.message ?? e?.response?.data?.error;
  if (Array.isArray(msg)) return msg.filter(Boolean).join(', ');
  if (typeof msg === 'string' && msg.trim()) return msg;
  return e?.message || fallback;
}

export function broadcastLinkTypeLabel(item: BroadcastKeyLabel): string {
  const key = item.key.toLowerCase();
  const label = (item.label || '').trim();
  if (key === 'post' && (!label || label.toLowerCase() === 'post')) return 'Listing / project';
  if (key === 'page' && (!label || label.toLowerCase() === 'page')) return 'Internal page';
  return label || item.key;
}

function asBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const v = value.toLowerCase().trim();
    return v === 'true' || v === '1' || v === 'on';
  }
  return false;
}

function asNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeOps(raw: unknown): NotificationsOps {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const nested =
    obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)
      ? (obj.data as Record<string, unknown>)
      : obj;
  const feed =
    nested.feed && typeof nested.feed === 'object'
      ? (nested.feed as Record<string, unknown>)
      : {};
  const campaigns =
    nested.campaigns && typeof nested.campaigns === 'object'
      ? (nested.campaigns as Record<string, unknown>)
      : {};
  const cleanupRaw = nested.lastCleanup ?? nested.last_cleanup;
  const cleanup =
    cleanupRaw && typeof cleanupRaw === 'object'
      ? (cleanupRaw as Record<string, unknown>)
      : null;

  const citiesRaw =
    nested.citiesWithAlertsOn ||
    nested.cities_with_alerts_on ||
    nested.citiesWithAlerts ||
    nested.cities;
  const citiesWithAlertsOn: OpsCityAlerts[] = asArrayUnknown(citiesRaw)
    .map((row) => {
      if (typeof row === 'string') return { name: row, count: 0 };
      const r = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>;
      const name = str(r.name || r.cityName || r.city_name || r.title);
      if (!name) return null;
      return {
        id: str(r.id || r.cityId || r.city_id) || undefined,
        name,
        count: asNum(r.count ?? r.alertsOn ?? r.alerts_on ?? r.users),
      };
    })
    .filter((c): c is OpsCityAlerts => !!c);

  return {
    cityPushKillSwitch: asBool(
      nested.cityPushKillSwitch ?? nested.city_push_kill_switch ?? nested.killSwitch ?? nested.kill_switch,
    ),
    citiesWithAlertsOn,
    feedLive: asNum(feed.live ?? nested.feedLive ?? nested.feed_live),
    feedExpiredPending: asNum(
      feed.expiredPending ?? feed.expired_pending ?? nested.feedExpiredPending ?? nested.feed_expired_pending,
    ),
    campaignsSent: asNum(campaigns.sent ?? nested.campaignsSent ?? nested.campaigns_sent),
    campaignsFailed: asNum(campaigns.failed ?? nested.campaignsFailed ?? nested.campaigns_failed),
    fcmFailedJobs: asNum(
      nested.fcmFailedJobs ?? nested.fcm_failed_jobs ?? nested.failedJobs ?? nested.failed_jobs,
    ),
    lastCleanupAt:
      str(cleanup?.at ?? cleanup?.createdAt ?? cleanup?.created_at ?? (typeof cleanupRaw === 'string' ? cleanupRaw : '')) ||
      null,
    lastCleanupCount:
      cleanup || nested.lastCleanupCount != null || nested.last_cleanup_count != null
        ? asNum(cleanup?.count ?? nested.lastCleanupCount ?? nested.last_cleanup_count)
        : null,
  };
}

export const notificationsService = {
  getNotifications: async (params: NotificationListParams = {}): Promise<NotificationListResult> => {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const query: Record<string, string | number> = { page, limit };
    if (params.search?.trim()) query.search = params.search.trim();
    if (params.type?.trim()) query.type = params.type.trim();
    const response = await axiosClient.get('/admin/notifications', { params: query });
    return asListResult(response.data, page, limit);
  },

  send: async (payload: SendNotificationPayload) => {
    const response = await axiosClient.post('/admin/notifications/send', payload);
    return response.data;
  },

  sendBulk: async (payload: SendBulkNotificationPayload) => {
    const response = await axiosClient.post('/admin/notifications/send-bulk', payload);
    return response.data;
  },

  getBroadcastCities: async (): Promise<BroadcastCity[]> => {
    try {
      const response = await axiosClient.get('/cities');
      return asNamedList(response.data);
    } catch {
      const response = await axiosClient.get('/admin/cities');
      return asNamedList(response.data);
    }
  },

  getBroadcastOptions: async (): Promise<BroadcastOptions> => {
    const response = await axiosClient.get('/admin/notifications/broadcast-options');
    return normalizeBroadcastOptions(response.data);
  },

  getPublishedListings: async (params: {
    cityId?: string;
    search?: string;
  } = {}): Promise<BroadcastListing[]> => {
    const query: Record<string, string | number> = { status: 'published', limit: 50 };
    if (params.cityId) query.cityId = params.cityId;
    if (params.search?.trim()) {
      query.search = params.search.trim();
      query.q = params.search.trim();
    }

    try {
      const response = await axiosClient.get('/admin/listings', { params: query });
      const items = asListings(response.data);
      if (items.length) return items;
    } catch {
      /* try review queue next */
    }

    try {
      const response = await axiosClient.get('/admin/listings/review', {
        params: { tab: 'verified', page: 1, limit: 50, ...(params.search?.trim() ? { search: params.search.trim() } : {}) },
      });
      const items = asListings(response.data);
      if (items.length) return items;
    } catch {
      /* try ads posts next */
    }

    if (params.cityId) {
      try {
        const response = await axiosClient.get('/admin/ads/posts', {
          params: {
            cityId: params.cityId,
            ...(params.search?.trim() ? { q: params.search.trim() } : {}),
          },
        });
        return asListings(response.data);
      } catch {
        return [];
      }
    }

    return [];
  },

  broadcast: async (payload: BroadcastPayload) => {
    const response = await axiosClient.post('/admin/notifications/broadcast', payload);
    return response.data as { queued?: boolean; status?: string; id?: string };
  },

  getCampaigns: async (
    params: { page?: number; limit?: number } = {},
  ): Promise<CampaignListResult> => {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const response = await axiosClient.get('/admin/notifications/campaigns', {
      params: { page, limit, ...PROPNETRA_UPDATES_QUERY },
    });
    const result = asCampaignListResult(response.data, page, limit);
    const items = result.items.filter(isAdminBroadcastCampaign);
    if (items.length === result.items.length) return result;
    if (result.serverPaginated) return { ...result, items };
    return {
      ...result,
      items,
      total: items.length,
      totalPages: Math.max(1, Math.ceil(items.length / (result.limit || limit))),
    };
  },

  getCampaign: async (id: string): Promise<NotificationCampaign> => {
    const response = await axiosClient.get(`/admin/notifications/campaigns/${id}`);
    const data = response.data;
    const inner =
      data && typeof data === 'object' && 'campaign' in (data as object)
        ? (data as { campaign: unknown }).campaign
        : data;
    return normalizeCampaign(inner);
  },

  getOps: async (): Promise<NotificationsOps> => {
    const response = await axiosClient.get('/admin/notifications/ops', {
      params: PROPNETRA_UPDATES_QUERY,
    });
    return normalizeOps(response.data);
  },

  updateOps: async (payload: { cityPushKillSwitch: boolean }): Promise<NotificationsOps> => {
    const response = await axiosClient.put('/admin/notifications/ops', payload, {
      params: PROPNETRA_UPDATES_QUERY,
    });
    return normalizeOps(response.data);
  },
};
