'use client';

import { useState } from 'react';
import { DeleteRemarkDialog } from '@/components/common/delete-remark-dialog';
import { rbacService } from '@/services/rbac.service';

interface DeleteRoleAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: any;
  onSuccess: () => void;
}

export function DeleteRoleAlert({ open, onOpenChange, role, onSuccess }: DeleteRoleAlertProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (remark: string) => {
    setIsDeleting(true);
    setError(null);
    try {
      if (role?.id) {
        await rbacService.deleteRole(role.id, remark);
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
    <DeleteRemarkDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(null);
        onOpenChange(next);
      }}
      title="Delete role?"
      itemName={role?.name}
      submitting={isDeleting}
      error={error || undefined}
      onConfirm={handleDelete}
    />
  );
}
