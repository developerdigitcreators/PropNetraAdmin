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
import { primaryFromLinks } from '@/modules/notifications/chat/multi-link-cta-editor';
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
  const primary = primaryFromLinks(draft.links);
  const hasCta = primary.linkType !== 'none';
  const cta =
    primary.linkType === 'none' ? '' : primary.ctaLabel.trim() || 'View';
  const bg = draft.backgroundColor || '#FFFFFF';
  const textColor = draft.textColor || '#0F172A';
  const ctaColor = draft.ctaColor || '#E11D48';

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Review changes' : isResend ? 'Resend this popup?' : 'Ready to publish?'}
          </DialogTitle>
          <DialogDescription>
            White bordered card on the homepage
            {hasCta ? ' — View button shows when a post/page is linked.' : '.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            In-app popup preview
          </p>

          <div className="relative mx-auto w-full max-w-[280px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg ring-1 ring-black/5">
            <div className="relative flex flex-col p-4" style={{ backgroundColor: bg }}>
              <button
                type="button"
                className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-slate-100 text-slate-600"
                aria-hidden
              >
                <X className="size-4" />
              </button>

              <div className="mt-6 flex flex-col items-center gap-3 px-1 text-center">
                {draft.imageUrl.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={draft.imageUrl.trim()}
                    alt=""
                    className="max-h-40 w-full rounded-xl border border-slate-100 object-cover"
                  />
                ) : null}
                <p
                  className="text-lg font-bold leading-tight"
                  style={{ color: textColor }}
                >
                  <MarkdownText
                    value={draft.title.trim() || 'Popup title'}
                    format={draft.bodyFormat}
                  />
                </p>
                <p className="text-sm leading-snug opacity-90" style={{ color: textColor }}>
                  <MarkdownText
                    value={draft.body.trim() || 'Your message'}
                    format={draft.bodyFormat}
                  />
                </p>
              </div>

              {hasCta ? (
                <div className="mt-4">
                  <Button
                    type="button"
                    className="w-full border-0 text-white"
                    style={{ backgroundColor: ctaColor }}
                    disabled
                  >
                    {cta}
                  </Button>
                </div>
              ) : (
                <p className="mt-4 text-center text-[11px] text-slate-400">
                  No button — link a post or page to show View.
                </p>
              )}
            </div>
          </div>

          <p className="text-[11px] text-gray-400">
            {draft.displayDurationSec > 0
              ? `Auto-closes in ${draft.displayDurationSec}s`
              : 'Stays open until the user taps close or the button.'}
          </p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-xs text-gray-600">
          <span className="font-medium text-gray-900">Target</span>
          {' — '}
          {targetSummary}
          {hasCta && (
            <>
              {' · '}
              Button:{' '}
              <span className="font-medium text-gray-900">{cta}</span>
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
