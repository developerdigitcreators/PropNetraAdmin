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
import { MarkdownText } from '@/modules/notifications/chat/markdown-text';
import { type PopupDraft } from './popup-draft';
import { Loader2, Send, X } from 'lucide-react';

type PopupPreviewDialogProps = {
  open: boolean;
  draft: PopupDraft;
  targetSummary: string;
  mode: 'create' | 'edit' | 'resend';
  submitting: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function PopupPreviewDialog({
  open,
  draft,
  targetSummary,
  mode,
  submitting,
  error,
  onClose,
  onConfirm,
}: PopupPreviewDialogProps) {
  const isEdit = mode === 'edit';
  const isResend = mode === 'resend';
  const cta =
    draft.linkType === 'none'
      ? 'Dismiss'
      : draft.ctaLabel.trim() || 'View';

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Review changes' : isResend ? 'Resend this popup?' : 'Ready to publish?'}
          </DialogTitle>
          <DialogDescription>
            {isResend
              ? 'This publishes a new popup with the same content. Users who already dismissed the old one will see it again — once.'
              : 'Full-screen modal inside the app. Each user sees it once — no phone notification tray.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            In-app modal preview
          </p>

          <div className="relative overflow-hidden rounded-2xl bg-gray-900 p-4">
            <div className="pointer-events-none absolute inset-0 bg-black/55" />
            <div className="relative mx-auto max-w-[280px] overflow-hidden rounded-2xl bg-white shadow-xl">
              <button
                type="button"
                className="absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-full bg-black/10 text-gray-600"
                aria-hidden
              >
                <X className="size-4" />
              </button>

              {draft.imageUrl.trim() && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={draft.imageUrl.trim()}
                  alt=""
                  className="aspect-[16/10] w-full object-cover"
                />
              )}

              <div className="space-y-2 px-4 py-4">
                <p className="text-base font-semibold text-gray-900">
                  <MarkdownText value={draft.title.trim() || 'Popup title'} format={draft.bodyFormat} />
                </p>
                <p className="text-sm text-gray-600">
                  <MarkdownText value={draft.body.trim() || 'Your message'} format={draft.bodyFormat} />
                </p>
                <Button
                  type="button"
                  className="mt-2 w-full bg-primary text-white hover:bg-primary/90"
                  disabled
                >
                  {cta}
                </Button>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-gray-400">
            Shown on open, login, city change, or reconnect. Acknowledged as soon
            as the modal appears — never repeated for that user.
          </p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-xs text-gray-600">
          <span className="font-medium text-gray-900">Target</span>
          {' — '}
          {targetSummary}
          {draft.linkType !== 'none' && (
            <>
              {' · '}
              Button opens{' '}
              <span className="font-medium text-gray-900">
                {draft.linkType === 'post'
                  ? draft.listingLabel || 'linked listing'
                  : draft.pageKey || 'internal page'}
              </span>
            </>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Back to edit
          </Button>
          <Button
            onClick={onConfirm}
            disabled={submitting}
            className="bg-primary text-white hover:bg-primary/90"
          >
            {submitting ? (
              <Loader2 className="mr-2 w-4 h-4 animate-spin" />
            ) : (
              <Send className="mr-2 w-4 h-4" />
            )}
            {isEdit ? 'Save changes' : isResend ? 'Resend popup' : 'Publish popup'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
