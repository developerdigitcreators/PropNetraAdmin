'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { formatDisplayDateTime } from '@/lib/format-date';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { newFirstCellClass, NewTag } from '@/components/common/new-row-marker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import {
  USER_PROFILE_READ_PERMISSIONS,
} from '@/modules/app-users/app-users-access';
import {
  adminUsersService,
  type AppUserFilterType,
} from '@/services/admin-users.service';
import { locationService } from '@/services/location.service';
import { useAuthStore } from '@/store/use-auth-store';
import {
  CheckCircle2,
  Edit2,
  Eye,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react';
import { UserFormModal } from '@/modules/rbac/user-form-modal';
import { RegisteredUserViewModal } from '@/modules/app-users/registered-user-view-modal';
import { rbacService } from '@/services/rbac.service';
import { resolvePlanChip } from '@/lib/plan-labels';

type LocItem = {
  id: string;
  name: string;
  state_id?: string;
  state?: { id?: string };
};

type FilterCategory = AppUserFilterType | '';

const ROLE_OPTIONS = [
  { value: 'agent', label: 'Agent' },
  { value: 'developer', label: 'Developer' },
  { value: 'floor', label: 'Direct builder floor' },
] as const;

const PLAN_OPTIONS = [
  { value: 'free', label: 'Trial Free' },
  { value: 'lifetime_free', label: 'Lifetime Free' },
  { value: 'network', label: 'Network Paid' },
  { value: 'pro', label: 'Pro' },
  { value: 'elite', label: 'Elite' },
] as const;

const DOC_OPTIONS = [
  { value: 'aadhaar', label: 'Aadhaar' },
  { value: 'rera', label: 'RERA' },
  { value: 'both', label: 'Both' },
] as const;

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const;

const DOC_STATUS_CHIP: Record<string, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  approved: {
    label: 'Approved',
    className: 'bg-green-50 text-green-800 border-green-200',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-50 text-red-800 border-red-200',
  },
  new_document_added: {
    label: 'New document added',
    className: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  reuploaded: {
    label: 'Reuploaded',
    className: 'bg-violet-50 text-violet-800 border-violet-200',
  },
};

function formatDateTime(value?: string | Date | null) {
  return formatDisplayDateTime(value);
}

function DocumentsStatusBadge({
  status,
  label,
}: {
  status?: string | null;
  label?: string | null;
}) {
  if (!status || status === 'none') {
    return <span className="text-gray-400 text-xs">—</span>;
  }
  const chip = DOC_STATUS_CHIP[status];
  return (
    <Badge
      variant="outline"
      className={chip?.className || 'bg-gray-50 text-gray-700 border-gray-200'}
    >
      {chip?.label || label || status}
    </Badge>
  );
}

function PlanBadge({
  label,
  planCode,
}: {
  label?: string | null;
  planCode?: string | null;
}) {
  const chip = resolvePlanChip(label, planCode);
  if (!chip) {
    return <span className="text-xs text-gray-400">—</span>;
  }
  return (
    <Badge variant="outline" className={chip.className}>
      {chip.label}
    </Badge>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  const s = String(status || '').toLowerCase();
  if (s === 'pending_approval') {
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
        Pending approval
      </Badge>
    );
  }
  if (s === 'rejected') {
    return (
      <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200">
        Rejected
      </Badge>
    );
  }
  if (s === 'suspended') {
    return (
      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
        Inactive
      </Badge>
    );
  }
  if (s === 'without_referral') {
    return (
      <Badge variant="outline" className="bg-sky-50 text-sky-800 border-sky-200">
        Without referral
      </Badge>
    );
  }
  if (s === 'active') {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">
        Active
      </Badge>
    );
  }
  return <span className="text-gray-400 text-xs">{status || '—'}</span>;
}

function isWithoutReferralRow(user: any) {
  if (user?.withoutReferral === true) return true;
  if (user?.withoutReferral === false) return false;
  return !user?.referIdUsed;
}

function valueOptionsFor(category: FilterCategory) {
  if (category === 'role') return ROLE_OPTIONS;
  if (category === 'plan') return PLAN_OPTIONS;
  if (category === 'documents') return DOC_OPTIONS;
  if (category === 'status') return STATUS_OPTIONS;
  return [] as ReadonlyArray<{ value: string; label: string }>;
}

