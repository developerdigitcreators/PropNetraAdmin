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

export type BroadcastPushAction = {
  iconUrl?: string;
  label: string;
  deepLink: string;
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
  layoutType?: string;
  bgColor?: string;
  countdownEndsAt?: string;
  actions?: BroadcastPushAction[];
  progressMax?: number;
  progress?: number;
  progressIndeterminate?: boolean;
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
  layoutTypes: BroadcastKeyLabel[];
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
  stateId?: string;
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
  media: BroadcastMedia[];
  layoutType?: string | null;
  bgColor?: string | null;
  countdownEndsAt?: string | null;
  actions: BroadcastPushAction[];
  progressMax?: number | null;
  progress?: number | null;
  progressIndeterminate?: boolean;
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

export type UpdateCampaignPayload = {
  title?: string;
  body?: string;
  cardTitle?: string;
  cardBody?: string;
  bodyFormat?: BroadcastBodyFormat;
  format?: BroadcastFormat;
  imageUrl?: string;
  media?: BroadcastMedia[];
  ctas?: BroadcastCta[];
  linkType?: BroadcastLinkType;
  listingId?: string;
  pageKey?: string;
  layoutType?: string;
  bgColor?: string | null;
  countdownEndsAt?: string | null;
  actions?: BroadcastPushAction[];
  progressMax?: number | null;
  progress?: number | null;
  progressIndeterminate?: boolean;
};

/** A Groups channel as the app sees it. PropNetra Updates has allowAdminBroadcast. */
export type ConnectChannel = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  sortOrder: number;
  allowAdminBroadcast: boolean;
  source: string;
};

export type ConnectFeedItem = {
  id: string;
  channelId: string;
  cityId: string;
  listingId?: string | null;
  event?: string | null;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  expiresAt?: string | null;
  createdAt?: string | null;
};

