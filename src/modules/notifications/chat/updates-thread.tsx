'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  notificationsService,
  notificationApiError,
  type BroadcastKeyLabel,
  type NotificationCampaign,
} from '@/services/notifications.service';
import { Button } from '@/components/ui/button';
import {
  DaySeparator,
  MessageBubble,
  dayLabel,
  type BubbleMessage,
  type BubbleStatus,
} from './message-bubble';
import { CampaignActionsMenu, DeleteCampaignDialog } from './campaign-actions';
import { Loader2, Megaphone } from 'lucide-react';

function bubbleStatus(campaign: NotificationCampaign): BubbleStatus {
  const status = (campaign.status || 'pending').toLowerCase();
  if (status === 'sent' || status === 'delivered') return 'sent';
  if (status === 'failed' || status === 'error') return 'failed';
  if (status === 'processing') return 'processing';
  return 'pending';
}

function toBubble(
  campaign: NotificationCampaign,
  pages: BroadcastKeyLabel[],
): BubbleMessage {
  const linkType = campaign.linkType || 'none';
  const linkLabel =
    linkType === 'post'
      ? 'Property Details'
      : linkType === 'page'
        ? pages.find((p) => p.key === campaign.pageKey)?.label || 'Open page'
        : null;

  return {
    id: campaign.id,
    title: campaign.cardTitle || campaign.title,
    body: campaign.cardBody || campaign.body,
    bodyFormat: campaign.bodyFormat,
    imageUrl: campaign.imageUrl,
    media: campaign.media,
    linkLabel,
    timestamp: campaign.sentAt || campaign.createdAt,
  };
}

function metaLine(campaign: NotificationCampaign): string {
  const cities = campaign.cityNames.length
    ? campaign.cityNames.join(', ')
    : `${campaign.cityIds.length} cities`;
  const parts = [cities, `${campaign.feedItemCount} in-app`, `${campaign.pushSuccessCount} pushed`];
  if ((campaign.status || '').toLowerCase() === 'failed' && campaign.errorMessage) {
    parts.push(campaign.errorMessage);
  }
  return parts.join(' · ');
}

type UpdatesThreadProps = {
  channelName: string;
  pages: BroadcastKeyLabel[];
  canWrite: boolean;
  canDelete: boolean;
  refreshKey: number;
  onResend: (campaign: NotificationCampaign) => void;
  onEdit: (campaign: NotificationCampaign) => void;
  onDeleted: (message: string) => void;
};

export function UpdatesThread({
  channelName,
  pages,
  canWrite,
  canDelete,
  refreshKey,
  onResend,
  onEdit,
  onDeleted,
}: UpdatesThreadProps) {
  const [campaigns, setCampaigns] = useState<NotificationCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<NotificationCampaign | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPage(1);
  }, [refreshKey]);

  const load = useCallback(
    (targetPage: number, signal: { cancelled: boolean }) => {
      setLoading(true);
      setError('');
      notificationsService
        .getCampaigns({ page: targetPage, limit: 30 })
        .then((result) => {
          if (signal.cancelled) return;
          setCampaigns((prev) =>
            targetPage === 1 ? result.items : [...prev, ...result.items],
          );
          setTotalPages(result.totalPages);
        })
        .catch((err) => {
          if (signal.cancelled) return;
          if (targetPage === 1) setCampaigns([]);
          setError(notificationApiError(err, 'Failed to load broadcasts.'));
        })
        .finally(() => {
          if (!signal.cancelled) setLoading(false);
        });
    },
    [],
  );

  useEffect(() => {
    const signal = { cancelled: false };
    load(page, signal);
    return () => {
      signal.cancelled = true;
    };
  }, [load, page, refreshKey]);

  useEffect(() => {
    if (page === 1 && !loading) {
      bottomRef.current?.scrollIntoView({ block: 'end' });
    }
  }, [page, loading, campaigns.length]);

  const confirmDelete = async (remark: string) => {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await notificationsService.deleteCampaign(pendingDelete.id, remark);
      setCampaigns((prev) => prev.filter((c) => c.id !== pendingDelete.id));
      setPendingDelete(null);
      onDeleted('Broadcast deleted and removed from Groups.');
    } catch (err) {
      setDeleteError(notificationApiError(err, 'Failed to delete this broadcast.'));
    } finally {
      setDeleting(false);
    }
  };

  // The API returns newest first; a chat reads oldest to newest.
  const ordered = [...campaigns].reverse();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto bg-gray-50 px-4 py-5">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && page === 1 && campaigns.length === 0 ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : ordered.length === 0 && !error ? (
          <div className="py-20 text-center text-gray-500">
            <Megaphone className="mx-auto mb-3 w-8 h-8 text-gray-300" />
            <p className="text-sm">
              No broadcasts yet. Write the first {channelName} message below.
            </p>
          </div>
        ) : (
          <>
            {page < totalPages && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {loading && <Loader2 className="mr-2 w-3.5 h-3.5 animate-spin" />}
                  Load older
                </Button>
              </div>
            )}

            {ordered.map((campaign, index) => {
              const previous = ordered[index - 1];
              const stamp = campaign.sentAt || campaign.createdAt;
              const label = dayLabel(stamp);
              const showDay =
                !previous || dayLabel(previous.sentAt || previous.createdAt) !== label;
              return (
                <div key={campaign.id} className="space-y-3">
                  {showDay && label && <DaySeparator label={label} />}
                  <MessageBubble
                    message={toBubble(campaign, pages)}
                    align="right"
                    status={bubbleStatus(campaign)}
                    meta={metaLine(campaign)}
                    actions={
                      <CampaignActionsMenu
                        campaign={campaign}
                        canWrite={canWrite}
                        canDelete={canDelete}
                        onResend={onResend}
                        onEdit={onEdit}
                        onDelete={setPendingDelete}
                      />
                    }
                  />
                </div>
              );
            })}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      <DeleteCampaignDialog
        campaign={pendingDelete}
        deleting={deleting}
        error={deleteError}
        onClose={() => {
          setPendingDelete(null);
          setDeleteError('');
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
