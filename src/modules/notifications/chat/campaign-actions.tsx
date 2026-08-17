'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { NotificationCampaign } from '@/services/notifications.service';
import { Loader2, MoreVertical, Pencil, RotateCw, Trash2 } from 'lucide-react';

type CampaignActionsMenuProps = {
  campaign: NotificationCampaign;
  canWrite: boolean;
  canDelete: boolean;
  onResend: (campaign: NotificationCampaign) => void;
  onEdit: (campaign: NotificationCampaign) => void;
  onDelete: (campaign: NotificationCampaign) => void;
};

export function CampaignActionsMenu({
  campaign,
  canWrite,
  canDelete,
  onResend,
  onEdit,
  onDelete,
}: CampaignActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!canWrite && !canDelete) return null;

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen((o) => !o)}
        aria-label="Message actions"
        className="rounded-full bg-white text-gray-500 shadow-sm hover:bg-gray-50"
      >
        <MoreVertical className="w-4 h-4" />
      </Button>

      {open && (
        <div className="absolute right-0 top-8 z-50 w-44 overflow-hidden rounded-xl border border-gray-100 bg-white p-1 shadow-lg">
          {canWrite && (
            <>
              <button
                type="button"
                onClick={() => run(() => onResend(campaign))}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <RotateCw className="w-4 h-4 text-gray-400" />
                Send again
              </button>
              <button
                type="button"
                onClick={() => run(() => onEdit(campaign))}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <Pencil className="w-4 h-4 text-gray-400" />
                Edit
              </button>
            </>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => run(() => onDelete(campaign))}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

type DeleteCampaignDialogProps = {
  campaign: NotificationCampaign | null;
  deleting: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteCampaignDialog({
  campaign,
  deleting,
  error,
  onClose,
  onConfirm,
}: DeleteCampaignDialogProps) {
  return (
    <Dialog open={!!campaign} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete this broadcast?</DialogTitle>
          <DialogDescription>
            “{campaign?.title}” disappears from Groups in every city it was sent to, and
            the record leaves this history. Phone notifications already delivered cannot be
            pulled back.
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
            {deleting && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
