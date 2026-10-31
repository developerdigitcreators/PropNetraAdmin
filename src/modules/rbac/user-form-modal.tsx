'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AdminUserSchema, AdminUserFormData } from '@/validators/rbac.schema';
import { adminUsersService } from '@/services/admin-users.service';
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
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDisplayDateTime } from '@/lib/format-date';
import { useDialogUnsavedGuard } from '@/hooks/use-unsaved-changes-guard';
import { useIsSuperAdmin } from '@/hooks/use-is-super-admin';
import { humanizeRoleName } from '@/lib/role-label';
import { KeyRound, Loader2 } from 'lucide-react';
import {
  CompanyLogoField,
  LOCKED_EMAIL_NOTE,
  PROJECT_PREFIX_HINT,
} from '@/modules/app-users/company-logo-field';
import { resolveProjectPrefixError } from '@/lib/project-prefix-error';
import { apiErrorInfo } from '@/services/password-reset.service';

interface UserFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: any;
  roles?: any[];
  rolesLoading?: boolean;
  onSuccess: () => void;
  hidePassword?: boolean;
  showEditLogs?: boolean;
  /** Admin panel staff user: super admins get a "Reset password" link when editing. */
  adminPanel?: boolean;
}

type RoleOption = { value: string; label: string };

type DeveloperFields = { companyName: string; projectPrefix: string; companyLogoUrl: string };

const EMPTY_DEV: DeveloperFields = { companyName: '', projectPrefix: '', companyLogoUrl: '' };

type UserRoleShape = {
  role_id?: string;
  userRoles?: { role_id?: string; role?: { id?: string; name?: string } }[];
};

function currentRole(user: UserRoleShape | null | undefined): { id: string; name: string } {
  const first = user?.userRoles?.[0];
  return {
    id: String(first?.role?.id || first?.role_id || user?.role_id || ''),
    name: String(first?.role?.name || ''),
  };
}

function formatLogTime(value?: string) {
  return formatDisplayDateTime(value);
}

function digitsOnly(value: string, max = 10) {
  return value.replace(/\D/g, '').slice(0, max);
}