export type ConnectFeedResult = {
  items: ConnectFeedItem[];
  cityName: string;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type InboxUser = {
  id: string;
  name: string;
  contact: string;
  email: string;
  status?: string | null;
  profilePhotoUrl?: string | null;
};

export type InboxCategory = {
  key: string;
  label: string;
  available: boolean;
  count: number;
  unreadCount: number;
  lastMessage?: string;
  lastMessageAt?: string | null;
};

export type InboxMessage = {
  id: string;
  title: string;
  body: string;
  type: string;
  category?: string;
  data: Record<string, string>;
  isRead: boolean;
  readAt?: string | null;
  pushStatus?: string | null;
  pushError?: string | null;
  createdAt?: string | null;
  thread?: boolean;
  threadId?: string;
  items?: InboxMessage[];
};

export type InboxOverview = {
  user: InboxUser;
  categories: InboxCategory[];
  leads: InboxMessage[];
};

export type InboxMessageListResult = {
  items: InboxMessage[];
  category?: string;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export const INBOX_LEAD_EVENTS = ['listing.interest', 'listing.contacted'] as const;

export type InAppPopupStatus = 'draft' | 'active' | 'expired' | 'inactive';

export type PopupAudience =
  | 'all'
  | 'elite'
  | 'pro'
  | 'network'
  | 'network_unsubscribed'
  | 'network_subscribed';

export type PopupPlaceScope = 'global' | 'state' | 'city';

export type PopupAudienceOption = BroadcastKeyLabel & {
  children?: PopupAudienceOption[];
};

export type InAppPopup = {
  id: string;
  title: string;
  body: string;
  bodyFormat: BroadcastBodyFormat;
  imageUrl?: string | null;
  ctaLabel: string;
  stateIds: string[];
  stateNames: string[];
  cityIds: string[];
  cityNames: string[];
  audience: PopupAudience;
  audienceLabel: string;
  placeScope: PopupPlaceScope;
  linkType: BroadcastLinkType;
  listingId?: string | null;
  pageKey?: string | null;
  pageLabel?: string | null;
  screen?: string | null;
  isActive: boolean;
  status: InAppPopupStatus;
  seenCount: number;
  publishedAt?: string | null;
  expiresAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type InAppPopupOptions = {
  linkTypes: BroadcastKeyLabel[];
  pageKeys: BroadcastKeyLabel[];
  bodyFormats: BroadcastKeyLabel[];
  audiences: PopupAudienceOption[];
};

export type InAppPopupListResult = {
  items: InAppPopup[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  serverPaginated: boolean;
};

export type CreateInAppPopupPayload = {
  title: string;
  body: string;
  bodyFormat?: BroadcastBodyFormat;
  imageUrl?: string;
  ctaLabel?: string;
  stateIds?: string[];
  cityIds?: string[];
  audience?: PopupAudience;
  linkType?: BroadcastLinkType;
  listingId?: string;
  pageKey?: string;
  publish?: boolean;
};

export type UpdateInAppPopupPayload = {
  title?: string;
  body?: string;
  bodyFormat?: BroadcastBodyFormat;
  imageUrl?: string | null;
  ctaLabel?: string;
  stateIds?: string[];
  cityIds?: string[];
  audience?: PopupAudience;
  linkType?: BroadcastLinkType;
  listingId?: string | null;
  pageKey?: string | null;
  isActive?: boolean;
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

export const DEFAULT_PUSH_LAYOUT_TYPES: BroadcastKeyLabel[] = [
  { key: 'COUNTDOWN', label: 'Countdown' },
  { key: 'MULTI_ACTION', label: 'Multi-action' },
  { key: 'PROGRESS', label: 'Progress' },
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
      const stateObj =
        r.state && typeof r.state === 'object'
          ? (r.state as Record<string, unknown>)
          : null;
      const stateId = str(r.stateId || r.state_id || stateObj?.id) || undefined;
      return { id, name, ...(stateId ? { stateId } : {}) };
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
      const channel: SystemChannel = {
        id,
        name: name || id,
        slug: str(r.slug || r.key) || undefined,
        kind: str(r.kind || r.type) || undefined,
      };
      return channel;
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

export function isLeadInboxMessage(item?: InboxMessage | null): boolean {
  if (!item) return false;
  const event = str(item.data?.event);
  if (INBOX_LEAD_EVENTS.includes(event as (typeof INBOX_LEAD_EVENTS)[number])) {
    return true;
  }
  if (item.thread) return true;
  return (item.items || []).some((row) => isLeadInboxMessage(row));
}

export function inboxEventOf(item?: InboxMessage | null): string {
  return str(item?.data?.event);
}

export function leadThreadKey(item?: InboxMessage | null): string {
  if (!item) return '';
  if (item.threadId) return item.threadId;
  const actor = str(item.data?.actorUserId);
  const event = inboxEventOf(item);
  if (actor && event) return `${event}:${actor}`;
  return item.id;
}

function asInboxData(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    out[key] = value == null ? '' : String(value);
  }
  return out;
}

export function normalizeInboxMessage(raw: unknown): InboxMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const n = raw as Record<string, unknown>;
  const id = str(n.id);
  if (!id) return null;
  const nested = Array.isArray(n.items)
    ? n.items
        .map(normalizeInboxMessage)
        .filter((row): row is InboxMessage => !!row)
    : undefined;
  return {
    id,
    title: str(n.title),
    body: str(n.body || n.message),
    type: str(n.type || 'general'),
    category: str(n.category) || undefined,
    data: asInboxData(n.data),
    isRead: n.isRead === true || n.is_read === true,
    readAt: str(n.readAt || n.read_at) || null,
    pushStatus: str(n.pushStatus || n.push_status) || null,
    pushError: str(n.pushError || n.push_error) || null,
    createdAt: str(n.createdAt || n.created_at) || null,
    thread: n.thread === true,
    threadId: str(n.threadId || n.thread_id) || undefined,
    items: nested,
  };
}

function normalizeInboxUser(raw: unknown): InboxUser | null {
  if (!raw || typeof raw !== 'object') return null;
  const u = raw as Record<string, unknown>;
  const id = str(u.id);
  if (!id) return null;
  return {
    id,
    name: str(u.name) || 'User',
    contact: str(u.contact || u.phone),
    email: str(u.email),
    status: str(u.status) || null,
    profilePhotoUrl: str(u.profilePhotoUrl || u.profile_photo_url) || null,
  };
}

function normalizeInboxCategory(raw: unknown): InboxCategory | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;
  const key = str(c.key || c.id);
  if (!key) return null;
  return {
    key,
    label: str(c.label || c.name) || key,
    available: c.available !== false,
    count: Number(c.count) || 0,
    unreadCount: Number(c.unreadCount ?? c.unread_count) || 0,
    lastMessage: str(c.lastMessage || c.last_message) || undefined,
    lastMessageAt: str(c.lastMessageAt || c.last_message_at) || null,
  };
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
  const pages = asKeyLabelList(nested.pages || nested.pageKeys || nested.page_keys);
  const mediaKinds = asKeyLabelList(
    nested.mediaKinds || nested.media_kinds || nested.mediaTypes || nested.media_types,
  );
  const layoutTypes = asKeyLabelList(nested.layoutTypes || nested.layout_types)
    .map((item) => ({
      key: item.key.toUpperCase(),
      label: item.label,
    }))
    .filter((item) =>
      ['COUNTDOWN', 'MULTI_ACTION', 'PROGRESS'].includes(item.key),
    );
  const channels = adminBroadcastChannels(asChannels(nested.channels || nested.channel));
  return {
    channels,
    linkTypes: linkTypes.length ? linkTypes : DEFAULT_BROADCAST_LINK_TYPES,
    pages,
    mediaKinds: mediaKinds.length ? mediaKinds : DEFAULT_BROADCAST_MEDIA_KINDS,
    layoutTypes: layoutTypes.length ? layoutTypes : DEFAULT_PUSH_LAYOUT_TYPES,
  };
}

export function asMediaList(raw: unknown): BroadcastMedia[] {
  return asArrayUnknown(raw)
    .map((row) => {
      const r = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>;
      const url = str(r.url).trim();
      if (!url) return null;
      return { kind: str(r.kind || r.type) || 'image', url };
    })
    .filter((m): m is BroadcastMedia => !!m);
}

function asPushActions(raw: unknown): BroadcastPushAction[] {
  return asArrayUnknown(raw)
    .map((row) => {
      const r = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>;
      const label = str(r.label).trim();
      const deepLink = str(r.deepLink || r.deep_link || r.pageKey || r.page_key).trim();
      if (!label && !deepLink) return null;
      const iconUrl = str(r.iconUrl || r.icon_url).trim();
      return {
        label,
        deepLink,
        ...(iconUrl ? { iconUrl } : {}),
      };
    })
    .filter((item): item is BroadcastPushAction => !!item);
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
    media: asMediaList(n.media),
    layoutType: str(n.layoutType || n.layout_type).toUpperCase() || null,
    bgColor: str(n.bgColor || n.bg_color) || null,
    countdownEndsAt: str(n.countdownEndsAt || n.countdown_ends_at) || null,
    actions: asPushActions(n.actions),
    progressMax:
      n.progressMax != null || n.progress_max != null
        ? asNum(n.progressMax ?? n.progress_max)
        : null,
    progress:
      n.progress != null ? asNum(n.progress) : null,
    progressIndeterminate:
      n.progressIndeterminate === true || n.progress_indeterminate === true,
    createdAt: str(n.createdAt || n.created_at) || null,
    sentAt: str(n.sentAt || n.sent_at) || null,
  };
}

export function normalizeConnectChannel(raw: unknown): ConnectChannel | null {
  const c = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const id = str(c.id);
  if (!id) return null;
  const slug = str(c.slug || c.key);
  const allowAdminBroadcast =
    c.allowAdminBroadcast === true ||
    c.allow_admin_broadcast === true ||
    isPropNetraUpdatesChannel({ slug, name: str(c.name) });
  return {
    id,
    slug,
    name: str(c.name || c.title) || slug || id,
    kind: str(c.kind || c.type) || 'system',
    sortOrder: Number(c.sortOrder ?? c.sort_order ?? 0) || 0,
    allowAdminBroadcast,
    source: str(c.source) || (allowAdminBroadcast ? 'admin' : 'listing'),
  };
}

export function normalizeConnectFeedItem(raw: unknown): ConnectFeedItem | null {
  const f = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const id = str(f.id);
  if (!id) return null;
  const payload =
    f.payload && typeof f.payload === 'object' && !Array.isArray(f.payload)
      ? (f.payload as Record<string, unknown>)
      : {};
  return {
    id,
    channelId: str(f.channelId || f.channel_id),
    cityId: str(f.cityId || f.city_id),
    listingId: str(f.listingId || f.listing_id) || null,
    event: str(f.event) || null,
    title: str(f.title),
    body: str(f.body),
    payload,
    expiresAt: str(f.expiresAt || f.expires_at) || null,
    createdAt: str(f.createdAt || f.created_at) || null,
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

function asPopupListResult(data: unknown, page: number, limit: number): InAppPopupListResult {
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const meta =
      obj.meta && typeof obj.meta === 'object'
        ? (obj.meta as Record<string, unknown>)
        : obj;
    const rawItems = obj.items || obj.popups || obj.data || obj.rows;
    const items = Array.isArray(rawItems) ? rawItems.map(normalizeInAppPopup) : [];
    const hasPaging =
      meta.total != null || meta.page != null || meta.totalPages != null || meta.limit != null;
    const total = Number(meta.total ?? obj.total ?? items.length) || items.length;
    const p = Number(meta.page ?? obj.page ?? page) || page;
    const l = Number(meta.limit ?? obj.limit ?? limit) || limit;
    const totalPages =
      Number(meta.totalPages ?? meta.total_pages ?? Math.max(1, Math.ceil(total / l))) || 1;
    return {
      items,
      total,
      page: p,
      limit: l,
      totalPages,
      serverPaginated: hasPaging,
    };
  }

  if (Array.isArray(data)) {
    const items = data.map(normalizeInAppPopup);
    return {
      items,
      total: items.length,
      page: 1,
      limit: items.length || limit,
      totalPages: 1,
      serverPaginated: false,
    };
  }

  return { items: [], total: 0, page, limit, totalPages: 1, serverPaginated: false };
}

export function normalizeInAppPopup(raw: unknown): InAppPopup {
  const n = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const cityIds = asStringArray(n.cityIds || n.city_ids);
  const cityNamesRaw = n.cityNames ?? n.city_names;
  const cityNames = Array.isArray(cityNamesRaw)
    ? cityNamesRaw
        .map((c) => (typeof c === 'string' ? c : str((c as Record<string, unknown>)?.name)))
        .filter(Boolean)
    : [];
  const linkTypeRaw = str(n.linkType || n.link_type || 'none').toLowerCase();
  const linkType = (
    linkTypeRaw === 'post' || linkTypeRaw === 'page' ? linkTypeRaw : 'none'
  ) as BroadcastLinkType;
  const statusRaw = str(n.status).toLowerCase();
  const status: InAppPopupStatus =
    statusRaw === 'draft' ||
    statusRaw === 'active' ||
    statusRaw === 'expired' ||
    statusRaw === 'inactive'
      ? statusRaw
      : 'inactive';
  const stateIds = asStringArray(n.stateIds || n.state_ids);
  const stateNamesRaw = n.stateNames ?? n.state_names;
  const stateNames = Array.isArray(stateNamesRaw)
    ? stateNamesRaw
        .map((s) => (typeof s === 'string' ? s : str((s as Record<string, unknown>)?.name)))
        .filter(Boolean)
    : [];
  const audienceRaw = str(n.audience || 'all').toLowerCase();
  const audience = (
    [
      'all',
      'elite',
      'pro',
      'network',
      'network_unsubscribed',
      'network_subscribed',
    ] as const
  ).includes(audienceRaw as PopupAudience)
    ? (audienceRaw as PopupAudience)
    : 'all';
  const placeScopeRaw = str(n.placeScope || n.place_scope).toLowerCase();
  const placeScope: PopupPlaceScope =
    placeScopeRaw === 'state' || placeScopeRaw === 'city' || placeScopeRaw === 'global'
      ? placeScopeRaw
      : cityIds.length
        ? 'city'
        : stateIds.length
          ? 'state'
          : 'global';

  return {
    id: str(n.id),
    title: str(n.title),
    body: str(n.body),
    bodyFormat: (n.bodyFormat === 'markdown' || n.body_format === 'markdown'
      ? 'markdown'
      : 'plain') as BroadcastBodyFormat,
    imageUrl: str(n.imageUrl || n.image_url) || null,
    ctaLabel: str(n.ctaLabel || n.cta_label) || 'View',
    stateIds,
    stateNames,
    cityIds,
    cityNames,
    audience,
    audienceLabel: str(n.audienceLabel || n.audience_label) || 'All users',
    placeScope,
    linkType,
    listingId: str(n.listingId || n.listing_id) || null,
    pageKey: str(n.pageKey || n.page_key) || null,
    pageLabel: str(n.pageLabel || n.page_label) || null,
    screen: str(n.screen) || null,
    isActive: n.isActive === true || n.is_active === true,
    status,
    seenCount: Number(n.seenCount ?? n.seen_count ?? 0) || 0,
    publishedAt: str(n.publishedAt || n.published_at) || null,
    expiresAt: str(n.expiresAt || n.expires_at) || null,
    createdAt: str(n.createdAt || n.created_at) || null,
    updatedAt: str(n.updatedAt || n.updated_at) || null,
  };
}

export function flattenPopupAudiences(options: PopupAudienceOption[]): BroadcastKeyLabel[] {
  const items: BroadcastKeyLabel[] = [];
  const walk = (nodes: PopupAudienceOption[]) => {
    for (const node of nodes) {
      if (node.key) items.push({ key: node.key, label: node.label || node.key });
      if (node.children?.length) walk(node.children);
    }
  };
  walk(options);
  return items;
}

function asPopupAudienceOptions(raw: unknown): PopupAudienceOption[] {
  return asArrayUnknown(raw)
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const r = row as Record<string, unknown>;
      const key = str(r.key);
      if (!key) return null;
      const childrenRaw = r.children;
      const children = Array.isArray(childrenRaw)
        ? asPopupAudienceOptions(childrenRaw)
        : undefined;
      return {
        key,
        label: str(r.label || r.name) || key,
        ...(children?.length ? { children } : {}),
      };
    })
    .filter((item): item is PopupAudienceOption => !!item);
}

export function normalizePopupOptions(raw: unknown): InAppPopupOptions {
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
  const pageKeys = asKeyLabelList(nested.pageKeys || nested.page_keys || nested.pages);
  const bodyFormats = asKeyLabelList(nested.bodyFormats || nested.body_formats);
  const audiences = asPopupAudienceOptions(nested.audiences);
  return {
    linkTypes: linkTypes.length ? linkTypes : DEFAULT_BROADCAST_LINK_TYPES,
    pageKeys,
    bodyFormats,
    audiences,
  };
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

  /** Every Groups channel the app shows. General inbox is user-specific and not listed here. */
  getChannels: async (): Promise<ConnectChannel[]> => {
    const response = await axiosClient.get('/connect/channels');
    return asArrayUnknown(response.data)
      .map(normalizeConnectChannel)
      .filter((c): c is ConnectChannel => !!c)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  },

  /** City-scoped cards inside one group. Expired cards are dropped server-side. */
  getChannelFeed: async (params: {
    channelId: string;
    cityId: string;
    page?: number;
    limit?: number;
  }): Promise<ConnectFeedResult> => {
    const page = params.page ?? 1;
    const limit = params.limit ?? 30;
    const response = await axiosClient.get(
      `/connect/channels/${params.channelId}/feed`,
      { params: { cityId: params.cityId, page, limit } },
    );
    const data = (response.data && typeof response.data === 'object'
      ? response.data
      : {}) as Record<string, unknown>;
    const city = (data.city && typeof data.city === 'object'
      ? data.city
      : {}) as Record<string, unknown>;
    const items = asArrayUnknown(data.items)
      .map(normalizeConnectFeedItem)
      .filter((f): f is ConnectFeedItem => !!f);
    const total = Number(data.total ?? items.length) || items.length;
    return {
      items,
      cityName: str(city.name),
      total,
      page: Number(data.page ?? page) || page,
      limit: Number(data.limit ?? limit) || limit,
      totalPages: Number(data.totalPages ?? Math.max(1, Math.ceil(total / limit))) || 1,
    };
  },

  updateCampaign: async (
    id: string,
    payload: UpdateCampaignPayload,
  ): Promise<NotificationCampaign> => {
    const response = await axiosClient.patch(
      `/admin/notifications/campaigns/${id}`,
      payload,
    );
    return normalizeCampaign(response.data);
  },

  deleteCampaign: async (id: string) => {
    const response = await axiosClient.delete(`/admin/notifications/campaigns/${id}`);
    return response.data as { id: string; deleted: boolean; feedItemsDeleted: number };
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

  searchInboxUsers: async (search = ''): Promise<InboxUser[]> => {
    const response = await axiosClient.get('/admin/notifications/inbox/users', {
      params: { search: search.trim() || undefined, limit: 30 },
    });
    return asArrayUnknown(response.data)
      .map(normalizeInboxUser)
      .filter((user): user is InboxUser => !!user);
  },

  getInboxOverview: async (userId: string): Promise<InboxOverview> => {
    const response = await axiosClient.get(
      `/admin/notifications/inbox/${userId}/overview`,
    );
    const data = (response.data && typeof response.data === 'object'
      ? response.data
      : {}) as Record<string, unknown>;
    const user = normalizeInboxUser(data.user);
    if (!user) {
      throw new Error('User inbox could not be loaded.');
    }
    return {
      user,
      categories: asArrayUnknown(data.categories)
        .map(normalizeInboxCategory)
        .filter((row): row is InboxCategory => !!row),
      leads: asArrayUnknown(data.leads)
        .map(normalizeInboxMessage)
        .filter((row): row is InboxMessage => !!row),
    };
  },

  getInboxMessages: async (params: {
    userId: string;
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<InboxMessageListResult> => {
    const page = params.page ?? 1;
    const limit = params.limit ?? 50;
    const response = await axiosClient.get(
      `/admin/notifications/inbox/${params.userId}`,
      {
        params: {
          page,
          limit,
          ...(params.category ? { category: params.category } : {}),
        },
      },
    );
    const data = (response.data && typeof response.data === 'object'
      ? response.data
      : {}) as Record<string, unknown>;
    const meta = (data.meta && typeof data.meta === 'object'
      ? data.meta
      : {}) as Record<string, unknown>;
    const items = asArrayUnknown(data.items)
      .map(normalizeInboxMessage)
      .filter((row): row is InboxMessage => !!row);
    const total = Number(meta.total ?? data.total ?? items.length) || items.length;
    return {
      items,
      category: str(data.category) || params.category,
      total,
      page: Number(meta.page ?? data.page ?? page) || page,
      limit: Number(meta.limit ?? data.limit ?? limit) || limit,
      totalPages:
        Number(meta.totalPages ?? data.totalPages) ||
        Math.max(1, Math.ceil(total / limit)),
    };
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

  getPopupOptions: async (): Promise<InAppPopupOptions> => {
    const response = await axiosClient.get('/admin/notifications/popups/options');
    return normalizePopupOptions(response.data);
  },

  getPopupCities: async (
    stateId: string,
  ): Promise<{ state: BroadcastCity; items: BroadcastCity[] }> => {
    const response = await axiosClient.get('/admin/notifications/popups/cities', {
      params: { stateId },
    });
    const data = (response.data && typeof response.data === 'object'
      ? response.data
      : {}) as Record<string, unknown>;
    const stateRaw = data.state && typeof data.state === 'object' ? data.state : {};
    const stateObj = stateRaw as Record<string, unknown>;
    return {
      state: {
        id: str(stateObj.id || stateId),
        name: str(stateObj.name) || 'State',
      },
      items: asNamedList(data.items).map((city) => ({
        ...city,
        stateId: city.stateId || stateId,
      })),
    };
  },

  listPopups: async (
    params: { page?: number; limit?: number } = {},
  ): Promise<InAppPopupListResult> => {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const response = await axiosClient.get('/admin/notifications/popups', {
      params: { page, limit },
    });
    return asPopupListResult(response.data, page, limit);
  },

  getPopup: async (id: string): Promise<InAppPopup> => {
    const response = await axiosClient.get(`/admin/notifications/popups/${id}`);
    const data = response.data;
    const inner =
      data && typeof data === 'object' && 'popup' in (data as object)
        ? (data as { popup: unknown }).popup
        : data;
    return normalizeInAppPopup(inner);
  },

  createPopup: async (payload: CreateInAppPopupPayload): Promise<InAppPopup> => {
    const response = await axiosClient.post('/admin/notifications/popups', payload);
    return normalizeInAppPopup(response.data);
  },

  updatePopup: async (
    id: string,
    payload: UpdateInAppPopupPayload,
  ): Promise<InAppPopup> => {
    const response = await axiosClient.put(`/admin/notifications/popups/${id}`, payload);
    return normalizeInAppPopup(response.data);
  },

  publishPopup: async (id: string): Promise<InAppPopup> => {
    const response = await axiosClient.post(`/admin/notifications/popups/${id}/publish`);
    return normalizeInAppPopup(response.data);
  },

  deletePopup: async (id: string) => {
    const response = await axiosClient.delete(`/admin/notifications/popups/${id}`);
    return response.data as { success?: boolean };
  },
};
