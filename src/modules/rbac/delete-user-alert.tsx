'use client';

import { DeleteRemarkDialog } from '@/components/common/delete-remark-dialog';
import { adminUsersService } from '@/services/admin-users.service';
import { useState } from 'react';

interface DeleteUserAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  onSuccess: () => void;
}

export function DeleteUserAlert({ open, onOpenChange, user, onSuccess }: DeleteUserAlertProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async (remark: string) => {
    if (!user) return;
    setIsDeleting(true);
    setError('');
    try {
      await adminUsersService.deleteUser(user.id, remark);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to delete user', err);
      setError('Failed to delete user.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DeleteRemarkDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete user?"
      itemName={user?.name}
      submitting={isDeleting}
      error={error}
      onConfirm={handleDelete}
    />
  );
}
