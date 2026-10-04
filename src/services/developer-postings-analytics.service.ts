import { axiosClient } from '@/lib/axios-client';

export type DeveloperPostingRow = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  expiresAt: string | null;
  location: string | null;
  micromarket: string | null;
  city: string | null;
  cityId: string | null;
  developer: { id: string; name: string | null; logoUrl: string | null };
  views: number;
  shares: number;
  brochures: number;
  contacts: number;
};

export type DeveloperPostingsList = {
  items: DeveloperPostingRow[];
  total: number;
  page: number;
  limit: number;
};

export type PostingPerson = {
  id: string;
  userId: string | null;
  name: string | null;
  contact: string | null;
  photoUrl: string | null;
  at: string;
  channel?: string;
  day?: string;
  firstViewedAt?: string;
  source?: string;
  teamMemberName?: string | null;
};

export type DeveloperPostingDetail = {
  posting: {
    id: string;
    title: string;
    status: string;
    createdAt: string;
    expiresAt: string | null;
    location: string | null;
    micromarket: string | null;
    city: string | null;
    buildingType: string | null;
    propertyType: string | null;
    price: string | null;
    developer: {
      id: string;
      name: string | null;
      userName: string | null;
      contact: string | null;
      logoUrl: string | null;
    };
  };
  totals: { views: number; shares: number; brochures: number; contacts: number };
  shares: PostingPerson[];
  views: PostingPerson[];
  brochures: PostingPerson[];
  contacts: PostingPerson[];
};

export type DeveloperPostingsQuery = {
  search?: string;
  status?: string;
  sort?: 'recent' | 'views' | 'shares' | 'brochures' | 'contacts';
  page?: number;
  limit?: number;
};

function payload<T>(data: unknown): T {
  const rec = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  return ((rec.data ?? data) as T) || ({} as T);
}

export const developerPostingsAnalyticsService = {
  list: async (query: DeveloperPostingsQuery): Promise<DeveloperPostingsList> => {
    const res = await axiosClient.get('/admin/developer-postings-analytics', { params: query });
    return payload<DeveloperPostingsList>(res.data);
  },

  detail: async (listingId: string): Promise<DeveloperPostingDetail> => {
    const res = await axiosClient.get(`/admin/developer-postings-analytics/${listingId}`);
    return payload<DeveloperPostingDetail>(res.data);
  },
};
