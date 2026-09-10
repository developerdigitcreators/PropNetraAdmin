import { axiosClient } from '@/lib/axios-client';

export type DashboardUnreadKey =
  | 'documentsPending'
  | 'approvalPending'
  | 'otpIssued'
  | 'otpVerified'
  | 'reviewPending'
  | 'feedbacks'
  | 'supportTickets'
  | 'accountDeletions'
  | 'myListingsActionable'
  | 'subscriptionTracking';

export type AdminDashboardSummary = {
  documentsPending?: number;
  approvalPending?: number;
  otpIssued?: number;
  otpVerified?: number;
  reviewPending?: number;
  feedbacks?: number;
  supportTickets?: number;
  accountDeletions?: number;
  myListingsActionable?: number;
  subscriptionTracking?: number;
  activeUsers?: number;
  inactiveUsers?: number;
  /** True when that card has unread/new rows needing attention. */
  highlight?: Partial<Record<DashboardUnreadKey, boolean>>;
  /** Echo of without-referral approval gate (card only when true). */
  withoutReferralApprovalRequired?: boolean;
};

export const dashboardService = {
  getSummary: async (): Promise<AdminDashboardSummary> => {
    const response = await axiosClient.get('/admin/dashboard/summary');
    return (response.data || {}) as AdminDashboardSummary;
  },
};
