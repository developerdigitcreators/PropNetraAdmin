'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export const UNSAVED_CHANGES_MESSAGE =
  'You have edited the data, do you want to save or not?';

type UnsavedChangesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void | Promise<void>;
  onLeave: () => void;
  onCancel: () => void;
  saving?: boolean;
};

export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onSave,
  onLeave,
  onCancel,
  saving = false,
}: UnsavedChangesDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
        onOpenChange(next);
      }}
    >
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Unsaved changes</DialogTitle>
          <DialogDescription>{UNSAVED_CHANGES_MESSAGE}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          {onSave ? (
            <Button
              type="button"
              disabled={saving}
              onClick={() => void onSave()}
            >
              {saving ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : null}
              Save
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={onLeave} disabled={saving}>
            Leave without saving
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
