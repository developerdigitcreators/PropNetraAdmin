'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import type {
  InboxCategory,
  InboxMessage,
} from '@/services/notifications.service';
import { inboxEventOf, leadThreadKey } from '@/services/notifications.service';
import { Bell, Loader2, Lock, Search, UserRound } from 'lucide-react';

export type GeneralRailSelection =
  | { kind: 'category'; key: string }
  | { kind: 'lead'; key: string };

type GeneralInboxRailProps = {
  categories: InboxCategory[];
  leads: InboxMessage[];
  loading: boolean;
  selection: GeneralRailSelection | null;
  onSelect: (selection: GeneralRailSelection) => void;
  className?: string;
};

function leadLabel(item: InboxMessage) {
  return item.data.actorName || item.title || 'Lead';
}

function leadChip(item: InboxMessage) {
  return inboxEventOf(item) === 'listing.interest' ? 'Interested' : 'Contacted';
}

function previewTime(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

export function GeneralInboxRail({
  categories,
  leads,
  loading,
  selection,
  onSelect,
  className,
}: GeneralInboxRailProps) {
  const [query, setQuery] = useState('');

  const filteredLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((item) =>
      `${leadLabel(item)} ${leadChip(item)} ${item.body}`.toLowerCase().includes(q),
    );
  }, [leads, query]);

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((item) =>
      `${item.label} ${item.lastMessage || ''}`.toLowerCase().includes(q),
    );
  }, [categories, query]);

  return (
    <div className={cn('flex min-h-0 flex-col border-r border-gray-100', className)}>
      <div className="relative shrink-0 border-b border-gray-100 p-3">
        <Search className="pointer-events-none absolute left-6 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search categories"
          className="h-9 rounded-full bg-gray-50 pl-8"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : filteredLeads.length === 0 && filteredCategories.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-gray-500">
            No categories found.
          </p>
        ) : (
          <>
            {filteredLeads.map((lead) => {
              const key = leadThreadKey(lead);
              const active = selection?.kind === 'lead' && selection.key === key;
              const unread = Number(lead.data.unreadCount || 0);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelect({ kind: 'lead', key })}
                  className={cn(
                    'flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition-colors',
                    active
                      ? 'border-primary bg-primary-light'
                      : 'border-transparent hover:bg-gray-50',
                  )}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-700">
                    {(leadLabel(lead).trim().charAt(0) || '?').toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span
                        className={cn(
                          'truncate text-sm font-medium',
                          active ? 'text-primary' : 'text-gray-900',
                        )}
                      >
                        {leadLabel(lead)}
                      </span>
                      <span className="shrink-0 text-[11px] text-gray-400">
                        {previewTime(lead.createdAt)}
                      </span>
                    </span>
                    <span className="mt-0.5 inline-flex items-center rounded-full border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-500">
                      {leadChip(lead)}
                    </span>
                  </span>
                  {unread > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-green-600 px-1.5 text-[10px] font-semibold text-white">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </button>
              );
            })}

            {filteredCategories.map((category) => {
              const active =
                selection?.kind === 'category' && selection.key === category.key;
              return (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => onSelect({ kind: 'category', key: category.key })}
                  className={cn(
                    'flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition-colors',
                    active
                      ? 'border-primary bg-primary-light'
                      : 'border-transparent hover:bg-gray-50',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-full',
                      category.available
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-400',
                    )}
                  >
                    {category.available ? (
                      <Bell className="w-4 h-4" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span
                        className={cn(
                          'truncate text-sm font-medium',
                          active ? 'text-primary' : 'text-gray-900',
                        )}
                      >
                        {category.label}
                      </span>
                      <span className="shrink-0 text-[11px] text-gray-400">
                        {previewTime(category.lastMessageAt)}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-gray-500">
                      {category.available
                        ? category.lastMessage ||
                          (category.count
                            ? `${category.count} messages`
                            : 'No messages yet')
                        : 'Coming soon'}
                    </span>
                  </span>
                  {category.unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-green-600 px-1.5 text-[10px] font-semibold text-white">
                      {category.unreadCount > 99 ? '99+' : category.unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </>
        )}
      </div>

      <p className="shrink-0 border-t border-gray-100 px-4 py-3 text-[11px] leading-relaxed text-gray-400">
        Same categories as the app General tab: Listing Status, Admin Notification,
        plus parked Subscription, Payment, and Refer &amp; Earned.
      </p>
    </div>
  );
}

export function EmptyUserRail({ className }: { className?: string }) {
  return (
    <div className={cn('flex min-h-0 flex-col border-r border-gray-100', className)}>
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-sm text-gray-500">
        <UserRound className="mb-3 h-8 w-8 text-gray-300" />
        Pick a user to load their General categories.
      </div>
    </div>
  );
}
