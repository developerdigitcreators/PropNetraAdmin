import { axiosClient } from '@/lib/axios-client';

export type FeatureControls = {
  listing_viewers_developer_enabled: boolean;
  listing_viewers_dbf_enabled: boolean;
  listing_viewers_agent_enabled: boolean;
  developer_share_count_enabled: boolean;
  reels_silent_enabled: boolean;
  reels_share_enabled: boolean;
  reels_views_enabled: boolean;
  developer_compare_agents_enabled: boolean;
  /** OFF: chats/message icon hidden, sidebar Push Notification page, lead pushes open My Leads. */
  netra_connect_enabled: boolean;
  /** Push 24 hours before a user's plan ends. */
  autopay_renewal_reminder_enabled: boolean;
  /** When each listing-viewers switch was last turned ON (ISO). null = shows all past viewers. */
  enabledSince?: Partial<Record<ListingViewersKey, string | null>>;
};

export type ListingViewersKey =
  | 'listing_viewers_developer_enabled'
  | 'listing_viewers_dbf_enabled'
  | 'listing_viewers_agent_enabled';

export type FeatureControlKey = Exclude<keyof FeatureControls, 'enabledSince'>;

function payload<T>(data: unknown): T {
  const rec = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  return ((rec.data ?? data) as T) || ({} as T);
}

export const featureControlsService = {
  get: async (): Promise<FeatureControls> => {
    const res = await axiosClient.get('/admin/settings/feature-controls');
    return payload<FeatureControls>(res.data);
  },

  update: async (
    patch: Partial<Omit<FeatureControls, 'enabledSince'>>,
  ): Promise<FeatureControls> => {
    const res = await axiosClient.put('/admin/settings/feature-controls', patch);
    return payload<FeatureControls>(res.data);
  },
};
