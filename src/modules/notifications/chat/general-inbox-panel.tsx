'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { SearchableSelect } from '@/components/common/searchable-select';
import { Button } from '@/components/ui/button';
import {
  notificationsService,
  notificationApiError,
  isLeadInboxMessage,
  leadThreadKey,
  type InboxCategory,
  type InboxMessage,
  type InboxUser,
} from '@/services/notifications.service';
import type { RealtimeInboxEvent } from '@/modules/notifications/use-notifications-realtime';
import { ArrowLeft, Inbox, Loader2 } from 'lucide-react';
import {
  EmptyUserRail,
  GeneralInboxRail,
  type GeneralRailSelection,
} from './general-inbox-rail';
import {
  GeneralInboxPlaceholder,
  GeneralInboxThread,
} from './general-inbox-thread';

type GeneralInboxPanelProps = {
  inboxTick: number;
  inboxEvent: RealtimeInboxEvent | null;
  onWatchUser: (userId: string) => void;
};

function userLabel(user: Pick<InboxUser, 'name' | 'contact' | 'email'>) {
  return [user.name, user.contact || user.email].filter(Boolean).join(' · ');
}

function sameLead(a: InboxMessage, b: InboxMessage) {
  return leadThreadKey(a) === leadThreadKey(b) && Boolean(leadThreadKey(a));
}

