import { axiosClient } from '@/lib/axios-client';

export type DeveloperGroupSettings = {
  enabled: boolean;
  seenByEnabled: boolean;
  retentionDays: number;
};

export type DeveloperGroupRow = {
  groupId?: string;
  groupName?: string;
  developerId: string;
  developerName: string;
  ownerName: string | null;
  cityId: string;
  cityName: string | null;
  messageCount: number;
  lastAt: string | null;
};

export type DeveloperGroupAttachment = {
  type: 'image' | 'pdf' | 'video' | 'youtube' | 'project' | 'link';
  url?: string;
  name?: string;
  thumbUrl?: string;
  videoId?: string;
  listingId?: string;
  title?: string;
};

export type DeveloperGroupMessage = {
  id: string;
  developerId: string;
  cityId: string;
  text: string;
  richText?: string | null;
  attachments: DeveloperGroupAttachment[];
  createdAt: string;
  seenCount?: number;
  hidden?: boolean;
};

export const DEVELOPER_GROUP_RETENTION_MIN = 90;
export const DEVELOPER_GROUP_RETENTION_MAX = 180;

function payload<T>(data: unknown): T {
  const rec = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  return ((rec.data ?? data) as T) || ({} as T);
}

export const developerGroupsService = {
  getSettings: async (): Promise<DeveloperGroupSettings> => {
    const res = await axiosClient.get('/admin/developer-groups/settings');
    const s = payload<Partial<DeveloperGroupSettings>>(res.data);
    return {
      enabled: s.enabled !== false,
      seenByEnabled: s.seenByEnabled !== false,
      retentionDays: Number(s.retentionDays) || DEVELOPER_GROUP_RETENTION_MIN,
    };
  },

  updateSettings: async (patch: Partial<DeveloperGroupSettings>): Promise<DeveloperGroupSettings> => {
    const res = await axiosClient.put('/admin/developer-groups/settings', patch);
    return payload<DeveloperGroupSettings>(res.data);
  },

  listGroups: async (cityId?: string): Promise<DeveloperGroupRow[]> => {
    const res = await axiosClient.get('/admin/developer-groups/groups', {
      params: cityId ? { cityId } : undefined,
    });
    const items = payload<{ items?: DeveloperGroupRow[] }>(res.data).items;
    return Array.isArray(items) ? items : [];
  },

  listMessages: async (
    developerId: string,
    cityId: string,
    cursor?: string | null,
  ): Promise<{ items: DeveloperGroupMessage[]; nextCursor: string | null }> => {
    const res = await axiosClient.get(
      `/admin/developer-groups/groups/${developerId}/${cityId}/messages`,
      { params: cursor ? { cursor } : undefined },
    );
    const body = payload<{ items?: DeveloperGroupMessage[]; nextCursor?: string | null }>(res.data);
    return { items: Array.isArray(body.items) ? body.items : [], nextCursor: body.nextCursor ?? null };
  },

  deleteMessage: async (id: string) => {
    await axiosClient.delete(`/admin/developer-groups/messages/${id}`);
  },
};
