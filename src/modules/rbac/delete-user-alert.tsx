'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { adminUsersService } from '@/services/admin-users.service';
import { useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';

interface DeleteUserAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  onSuccess: () => void;
}

export function DeleteUserAlert({ open, onOpenChange, user, onSuccess }: DeleteUserAlertProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      await adminUsersService.deleteUser(user.id);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to delete user', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="hidden">
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>Confirm deletion</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center text-center pt-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete User?</h3>
          <p className="text-sm text-gray-500 mb-6">
            Are you sure you want to delete <strong>{user?.name}</strong>? This action cannot be undone and will permanently remove their access to the admin panel.
          </p>
          
          <div className="flex w-full gap-3">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Yes, Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
