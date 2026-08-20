'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DELETE_REMARK_MIN_LENGTH } from '@/lib/delete-with-remark';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type DeleteRemarkDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  itemName?: string;
  description?: string;
  submitting?: boolean;
  error?: string;
  confirmLabel?: string;
  onConfirm: (remark: string) => void | Promise<void>;
};

export function DeleteRemarkDialog({
  open,
  onOpenChange,
  title = 'Delete this record?',
  itemName,
  description = 'This record will be hidden from this module and moved to Deleted Items. It can be restored from there while it is still in the restore window.',
  submitting = false,
  error,
  confirmLabel = 'Delete',
  onConfirm,
}: DeleteRemarkDialogProps) {
  const [remark, setRemark] = useState('');
  const trimmed = remark.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < DELETE_REMARK_MIN_LENGTH;
  const canSubmit = trimmed.length >= DELETE_REMARK_MIN_LENGTH && !submitting;

  useEffect(() => {
    if (open) setRemark('');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="hidden">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center text-center pt-1">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
          {itemName ? (
            <p className="mb-1 text-sm font-medium text-gray-800">“{itemName}”</p>
          ) : null}
          <p className="mb-4 text-sm text-gray-500">{description}</p>
        </div>

        <label className="block text-left">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Remark <span className="text-red-500">*</span>
          </span>
          <textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="Why is this being deleted?"
            rows={3}
            className={cn(
              'h-auto min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none',
              'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
            )}
          />
          <span className="mt-1 block text-xs text-gray-400">
            At least {DELETE_REMARK_MIN_LENGTH} characters.
          </span>
          {tooShort && (
            <span className="mt-1 block text-xs text-red-600">
              Remark must be at least {DELETE_REMARK_MIN_LENGTH} characters.
            </span>
          )}
        </label>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        <div className="flex w-full gap-3 pt-1">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            disabled={!canSubmit}
            onClick={() => void onConfirm(trimmed)}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