export function UserProfileMasterPanel() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canUpdate = hasPermission('app_users_master', 'update');

  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshBusy, setRefreshBusy] = useState(false);

  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [stateId, setStateId] = useState('');
  const [cityId, setCityId] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [filterType, setFilterType] = useState<FilterCategory>('');
  const [filterValue, setFilterValue] = useState('');

  const [states, setStates] = useState<LocItem[]>([]);
  const [cities, setCities] = useState<LocItem[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);

  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [togglingActiveId, setTogglingActiveId] = useState<string | null>(null);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<any>(null);
  const [rejectRemark, setRejectRemark] = useState('');
  const [rejectBusy, setRejectBusy] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsRequired, setSettingsRequired] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const [viewUser, setViewUser] = useState<any>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [formUser, setFormUser] = useState<any>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);

  const citiesForState = useMemo(
    () => cities.filter((c) => c.state_id === stateId || c.state?.id === stateId),
    [cities, stateId],
  );

  const stateName = states.find((s) => s.id === stateId)?.name || '';
  const cityName = cities.find((c) => c.id === cityId)?.name || '';
  const filterValueLabel =
    valueOptionsFor(filterType).find((o) => o.value === filterValue)?.label || '';

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminUsersService.list({
        audience: 'app',
        bucket: 'master',
        includeInProgress: false,
        q: appliedQ || undefined,
        stateId: stateId || undefined,
        cityId: cityId || undefined,
        createdFrom: createdFrom || undefined,
        createdTo: createdTo || undefined,
        filterType: filterType || undefined,
        filterValue: filterType && filterValue ? filterValue : undefined,
      });
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [appliedQ, stateId, cityId, createdFrom, createdTo, filterType, filterValue]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    let cancelled = false;
    rbacService
      .getRoles('app')
      .then((rows) => {
        if (!cancelled) setRoles(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setRoles([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLocationsLoading(true);
    Promise.all([locationService.getStates(), locationService.getCities()])
      .then(([nextStates, nextCities]) => {
        if (cancelled) return;
        setStates(Array.isArray(nextStates) ? nextStates : []);
        setCities(Array.isArray(nextCities) ? nextCities : []);
      })
      .catch(() => {
        if (!cancelled) {
          setStates([]);
          setCities([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLocationsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const triggerRefresh = () => {
    setRefreshBusy(true);
    void fetchUsers().finally(() => {
      window.setTimeout(() => setRefreshBusy(false), 400);
    });
  };

  const openSettings = async () => {
    setSettingsOpen(true);
    setSettingsLoading(true);
    try {
      const setting = await adminUsersService.getWithoutReferralApproval();
      setSettingsRequired(Boolean(setting.required));
    } catch (err) {
      console.error(err);
      alert('Failed to load without-referral approval setting.');
    } finally {
      setSettingsLoading(false);
    }
  };

  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      const saved = await adminUsersService.setWithoutReferralApproval(settingsRequired);
      setSettingsRequired(Boolean(saved.required));
      setSettingsOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save setting.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleApprove = async (user: any) => {
    setApprovingId(user.id);
    try {
      await adminUsersService.approveUser(user.id);
      await fetchUsers();
    } catch (err) {
      console.error(err);
      alert('Failed to approve user.');
    } finally {
      setApprovingId(null);
    }
  };

  const openReject = (user: any) => {
    setRejectTarget(user);
    setRejectRemark('');
    setRejectOpen(true);
  };

  const submitReject = async () => {
    if (!rejectTarget?.id) return;
    const remark = rejectRemark.trim();
    if (!remark) {
      alert('Remark is required to reject a user.');
      return;
    }
    setRejectBusy(true);
    setRejectingId(rejectTarget.id);
    try {
      await adminUsersService.rejectUser(rejectTarget.id, remark);
      setRejectOpen(false);
      setRejectTarget(null);
      setRejectRemark('');
      await fetchUsers();
    } catch (err) {
      console.error(err);
      alert('Failed to reject user.');
    } finally {
      setRejectBusy(false);
      setRejectingId(null);
    }
  };

  const handleToggleActive = async (user: any, active: boolean) => {
    setTogglingActiveId(user.id);
    try {
      await adminUsersService.setUserActive(user.id, active);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, status: active ? 'active' : 'suspended' } : u,
        ),
      );
    } catch (err) {
      console.error(err);
      alert('Failed to update account status.');
    } finally {
      setTogglingActiveId(null);
    }
  };

  const applySearch = () => setAppliedQ(q.trim());

  const onFilterTypeChange = (next: FilterCategory) => {
    setFilterType(next);
    setFilterValue('');
  };

  return (
    <PermissionGuard
      permission={[...USER_PROFILE_READ_PERMISSIONS]}
      fallback={
        <div className="p-12 text-center text-gray-500">
          You do not have permission to view User Profile.
        </div>
      }
    >
      <div className="space-y-6 pb-12">
        <Breadcrumb items={[{ label: 'User Profile' }]} />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">User Profile</h1>
            <p className="mt-1 text-gray-500">
              Master data for registered app users. Filter by location, plan, role, or documents.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={triggerRefresh}
              disabled={refreshBusy || isLoading}
            >
              <RefreshCw className={`mr-1.5 size-3.5 ${refreshBusy ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {canUpdate ? (
              <Button type="button" variant="outline" size="sm" onClick={() => void openSettings()}>
                Without referral user approval
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <label className="mb-1 block text-xs font-medium text-gray-500">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applySearch();
                }}
                placeholder="Name, email, phone, role, plan…"
                className="bg-white pl-9"
              />
            </div>
          </div>

          <div className="w-44">
            <label className="mb-1 block text-xs font-medium text-gray-500">State</label>
            <Select
              value={stateId || null}
              onValueChange={(v) => {
                setStateId(v ?? '');
                setCityId('');
              }}
              disabled={locationsLoading}
            >
              <SelectTrigger className="w-full bg-white">
                <span className={!stateName ? 'text-muted-foreground' : ''}>
                  {locationsLoading ? 'Loading…' : stateName || 'All states'}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All states</SelectItem>
                {states.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-44">
            <label className="mb-1 block text-xs font-medium text-gray-500">City</label>
            <Select
              value={cityId || null}
              onValueChange={(v) => setCityId(v ?? '')}
              disabled={!stateId || locationsLoading}
            >
              <SelectTrigger className="w-full bg-white">
                <span className={!cityName ? 'text-muted-foreground' : ''}>
                  {cityName || (stateId ? 'All cities' : 'Select state first')}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All cities</SelectItem>
                {citiesForState.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-40">
            <label className="mb-1 block text-xs font-medium text-gray-500">Created from</label>
            <Input
              type="date"
              value={createdFrom}
              onChange={(e) => setCreatedFrom(e.target.value)}
              className="bg-white"
            />
          </div>
          <div className="w-40">
            <label className="mb-1 block text-xs font-medium text-gray-500">Created to</label>
            <Input
              type="date"
              value={createdTo}
              min={createdFrom || undefined}
              onChange={(e) => setCreatedTo(e.target.value)}
              className="bg-white"
            />
          </div>

          <div className="w-40">
            <label className="mb-1 block text-xs font-medium text-gray-500">Category</label>
            <Select
              value={filterType || null}
              onValueChange={(v) => onFilterTypeChange((v ?? '') as FilterCategory)}
            >
              <SelectTrigger className="w-full bg-white">
                <span className={!filterType ? 'text-muted-foreground' : ''}>
                  {filterType
                    ? filterType.charAt(0).toUpperCase() + filterType.slice(1)
                    : 'Any'}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any</SelectItem>
                <SelectItem value="plan">Plan</SelectItem>
                <SelectItem value="role">Role</SelectItem>
                <SelectItem value="documents">Documents</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-48">
            <label className="mb-1 block text-xs font-medium text-gray-500">Value</label>
            <Select
              value={filterValue || null}
              onValueChange={(v) => setFilterValue(v ?? '')}
              disabled={!filterType}
            >
              <SelectTrigger className="w-full bg-white">
                <span className={!filterValueLabel ? 'text-muted-foreground' : ''}>
                  {filterValueLabel || (filterType ? 'Select value' : 'Pick category')}
                </span>
              </SelectTrigger>
              <SelectContent>
                {valueOptionsFor(filterType).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="button" size="sm" onClick={applySearch} className="bg-primary text-white">
            Apply search
          </Button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-5 py-4 font-semibold text-gray-700">Name / Email / Contact</th>
                  <th className="px-5 py-4 font-semibold text-gray-700">Role</th>
                  <th className="px-5 py-4 font-semibold text-gray-700">Active</th>
                  <th className="px-5 py-4 font-semibold text-gray-700">Subscription</th>
                  <th className="px-5 py-4 font-semibold text-gray-700">Documents</th>
                  <th className="px-5 py-4 font-semibold text-gray-700">Last Login</th>
                  <th className="px-5 py-4 font-semibold text-gray-700">Created</th>
                  <th className="w-[160px] px-3 py-4 text-right font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const status = String(user.status || '').toLowerCase();
                    const withoutReferral = isWithoutReferralRow(user);
                    const canToggle =
                      status === 'active' || status === 'without_referral' || status === 'suspended';
                    const showApproveReject = status === 'pending_approval';
                    const isActiveLike =
                      status === 'active' || status === 'without_referral';
                    const busy = togglingActiveId === user.id;
                    const roleName = user.userRoles?.[0]?.role?.name;

                    return (
                      <tr
                        key={user.id}
                        className="align-top transition-colors hover:bg-gray-50/50"
                      >
                        <td
                          className={`px-5 py-4 ${newFirstCellClass(
                            !!user.isNew || showApproveReject,
                          )}`}
                        >
                          <div>
                            <p className="font-medium text-gray-900">
                              <span className="inline-flex items-center gap-1.5">
                                {user.name || '—'}
                                <NewTag show={!!user.isNew || showApproveReject} />
                              </span>
                            </p>
                            <p className="text-xs text-gray-500">{user.email || '—'}</p>
                            <p className="text-xs text-gray-400">{user.contact || '—'}</p>
                            {withoutReferral ? (
                              <span className="mt-1.5 inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                                Without referral
                              </span>
                            ) : null}
                          </div>
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
                        <td className="px-5 py-4">
                          {showApproveReject || status === 'rejected' || !canToggle ? (
                            <StatusBadge status={status} />
                          ) : (
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={isActiveLike}
                                disabled={busy || !canUpdate}
                                onCheckedChange={(checked) => {
                                  void handleToggleActive(user, checked);
                                }}
                                aria-label={
                                  isActiveLike ? 'Deactivate user' : 'Activate user'
                                }
                              />
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  isActiveLike
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-red-50 text-red-700'
                                }`}
                              >
                                {busy ? 'Saving…' : isActiveLike ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <PlanBadge
                            label={user.subscriptionStatus || user.subscription}
                            planCode={user.planCode || user.plan_code}
                          />
                        </td>
                        <td className="px-5 py-4">
                          <DocumentsStatusBadge
                            status={user.documentsStatus}
                            label={user.documentsStatusLabel}
                          />
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-xs text-gray-600">
                          {formatDateTime(user.lastLoginAt ?? user.last_login_at)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-xs text-gray-600">
                          {formatDateTime(user.createdAt)}
                        </td>
                        <td className="w-[160px] px-3 py-4 text-right">
                          <div className="inline-flex items-center justify-end gap-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setViewUser(user);
                                setViewOpen(true);
                              }}
                              className="h-8 w-8 p-0 text-gray-500 hover:text-gray-800"
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {showApproveReject && canUpdate ? (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => void handleApprove(user)}
                                  disabled={approvingId === user.id}
                                  className="h-8 px-2 text-green-600 hover:bg-green-50 hover:text-green-700"
                                  title="Approve"
                                >
                                  {approvingId === user.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <CheckCircle2 className="mr-1 h-4 w-4" />
                                      <span className="text-xs">Approve</span>
                                    </>
                                  )}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openReject(user)}
                                  disabled={rejectingId === user.id}
                                  className="h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                                  title="Reject"
                                >
                                  <XCircle className="mr-1 h-4 w-4" />
                                  <span className="text-xs">Reject</span>
                                </Button>
                              </>
                            ) : (
                              <>
                                {canUpdate ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setFormUser(user);
                                      setFormOpen(true);
                                    }}
                                    className="h-8 w-8 p-0 text-gray-500 hover:text-gray-800"
                                    title="Edit"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                ) : null}
                                <Link
                                  href={`/user-analytics?userId=${encodeURIComponent(user.id)}`}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary hover:bg-primary/10"
                                  title="View Full Profile"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Link>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Without referral user approval</DialogTitle>
            <DialogDescription>
              When required, organic (no referral) signups stay in pending approval until an admin
              approves them.
            </DialogDescription>
          </DialogHeader>
          {settingsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-5 py-2">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Approval required</p>
                  <p className="text-xs text-gray-500">
                    {settingsRequired ? 'On — gate is active' : 'Off — users skip pending'}
                  </p>
                </div>
                <Switch
                  checked={settingsRequired}
                  onCheckedChange={setSettingsRequired}
                  aria-label="Toggle without-referral approval required"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link
                  href="/user-analytics/rejected"
                  className="text-sm font-medium text-primary hover:underline"
                  onClick={() => setSettingsOpen(false)}
                >
                  View rejected users
                </Link>
                <Button
                  type="button"
                  onClick={() => void saveSettings()}
                  disabled={settingsSaving}
                  className="bg-primary text-white hover:bg-primary/90"
                >
                  {settingsSaving ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : null}
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject user</DialogTitle>
            <DialogDescription>
              A remark is required. {rejectTarget?.name ? `Rejecting ${rejectTarget.name}.` : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <textarea
              value={rejectRemark}
              onChange={(e) => setRejectRemark(e.target.value)}
              rows={4}
              placeholder="Reason for rejection…"
              className="min-h-[96px] w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setRejectOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void submitReject()}
                disabled={rejectBusy || !rejectRemark.trim()}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {rejectBusy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <RegisteredUserViewModal
        open={viewOpen}
        onOpenChange={setViewOpen}
        user={viewUser}
      />

      {canUpdate ? (
        <UserFormModal
          open={formOpen}
          onOpenChange={setFormOpen}
          user={formUser}
          roles={roles}
          onSuccess={() => {
            void fetchUsers();
          }}
          hidePassword={!!formUser}
          showEditLogs
        />
      ) : null}
    </PermissionGuard>
  );
}
