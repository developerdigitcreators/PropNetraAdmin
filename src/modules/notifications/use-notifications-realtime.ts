'use client';

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getRealtimeUrl } from '@/lib/realtime-url';
import { useAuthStore } from '@/store/use-auth-store';
import type { ConnectFeedItem } from '@/services/notifications.service';

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

type UseNotificationsRealtimeOptions = {
  cityId: string;
  channelId: string;
  enabled?: boolean;
};

/**
 * Keeps the admin notifications console in sync with app-facing socket events.
 * Joins the same city / group rooms the mobile app uses.
 */
export function useNotificationsRealtime({
  cityId,
  channelId,
  enabled = true,
}: UseNotificationsRealtimeOptions) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [groupsTick, setGroupsTick] = useState(0);
  const [popupsTick, setPopupsTick] = useState(0);
  const [feedEvent, setFeedEvent] = useState<RealtimeFeedEvent | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const roomsRef = useRef({ cityId: '', channelId: '' });

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
      const prev = roomsRef.current;
      if (prev.cityId && prev.cityId !== cityId) {
        socket.emit('groups:unwatchCity', { cityId: prev.cityId });
      }
      if (prev.channelId && prev.cityId && (prev.channelId !== channelId || prev.cityId !== cityId)) {
        socket.emit('groups:leave', {
          channelId: prev.channelId,
          cityId: prev.cityId,
        });
      }
      if (cityId) {
        socket.emit('groups:watchCity', { cityId });
      }
      if (cityId && channelId) {
        socket.emit('groups:join', { channelId, cityId });
      }
      roomsRef.current = { cityId, channelId };
    };

    socket.on('connect', syncRooms);

    socket.on('groups:item', (payload: RealtimeGroupsItem) => {
      if (!payload?.channelId || !payload?.cityId || !payload?.item) return;
      setFeedEvent({ type: 'item', payload });
      if (payload.channelId === channelId && payload.cityId === cityId) {
        setGroupsTick((t) => t + 1);
      }
    });

    socket.on('groups:remove', (payload: RealtimeGroupsRemove) => {
      if (!payload?.channelId || !payload?.cityId || !payload?.itemId) return;
      setFeedEvent({ type: 'remove', payload });
      if (payload.channelId === channelId && payload.cityId === cityId) {
        setGroupsTick((t) => t + 1);
      }
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
      roomsRef.current = { cityId: '', channelId: '' };
      socket.off('connect', syncRooms);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, accessToken, cityId, channelId]);

  return { groupsTick, popupsTick, feedEvent };
}