export function GeneralInboxPanel({
  inboxTick,
  inboxEvent,
  onWatchUser,
}: GeneralInboxPanelProps) {
  const [users, setUsers] = useState<InboxUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [selectedUser, setSelectedUser] = useState<InboxUser | null>(null);

  const [categories, setCategories] = useState<InboxCategory[]>([]);
  const [leads, setLeads] = useState<InboxMessage[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState('');
  const [selection, setSelection] = useState<GeneralRailSelection | null>(null);
  const [showThreadOnMobile, setShowThreadOnMobile] = useState(false);

  useEffect(() => {
    let cancelled = false;
    notificationsService
      .searchInboxUsers('')
      .then((items) => {
        if (!cancelled) setUsers(items);
      })
      .finally(() => {
        if (!cancelled) setUsersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const searchUsers = useCallback((query: string) => {
    notificationsService
      .searchInboxUsers(query.trim())
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  const loadOverview = (id: string, silent: boolean) => {
    if (!silent) setOverviewLoading(true);
    setOverviewError('');
    return notificationsService
      .getInboxOverview(id)
      .then((overview) => {
        setSelectedUser(overview.user);
        setCategories(overview.categories);
        setLeads(overview.leads);
        setSelection((current) => {
          if (current?.kind === 'lead') {
            const stillThere = overview.leads.some(
              (lead) => leadThreadKey(lead) === current.key,
            );
            if (stillThere) return current;
          }
          if (current?.kind === 'category') {
            const match = overview.categories.find((row) => row.key === current.key);
            if (match) return current;
          }
          const firstLive = overview.categories.find((row) => row.available);
          return firstLive ? { kind: 'category', key: firstLive.key } : null;
        });
      })
      .catch((err) => {
        if (!silent) {
          setCategories([]);
          setLeads([]);
        }
        setOverviewError(notificationApiError(err, 'Failed to load this inbox.'));
      })
      .finally(() => {
        if (!silent) setOverviewLoading(false);
      });
  };

  useEffect(() => {
    onWatchUser(userId);
  }, [userId, onWatchUser]);

  useEffect(() => {
    if (!userId) {
      setCategories([]);
      setLeads([]);
      setSelectedUser(null);
      setSelection(null);
      setOverviewError('');
      return;
    }
    void loadOverview(userId, false);
  }, [userId]);

  useEffect(() => {
    if (!userId || inboxTick === 0) return;
    void loadOverview(userId, true);
  }, [inboxTick]);

  const userOptions = useMemo(() => {
    const options = users.map((user) => ({
      value: user.id,
      label: userLabel(user),
    }));
    if (selectedUser && !options.some((row) => row.value === selectedUser.id)) {
      options.unshift({
        value: selectedUser.id,
        label: userLabel(selectedUser),
      });
    }
    return options;
  }, [users, selectedUser]);

  const activeCategory = useMemo(
    () =>
      selection?.kind === 'category'
        ? categories.find((row) => row.key === selection.key) || null
        : null,
    [categories, selection],
  );

  const activeLead = useMemo(
    () =>
      selection?.kind === 'lead'
        ? leads.find((row) => leadThreadKey(row) === selection.key) || null
        : null,
    [leads, selection],
  );

  const threadTitle = activeLead
    ? activeLead.data.actorName || activeLead.title || 'Lead'
    : activeCategory?.label || 'General';

  const leadThreadItems = useMemo(() => {
    if (!activeLead) return [];
    return activeLead.items?.length ? activeLead.items : [activeLead];
  }, [activeLead]);

  useEffect(() => {
    if (!inboxEvent || inboxEvent.userId !== userId) return;
    const incoming = inboxEvent.item;
    if (!isLeadInboxMessage(incoming)) {
      setCategories((prev) =>
        prev.map((row) => {
          if (!row.available || row.key !== incoming.category) return row;
          return {
            ...row,
            count: row.count + 1,
            unreadCount: incoming.isRead ? row.unreadCount : row.unreadCount + 1,
            lastMessage: incoming.body || incoming.title || row.lastMessage,
            lastMessageAt: incoming.createdAt || row.lastMessageAt,
          };
        }),
      );
      return;
    }
    setLeads((prev) => {
      const existing = prev.find((row) => sameLead(row, incoming));
      const others = prev.filter((row) => !sameLead(row, incoming));
      const children = incoming.items?.length ? incoming.items : [incoming];
      if (!existing) {
        return [{ ...incoming, thread: true, items: children }, ...others];
      }
      const seen = new Set((existing.items || []).map((row) => row.id));
      const fresh = children.filter((row) => row.id && !seen.has(row.id));
      return [
        {
          ...existing,
          ...incoming,
          id: existing.id,
          thread: true,
          items: [...fresh, ...(existing.items || [existing])],
        },
        ...others,
      ];
    });
  }, [inboxEvent, userId]);

  const pickUser = (id: string) => {
    setUserId(id);
    const match = users.find((user) => user.id === id);
    if (match) setSelectedUser(match);
    setShowThreadOnMobile(false);
  };

  return (
    <div className="flex h-[calc(100vh-19rem)] min-h-[520px] flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="relative z-30 flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-white">
            <Inbox className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">
              General inbox
            </p>
            <p className="truncate text-[11px] text-gray-500">
              Same categories the app shows under General
            </p>
          </div>
        </div>
        <div className="w-72 shrink-0">
          <SearchableSelect
            options={userOptions}
            value={userId}
            onValueChange={pickUser}
            onSearch={searchUsers}
            loading={usersLoading && users.length === 0}
            placeholder="Select user"
            searchPlaceholder="Search name or phone…"
            emptyText="No users found."
            selectedLabel={selectedUser ? userLabel(selectedUser) : undefined}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {userId ? (
          <GeneralInboxRail
            categories={categories}
            leads={leads}
            loading={overviewLoading && categories.length === 0}
            selection={selection}
            onSelect={(next) => {
              setSelection(next);
              setShowThreadOnMobile(true);
            }}
            className={
              showThreadOnMobile
                ? 'hidden w-full shrink-0 lg:flex lg:w-80'
                : 'flex w-full shrink-0 lg:w-80'
            }
          />
        ) : (
          <EmptyUserRail
            className={
              showThreadOnMobile
                ? 'hidden w-full shrink-0 lg:flex lg:w-80'
                : 'flex w-full shrink-0 lg:w-80'
            }
          />
        )}

        <div
          className={
            showThreadOnMobile
              ? 'flex min-w-0 flex-1 flex-col'
              : 'hidden min-w-0 flex-1 flex-col lg:flex'
          }
        >
          <div className="flex shrink-0 items-center gap-3 border-b border-gray-100 px-4 py-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowThreadOnMobile(false)}
              aria-label="Back to categories"
              className="lg:hidden"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
              <Inbox className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">
                {userId ? threadTitle : 'Select a user'}
              </p>
              <p className="truncate text-[11px] text-gray-500">
                {selectedUser
                  ? `${selectedUser.name} · ${selectedUser.contact || selectedUser.email} · live`
                  : 'Pick a user above to load their inbox'}
              </p>
            </div>
          </div>

          {overviewError && (
            <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
              {overviewError}
            </div>
          )}

          {overviewLoading && userId && !selection ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : selection && userId ? (
            <GeneralInboxThread
              userId={userId}
              title={threadTitle}
              available={selection.kind === 'lead' ? true : activeCategory?.available !== false}
              selectionKey={selection.key}
              selectionKind={selection.kind}
              leadItems={selection.kind === 'lead' ? leadThreadItems : undefined}
              inboxEvent={inboxEvent}
            />
          ) : (
            <GeneralInboxPlaceholder hasUser={Boolean(userId)} />
          )}
        </div>
      </div>
    </div>
  );
}
