'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import type { ConnectChannel } from '@/services/notifications.service';
import { Loader2, Lock, Megaphone, Search, Users } from 'lucide-react';

type GroupsRailProps = {
  channels: ConnectChannel[];
  loading: boolean;
  activeChannelId: string;
  onSelect: (channelId: string) => void;
  className?: string;
};

export function GroupsRail({
  channels,
  loading,
  activeChannelId,
  onSelect,
  className,
}: GroupsRailProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...channels].sort((a, b) => {
      if (a.allowAdminBroadcast !== b.allowAdminBroadcast) {
        return a.allowAdminBroadcast ? -1 : 1;
      }
      return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
    });
    if (!q) return sorted;
    return sorted.filter((c) => c.name.toLowerCase().includes(q));
  }, [channels, query]);

  return (
    <div className={cn('flex min-h-0 flex-col border-r border-gray-100', className)}>
      <div className="relative shrink-0 border-b border-gray-100 p-3">
        <Search className="pointer-events-none absolute left-6 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search groups"
          className="h-9 rounded-full bg-gray-50 pl-8"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-gray-500">No groups found.</p>
        ) : (
          filtered.map((channel) => {
            const active = channel.id === activeChannelId;
            return (
              <button
                key={channel.id}
                type="button"
                onClick={() => onSelect(channel.id)}
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
                    channel.allowAdminBroadcast
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-500',
                  )}
                >
                  {channel.allowAdminBroadcast ? (
                    <Megaphone className="w-4 h-4" />
                  ) : (
                    <Users className="w-4 h-4" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block truncate text-sm font-medium',
                      active ? 'text-primary' : 'text-gray-900',
                    )}
                  >
                    {channel.name}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500">
                    {channel.allowAdminBroadcast ? (
                      'You can post here'
                    ) : (
                      <>
                        <Lock className="w-3 h-3" /> Automatic — read only
                      </>
                    )}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>

      <p className="shrink-0 border-t border-gray-100 px-4 py-3 text-[11px] leading-relaxed text-gray-400">
        The General inbox is per-user, so it is not shown here. Admins only see Groups.
      </p>
    </div>
  );
}
