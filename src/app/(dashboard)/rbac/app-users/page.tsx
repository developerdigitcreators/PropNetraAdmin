'use client';

import { useState, useEffect, useMemo } from 'react';
import { AssignRoleModal } from '@/modules/rbac/assign-role-modal';
import { UserFormModal } from '@/modules/rbac/user-form-modal';
import { DeleteUserAlert } from '@/modules/rbac/delete-user-alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { rbacService } from '@/services/rbac.service';
import { adminUsersService } from '@/services/admin-users.service';
import { Loader2, Plus, Edit2, Trash2, Check, X, Shield, CheckCircle2 } from 'lucide-react';
import { PermissionGuard } from '@/components/common/permission-guard';

type SignupStep = 'basic' | 'verification' | 'profile' | 'logged_in' | 'completed' | '';
type AccountStatusFilter = 'pending_approval' | 'active' | '';

type FilledChip = {
  key: string;
  label: string;
  filled: boolean;
  note?: string;
};

const STEP_CHIP: Record<string, { label: string; className: string }> = {
  basic: { label: 'OTP Sent', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  verification: { label: 'Verification', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  profile: { label: 'Profile', className: 'bg-violet-50 text-violet-700 border-violet-200' },
  logged_in: { label: 'Logged In', className: 'bg-green-50 text-green-700 border-green-200' },
  completed: { label: 'Completed', className: 'bg-green-50 text-green-700 border-green-200' },
};

function formatLastLogin(value?: string | null) {
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
    { key: 'gstNumber', label: 'GST', filled: !!filled.gstNumber },
    { key: 'password', label: 'Password', filled: !!filled.password },
    { key: 'referId', label: 'Refer ID', filled: !!filled.referId },
  ];
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
              title={chip.note ? `${chip.label} (${chip.note})` : chip.label}
              className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                !chip.filled
                  ? 'bg-red-50 text-red-600 border-red-200'
                  : unverified
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-green-50 text-green-700 border-green-200'
              }`}
            >
              {chip.filled ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0" />}
              <span>{chip.label}</span>
              {chip.note === 'verified' && <span className="opacity-70">· ✓</span>}
              {chip.note === 'unverified' && <span className="opacity-70">· unverified</span>}
            </span>
          );
        })}
      </div>
      {missing.length > 0 && (
        <p className="text-[10px] text-red-600">
          Missing: {missing.map((m) => m.label).join(', ')}
        </p>
      )}
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const [roles, setRoles] = useState<any[]>([]);
  const [stepFilter, setStepFilter] = useState<SignupStep>('');
  const [statusFilter, setStatusFilter] = useState<AccountStatusFilter>('');
  const [includeInProgress, setIncludeInProgress] = useState(true);

  const [assignRoleUser, setAssignRoleUser] = useState<any>(null);
  const [assignRoleOpen, setAssignRoleOpen] = useState(false);
  const [formUser, setFormUser] = useState<any>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<any>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await adminUsersService.getUsers({
        audience: 'app',
        includeInProgress,
      });
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [includeInProgress]);

  useEffect(() => {
    rbacService.getRoles('app').then((data) => setRoles(Array.isArray(data) ? data : [])).catch(console.error);
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchStep = !stepFilter || user.signupStep === stepFilter;
      const matchStatus = !statusFilter || user.status === statusFilter;
      return matchStep && matchStatus;
    });
  }, [users, stepFilter, statusFilter]);

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

  const stepLabel = (v: SignupStep) => {
    if (!v) return 'All steps';
    return STEP_CHIP[v]?.label || v;
  };

  const statusLabel = (v: AccountStatusFilter) => {
    if (!v) return 'All statuses';
    if (v === 'pending_approval') return 'Pending approval';
    return 'Active';
  };

  return (
    <PermissionGuard permission="users:read" fallback={<div className="p-12 text-center text-gray-500">You do not have permission to view app users.</div>}>
      <div className="space-y-6 pb-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">App Users</h1>
            <p className="text-gray-500 mt-1">
              Track signup progress and manage registered app users (Agents, Builders, etc).
            </p>
          </div>
          <Button onClick={() => { setFormUser(null); setFormOpen(true); }} className="bg-primary text-white hover:bg-primary/90 shrink-0">
            <Plus className="w-4 h-4 mr-2" /> Add User
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={stepFilter} onValueChange={(v) => setStepFilter((v ?? '') as SignupStep)}>
            <SelectTrigger className="w-44 bg-white">
              <span>{stepLabel(stepFilter)}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All steps</SelectItem>
              <SelectItem value="basic">OTP Sent (basic)</SelectItem>
              <SelectItem value="verification">Verification</SelectItem>
              <SelectItem value="profile">Profile</SelectItem>
              <SelectItem value="logged_in">Logged In</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter((v ?? '') as AccountStatusFilter)}>
            <SelectTrigger className="w-44 bg-white">
              <span>{statusLabel(statusFilter)}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="pending_approval">Pending approval</SelectItem>
              <SelectItem value="active">Active</SelectItem>
            </SelectContent>
          </Select>

          <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              className="rounded border-gray-300"
              checked={includeInProgress}
              onChange={(e) => setIncludeInProgress(e.target.checked)}
            />
            Include in-progress signups
          </label>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-4 font-semibold text-gray-700">Name / Email / Contact</th>
                  <th className="px-5 py-4 font-semibold text-gray-700">Signup Step</th>
                  <th className="px-5 py-4 font-semibold text-gray-700">Filled</th>
                  <th className="px-5 py-4 font-semibold text-gray-700">Account Status</th>
                  <th className="px-5 py-4 font-semibold text-gray-700">Subscription</th>
                  <th className="px-5 py-4 font-semibold text-gray-700">Kind</th>
                  <th className="px-5 py-4 font-semibold text-gray-700">Last Login</th>
                  <th className="px-5 py-4 font-semibold text-gray-700 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
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
                          {isRegistered && user.userRoles?.[0]?.role?.name && (
                            <Badge variant="secondary" className="mt-1.5 bg-primary-light text-primary capitalize text-[10px]">
                              {user.userRoles[0].role.name.replace('_', ' ')}
                            </Badge>
                          )}
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

                        <td className="px-5 py-4">
                          <FilledFieldsCell filled={user.filledFields} />
                        </td>

                        <td className="px-5 py-4">
                          {user.status === 'active' ? (
                            <Badge className="bg-green-100 text-green-700">Active</Badge>
                          ) : user.status === 'pending_approval' ? (
                            <Badge className="bg-orange-100 text-orange-700">Pending approval</Badge>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {user.subscriptionStatus ? (
                            <Badge variant="outline" className="text-gray-700 border-gray-200 bg-gray-50">
                              {user.subscriptionStatus}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {user.kind === 'registered' ? (
                            <Badge className="bg-green-100 text-green-700">Registered</Badge>
                          ) : user.kind === 'in_progress' ? (
                            <Badge className="bg-orange-100 text-orange-700">In progress</Badge>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-xs text-gray-600 whitespace-nowrap">
                          {formatLastLogin(user.lastLoginAt ?? user.last_login_at)}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
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
                            {isRegistered && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { setAssignRoleUser(user); setAssignRoleOpen(true); }}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  title="Assign Role"
                                >
                                  <Shield className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { setFormUser(user); setFormOpen(true); }}
                                  className="text-gray-500 hover:text-gray-700"
                                  title="Edit"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setDeleteUser(user); setDeleteOpen(true); }}
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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
      </div>
    </PermissionGuard>
  );
}
