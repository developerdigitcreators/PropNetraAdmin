'use client';

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getRealtimeUrl } from '@/lib/realtime-url';
import { useAuthStore } from '@/store/use-auth-store';
import type { ConnectFeedItem, InboxMessage } from '@/services/notifications.service';
import { normalizeInboxMessage } from '@/services/notifications.service';

export type RealtimeGroupsItem = {
  channelId: string;
  cityId: string;
  item: ConnectFeedItem;
};

export type RealtimeGroupsRemove = {
  channelId: string;
  cityId: string;
  itemId: string;
};

export type RealtimeFeedEvent =
  | { type: 'item'; payload: RealtimeGroupsItem }
  | { type: 'remove'; payload: RealtimeGroupsRemove };

export type RealtimeInboxEvent = {
  userId: string;
  item: InboxMessage;
};

type UseNotificationsRealtimeOptions = {
  cityId: string;
  channelId: string;
  watchUserId?: string;
  enabled?: boolean;
};

/**
 * Keeps the admin notifications console in sync with app-facing socket events.
 * Joins the same city / group rooms the mobile app uses, plus a staff-only
 * inbox room when a General-tab user is selected.
 */
export function useNotificationsRealtime({
  cityId,
  channelId,
  watchUserId = '',
  enabled = true,
}: UseNotificationsRealtimeOptions) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [groupsTick, setGroupsTick] = useState(0);
  const [popupsTick, setPopupsTick] = useState(0);
  const [inboxTick, setInboxTick] = useState(0);
  const [feedEvent, setFeedEvent] = useState<RealtimeFeedEvent | null>(null);
  const [inboxEvent, setInboxEvent] = useState<RealtimeInboxEvent | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const roomsRef = useRef({ cityId: '', channelId: '', watchUserId: '' });
  const latestRef = useRef({ cityId, channelId, watchUserId });
  latestRef.current = { cityId, channelId, watchUserId };

  useEffect(() => {
    if (!enabled || !accessToken) return;

    const socket = io(getRealtimeUrl(), {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
    });
    socketRef.current = socket;

    const syncRooms = () => {
      const next = latestRef.current;
      const prev = roomsRef.current;
      if (prev.cityId && prev.cityId !== next.cityId) {
        socket.emit('groups:unwatchCity', { cityId: prev.cityId });
      }
      if (
        prev.channelId &&
        prev.cityId &&
        (prev.channelId !== next.channelId || prev.cityId !== next.cityId)
      ) {
        socket.emit('groups:leave', {
          channelId: prev.channelId,
          cityId: prev.cityId,
        });
      }
      if (prev.watchUserId && prev.watchUserId !== next.watchUserId) {
        socket.emit('inbox:unwatchUser', { userId: prev.watchUserId });
      }
      if (next.cityId) {
        socket.emit('groups:watchCity', { cityId: next.cityId });
      }
      if (next.cityId && next.channelId) {
        socket.emit('groups:join', {
          channelId: next.channelId,
          cityId: next.cityId,
        });
      }
      if (next.watchUserId) {
        socket.emit('inbox:watchUser', { userId: next.watchUserId });
      }
      roomsRef.current = next;
    };

    socket.on('connect', syncRooms);

    socket.on('groups:item', (payload: RealtimeGroupsItem) => {
      if (!payload?.channelId || !payload?.cityId || !payload?.item) return;
      setFeedEvent({ type: 'item', payload });
      const current = latestRef.current;
      if (payload.channelId === current.channelId && payload.cityId === current.cityId) {
        setGroupsTick((t) => t + 1);
      }
    });

    socket.on('groups:remove', (payload: RealtimeGroupsRemove) => {
      if (!payload?.channelId || !payload?.cityId || !payload?.itemId) return;
      setFeedEvent({ type: 'remove', payload });
      const current = latestRef.current;
      if (payload.channelId === current.channelId && payload.cityId === current.cityId) {
        setGroupsTick((t) => t + 1);
      }
    });

    socket.on('inbox:new', (payload: { userId?: string; item?: unknown }) => {
      const item = normalizeInboxMessage(payload?.item);
      const userId = String(payload?.userId || '').trim();
      if (!item || !userId) return;
      if (userId !== latestRef.current.watchUserId) return;
      setInboxEvent({ userId, item });
      setInboxTick((t) => t + 1);
    });

    socket.on('popup:show', () => {
      setPopupsTick((t) => t + 1);
    });

    if (socket.connected) syncRooms();

    return () => {
      const prev = roomsRef.current;
      if (prev.cityId) socket.emit('groups:unwatchCity', { cityId: prev.cityId });
      if (prev.channelId && prev.cityId) {
        socket.emit('groups:leave', {
          channelId: prev.channelId,
          cityId: prev.cityId,
        });
      }
      if (prev.watchUserId) {
        socket.emit('inbox:unwatchUser', { userId: prev.watchUserId });
      }
      roomsRef.current = { cityId: '', channelId: '', watchUserId: '' };
      socket.off('connect', syncRooms);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, accessToken]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    const prev = roomsRef.current;
    if (prev.cityId && prev.cityId !== cityId) {
      socket.emit('groups:unwatchCity', { cityId: prev.cityId });
    }
    if (
      prev.channelId &&
      prev.cityId &&
      (prev.channelId !== channelId || prev.cityId !== cityId)
    ) {
      socket.emit('groups:leave', {
        channelId: prev.channelId,
        cityId: prev.cityId,
      });
    }
    if (prev.watchUserId && prev.watchUserId !== watchUserId) {
      socket.emit('inbox:unwatchUser', { userId: prev.watchUserId });
    }
    if (cityId) socket.emit('groups:watchCity', { cityId });
    if (cityId && channelId) {
      socket.emit('groups:join', { channelId, cityId });
    }
    if (watchUserId) socket.emit('inbox:watchUser', { userId: watchUserId });
    roomsRef.current = { cityId, channelId, watchUserId };
  }, [cityId, channelId, watchUserId]);

  return { groupsTick, popupsTick, inboxTick, feedEvent, inboxEvent };
}
