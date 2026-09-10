'use client';

import { useEffect, useState } from 'react';
import {
  notificationsService,
  notificationApiError,
  asMediaList,
  normalizeConnectFeedItem,
  type ConnectChannel,
  type ConnectFeedItem,
} from '@/services/notifications.service';
import type { RealtimeFeedEvent } from '@/modules/notifications/use-notifications-realtime';
import { Button } from '@/components/ui/button';
import {
  DaySeparator,
  MessageBubble,
  dayLabel,
  type BubbleMessage,
} from './message-bubble';
import { Info, Loader2, MessagesSquare } from 'lucide-react';

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function linkLabelFor(item: ConnectFeedItem): string | null {
  const linkType = str(item.payload.linkType);
  if (linkType === 'page') return 'Open page';
  if (linkType === 'post' || item.listingId) return 'Property Details';
  return null;
}

function toBubble(item: ConnectFeedItem): BubbleMessage {
  return {
    id: item.id,
    title: item.title,
    body: item.body,
    bodyFormat: str(item.payload.bodyFormat) || 'plain',
    imageUrl: str(item.payload.imageUrl) || null,
    media: asMediaList(item.payload.media),
    linkLabel: linkLabelFor(item),
    timestamp: item.createdAt,
    edited: item.payload.edited === true,
  };
}

type GroupFeedThreadProps = {
  channel: ConnectChannel;
  cityId: string;
  cityName: string;
  feedEvent?: RealtimeFeedEvent | null;
};

export function GroupFeedThread({ channel, cityId, cityName, feedEvent }: GroupFeedThreadProps) {
  const [items, setItems] = useState<ConnectFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [channel.id, cityId]);

  useEffect(() => {
    if (!cityId) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    notificationsService
      .getChannelFeed({ channelId: channel.id, cityId, page, limit: 30 })
      .then((result) => {
        if (cancelled) return;
        setItems((prev) => (page === 1 ? result.items : [...prev, ...result.items]));
        setTotalPages(result.totalPages);
      })
      .catch((err) => {
        if (cancelled) return;
        if (page === 1) setItems([]);
        setError(notificationApiError(err, 'Failed to load this group.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [channel.id, cityId, page]);

  useEffect(() => {
    if (!feedEvent || !cityId) return;
    const { payload } = feedEvent;
    if (payload.channelId !== channel.id || payload.cityId !== cityId) return;

    if (feedEvent.type === 'remove') {
      setItems((prev) => prev.filter((row) => row.id !== feedEvent.payload.itemId));
      return;
    }

    const normalized = normalizeConnectFeedItem(feedEvent.payload.item);
    if (!normalized) return;
    setItems((prev) => {
      const without = prev.filter((row) => row.id !== normalized.id);
      return [normalized, ...without];
    });
  }, [feedEvent, channel.id, cityId]);

  // Newest first from the API; the thread reads oldest to newest like a chat.
  const ordered = [...items].reverse();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-start gap-2 border-b border-gray-100 bg-blue-50/60 px-4 py-2.5">
        <Info className="mt-0.5 w-3.5 h-3.5 shrink-0 text-blue-500" />
        <p className="text-xs leading-relaxed text-blue-900">
          {channel.name} fills up automatically from listing activity, so there is nothing
          to send here. Cards drop off after two days, so this shows roughly the last 48
          hours for {cityName || 'the selected city'}.
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto bg-gray-50 px-4 py-5">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && page === 1 ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : ordered.length === 0 && !error ? (
          <div className="py-20 text-center text-gray-500">
            <MessagesSquare className="mx-auto mb-3 w-8 h-8 text-gray-300" />
            <p className="text-sm">Nothing in this group for {cityName || 'this city'}.</p>
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

            {ordered.map((item, index) => {
              const previous = ordered[index - 1];
              const label = dayLabel(item.createdAt);
              const showDay = !previous || dayLabel(previous.createdAt) !== label;
              return (
                <div key={item.id} className="space-y-3">
                  {showDay && label && <DaySeparator label={label} />}
                  <MessageBubble
                    message={toBubble(item)}
                    align={index % 2 === 0 ? 'left' : 'right'}
                  />
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
