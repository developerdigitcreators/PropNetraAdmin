'use client';

import { useEffect } from 'react';
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
import { Loader2 } from 'lucide-react';

interface UserFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: any;
  roles?: any[];
  onSuccess: () => void;
}

export function UserFormModal({ open, onOpenChange, user, roles = [], onSuccess }: UserFormModalProps) {
  const isEdit = !!user;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AdminUserFormData>({
    resolver: zodResolver(AdminUserSchema),
    defaultValues: {
      name: '',
      email: '',
      contact: '',
      password: '',
      role_id: '',
    },
  });

  const selectedRoleId = watch('role_id');

  useEffect(() => {
    if (open) {
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
    try {
      if (isEdit) {
        const updateData = { ...data };
        if (!updateData.password) {
          delete updateData.password;
        }
        await adminUsersService.updateUser(user.id, updateData);
      } else {
        await adminUsersService.createUser(data);
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save user', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Admin User' : 'Create Admin User'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update details for this user.' : 'Add a new administrative user to the system.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Full Name</label>
            <Input
              placeholder="John Doe"
              {...register('name')}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Email Address</label>
            <Input
              type="email"
              placeholder="john@propnetra.com"
              {...register('email')}
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Contact Number</label>
            <Input
              placeholder="9876543210"
              {...register('contact')}
              className={errors.contact ? 'border-red-500' : ''}
            />
            {errors.contact && <p className="text-red-500 text-xs">{errors.contact.message}</p>}
          </div>

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

          {!isEdit && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Assign Role (Optional)</label>
              <Select value={selectedRoleId} onValueChange={(val) => setValue('role_id', val, { shouldValidate: true })}>
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
      </DialogContent>
    </Dialog>
  );
}
