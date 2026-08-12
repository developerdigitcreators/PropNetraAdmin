'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { AssignRoleModal } from '@/modules/rbac/assign-role-modal';
import { UserFormModal } from '@/modules/rbac/user-form-modal';
import { DeleteUserAlert } from '@/modules/rbac/delete-user-alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { rbacService } from '@/services/rbac.service';
import { adminUsersService, type AppUserBucket, type SignupRemark } from '@/services/admin-users.service';
import { locationService } from '@/services/location.service';
import {
  Loader2,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Shield,
  CheckCircle2,
  Eye,
  Search,
  MessageSquarePlus,
} from 'lucide-react';

export type AppUsersTab = 'otp_issued' | 'otp_verified' | 'master';

type AccountStatusFilter = 'pending_approval' | 'active' | 'suspended' | '';

type UserRemark = SignupRemark;

type FilledChip = {
  key: string;
  label: string;
  filled: boolean;
  note?: string;
  optional?: boolean;
};

const STEP_CHIP: Record<string, { label: string; className: string }> = {
  basic: { label: 'OTP Sent', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  verification: { label: 'Company pending', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  profile: { label: 'Password pending', className: 'bg-violet-50 text-violet-700 border-violet-200' },
  password: { label: 'Password pending', className: 'bg-violet-50 text-violet-700 border-violet-200' },
  logged_in: { label: 'Logged In', className: 'bg-green-50 text-green-700 border-green-200' },
  completed: { label: 'Completed', className: 'bg-green-50 text-green-700 border-green-200' },
};

function formatDateTime(value?: string | Date | null) {
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

function buildFilledChips(filled: Record<string, boolean>): FilledChip[] {
  const emailFilled = !!filled.email;
  const emailVerified = !!filled.emailVerified;
  const phoneFilled = !!filled.contact;
  const phoneVerified = !!filled.contactVerified;

  return [
    { key: 'name', label: 'Name', filled: !!filled.name },
    {
      key: 'email',
      label: 'Email',
      filled: emailFilled,
      note: emailFilled ? (emailVerified ? 'verified' : 'unverified') : undefined,
    },
    {
      key: 'contact',
      label: 'Phone',
      filled: phoneFilled,
      note: phoneFilled ? (phoneVerified ? 'verified' : 'unverified') : undefined,
    },
    { key: 'companyName', label: 'Company', filled: !!filled.companyName },
    { key: 'address', label: 'Address', filled: !!filled.address },
    { key: 'city', label: 'City', filled: !!filled.city },
    { key: 'gstNumber', label: 'GST', filled: !!filled.gstNumber, optional: true },
    { key: 'password', label: 'Password', filled: !!filled.password },
    { key: 'referId', label: 'Refer ID', filled: !!filled.referId },
  ];
}

function missingSummary(filled?: Record<string, boolean> | null, signupStep?: string) {
  if (!filled) return '—';
  const chips = buildFilledChips(filled);
  const missing = chips.filter((c) => !c.filled).map((c) => (c.optional ? `${c.label} (optional)` : c.label));
  if (missing.length === 0) {
    if (signupStep === 'profile' || signupStep === 'password') return 'Missing: Password';
    return '—';
  }
  return `Missing: ${missing.join(', ')}`;
}

function FilledFieldsCell({ filled }: { filled?: Record<string, boolean> | null }) {
  if (!filled) return <span className="text-gray-400 text-xs">—</span>;

  const chips = buildFilledChips(filled);
  const missing = chips.filter((c) => !c.filled);

  return (
    <div className="space-y-1.5 min-w-[200px] max-w-[280px]">
      <div className="flex flex-wrap gap-1">
        {chips.map((chip) => {
          const unverified = chip.filled && chip.note === 'unverified';
          return (
            <span
              key={chip.key}
              title={
                chip.optional && !chip.filled
                  ? `${chip.label} (optional)`
                  : chip.note
                    ? `${chip.label} (${chip.note})`
                    : chip.label
              }
              className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                !chip.filled
                  ? chip.optional
                    ? 'bg-orange-50 text-orange-600 border-orange-200'
                    : 'bg-red-50 text-red-600 border-red-200'
                  : unverified
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-green-50 text-green-700 border-green-200'
              }`}
            >
              {chip.filled ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0" />}
              <span>{chip.label}</span>
              {chip.note === 'verified' && <span className="opacity-70">· ✓</span>}
              {chip.note === 'unverified' && <span className="opacity-70">· unverified</span>}
              {chip.optional && !chip.filled && <span className="opacity-70">· opt</span>}
            </span>
          );
        })}
      </div>
      {missing.length > 0 && (
        <p className="text-[10px] text-red-600">
          Missing:{' '}
          {missing.map((m) => (m.optional ? `${m.label} (optional)` : m.label)).join(', ')}
        </p>
      )}
    </div>
  );
}

function OtpStatusChips({ user }: { user: any }) {
  return (
    <div className="flex flex-wrap gap-1">
      <Badge
        variant="outline"
        className={
          user.emailVerified
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-amber-50 text-amber-700 border-amber-200'
        }
      >
        {user.emailVerified ? 'Email verified' : 'Email pending'}
      </Badge>
      <Badge
        variant="outline"
        className={
          user.contactVerified
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-amber-50 text-amber-700 border-amber-200'
        }
      >
        {user.contactVerified ? 'Phone verified' : 'Phone pending'}
      </Badge>
    </div>
  );
}

function ViewOnlyModal({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: any | null;
}) {
  if (!user) return null;
  const stepMeta = STEP_CHIP[user.signupStep];
  const isRegistered = user.kind === 'registered';
  const chips = user.filledFields ? buildFilledChips(user.filledFields) : [];
  const missing = chips.filter((c) => !c.filled);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isRegistered ? 'User details' : 'Signup session'}</DialogTitle>
          <DialogDescription>
            {isRegistered
              ? 'Registered app user (view only).'
              : 'View-only details for in-progress signup.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm pt-1 pb-2">
          <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 space-y-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Name</p>
              <p className="mt-0.5 font-semibold text-gray-900 break-words">{user.name || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Email</p>
              <p className="mt-0.5 text-gray-800 break-all">{user.email || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Contact</p>
              <p className="mt-0.5 text-gray-800">{user.contact || '—'}</p>
            </div>
          </div>

          {!isRegistered && (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-1.5">
                OTP status
              </p>
              <OtpStatusChips user={user} />
            </div>
          )}

          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-1.5">
              Signup step
            </p>
            {stepMeta ? (
              <Badge variant="outline" className={stepMeta.className}>
                {stepMeta.label}
              </Badge>
            ) : (
              <p className="text-gray-800">{user.signupStepLabel || user.signupStep || '—'}</p>
            )}
            {user.signupStepLabel && stepMeta && (
              <p className="mt-1.5 text-xs text-gray-500 leading-snug">{user.signupStepLabel}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-gray-100 px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                {isRegistered ? 'Created' : 'Session created'}
              </p>
              <p className="mt-1 text-gray-800 text-xs whitespace-nowrap">
                {formatDateTime(user.createdAt)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-100 px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                {isRegistered ? 'Last login' : 'Expires'}
              </p>
              <p className="mt-1 text-gray-800 text-xs whitespace-nowrap">
                {formatDateTime(
                  isRegistered
                    ? user.lastLoginAt ?? user.last_login_at
                    : user.expiresAt,
                )}
              </p>
            </div>
          </div>

          {chips.length > 0 && (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-1.5">
                Filled fields
              </p>
              <div className="flex flex-wrap gap-1.5">
                {chips.map((chip) => {
                  const unverified = chip.filled && chip.note === 'unverified';
                  return (
                    <span
                      key={chip.key}
                      title={chip.note ? `${chip.label} (${chip.note})` : chip.label}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium border ${
                        !chip.filled
                          ? 'bg-red-50 text-red-600 border-red-200'
                          : unverified
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-green-50 text-green-700 border-green-200'
                      }`}
                    >
                      {chip.filled ? (
                        <Check className="w-3 h-3 shrink-0" />
                      ) : (
                        <X className="w-3 h-3 shrink-0" />
                      )}
                      {chip.label}
                      {chip.note === 'unverified' && (
                        <span className="opacity-70 font-normal">unverified</span>
                      )}
                    </span>
                  );
                })}
              </div>
              {missing.length > 0 && (
                <p className="mt-2 text-xs text-red-600 leading-snug">
                  Missing: {missing.map((m) => m.label).join(', ')}
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RemarksModal({
  open,
  onOpenChange,
  user,
  remarks,
  onAdd,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: any | null;
  remarks: UserRemark[];
  onAdd: (text: string) => void | Promise<void>;
  onDelete: (remarkId: string) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setDraft('');
  }, [open, user?.id]);

  if (!user) return null;

  const submit = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      await onAdd(text);
      setDraft('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Remarks</DialogTitle>
          <DialogDescription>
            Add remarks for {user.name || user.email || 'this signup'}. Previous remarks cannot be
            edited (append-only).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1 pb-2">
          <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2.5 text-sm">
            <p className="font-medium text-gray-900">{user.name || '—'}</p>
            <p className="text-xs text-gray-500 break-all">{user.email || '—'}</p>
            <p className="text-xs text-gray-400">{user.contact || '—'}</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Add remark
            </label>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              placeholder="Write a remark…"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-y min-h-[72px]"
            />
            <Button
              type="button"
              onClick={() => void submit()}
              disabled={!draft.trim() || busy}
              className="bg-primary text-white hover:bg-primary/90"
              size="sm"
            >
              {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Plus className="w-4 h-4 mr-1.5" />}
              Add remark
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Remarks ({remarks.length})
            </p>
            {remarks.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center border border-dashed border-gray-200 rounded-xl">
                No remarks yet.
              </p>
            ) : (
              <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {[...remarks].reverse().map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-gray-800 whitespace-pre-wrap break-words flex-1">{r.text}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0 -mr-1 -mt-1"
                        title="Delete remark"
                        onClick={() => onDelete(r.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1.5">{formatDateTime(r.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type Props = {
  tab: AppUsersTab;
};

export function AppUsersTable({ tab }: Props) {
  const bucket: AppUserBucket =
    tab === 'otp_issued' ? 'otp_issued' : tab === 'otp_verified' ? 'otp_verified' : 'master';

  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AccountStatusFilter>('');
  const [cityFilter, setCityFilter] = useState('');
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);

  const [roles, setRoles] = useState<any[]>([]);
  const [assignRoleUser, setAssignRoleUser] = useState<any>(null);
  const [assignRoleOpen, setAssignRoleOpen] = useState(false);
  const [formUser, setFormUser] = useState<any>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<any>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [viewUser, setViewUser] = useState<any>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [togglingActiveId, setTogglingActiveId] = useState<string | null>(null);
  const [remarksMap, setRemarksMap] = useState<Record<string, UserRemark[]>>({});
  const [remarksUser, setRemarksUser] = useState<any>(null);
  const [remarksOpen, setRemarksOpen] = useState(false);
  const [remarksSaving, setRemarksSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminUsersService.getUsers({
        audience: 'app',
        includeInProgress: tab !== 'master',
        bucket,
      });
      const rows = Array.isArray(data) ? data : [];
      setUsers(rows);
      // Seed remarks map from API (OTP Issued / in-progress)
      if (tab === 'otp_issued') {
        const map: Record<string, UserRemark[]> = {};
        for (const row of rows) {
          if (Array.isArray(row.remarks)) map[row.id] = row.remarks;
        }
        setRemarksMap(map);
      }
    } catch (err) {
      console.error('Failed to fetch users', err);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [tab, bucket]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    locationService
      .getCities()
      .then((data) => setCities(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (tab !== 'master') return;
    rbacService
      .getRoles('app')
      .then((data) => setRoles(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, [tab]);

  const cityOptions = useMemo(() => {
    const fromApi = cities.map((c) => c.name).filter(Boolean);
    const fromRows = users.map((u) => u.city).filter(Boolean);
    return Array.from(new Set([...fromApi, ...fromRows])).sort((a, b) =>
      String(a).localeCompare(String(b)),
    );
  }, [cities, users]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const cityName = cityFilter.trim().toLowerCase();
    return users.filter((user) => {
      const matchStatus = tab !== 'master' || !statusFilter || user.status === statusFilter;
      const matchCity =
        !cityName || String(user.city || '').trim().toLowerCase() === cityName;
      const matchSearch =
        !q ||
        String(user.name || '').toLowerCase().includes(q) ||
        String(user.email || '').toLowerCase().includes(q) ||
        String(user.contact || '').toLowerCase().includes(q);
      return matchStatus && matchCity && matchSearch;
    });
  }, [users, search, statusFilter, cityFilter, tab]);

  const handleApprove = async (user: any) => {
    if (user.kind !== 'registered') return;
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

  const handleToggleActive = async (user: any, active: boolean) => {
    if (user.kind !== 'registered') return;
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

  const addRemark = async (userId: string, text: string) => {
    setRemarksSaving(true);
    try {
      const res = await adminUsersService.addRemark(userId, text);
      const list = res?.remarks || [];
      setRemarksMap((prev) => ({ ...prev, [userId]: list }));
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, remarks: list } : u)),
      );
    } catch (err) {
      console.error(err);
      alert('Failed to save remark.');
    } finally {
      setRemarksSaving(false);
    }
  };

  const deleteRemark = async (userId: string, remarkId: string) => {
    setRemarksSaving(true);
    try {
      const res = await adminUsersService.deleteRemark(userId, remarkId);
      const list = res?.remarks || [];
      setRemarksMap((prev) => ({ ...prev, [userId]: list }));
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, remarks: list } : u)),
      );
    } catch (err) {
      console.error(err);
      alert('Failed to delete remark.');
    } finally {
      setRemarksSaving(false);
    }
  };

  const openRemarks = async (user: any) => {
    setRemarksUser(user);
    setRemarksOpen(true);
    try {
      const res = await adminUsersService.listRemarks(user.id);
      const list = res?.remarks || [];
      setRemarksMap((prev) => ({ ...prev, [user.id]: list }));
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, remarks: list } : u)),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const colSpan =
    tab === 'otp_issued' ? 6 : tab === 'otp_verified' ? 6 : 7;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone..."
            className="pl-9 bg-white"
          />
        </div>

        <Select value={cityFilter} onValueChange={(v) => setCityFilter(v ?? '')}>
          <SelectTrigger className="w-44 bg-white">
            <span>{cityFilter || 'All cities'}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All cities</SelectItem>
            {cityOptions.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {tab === 'master' && (
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter((v ?? '') as AccountStatusFilter)}
          >
            <SelectTrigger className="w-44 bg-white">
              <span>
                {!statusFilter
                  ? 'All statuses'
                  : statusFilter === 'pending_approval'
                    ? 'Pending approval'
                    : statusFilter === 'suspended'
                      ? 'Suspended'
                      : 'Active'}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="pending_approval">Pending approval</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        )}

        {tab === 'master' && (
          <Button
            onClick={() => {
              setFormUser(null);
              setFormOpen(true);
            }}
            className="bg-primary text-white hover:bg-primary/90 ml-auto"
          >
            <Plus className="w-4 h-4 mr-2" /> Add User
          </Button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-4 font-semibold text-gray-700">Name / Email / Contact</th>
                {tab === 'otp_issued' && (
                  <>
                    <th className="px-5 py-4 font-semibold text-gray-700">OTP Status</th>
                    <th className="px-5 py-4 font-semibold text-gray-700">Signup Step</th>
                    <th className="px-5 py-4 font-semibold text-gray-700">Session</th>
                    <th className="px-5 py-4 font-semibold text-gray-700">Remarks</th>
                  </>
                )}
                {tab === 'otp_verified' && (
                  <>
                    <th className="px-5 py-4 font-semibold text-gray-700">Signup Step</th>
                    <th className="px-5 py-4 font-semibold text-gray-700">Filled</th>
                    <th className="px-5 py-4 font-semibold text-gray-700">Missing</th>
                    <th className="px-5 py-4 font-semibold text-gray-700">Session Expires</th>
                  </>
                )}
                {tab === 'master' && (
                  <>
                    <th className="px-5 py-4 font-semibold text-gray-700">Role</th>
                    <th className="px-5 py-4 font-semibold text-gray-700">Active</th>
                    <th className="px-5 py-4 font-semibold text-gray-700">Subscription</th>
                    <th className="px-5 py-4 font-semibold text-gray-700">Last Login</th>
                    <th className="px-5 py-4 font-semibold text-gray-700">Created</th>
                  </>
                )}
                <th className="px-5 py-4 font-semibold text-gray-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={colSpan} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="px-6 py-12 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const stepMeta = STEP_CHIP[user.signupStep] || null;
                  const isRegistered = user.kind === 'registered';
                  const canApprove = isRegistered && user.status === 'pending_approval';

                  return (
                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors align-top">
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">{user.name || '—'}</p>
                        <p className="text-xs text-gray-500">{user.email || '—'}</p>
                        <p className="text-xs text-gray-400">{user.contact || '—'}</p>
                      </td>

                      {tab === 'otp_issued' && (
                        <>
                          <td className="px-5 py-4">
                            <OtpStatusChips user={user} />
                          </td>
                          <td className="px-5 py-4">
                            {stepMeta ? (
                              <div className="space-y-1">
                                <Badge variant="outline" className={stepMeta.className}>
                                  {stepMeta.label}
                                </Badge>
                                {user.signupStepLabel && (
                                  <p className="text-[11px] text-gray-500 max-w-[180px] leading-snug">
                                    {user.signupStepLabel}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-xs text-gray-600 whitespace-nowrap">
                            <p>Created: {formatDateTime(user.createdAt)}</p>
                            <p className="text-gray-400">Expires: {formatDateTime(user.expiresAt)}</p>
                          </td>
                          <td className="px-5 py-4">
                            {(() => {
                              const list = remarksMap[user.id] || [];
                              const latest = list[list.length - 1];
                              return (
                                <div className="min-w-[140px] max-w-[200px] space-y-1">
                                  {list.length === 0 ? (
                                    <span className="text-gray-400 text-xs">No remarks</span>
                                  ) : (
                                    <>
                                      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                                        {list.length} remark{list.length === 1 ? '' : 's'}
                                      </Badge>
                                      {latest && (
                                        <p className="text-[11px] text-gray-500 line-clamp-2 leading-snug">
                                          {latest.text}
                                        </p>
                                      )}
                                    </>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                        </>
                      )}

                      {tab === 'otp_verified' && (
                        <>
                          <td className="px-5 py-4">
                            {stepMeta ? (
                              <div className="space-y-1">
                                <Badge variant="outline" className={stepMeta.className}>
                                  {stepMeta.label}
                                </Badge>
                                {user.signupStepLabel && (
                                  <p className="text-[11px] text-gray-500 max-w-[180px] leading-snug">
                                    {user.signupStepLabel}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <FilledFieldsCell filled={user.filledFields} />
                          </td>
                          <td className="px-5 py-4 text-xs text-red-600 max-w-[160px]">
                            {missingSummary(user.filledFields, user.signupStep)}
                          </td>
                          <td className="px-5 py-4 text-xs text-gray-600 whitespace-nowrap">
                            {formatDateTime(user.expiresAt)}
                          </td>
                        </>
                      )}

                      {tab === 'master' && (
                        <>
                          <td className="px-5 py-4">
                            {user.userRoles?.[0]?.role?.name ? (
                              <Badge
                                variant="secondary"
                                className="bg-primary-light text-primary capitalize text-[10px]"
                              >
                                {String(user.userRoles[0].role.name).replace('_', ' ')}
                              </Badge>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {(() => {
                              const isActive = user.status === 'active';
                              const busy = togglingActiveId === user.id;
                              return (
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={isActive}
                                    disabled={busy}
                                    onCheckedChange={(checked) => {
                                      void handleToggleActive(user, checked);
                                    }}
                                    aria-label={isActive ? 'Deactivate user' : 'Activate user'}
                                  />
                                  <span
                                    className={`text-xs font-medium ${
                                      isActive ? 'text-green-700' : 'text-gray-500'
                                    }`}
                                  >
                                    {busy ? 'Saving…' : isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                              );
                            })()}
                            {user.status === 'pending_approval' && (
                              <p className="text-[10px] text-orange-600 mt-1">Pending approval</p>
                            )}
                            {user.status === 'suspended' && (
                              <p className="text-[10px] text-gray-500 mt-1">Suspended</p>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {user.subscriptionStatus || user.subscription ? (
                              <Badge variant="outline" className="text-gray-700 border-gray-200 bg-gray-50">
                                {user.subscriptionStatus || user.subscription}
                              </Badge>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-xs text-gray-600 whitespace-nowrap">
                            {formatDateTime(user.lastLoginAt ?? user.last_login_at)}
                          </td>
                          <td className="px-5 py-4 text-xs text-gray-600 whitespace-nowrap">
                            {formatDateTime(user.createdAt)}
                          </td>
                        </>
                      )}

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {tab === 'otp_issued' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                void openRemarks(user);
                              }}
                              className="text-primary hover:text-primary hover:bg-primary-light"
                              title="Add remarks"
                            >
                              <MessageSquarePlus className="w-4 h-4" />
                            </Button>
                          )}
                          {tab !== 'master' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setViewUser(user);
                                setViewOpen(true);
                              }}
                              className="text-gray-500 hover:text-gray-700"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}

                          {tab === 'master' && (
                            <>
                              {canApprove && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleApprove(user)}
                                  disabled={approvingId === user.id}
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  title="Approve user"
                                >
                                  {approvingId === user.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-4 h-4" />
                                  )}
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setViewUser(user);
                                  setViewOpen(true);
                                }}
                                className="text-gray-500"
                                title="View"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setAssignRoleUser(user);
                                  setAssignRoleOpen(true);
                                }}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title="Assign Role"
                              >
                                <Shield className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setFormUser(user);
                                  setFormOpen(true);
                                }}
                                className="text-gray-500 hover:text-gray-700"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setDeleteUser(user);
                                  setDeleteOpen(true);
                                }}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
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

      <ViewOnlyModal open={viewOpen} onOpenChange={setViewOpen} user={viewUser} />

      {tab === 'otp_issued' && (
        <RemarksModal
          open={remarksOpen}
          onOpenChange={setRemarksOpen}
          user={remarksUser}
          remarks={remarksUser ? remarksMap[remarksUser.id] || remarksUser.remarks || [] : []}
          onAdd={async (text) => {
            if (remarksUser) await addRemark(remarksUser.id, text);
          }}
          onDelete={async (remarkId) => {
            if (remarksUser) await deleteRemark(remarksUser.id, remarkId);
          }}
        />
      )}

      {tab === 'master' && (
        <>
          <UserFormModal
            open={formOpen}
            onOpenChange={setFormOpen}
            user={formUser}
            roles={roles}
            onSuccess={fetchUsers}
          />
          <DeleteUserAlert
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            user={deleteUser}
            onSuccess={fetchUsers}
          />
          {assignRoleUser && (
            <AssignRoleModal
              user={assignRoleUser}
              roles={roles}
              open={assignRoleOpen}
              onOpenChange={setAssignRoleOpen}
              onSuccess={fetchUsers}
            />
          )}
        </>
      )}
    </>
  );
}
