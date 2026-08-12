'use client';

import { useRef, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface RoleSelectionModalProps {
  roles: Array<{ id: string; name: string }>;
  onComplete: () => void;
}

export function RoleSelectionModal({ roles, onComplete }: RoleSelectionModalProps) {
  const [open, setOpen] = useState(true);
  const completedRef = useRef(false);
  const setActiveRole = useAuthStore((state) => state.setActiveRole);

  const finish = (roleName: string) => {
    if (completedRef.current) return;
    completedRef.current = true;
    setActiveRole(roleName);
    setOpen(false);
    onComplete();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          finish(roles[0]?.name || 'User');
          return;
        }
        setOpen(next);
      }}
    >
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
              onClick={() => finish(role.name)}
            >
              {role.name}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
