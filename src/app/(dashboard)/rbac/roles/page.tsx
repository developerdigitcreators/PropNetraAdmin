'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RoleSchema, RoleFormData } from '@/validators/rbac.schema';
import { rbacService } from '@/services/rbac.service';
import { PermissionMatrix } from '@/modules/rbac/permission-matrix';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

export default function RolesPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<RoleFormData>({
    resolver: zodResolver(RoleSchema),
    defaultValues: {
      name: '',
      permissions: [],
    }
  });

  const selectedPermissions = watch('permissions');

  const onSubmit = async (data: RoleFormData) => {
    setIsSubmitting(true);
    setSuccess(false);
    try {
      await rbacService.createRole(data);
      setSuccess(true);
      reset();
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to create role', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Role Management</h1>
        <p className="text-gray-500 mt-1">Create custom roles and define their granular permission access.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-6">Create New Role</h2>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="space-y-2 max-w-md">
            <label className="text-sm font-medium text-gray-700">Role Name</label>
            <Input
              type="text"
              placeholder="e.g., Listings Manager"
              {...register('name')}
              className={`h-11 ${errors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Permission Scope</label>
              <p className="text-sm text-gray-500 mb-4">Select the modules and actions this role can perform.</p>
            </div>
            
            <PermissionMatrix 
              selectedPermissions={selectedPermissions}
              onChange={(perms) => setValue('permissions', perms, { shouldValidate: true })}
            />
            {errors.permissions && (
              <p className="text-red-500 text-xs mt-1">{errors.permissions.message}</p>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <Button 
              type="submit" 
              className="h-11 px-8 bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Create Role'
              )}
            </Button>
            {success && <span className="text-sm text-green-600 font-medium">Role created successfully!</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
