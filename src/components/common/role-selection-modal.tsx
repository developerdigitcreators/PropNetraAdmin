'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { authService } from '@/services/auth.service';

interface RoleSelectionModalProps {
  roles: any[]; // Adjust type based on backend
  onComplete: () => void;
}

export function RoleSelectionModal({ roles, onComplete }: RoleSelectionModalProps) {
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const setActiveRole = useAuthStore((state) => state.setActiveRole);
  const setAuthData = useAuthStore((state) => state.setAuthData);

  const handleRoleSelect = async (role: any) => {
    setLoading(true);
    try {
      // Simulate fetching permissions for the selected role
      // In a real app, you might fetch from /admin/permissions
      // const perms = await authService.getPermissions(role.id);
      
      const mockedPerms = role.name === 'Super Admin' ? ['ALL:ALL'] : ['listings:read', 'locations:read'];
      
      setActiveRole(role.name);
      
      // Update permissions in store
      const currentState = useAuthStore.getState();
      if (currentState.user && currentState.accessToken) {
        setAuthData(currentState.user, currentState.accessToken, mockedPerms);
      }
      
      setOpen(false);
      onComplete();
    } catch (error) {
      console.error('Failed to select role', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Select Your Workspace</DialogTitle>
          <DialogDescription>
            You have multiple roles assigned. Please select the context you want to work in.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {roles.map((role) => (
            <Button
              key={role.id}
              variant="outline"
              className="w-full justify-start h-14 px-6 text-lg"
              onClick={() => handleRoleSelect(role)}
              disabled={loading}
            >
              {role.name}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
