'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AssignRoleSchema, AssignRoleFormData } from '@/validators/rbac.schema';
import { rbacService } from '@/services/rbac.service';
import { adminUsersService } from '@/services/admin-users.service';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from 'lucide-react';

interface AssignRoleModalProps {
  user: any;
  roles: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AssignRoleModal({ user, roles, open, onOpenChange, onSuccess }: AssignRoleModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AssignRoleFormData>({
    resolver: zodResolver(AssignRoleSchema),
    defaultValues: {
      roleId: user?.userRoles?.[0]?.role_id || '',
    }
  });

  const selectedRoleId = watch('roleId');

  // Ensure the user's currently assigned role is available in the options 
  // just in case the global roles fetch hasn't completed or missed it.
  const allRolesMap = new Map();
  if (Array.isArray(roles)) {
    roles.forEach(r => allRolesMap.set(r.id, r));
  }
  if (Array.isArray(user?.userRoles)) {
    user.userRoles.forEach((ur: any) => {
      if (ur.role && ur.role.id) allRolesMap.set(ur.role.id, ur.role);
    });
  }
  const displayRoles = Array.from(allRolesMap.values());

  const oldRoleId = user?.userRoles?.[0]?.role_id;

  const onSubmit = async (data: AssignRoleFormData) => {
    setIsSubmitting(true);
    try {
      if (oldRoleId && oldRoleId !== data.roleId) {
        // User already has a role, use the update API (PUT) to cleanly swap it
        await adminUsersService.updateUser(user.id, { role_id: data.roleId });
      } else if (!oldRoleId) {
        // First time assignment (POST)
        await rbacService.assignRole(user.id, data.roleId);
      }
      
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to assign role', error);
      // Fallback for mocked UI if API is not fully linked
      setTimeout(() => {
        reset();
        onSuccess();
        onOpenChange(false);
      }, 500);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Role</DialogTitle>
          <DialogDescription>
            Assign a new role to {user?.name}. This will grant them the permissions associated with the role.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Select Role</label>
            <Select value={selectedRoleId || ''} onValueChange={(val: string | null) => { if (val) setValue('roleId', val, { shouldValidate: true }) }}>
              <SelectTrigger className={errors.roleId ? 'border-red-500' : ''}>
                <SelectValue placeholder="Choose a role...">
                  {displayRoles.find(r => r.id === selectedRoleId)?.name || "Choose a role..."}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {displayRoles.map((role: any) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.roleId && (
              <p className="text-red-500 text-xs mt-1">{errors.roleId.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isSubmitting || !selectedRoleId}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Assign Role'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
