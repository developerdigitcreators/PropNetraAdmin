'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import {
  notificationsService,
  notificationApiError,
  type NotificationCampaign,
} from '@/services/notifications.service';
import { BroadcastToCityDialog } from '@/modules/notifications/broadcast-to-city-dialog';
import { NotificationsOpsPanel } from '@/modules/notifications/notifications-ops-panel';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { PaginationBar } from '@/components/common/pagination-bar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Megaphone } from 'lucide-react';

type PageTab = 'broadcasts' | 'ops';

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusClass(status?: string | null) {
  const s = (status || '').toLowerCase();
  if (s === 'sent' || s === 'delivered' || s === 'success') return 'bg-green-100 text-green-700';
  if (s === 'failed' || s === 'error') return 'bg-red-100 text-red-700';
  if (s === 'pending' || s === 'queued') return 'bg-orange-100 text-orange-700';
  return 'bg-gray-100 text-gray-700';
}

function formatLabel(format?: string) {
  const f = (format || 'text').toLowerCase();
  if (f === 'text_image' || f === 'text+image') return 'text+image';
  return 'text';
}

export default function NotificationsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canSend = hasPermission('notifications', 'create') || hasPermission('notifications', 'send');
  const [tab, setTab] = useState<PageTab>('broadcasts');
  const [success, setSuccess] = useState('');

  const [campaigns, setCampaigns] = useState<NotificationCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [campaignsError, setCampaignsError] = useState('');
  const [campaignPage, setCampaignPage] = useState(1);
  const [campaignPageSize, setCampaignPageSize] = useState(20);
  const [campaignTotal, setCampaignTotal] = useState(0);
  const [campaignTotalPages, setCampaignTotalPages] = useState(1);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<NotificationCampaign | null>(null);
  const [campaignDetailLoading, setCampaignDetailLoading] = useState(false);

  const fetchCampaigns = useCallback(async (query: { page: number; limit: number }) => {
    setCampaignsLoading(true);
    setCampaignsError('');
    try {
      const result = await notificationsService.getCampaigns(query);
      setCampaigns(result.items);
      setCampaignTotal(result.total);
      setCampaignTotalPages(result.totalPages);
    } catch (err) {
      setCampaigns([]);
      setCampaignTotal(0);
      setCampaignTotalPages(1);
      setCampaignsError(notificationApiError(err, 'Failed to load broadcasts.'));
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab !== 'broadcasts') return;
    let cancelled = false;
    (async () => {
      try {
        const result = await notificationsService.getCampaigns({
          page: campaignPage,
          limit: campaignPageSize,
        });
        if (cancelled) return;
        setCampaigns(result.items);
        setCampaignTotal(result.total);
        setCampaignTotalPages(result.totalPages);
        setCampaignsError('');
      } catch (err) {
        if (cancelled) return;
        setCampaigns([]);
        setCampaignTotal(0);
        setCampaignTotalPages(1);
        setCampaignsError(notificationApiError(err, 'Failed to load broadcasts.'));
      } finally {
        if (!cancelled) setCampaignsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, campaignPage, campaignPageSize]);

  const showToast = (message: string) => {
    setSuccess(message);
    window.setTimeout(() => setSuccess(''), 4000);
  };

  const handleQueued = (message: string) => {
    showToast(message);
    setCampaignPage(1);
    fetchCampaigns({ page: 1, limit: campaignPageSize });
    window.setTimeout(() => fetchCampaigns({ page: 1, limit: campaignPageSize }), 2500);
    window.setTimeout(() => fetchCampaigns({ page: 1, limit: campaignPageSize }), 6000);
  };

  const openCampaign = async (campaign: NotificationCampaign) => {
    setSelectedCampaign(campaign);
    if (!campaign.id) return;
    setCampaignDetailLoading(true);
    try {
      const detail = await notificationsService.getCampaign(campaign.id);
      setSelectedCampaign(detail);
    } catch (err) {
      setCampaignsError(notificationApiError(err, 'Failed to load campaign.'));
    } finally {
      setCampaignDetailLoading(false);
    }
  };

  return (
    <PermissionGuard
      permission="notifications:read"
      fallback={
        <div className="p-12 text-center text-gray-500">
          You do not have permission to view Notifications.
        </div>
      }
    >
      <div className="space-y-6 pb-12">
        <Breadcrumb items={[{ label: 'Notifications' }]} />
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Notifications</h1>
            <p className="text-gray-500 mt-1">
              PropNetra Updates city broadcasts. Listing groups are automatic.
            </p>
          </div>
          {canSend && tab === 'broadcasts' && (
            <Button onClick={() => setBroadcastOpen(true)} className="bg-primary text-white hover:bg-primary/90">
              <Megaphone className="w-4 h-4 mr-2" /> Broadcast to city
            </Button>
          )}
        </div>

        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {success}
          </div>
        )}
        {tab === 'broadcasts' && campaignsError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {campaignsError}
          </div>
        )}

        <Tabs
          value={tab}
          onValueChange={(v) => {
            const next = (v as PageTab) || 'broadcasts';
            setTab(next);
            if (next === 'broadcasts') setCampaignsLoading(true);
          }}
          className="w-full"
        >
          <TabsList className="mb-2 bg-white border shadow-sm p-1 h-auto">
            <TabsTrigger
              value="broadcasts"
              className="data-[state=active]:bg-primary-light data-[state=active]:text-primary rounded-md px-6 text-sm"
            >
              Broadcasts
            </TabsTrigger>
            <TabsTrigger
              value="ops"
              className="data-[state=active]:bg-primary-light data-[state=active]:text-primary rounded-md px-6 text-sm"
            >
              Ops
            </TabsTrigger>
          </TabsList>

          <TabsContent value="broadcasts" className="focus-visible:outline-none space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-gray-700">Title</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">Channel</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">Cities</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">Format</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">Feed</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">Push</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">Sent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {campaignsLoading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                      </td>
                    </tr>
                  ) : campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center text-gray-500">
                        <Megaphone className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                        No broadcasts yet.
                      </td>
                    </tr>
                  ) : (
                    campaigns.map((item, idx) => (
                      <tr
                        key={item.id || `campaign-${idx}`}
                        className="hover:bg-gray-50/50 cursor-pointer"
                        onClick={() => openCampaign(item)}
                      >
                        <td className="px-6 py-4 font-medium text-gray-900 max-w-56 truncate">
                          {item.title || '—'}
                        </td>
                        <td className="px-6 py-4 text-gray-700">{item.channelName || '—'}</td>
                        <td className="px-6 py-4 text-gray-600 max-w-48 truncate">
                          {item.cityNames.length > 0 ? item.cityNames.join(', ') : '—'}
                        </td>
                        <td className="px-6 py-4 text-gray-600">{formatLabel(item.format)}</td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <Badge className={statusClass(item.status || 'pending')}>
                              {item.status || 'pending'}
                            </Badge>
                            {(item.status || '').toLowerCase() === 'failed' && item.errorMessage ? (
                              <p className="text-xs text-red-600 max-w-48 truncate" title={item.errorMessage}>
                                {item.errorMessage}
                              </p>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-700">{item.feedItemCount}</td>
                        <td className="px-6 py-4 text-gray-700">{item.pushSuccessCount}</td>
                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                          {formatDateTime(item.sentAt || item.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!campaignsLoading && campaignTotal > 0 && (
              <PaginationBar
                currentPage={campaignPage}
                totalItems={campaignTotal}
                pageSize={campaignPageSize}
                totalPages={campaignTotalPages}
                onPageChange={(p) => {
                  setCampaignsLoading(true);
                  setCampaignPage(p);
                }}
                onPageSizeChange={(size) => {
                  setCampaignsLoading(true);
                  setCampaignPageSize(size);
                  setCampaignPage(1);
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="ops" className="focus-visible:outline-none space-y-4">
            <NotificationsOpsPanel canToggle={canSend} />
          </TabsContent>
        </Tabs>

        <BroadcastToCityDialog
          open={broadcastOpen}
          onClose={() => setBroadcastOpen(false)}
          onQueued={handleQueued}
        />

        <Dialog open={!!selectedCampaign} onOpenChange={(open) => !open && setSelectedCampaign(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedCampaign?.title || 'Broadcast'}</DialogTitle>
              <DialogDescription>Campaign detail</DialogDescription>
            </DialogHeader>
            {campaignDetailLoading ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : selectedCampaign ? (
              <div className="grid grid-cols-2 gap-3 text-sm py-2">
                <Detail label="Channel" value={selectedCampaign.channelName} />
                <Detail label="Format" value={formatLabel(selectedCampaign.format)} />
                <Detail
                  label="Cities"
                  value={
                    selectedCampaign.cityNames.length > 0
                      ? selectedCampaign.cityNames.join(', ')
                      : undefined
                  }
                />
                <Detail label="Status" value={selectedCampaign.status || 'pending'} />
                <Detail label="Feed" value={String(selectedCampaign.feedItemCount)} />
                <Detail label="Push" value={String(selectedCampaign.pushSuccessCount)} />
                <Detail
                  label="Sent"
                  value={formatDateTime(selectedCampaign.sentAt || selectedCampaign.createdAt)}
                />
                <Detail label="Link" value={selectedCampaign.linkType || 'none'} />
                {selectedCampaign.pageKey ? (
                  <Detail label="Page" value={selectedCampaign.pageKey} />
                ) : null}
                {selectedCampaign.errorMessage ? (
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Error</p>
                    <p className="text-red-700">{selectedCampaign.errorMessage}</p>
                  </div>
                ) : null}
                {selectedCampaign.body ? (
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Body</p>
                    <p className="text-gray-800">{selectedCampaign.body}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">{label}</p>
      <p className="text-gray-800">{value || '—'}</p>
    </div>
  );
}
