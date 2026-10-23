'use client';

import { useEffect, useState } from 'react';
import {
  notificationsService,
  notificationApiError,
  isLeadInboxMessage,
  type InboxMessage,
} from '@/services/notifications.service';
import type { RealtimeInboxEvent } from '@/modules/notifications/use-notifications-realtime';
import { Button } from '@/components/ui/button';
import {
  DaySeparator,
  MessageBubble,
  dayLabel,
  type BubbleMessage,
  type BubbleStatus,
} from './message-bubble';
import { Bell, Loader2, Lock, MessagesSquare } from 'lucide-react';

function eventLabel(event?: string) {
  const key = (event || '').replace(/^listing\./, '').replace(/^account\./, '').replace(/_/g, ' ');
  if (!key) return '';
  return key.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function ctaLabel(item: InboxMessage): string | null {
  const raw = item.data.ctas;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Array<{ label?: string }>;
      const label = parsed.find((row) => row?.label?.trim())?.label?.trim();
      if (label) return label;
    } catch {
      /* ignore */
    }
  }
  if (item.data.listingId || item.data.screen) return 'Open';
  return null;
}

function toBubble(item: InboxMessage): BubbleMessage {
  return {
    id: item.id,
    title: item.title,
    body: item.body,
    bodyFormat: 'html',
    imageUrl: item.data.imageUrl || null,
    linkLabel: ctaLabel(item),
    timestamp: item.createdAt,
  };
}

function bubbleStatus(item: InboxMessage): BubbleStatus {
  const status = (item.pushStatus || '').toLowerCase();
  if (status === 'failed') return 'failed';
  if (status === 'sent') return 'sent';
  if (status === 'pending') return 'pending';
  return item.isRead ? 'sent' : 'pending';
}

function metaLine(item: InboxMessage): string {
  const parts = [
    eventLabel(item.data.event) || item.category || 'General',
    item.isRead ? 'Read' : 'Unread',
    item.pushStatus || 'sent',
  ];
  return parts.join(' · ');
}

function categoryOfIncoming(item: InboxMessage): string {
  if (isLeadInboxMessage(item)) return 'leads';
  return item.category || item.data.category || '';
}

type GeneralInboxThreadProps = {
  userId: string;
  title: string;
  available: boolean;
  selectionKey: string;
  selectionKind: 'category' | 'lead';
  leadItems?: InboxMessage[];
  inboxEvent?: RealtimeInboxEvent | null;
};

export function GeneralInboxThread({
  userId,
  title,
  available,
  selectionKey,
  selectionKind,
  leadItems,
  inboxEvent,
}: GeneralInboxThreadProps) {
  const [items, setItems] = useState<InboxMessage[]>(leadItems || []);
  const [loading, setLoading] = useState(selectionKind === 'category' && available);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setPage(1);
    if (selectionKind === 'lead') {
      setItems(leadItems || []);
      setLoading(false);
      setError('');
      setTotalPages(1);
    }
  }, [selectionKind, selectionKey, userId, leadItems]);

  useEffect(() => {
    if (selectionKind !== 'category' || !available || !userId) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    notificationsService
      .getInboxMessages({
        userId,
        category: selectionKey,
        page,
        limit: 40,
      })
      .then((result) => {
        if (cancelled) return;
        setItems((prev) => (page === 1 ? result.items : [...prev, ...result.items]));
        setTotalPages(result.totalPages);
      })
      .catch((err) => {
        if (cancelled) return;
        if (page === 1) setItems([]);
        setError(notificationApiError(err, 'Failed to load this inbox.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectionKind, selectionKey, userId, available, page]);

  useEffect(() => {
    if (!inboxEvent || inboxEvent.userId !== userId) return;
    const incoming = inboxEvent.item;
    if (selectionKind === 'lead') {
      if (!isLeadInboxMessage(incoming)) return;
      setItems((prev) => {
        if (prev.some((row) => row.id === incoming.id)) return prev;
        return [incoming, ...prev];
      });
      return;
    }
    if (categoryOfIncoming(incoming) !== selectionKey) return;
    setItems((prev) => {
      if (prev.some((row) => row.id === incoming.id)) return prev;
      return [incoming, ...prev];
    });
  }, [inboxEvent, userId, selectionKind, selectionKey]);

  const ordered = [...items].reverse();

  if (!available) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-gray-50 px-6 text-center text-sm text-gray-500">
        <Lock className="mb-3 h-8 w-8 text-gray-300" />
        {title} is coming soon in the app, so there is nothing to show here yet.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-gray-50 px-4 py-5">
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
            <p className="text-sm">Nothing in {title} yet.</p>
          </div>
        ) : (
          <>
            {page < totalPages && selectionKind === 'category' && (
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
                    align="right"
                    status={bubbleStatus(item)}
                    meta={metaLine(item)}
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

export function GeneralInboxPlaceholder({
  hasUser,
}: {
  hasUser: boolean;
}) {
  return (
    <div className="flex flex-1 items-center justify-center bg-gray-50 px-6 text-center text-sm text-gray-500">
      <div>
        <Bell className="mx-auto mb-3 h-8 w-8 text-gray-300" />
        {hasUser
          ? 'Pick a category on the left to read this user’s General inbox.'
          : 'Select a user to see the same General inbox they have in the app.'}
      </div>
    </div>
  );
}
