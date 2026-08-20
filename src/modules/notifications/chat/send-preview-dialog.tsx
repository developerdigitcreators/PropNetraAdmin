"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageBubble, type BubbleMessage } from "./message-bubble";
import { type BroadcastDraft, draftImageUrl, resolvedPushLayout } from "./draft";
import { PushTrayPreview } from "./push-tray-preview";
import type {
  BroadcastCity,
  BroadcastKeyLabel,
} from "@/services/notifications.service";
import { Loader2, Send } from "lucide-react";

type SendPreviewDialogProps = {
  open: boolean;
  draft: BroadcastDraft;
  cities: BroadcastCity[];
  pages: BroadcastKeyLabel[];
  mode: "create" | "edit";
  submitting: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function SendPreviewDialog({
  open,
  draft,
  cities,
  pages,
  mode,
  submitting,
  error,
  onClose,
  onConfirm,
}: SendPreviewDialogProps) {
  const isEdit = mode === "edit";
  const trayImage = draftImageUrl(draft);
  const cityNames = draft.cityIds.map(
    (id) => cities.find((c) => c.id === id)?.name || "Unknown city",
  );
  const linkLabel =
    draft.linkType === "post"
      ? "Property Details"
      : draft.linkType === "page"
        ? pages.find((p) => p.key === draft.pageKey)?.label || "Open page"
        : null;

  const card: BubbleMessage = {
    id: "preview",
    title: draft.cardTitle.trim() || draft.title.trim(),
    body: draft.cardBody.trim() || draft.body.trim(),
    bodyFormat: draft.bodyFormat,
    media: draft.media,
    linkLabel,
    timestamp: new Date().toISOString(),
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Review your changes" : "Ready to send?"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "This rewrites the card already sitting in Groups. No new phone notification goes out."
              : "This is exactly how the message lands on people’s phones and inside Groups."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Phone notification
            </p>
            {isEdit ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-xs text-gray-500">
                Already delivered when this broadcast was first sent. Editing
                does not send it again.
              </div>
            ) : (
              <PushTrayPreview
                layoutType={resolvedPushLayout(draft)}
                title={draft.title}
                body={draft.body}
                bodyFormat={draft.bodyFormat}
                imageUrl={trayImage}
                bgColor={draft.bgColor.trim() || undefined}
                countdownEndsAt={draft.countdownEndsAt || undefined}
                actions={draft.actions}
                progressMax={draft.progressMax}
                progress={draft.progress}
                progressIndeterminate={draft.progressIndeterminate}
              />
            )}
            <p className="text-[11px] text-gray-400">
              Only users with city alerts turned on receive the push.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              In-app Groups card
            </p>
            <div className="rounded-2xl bg-gray-50 p-3">
              <MessageBubble message={card} align="left" />
            </div>
            <p className="text-[11px] text-gray-400">
              Everyone opening PropNetra Updates in these cities sees this,
              alerts on or off.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-xs text-gray-600">
          <span className="font-medium text-gray-900">
            {cityNames.length} {cityNames.length === 1 ? "city" : "cities"}
          </span>
          {" — "}
          {cityNames.join(", ")}
          {linkLabel && (
            <>
              {" · "}
              Tapping the card opens{" "}
              <span className="font-medium text-gray-900">
                {draft.linkType === "post"
                  ? draft.listingLabel || "the linked listing"
                  : linkLabel}
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
            {isEdit ? "Save changes" : "Send broadcast"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
