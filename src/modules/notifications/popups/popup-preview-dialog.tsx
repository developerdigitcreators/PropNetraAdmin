'use client';

import { useEffect, useState } from 'react';
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

function StoryProgressBar({
  durationSec,
  active,
}: {
  durationSec: number;
  active: boolean;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active || durationSec <= 0) {
      setProgress(0);
      return;
    }
    setProgress(0);
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const pct = Math.min(100, ((now - started) / (durationSec * 1000)) * 100);
      setProgress(pct);
      if (pct < 100) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, durationSec]);

  return (
    <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
      <div
        className="h-full rounded-full bg-white transition-[width] duration-75 ease-linear"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

function StoryCountdown({
  durationSec,
  active,
  textColor,
}: {
  durationSec: number;
  active: boolean;
  textColor: string;
}) {
  const [left, setLeft] = useState(durationSec);

  useEffect(() => {
    if (!active || durationSec <= 0) {
      setLeft(durationSec);
      return;
    }
    setLeft(durationSec);
    const started = Date.now();
    const id = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      const next = Math.max(0, durationSec - elapsed);
      setLeft(next);
      if (next <= 0) window.clearInterval(id);
    }, 250);
    return () => window.clearInterval(id);
  }, [active, durationSec]);

  return (
    <span
      className="rounded-full bg-black/25 px-2.5 py-0.5 text-xs font-semibold tabular-nums"
      style={{ color: textColor }}
    >
      {left}s
    </span>
  );
}

function timerIndicatorLabel(timerDisplay: PopupDraft['timerDisplay']) {
  switch (timerDisplay) {
    case 'countdown':
      return 'Countdown timer';
    case 'both':
      return 'Progress bar + countdown';
    case 'none':
      return 'No timer indicator';
    default:
      return 'Progress bar';
  }
}

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
  const cta =
    primary.linkType === 'none' ? 'Dismiss' : primary.ctaLabel.trim() || 'View';
  const extraCtas = draft.links.slice(1).map((row) => row.label.trim() || 'Open');  const showProgress =
    draft.displayDurationSec > 0 &&
    (draft.timerDisplay === 'progress_bar' || draft.timerDisplay === 'both');
  const showCountdown =
    draft.displayDurationSec > 0 &&
    (draft.timerDisplay === 'countdown' || draft.timerDisplay === 'both');

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Review changes' : isResend ? 'Resend this popup?' : 'Ready to publish?'}
          </DialogTitle>
          <DialogDescription>
            Story-style full-screen modal — {timerIndicatorLabel(draft.timerDisplay).toLowerCase()}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            In-app story preview
          </p>

          <div className="relative mx-auto aspect-[9/16] max-h-[420px] w-full max-w-[240px] overflow-hidden rounded-3xl shadow-2xl ring-1 ring-black/10">
            <div
              className="absolute inset-0"
              style={{ backgroundColor: draft.backgroundColor }}
            />
            <div className="relative flex h-full flex-col p-3">
              <div className="mb-3 flex items-center gap-2 pt-1">
                {showProgress ? (
                  <StoryProgressBar durationSec={draft.displayDurationSec} active={open} />
                ) : (
                  <div className="flex-1" />
                )}
                {showCountdown ? (
                  <StoryCountdown
                    durationSec={draft.displayDurationSec}
                    active={open}
                    textColor={draft.textColor}
                  />
                ) : null}
              </div>

              <button
                type="button"
                className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-black/20 text-white"
                aria-hidden
              >
                <X className="size-4" />
              </button>

              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-2 text-center">
                {draft.imageUrl.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={draft.imageUrl.trim()}
                    alt=""
                    className="max-h-[38%] w-full rounded-2xl object-cover"
                  />
                ) : null}
                <p
                  className="text-lg font-bold leading-tight"
                  style={{ color: draft.textColor }}
                >
                  <MarkdownText
                    value={draft.title.trim() || 'Popup title'}
                    format={draft.bodyFormat}
                  />
                </p>
                <p className="text-sm leading-snug opacity-90" style={{ color: draft.textColor }}>
                  <MarkdownText
                    value={draft.body.trim() || 'Your message'}
                    format={draft.bodyFormat}
                  />
                </p>
              </div>

              <div className="mt-auto space-y-2">
                <Button
                  type="button"
                  className="w-full border-0 text-white"
                  style={{ backgroundColor: draft.ctaColor }}
                  disabled
                >
                  {cta}
                </Button>
                {extraCtas.map((label, i) => (
                  <Button
                    key={`${label}-${i}`}
                    type="button"
                    variant="outline"
                    className="w-full border-white/40 bg-white/10 text-white"
                    disabled
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-[11px] text-gray-400">
            {draft.displayDurationSec > 0
              ? `Auto-closes in ${draft.displayDurationSec}s · ${timerIndicatorLabel(draft.timerDisplay)}`
              : 'Stays open until the user taps close or the button.'}
          </p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-xs text-gray-600">
          <span className="font-medium text-gray-900">Target</span>
          {' — '}
          {targetSummary}
          {primary.linkType !== 'none' && (
            <>
              {' · '}
              Buttons:{' '}
              <span className="font-medium text-gray-900">
                {[cta, ...extraCtas].join(', ')}
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
