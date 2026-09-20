'use client';

import { useCallback, useEffect, useMemo, useState, Fragment } from 'react';
import Link from 'next/link';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/store/use-auth-store';
import { isSuperAdmin } from '@/lib/super-admin';
import { planLabelFromCode, resolvePlanChip } from '@/lib/plan-labels';
import { formatDisplayDateTime } from '@/lib/format-date';
import {
  verifiedLeadsApiError,
  verifiedLeadsService,
  type VerifiedLeadAssignee,
  type VerifiedLeadRemark,
  type VerifiedLeadRow,
  type VerifiedLeadStatus,
} from '@/services/verified-leads.service';
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';

function PlanBadge({ planCode }: { planCode?: string | null }) {
  const chip = resolvePlanChip(null, planCode);
  if (!chip && !planCode) return null;
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
        chip?.className || 'bg-slate-100 text-slate-700'
      }`}
    >
      {chip?.label || planLabelFromCode(planCode) || '—'}
    </span>
  );
}

export function AdminVerifiedLeadsPanel() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const user = useAuthStore((s) => s.user);
  const superAdmin = isSuperAdmin(user);
  const canAssign =
    superAdmin || hasPermission('admin_verified_leads', 'assign');
  const canRemark = superAdmin || hasPermission('admin_verified_leads', 'create');
  const canStatus = superAdmin || hasPermission('admin_verified_leads', 'update');

  const [items, setItems] = useState<VerifiedLeadRow[]>([]);
  const [statuses, setStatuses] = useState<
    Array<{ value: VerifiedLeadStatus; label: string }>
  >([]);
  const [assignees, setAssignees] = useState<VerifiedLeadAssignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [remarksById, setRemarksById] = useState<Record<string, VerifiedLeadRemark[]>>(
    {},
  );
  const [remarksLoading, setRemarksLoading] = useState<string | null>(null);
  const [remarkDraft, setRemarkDraft] = useState('');
  const [statusDraft, setStatusDraft] = useState<VerifiedLeadStatus>('new');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [list, staff] = await Promise.all([
        verifiedLeadsService.list({
          page: 1,
          limit: 100,
          q: q.trim() || undefined,
          status: statusFilter === 'all' ? undefined : statusFilter,
        }),
        canAssign
          ? verifiedLeadsService.listAssignees().catch(() => [])
          : Promise.resolve([]),
      ]);
      setItems(list.items || []);
      setStatuses(list.statuses || []);
      setAssignees(staff || []);
    } catch (err) {
      setItems([]);
      setError(verifiedLeadsApiError(err, 'Failed to load leads.'));
    } finally {
      setLoading(false);
    }
  }, [q, statusFilter, canAssign]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetFilters = () => {
    setQ('');
    setStatusFilter('all');
    setExpandedId(null);
  };

  const toggleExpand = async (row: VerifiedLeadRow) => {
    if (expandedId === row.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(row.id);
    setRemarkDraft('');
    setStatusDraft(row.status);
    if (remarksById[row.id]) return;
    setRemarksLoading(row.id);
    try {
      const remarks = await verifiedLeadsService.listRemarks(row.id);
      setRemarksById((prev) => ({ ...prev, [row.id]: remarks }));
    } catch (err) {
      setError(verifiedLeadsApiError(err, 'Failed to load remarks.'));
    } finally {
      setRemarksLoading(null);
    }
  };

  const onAssign = async (row: VerifiedLeadRow, staffUserId: string) => {
    if (!staffUserId) return;
    setSaving(true);
    setError('');
    const staff =
      assignees.find((a) => a.id === staffUserId) ||
      row.assignedStaff ||
      null;
    try {
      const updated = await verifiedLeadsService.assign(row.id, staffUserId);
      setItems((prev) =>
        prev.map((item) =>
          item.id === row.id
            ? {
                ...item,
                ...updated,
                assignedStaff:
                  updated.assignedStaff?.name
                    ? updated.assignedStaff
                    : staff || updated.assignedStaff,
              }
            : item,
        ),
      );
    } catch (err) {
      setError(verifiedLeadsApiError(err, 'Failed to assign lead.'));
    } finally {
      setSaving(false);
    }
  };

  const onAddRemark = async (row: VerifiedLeadRow) => {
    const body = remarkDraft.trim();
    if (!body) return;
    setSaving(true);
    setError('');
    try {
      const remark = await verifiedLeadsService.addRemark(
        row.id,
        body,
        canStatus ? statusDraft : undefined,
      );
      setRemarksById((prev) => ({
        ...prev,
        [row.id]: [...(prev[row.id] || []), remark],
      }));
      if (canStatus && statusDraft !== row.status) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === row.id
              ? {
                  ...item,
                  status: statusDraft,
                  statusLabel:
                    statuses.find((s) => s.value === statusDraft)?.label ||
                    statusDraft,
                }
              : item,
          ),
        );
      }
      setRemarkDraft('');
    } catch (err) {
      setError(verifiedLeadsApiError(err, 'Failed to add remark.'));
    } finally {
      setSaving(false);
    }
  };

  const statusOptions = useMemo(
    () =>
      statuses.length
        ? statuses
        : [
            { value: 'new' as const, label: 'New' },
            { value: 'contacted' as const, label: 'Contacted' },
            { value: 'follow_up' as const, label: 'Follow up' },
            { value: 'closed' as const, label: 'Closed' },
          ],
    [statuses],
  );

  return (
    <PermissionGuard permission="admin_verified_leads:read">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Breadcrumb items={[{ label: 'Admin Verified My Leads' }]} />
            <h1 className="mt-2 text-2xl font-bold text-gray-900">
              Admin Verified My Leads
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Interests on admin-verified listings — one row per user × property.
              {superAdmin
                ? ' Super Admin sees all leads.'
                : ' You see leads assigned to you.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Reset
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, contact, project…"
            className="max-w-xs"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statusOptions.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Username</th>
                  <th className="px-4 py-3 font-medium">Contact no</th>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">BHK</th>
                  <th className="px-4 py-3 font-medium">City</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Dated</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Assign</th>
                  <th className="px-4 py-3 font-medium">Post</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                      No leads found.
                    </td>
                  </tr>
                ) : (
                  items.map((row) => {
                    const open = expandedId === row.id;
                    return (
                      <Fragment key={row.id}>
                        <tr className="text-gray-800">
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              className="flex items-center gap-2 text-left font-medium hover:text-primary"
                              onClick={() => void toggleExpand(row)}
                            >
                              {open ? (
                                <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                              )}
                              <span>{row.username}</span>
                              <PlanBadge planCode={row.planCode} />
                            </button>
                          </td>
                          <td className="px-4 py-3">{row.contact || '—'}</td>
                          <td className="px-4 py-3">{row.projectName || '—'}</td>
                          <td className="px-4 py-3">{row.bhk || '—'}</td>
                          <td className="px-4 py-3">{row.city || '—'}</td>
                          <td className="px-4 py-3">{row.location || '—'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                            {formatDisplayDateTime(row.interestedAt)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                              {row.statusLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 min-w-[180px]">
                            {canAssign && (!row.assignedLocked || superAdmin) ? (
                              <Select
                                value={row.assignedStaff?.id || undefined}
                                onValueChange={(v) => {
                                  if (!v) return;
                                  void onAssign(row, v);
                                }}
                                disabled={saving}
                              >
                                <SelectTrigger className="h-8 w-[170px] text-xs">
                                  <span className="truncate">
                                    {assignees.find(
                                      (a) => a.id === row.assignedStaff?.id,
                                    )?.name ||
                                      row.assignedStaff?.name ||
                                      'Assign staff'}
                                  </span>
                                </SelectTrigger>
                                <SelectContent>
                                  {assignees.map((a) => (
                                    <SelectItem key={a.id} value={a.id}>
                                      {a.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : row.assignedStaff ? (
                              <span className="text-xs text-gray-700">
                                {row.assignedStaff.name}
                                {row.assignedLocked ? (
                                  <span className="ml-1 text-gray-400">(locked)</span>
                                ) : null}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">Unassigned</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/my-listings?tab=admin_verified&listingId=${encodeURIComponent(row.listingId)}`}
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                            >
                              View
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </td>
                        </tr>
                        {open ? (
                          <tr className="bg-slate-50/80">
                            <td colSpan={10} className="px-4 py-4">
                              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  Remarks
                                </p>
                                {remarksLoading === row.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                ) : (remarksById[row.id] || []).length === 0 ? (
                                  <p className="text-sm text-gray-500">No remarks yet.</p>
                                ) : (
                                  <ul className="space-y-2">
                                    {(remarksById[row.id] || []).map((r) => (
                                      <li
                                        key={r.id}
                                        className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm"
                                      >
                                        <p className="text-gray-900">{r.body}</p>
                                        <p className="mt-1 text-[11px] text-gray-500">
                                          {r.author?.name || 'Admin'}
                                          {r.statusLabel ? ` · ${r.statusLabel}` : ''}
                                          {' · '}
                                          {formatDisplayDateTime(r.createdAt)}
                                        </p>
                                      </li>
                                    ))}
                                  </ul>
                                )}

                                {canRemark ? (
                                  <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 pt-3">
                                    {canStatus ? (
                                      <div className="space-y-1">
                                        <label className="text-[11px] text-gray-500">
                                          Status
                                        </label>
                                        <Select
                                          value={statusDraft}
                                          onValueChange={(v) =>
                                            setStatusDraft(v as VerifiedLeadStatus)
                                          }
                                        >
                                          <SelectTrigger className="h-9 w-[150px]">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {statusOptions.map((s) => (
                                              <SelectItem key={s.value} value={s.value}>
                                                {s.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    ) : null}
                                    <div className="min-w-[220px] flex-1 space-y-1">
                                      <label className="text-[11px] text-gray-500">
                                        Add remark
                                      </label>
                                      <Input
                                        value={remarkDraft}
                                        onChange={(e) => setRemarkDraft(e.target.value)}
                                        placeholder="Write a remark…"
                                      />
                                    </div>
                                    <Button
                                      type="button"
                                      size="sm"
                                      disabled={saving || !remarkDraft.trim()}
                                      onClick={() => void onAddRemark(row)}
                                    >
                                      Save
                                    </Button>
                                  </div>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}
