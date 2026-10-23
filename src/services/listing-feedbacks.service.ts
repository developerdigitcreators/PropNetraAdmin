import { axiosClient } from '@/lib/axios-client';

export type ListingFeedbackPerson = {
  id: string | null;
  name: string;
  contact: string;
  email: string;
};

export type ListingFeedbackItem = {
  id: string;
  createdAt: string | null;
  isNew: boolean;
  issues: {
    price: boolean;
    builderDetail: boolean;
    location: boolean;
    soldStatus: boolean;
    keys?: string[];
    labels?: string[];
  };
  selectedKeys?: string[];
  remarks: string;
  listing: {
    id: string;
    title: string;
    location: string;
    category: string;
    status: string;
    price: number | null;
  };
  owner: ListingFeedbackPerson;
  agent: ListingFeedbackPerson;
};

export type ListingFeedbackPage = {
  items: ListingFeedbackItem[];
  total: number;
  page: number;
  limit: number;
};

export type ListingFeedbackQuery = {
  listingId?: string;
  ownerUserId?: string;
  userId?: string;
  q?: string;
  page?: number;
  limit?: number;
};

export const LISTING_FEEDBACK_ISSUES: Array<{
  key: keyof ListingFeedbackItem['issues'];
  label: string;
}> = [
  { key: 'price', label: 'Price – Incorrect' },
  { key: 'builderDetail', label: 'Builder Detail – Incorrect' },
  { key: 'location', label: 'Location – Incorrect' },
  { key: 'soldStatus', label: 'Sold Status – Incorrect' },
];

export function listingFeedbackIssueLabels(item: ListingFeedbackItem): string[] {
  if (item.issues?.labels?.length) return item.issues.labels;
  if (item.selectedKeys?.length) return item.selectedKeys;
  return LISTING_FEEDBACK_ISSUES.filter((i) => item.issues?.[i.key]).map((i) => i.label);
}

function unwrap(data: unknown): Record<string, unknown> {
  const obj = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const inner = obj.data;
  if (inner && typeof inner === 'object' && !Array.isArray(inner) && 'items' in inner) {
    return inner as Record<string, unknown>;
  }
  return obj;
}

export const listingFeedbacksService = {
  list: async (query: ListingFeedbackQuery = {}): Promise<ListingFeedbackPage> => {
    const params: Record<string, string | number> = {};
    if (query.listingId) params.listingId = query.listingId;
    if (query.ownerUserId) params.ownerUserId = query.ownerUserId;
    if (query.userId) params.userId = query.userId;
    if (query.q?.trim()) params.q = query.q.trim();
    params.page = query.page || 1;
    params.limit = query.limit || 20;
    const response = await axiosClient.get('/admin/listing-feedbacks', { params });
    const body = unwrap(response.data);
    return {
      items: Array.isArray(body.items) ? (body.items as ListingFeedbackItem[]) : [],
      total: Number(body.total || 0),
      page: Number(body.page || params.page),
      limit: Number(body.limit || params.limit),
    };
  },

  markSeen: async (id: string): Promise<void> => {
    await axiosClient.post(`/admin/listing-feedbacks/${id}/seen`);
  },

  remove: async (id: string): Promise<void> => {
    await axiosClient.delete(`/admin/listing-feedbacks/${id}`);
  },
};
