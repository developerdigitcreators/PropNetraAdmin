import { axiosClient } from '@/lib/axios-client';

export type DashboardUnreadKey =
  | 'documentsPending'
  | 'otpIssued'
  | 'otpVerified'
  | 'reviewPending'
  | 'feedbacks'
  | 'supportTickets'
  | 'accountDeletions'
  | 'myListingsActionable';

export type AdminDashboardSummary = {
  documentsPending?: number;
  otpIssued?: number;
  otpVerified?: number;
  reviewPending?: number;
  feedbacks?: number;
  supportTickets?: number;
  accountDeletions?: number;
  myListingsActionable?: number;
  activeUsers?: number;
  inactiveUsers?: number;
  /** True when that card has unread/new rows needing attention. */
  highlight?: Partial<Record<DashboardUnreadKey, boolean>>;
};

export const dashboardService = {
  getSummary: async (): Promise<AdminDashboardSummary> => {
    const response = await axiosClient.get('/admin/dashboard/summary');
    return (response.data || {}) as AdminDashboardSummary;
  },
};
