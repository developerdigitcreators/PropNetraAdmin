'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { rbacService } from '@/services/rbac.service';
import { Loader2, AlertTriangle } from 'lucide-react';

interface DeleteRoleAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: any;
  onSuccess: () => void;
}

export function DeleteRoleAlert({ open, onOpenChange, role, onSuccess }: DeleteRoleAlertProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDeleting(true);
    setError(null);
    try {
      if (role?.id) {
        await rbacService.deleteRole(role.id);
        onSuccess();
        onOpenChange(false);
      }
    } catch (err: any) {
      console.error('Failed to delete role', err);
      setError(err.response?.data?.message || err.message || 'Failed to delete role');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="hidden">
          <DialogTitle>Delete Role</DialogTitle>
          <DialogDescription>Confirm deletion</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center text-center pt-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Role?</h3>
          <p className="text-sm text-gray-500 mb-4">
            Are you sure you want to delete <strong className="text-gray-900">{role?.name}</strong>? This action cannot be undone and will permanently remove its associated permissions.
          </p>
          
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md mb-6 w-full">
              {error}
            </div>
          )}

          <div className="flex w-full gap-3 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => { setError(null); onOpenChange(false); }} disabled={isDeleting}>
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
