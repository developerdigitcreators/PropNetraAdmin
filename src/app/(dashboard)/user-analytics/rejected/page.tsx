'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { AdminDataTable } from '@/components/common/admin-data-table';
import { AdminListToolbar } from '@/components/common/admin-list-toolbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { USER_PROFILE_READ_PERMISSIONS } from '@/modules/app-users/app-users-access';
import { RegisteredUserViewModal } from '@/modules/app-users/registered-user-view-modal';
import { adminUsersService } from '@/services/admin-users.service';
import { useAuthStore } from '@/store/use-auth-store';
import { useClientPagedRows } from '@/hooks/use-client-paged-rows';
import { formatDisplayDateTime } from '@/lib/format-date';
import { ArrowLeft, Eye, Loader2, RotateCcw } from 'lucide-react';

function formatDateTime(value?: string | Date | null) {
  return formatDisplayDateTime(value);
}

export default function RejectedUsersPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canUpdate = hasPermission('app_users_master', 'update');

  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [viewUser, setViewUser] = useState<any>(null);
  const [viewOpen, setViewOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminUsersService.list({
        audience: 'app',
        bucket: 'rejected',
        includeInProgress: false,
      });
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const {
    page,
    limit,
    total,
    totalPages,
    pageRows,
    onPageChange,
    onPageSizeChange,
  } = useClientPagedRows(users);

  const triggerRefresh = () => {
    setRefreshBusy(true);
    void fetchUsers().finally(() => {
      window.setTimeout(() => setRefreshBusy(false), 400);
    });
  };

  const handleRevoke = async (user: any) => {
    setRevokingId(user.id);
    try {
      await adminUsersService.revokeRejection(user.id);
      await fetchUsers();
    } catch (err) {
      console.error(err);
      alert('Failed to revoke rejection.');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <PermissionGuard
      permission={[...USER_PROFILE_READ_PERMISSIONS]}
      fallback={
        <div className="p-12 text-center text-gray-500">
          You do not have permission to view rejected users.
        </div>
      }
    >
      <div className="space-y-6 pb-12">
        <Breadcrumb
          items={[
            { label: 'User Profile master data', href: '/user-analytics' },
            { label: 'Rejected users' },
          ]}
        />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/user-analytics"
              className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to User Profile master data
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Rejected users</h1>
            <p className="mt-1 text-gray-500">
              Users rejected from without-referral approval. Revoke to move them back to pending.
            </p>
          </div>
          <AdminListToolbar
            onRefresh={triggerRefresh}
            refreshBusy={refreshBusy || isLoading}
          />
        </div>

        <AdminDataTable
          page={page}
          limit={limit}
          total={total}
          totalPages={totalPages}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          loading={isLoading}
          isEmpty={!users.length}
          emptyMessage="No rejected users."
          syncKey={pageRows.length}
        >
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-5 py-4 font-semibold text-gray-700">Name / Email / Contact</th>
                <th className="px-5 py-4 font-semibold text-gray-700">Role</th>
                <th className="px-5 py-4 font-semibold text-gray-700">Remark</th>
                <th className="px-5 py-4 font-semibold text-gray-700">Rejected</th>
                <th className="px-5 py-4 text-right font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageRows.map((user) => {
                const roleName = user.userRoles?.[0]?.role?.name;
                const remark =
                  user.statusRemark ||
                  user.rejectRemark ||
                  user.latestRemarkPreview ||
                  '—';
                return (
                  <tr key={user.id} className="align-top hover:bg-gray-50/50">
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">{user.name || '—'}</p>
                      <p className="text-xs text-gray-500">{user.email || '—'}</p>
                      <p className="text-xs text-gray-400">{user.contact || '—'}</p>
                    </td>
                    <td className="px-5 py-4">
                      {roleName ? (
                        <Badge
                          variant="secondary"
                          className="bg-primary-light text-[10px] capitalize text-primary"
                        >
                          {String(roleName).replace('_', ' ')}
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="max-w-xs px-5 py-4 text-sm text-gray-700">{remark}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-xs text-gray-600">
                      {formatDateTime(
                        user.statusChangedAt || user.updatedAt || user.createdAt,
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {canUpdate ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void handleRevoke(user)}
                            disabled={revokingId === user.id}
                          >
                            {revokingId === user.id ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Revoke
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 px-2 text-[0.8rem]"
                          title="View"
                          onClick={() => {
                            setViewUser(user);
                            setViewOpen(true);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </AdminDataTable>

        <RegisteredUserViewModal
          open={viewOpen}
          onOpenChange={setViewOpen}
          user={viewUser}
        />
      </div>
    </PermissionGuard>
  );
}
