'use client';

import { useEffect, useState } from 'react';
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
import { Loader2 } from 'lucide-react';

interface UserFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: any;
  roles?: any[];
  onSuccess: () => void;
  hidePassword?: boolean;
  showEditLogs?: boolean;
}

function formatLogTime(value?: string) {
  return formatDisplayDateTime(value);
}

function digitsOnly(value: string, max = 10) {
  return value.replace(/\D/g, '').slice(0, max);
}

function apiFieldError(err: unknown): { field?: string; message: string } {
  const data = (err as { response?: { data?: { error?: { field?: string; message?: string } } } })
    ?.response?.data?.error;
  return {
    field: data?.field || undefined,
    message: data?.message || 'Failed to save user.',
  };
}

export function UserFormModal({
  open,
  onOpenChange,
  user,
  roles = [],
  onSuccess,
  hidePassword = false,
  showEditLogs = false,
}: UserFormModalProps) {
  const isEdit = !!user;

  const [formError, setFormError] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
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

  const selectedRoleId = watch('role_id');
  const nameReg = register('name');
  const emailReg = register('email');
  const contactReg = register('contact');

  useEffect(() => {
    if (open) {
      setFormError('');
      if (isEdit && user) {
        reset({
          name: user.name || '',
          email: user.email || '',
          contact: user.contact || '',
          password: '',
          role_id: user.role_id || '',
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
    try {
      if (isEdit) {
        const updateData = { ...data };
        if (hidePassword || !updateData.password) {
          delete updateData.password;
        }
        await adminUsersService.updateUser(user.id, {
          ...updateData,
          name: data.name.trim(),
          email: data.email.trim().toLowerCase(),
          contact: data.contact.trim(),
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
      } else {
        setFormError(message);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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

          {!hidePassword && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                {isEdit ? 'New Password (Optional)' : 'Password'}
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                {...register('password')}
                className={errors.password ? 'border-red-500' : ''}
              />
              {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}
            </div>
          )}

          {!isEdit && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Assign Role (Optional)</label>
              <Select value={selectedRoleId} onValueChange={(val) => setValue('role_id', val || undefined, { shouldValidate: true })}>
                <SelectTrigger className={errors.role_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Choose a role..." />
                </SelectTrigger>
                <SelectContent>
                  {roles?.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role_id && <p className="text-red-500 text-xs">{errors.role_id.message}</p>}
            </div>
          )}

          {formError && <p className="text-red-500 text-xs">{formError}</p>}

          <div className="pt-4 flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-white">
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
  );
}