function apiFieldError(err: unknown): { field?: string; message: string } {
  const info = apiErrorInfo(err, 'Failed to save user.');
  const prefix = resolveProjectPrefixError(err, info.message);
  const fieldRaw = info.field;
  const fieldKey = String(fieldRaw || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  const field =
    fieldKey === 'projectprefix' || fieldKey === 'project_prefix'
      ? 'projectPrefix'
      : fieldKey === 'companyname' || fieldKey === 'company_name'
        ? 'companyName'
        : fieldKey === 'companylogourl' || fieldKey === 'company_logo_url'
          ? 'companyLogoUrl'
          : fieldRaw || undefined;
  return {
    field,
    message: prefix.isPrefixConflict ? prefix.message : info.message,
  };
}

export function UserFormModal({
  open,
  onOpenChange,
  user,
  roles = [],
  rolesLoading = false,
  onSuccess,
  hidePassword = false,
  showEditLogs = false,
  adminPanel = false,
}: UserFormModalProps) {
  const isEdit = !!user;
  const { superAdmin } = useIsSuperAdmin();

  const roleOptions = useMemo<RoleOption[]>(() => {
    const list: RoleOption[] = (roles || [])
      .filter((role) => role?.id)
      .map((role) => ({
        value: String(role.id),
        label: humanizeRoleName(role.label || role.roleLabel || role.name) || 'Unnamed role',
      }));
    if (isEdit) {
      const cur = currentRole(user);
      if (cur.id && cur.name && !list.some((o) => o.value === cur.id)) {
        list.unshift({ value: cur.id, label: humanizeRoleName(cur.name) });
      }
    }
    return list;
  }, [roles, isEdit, user]);

  const [formError, setFormError] = useState('');
  const [dev, setDev] = useState<DeveloperFields>(EMPTY_DEV);
  const [devBaseline, setDevBaseline] = useState<DeveloperFields>(EMPTY_DEV);
  const [devErrors, setDevErrors] = useState<Partial<Record<keyof DeveloperFields, string>>>({});
  const [logoUploading, setLogoUploading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<AdminUserFormData>({
    resolver: zodResolver(AdminUserSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      contact: '',
      password: '',
      role_id: '',
    },
  });

  const selectedRoleIdForDev = watch('role_id');
  const showDeveloperFields =
    isEdit &&
    showEditLogs &&
    (() => {
      const cur = currentRole(user);
      const picked = (roles || []).find((r) => String(r?.id) === selectedRoleIdForDev);
      const name = picked?.name || (selectedRoleIdForDev === cur.id ? cur.name : '');
      return String(name).trim().toLowerCase() === 'developer';
    })();
  const devDirty =
    showDeveloperFields &&
    (dev.companyName !== devBaseline.companyName ||
      dev.projectPrefix !== devBaseline.projectPrefix ||
      dev.companyLogoUrl !== devBaseline.companyLogoUrl);

  const submitUserRef = useRef<() => Promise<void>>(async () => {});
  const { requestClose, dialog: unsavedDialog } = useDialogUnsavedGuard(
    open && (isDirty || devDirty),
    { onSave: () => submitUserRef.current() },
  );

  const handleOpenChange = async (next: boolean) => {
    if (isSubmitting) return;
    if (!next) {
      const ok = await requestClose();
      if (ok) onOpenChange(false);
      return;
    }
    onOpenChange(true);
  };

  const selectedRoleId = watch('role_id');
  const nameReg = register('name');
  const emailReg = register('email');
  const contactReg = register('contact');

  useEffect(() => {
    if (open) {
      setFormError('');
      setDevErrors({});
      const nextDev: DeveloperFields =
        isEdit && user
          ? {
              companyName: user.companyName || '',
              projectPrefix: user.projectPrefix || '',
              companyLogoUrl: user.companyLogoUrl || '',
            }
          : EMPTY_DEV;
      setDev(nextDev);
      setDevBaseline(nextDev);
      if (isEdit && user) {
        reset({
          name: user.name || '',
          email: user.email || '',
          contact: user.contact || '',
          password: '',
          role_id: currentRole(user).id,
        });
      } else {
        reset({
          name: '',
          email: '',
          contact: '',
          password: '',
          role_id: '',
        });
      }
    }
  }, [open, isEdit, user, reset]);

  const onSubmit = async (data: AdminUserFormData) => {
    setFormError('');
    setDevErrors({});
    if (showDeveloperFields && !dev.projectPrefix.trim()) {
      setDevErrors({ projectPrefix: 'Project prefix is required' });
      return;
    }
    try {
      if (isEdit) {
        const updateData = { ...data };
        delete updateData.password;
        await adminUsersService.updateUser(user.id, {
          ...updateData,
          name: data.name.trim(),
          email: data.email.trim().toLowerCase(),
          contact: data.contact.trim(),
          ...(showDeveloperFields
            ? {
                companyName: dev.companyName.trim(),
                projectPrefix: dev.projectPrefix.trim(),
                companyLogoUrl: dev.companyLogoUrl,
              }
            : {}),
        });
      } else {
        await adminUsersService.createUser({
          ...data,
          name: data.name.trim(),
          email: data.email.trim().toLowerCase(),
          contact: data.contact.trim(),
        });
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      const { field, message } = apiFieldError(error);
      if (field === 'email' || field === 'contact' || field === 'name' || field === 'role_id') {
        setError(field, { message });
      } else if (
        field === 'companyName' ||
        field === 'projectPrefix' ||
        field === 'companyLogoUrl'
      ) {
        setDevErrors({ [field]: message });
      } else {
        setFormError(message);
      }
    }
  };

  submitUserRef.current = () =>
    new Promise<void>((resolve, reject) => {
      handleSubmit(
        async (data) => {
          try {
            await onSubmit(data);
            resolve();
          } catch (e) {
            reject(e);
          }
        },
        () => reject(new Error('validation')),
      )();
    });

  return (
    <>
    <Dialog open={open} onOpenChange={(next) => void handleOpenChange(next)}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? showEditLogs
                ? 'Edit User'
                : 'Edit Admin User'
              : 'Create Admin User'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? showEditLogs
                ? 'Update details for this app user. Previous edits are listed below.'
                : 'Update details for this user.'
              : 'Add a new administrative user to the system.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4" noValidate>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Full Name *</label>
            <Input
              placeholder="John Doe"
              autoComplete="name"
              {...nameReg}
              onBlur={(e) => {
                e.target.value = e.target.value.trim();
                void nameReg.onBlur(e);
              }}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Email Address *</label>
            <Input
              type="email"
              placeholder="john@propnetra.com"
              autoComplete="email"
              {...emailReg}
              onBlur={(e) => {
                e.target.value = e.target.value.trim();
                void emailReg.onBlur(e);
              }}
              className={errors.email ? 'border-red-500' : ''}
            />
            {isEdit && showEditLogs && user?.emailLocked ? (
              <p className="text-xs text-gray-500">{LOCKED_EMAIL_NOTE}</p>
            ) : null}
            {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Contact Number *</label>
            <Input
              placeholder="9876543210"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={10}
              {...contactReg}
              onChange={(e) => {
                e.target.value = digitsOnly(e.target.value);
                void contactReg.onChange(e);
              }}
              className={errors.contact ? 'border-red-500' : ''}
            />
            {errors.contact && <p className="text-red-500 text-xs">{errors.contact.message}</p>}
          </div>

          {!isEdit && !hidePassword && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                {...register('password')}
                className={errors.password ? 'border-red-500' : ''}
              />
              {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}
            </div>
          )}

          {rolesLoading ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                User Role {isEdit ? '' : '(Optional)'}
              </label>
              <div className="h-8 w-full animate-pulse rounded-lg bg-gray-100" />
            </div>
          ) : roleOptions.length ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                User Role {isEdit ? '' : '(Optional)'}
              </label>
              <Select
                value={selectedRoleId || undefined}
                onValueChange={(val) =>
                  setValue('role_id', val || '', { shouldValidate: true, shouldDirty: true })
                }
              >
                <SelectTrigger className={`w-full ${errors.role_id ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Agent, Direct builder, Developer">
                    {(value: string) =>
                      roleOptions.find((o) => o.value === value)?.label ||
                      'Agent, Direct builder, Developer'
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role_id && <p className="text-red-500 text-xs">{errors.role_id.message}</p>}
            </div>
          ) : null}

          {showDeveloperFields ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Company name</label>
                <Input
                  placeholder="Company name"
                  value={dev.companyName}
                  onChange={(e) => setDev((d) => ({ ...d, companyName: e.target.value }))}
                  className={devErrors.companyName ? 'border-red-500' : ''}
                />
                {devErrors.companyName && (
                  <p className="text-red-500 text-xs">{devErrors.companyName}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Project prefix *</label>
                <Input
                  placeholder="e.g. Suncity"
                  value={dev.projectPrefix}
                  onChange={(e) => {
                    setDev((d) => ({ ...d, projectPrefix: e.target.value }));
                    setDevErrors((prev) => ({ ...prev, projectPrefix: undefined }));
                  }}
                  className={devErrors.projectPrefix ? 'border-red-500' : ''}
                />
                <p className="text-xs text-gray-500">{PROJECT_PREFIX_HINT}</p>
                {devErrors.projectPrefix && (
                  <p className="text-red-500 text-xs">{devErrors.projectPrefix}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Company image</label>
                <CompanyLogoField
                  value={dev.companyLogoUrl}
                  onChange={(url) => {
                    setDev((d) => ({ ...d, companyLogoUrl: url }));
                    setDevErrors((prev) => ({ ...prev, companyLogoUrl: undefined }));
                  }}
                  onUploadingChange={setLogoUploading}
                  error={devErrors.companyLogoUrl}
                />
              </div>
            </>
          ) : null}

          {isEdit && adminPanel && superAdmin && user?.id && (
            <Link
              href={`/reset-password?userId=${encodeURIComponent(String(user.id))}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <KeyRound className="h-4 w-4" />
              Reset password →
            </Link>
          )}

          {formError && <p className="text-red-500 text-xs">{formError}</p>}

          <div className="pt-4 flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => void handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || logoUploading}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {isEdit ? 'Save Changes' : 'Create User'}
            </Button>
          </div>
        </form>

        {isEdit && showEditLogs && (
          <div className="border-t border-gray-100 pt-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-900 bg-gray-100 border-l-4 border-primary px-2 py-1.5 rounded-r">
              Edit logs ({Array.isArray(user?.editLogs) ? user.editLogs.length : 0})
            </p>
            {!Array.isArray(user?.editLogs) || user.editLogs.length === 0 ? (
              <p className="text-xs text-gray-500 px-1">No edits yet.</p>
            ) : (
              <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {user.editLogs.map((log: any) => (
                  <li
                    key={log.id}
                    className="rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2.5 text-sm"
                  >
                    <p className="text-[10px] text-gray-500 mb-1.5">
                      {log.createdByName || 'Admin'} · {formatLogTime(log.createdAt)}
                    </p>
                    <ul className="space-y-1">
                      {(log.changes || []).map(
                        (
                          change: { field: string; from: string; to: string },
                          i: number,
                        ) => (
                          <li key={`${log.id}-${change.field}-${i}`} className="text-xs text-gray-800">
                            <span className="font-medium">{change.field}:</span>{' '}
                            <span className="text-gray-500">{change.from}</span>
                            {' → '}
                            <span>{change.to}</span>
                          </li>
                        ),
                      )}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
    {unsavedDialog}
    </>
  );
}
