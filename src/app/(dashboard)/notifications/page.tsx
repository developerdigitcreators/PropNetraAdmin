'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import {
  notificationsService,
  notificationApiError,
  type AdminNotification,
} from '@/services/notifications.service';
import { SendNotificationDialog } from '@/modules/notifications/send-notification-dialog';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { PaginationBar } from '@/components/common/pagination-bar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Bell, Loader2, Search, Send } from 'lucide-react';

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

function recipientLabel(item: AdminNotification) {
  if (item.user?.name || item.user?.email || item.user?.contact) {
    return [item.user.name, item.user.email || item.user.contact].filter(Boolean).join(' · ');
  }
  if (item.users && item.users.length > 0) {
    const first = item.users[0];
    const extra = item.users.length - 1;
    const name = first.name || first.email || first.contact || 'User';
    return extra > 0 ? `${name} +${extra} more` : name;
  }
  if ((item.recipientCount || 0) > 1) return `${item.recipientCount} users`;
  if (item.userId) return item.userId;
  return '—';
}

function statusClass(status?: string | null) {
  const s = (status || '').toLowerCase();
  if (s === 'sent' || s === 'delivered' || s === 'success') return 'bg-green-100 text-green-700';
  if (s === 'failed' || s === 'error') return 'bg-red-100 text-red-700';
  if (s === 'pending' || s === 'queued') return 'bg-orange-100 text-orange-700';
  return 'bg-gray-100 text-gray-700';
}

export default function NotificationsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canSend = hasPermission('notifications', 'create') || hasPermission('notifications', 'send');

  const [items, setItems] = useState<AdminNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [serverPaginated, setServerPaginated] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const serverPaginatedRef = useRef<boolean | null>(null);

  const fetchList = useCallback(async (query: { page: number; limit: number; search?: string }) => {
    setIsLoading(true);
    setError('');
    try {
      const result = await notificationsService.getNotifications({
        page: query.page,
        limit: query.limit,
        search: query.search || undefined,
      });
      serverPaginatedRef.current = result.serverPaginated;
      setServerPaginated(result.serverPaginated);
      setItems(result.items);
      if (result.serverPaginated) {
        setTotal(result.total);
        setTotalPages(result.totalPages);
      } else {
        setTotal(result.items.length);
        setTotalPages(Math.max(1, Math.ceil(result.items.length / query.limit)));
      }
    } catch (err) {
      setItems([]);
      setTotal(0);
      setTotalPages(1);
      setError(notificationApiError(err, 'Failed to load notifications.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (serverPaginatedRef.current === false) return;
    fetchList({ page, limit: pageSize, search: appliedSearch });
  }, [page, pageSize, appliedSearch, fetchList]);

  useEffect(() => {
    const t = setTimeout(() => {
      setAppliedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const visible = useMemo(() => {
    if (serverPaginated) return items;
    const q = appliedSearch.toLowerCase();
    const filtered = !q
      ? items
      : items.filter((n) => {
          const hay = [n.title, n.body, n.type, recipientLabel(n)].join(' ').toLowerCase();
          return hay.includes(q);
        });
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [items, serverPaginated, appliedSearch, page, pageSize]);

  const displayTotal = useMemo(() => {
    if (serverPaginated) return total;
    const q = appliedSearch.toLowerCase();
    if (!q) return items.length;
    return items.filter((n) => {
      const hay = [n.title, n.body, n.type, recipientLabel(n)].join(' ').toLowerCase();
      return hay.includes(q);
    }).length;
  }, [serverPaginated, total, items, appliedSearch]);

  const displayPages = Math.max(1, serverPaginated ? totalPages : Math.ceil(displayTotal / pageSize) || 1);

  const handleSent = (message: string) => {
    setSuccess(message);
    setPage(1);
    fetchList({ page: 1, limit: pageSize, search: appliedSearch });
    window.setTimeout(() => setSuccess(''), 4000);
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
            <p className="text-gray-500 mt-1">Send push notifications to app users and review send history.</p>
          </div>
          {canSend && (
            <Button onClick={() => setSendOpen(true)} className="bg-primary text-white hover:bg-primary/90">
              <Send className="w-4 h-4 mr-2" /> Send notification
            </Button>
          )}
        </div>

        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {success}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notifications..."
            className="pl-9"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-700">Title</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Body</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Type</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Recipient</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-500">
                    <Bell className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                    No notifications yet.
                  </td>
                </tr>
              ) : (
                visible.map((item, idx) => (
                  <tr key={item.id || `${item.title}-${idx}`} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-medium text-gray-900 max-w-56 truncate">{item.title || '—'}</td>
                    <td className="px-6 py-4 text-gray-500 max-w-xs truncate">{item.body || '—'}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="capitalize">
                        {item.type || 'general'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-gray-600 max-w-56 truncate">{recipientLabel(item)}</td>
                    <td className="px-6 py-4">
                      {item.status ? (
                        <Badge className={statusClass(item.status)}>{item.status}</Badge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                      {formatDateTime(item.sentAt || item.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && displayTotal > 0 && (
          <PaginationBar
            currentPage={page}
            totalItems={displayTotal}
            pageSize={pageSize}
            totalPages={displayPages}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        )}

        <SendNotificationDialog open={sendOpen} onClose={() => setSendOpen(false)} onSent={handleSent} />
      </div>
    </PermissionGuard>
  );
}
