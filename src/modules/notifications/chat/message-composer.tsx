"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/common/searchable-select";
import {
  MAX_BROADCAST_CITIES,
  type BroadcastCity,
  type BroadcastKeyLabel,
} from "@/services/notifications.service";
import { AttachUrlDialog } from "./attach-url-dialog";
import { FormattedTextField } from "./formatted-text-field";
import {
  type BroadcastDraft,
  draftErrors,
  draftImageUrl,
  draftPrimaryLink,
  draftPushLayout,
  isHttpsUrl,
} from "./draft";
import { MultiLinkCtaEditor } from "./multi-link-cta-editor";
import {
  PushLayoutComposer,
  type PushLayoutDraft,
} from "./push-layout-composer";
import {
  ChevronDown,
  FileText,
  Image as ImageIcon,
  MessageSquare,
  Paperclip,
  Play,
  Send,
  X,
} from "lucide-react";

const KIND_ICONS: Record<string, typeof ImageIcon> = {
  image: ImageIcon,
  video: Play,
  pdf: FileText,
};

type MessageComposerProps = {
  draft: BroadcastDraft;
  onChange: (next: BroadcastDraft) => void;
  cities: BroadcastCity[];
  citiesLoading: boolean;
  pages: BroadcastKeyLabel[];
  mediaKinds: BroadcastKeyLabel[];
  layoutTypes: BroadcastKeyLabel[];
  mode: "create" | "edit";
  submitting: boolean;
  onSubmit: () => void;
  onCancelEdit: () => void;
};

export function MessageComposer({
  draft,
  onChange,
  cities,
  citiesLoading,
  pages,
  mediaKinds,
  layoutTypes,
  mode,
  submitting,
  onSubmit,
  onCancelEdit,
}: MessageComposerProps) {
  const [attachKind, setAttachKind] = useState<BroadcastKeyLabel | null>(null);
  const [expandedOverride, setExpandedOverride] = useState<boolean | null>(null);
  const [cityPicker, setCityPicker] = useState("");
  const [touched, setTouched] = useState(false);

  const isEdit = mode === "edit";
  const hasContent = Boolean(draft.title.trim() || draft.body.trim());
  const isEmpty = !hasContent;
  const [modeSnapshot, setModeSnapshot] = useState(mode);
  const [emptySnapshot, setEmptySnapshot] = useState(isEmpty);
  const kinds = mediaKinds.length
    ? mediaKinds
    : [
        { key: "image", label: "Image" },
        { key: "pdf", label: "PDF" },
        { key: "video", label: "Video" },
      ];

  if (mode !== modeSnapshot) {
    setModeSnapshot(mode);
    setExpandedOverride(null);
  }
  if (isEmpty !== emptySnapshot) {
    setEmptySnapshot(isEmpty);
    if (isEmpty && !isEdit) {
      setExpandedOverride(null);
    }
  }

  const expanded = expandedOverride ?? (isEdit || hasContent);
  const errors = draftErrors(draft);
  const canSubmit = errors.length === 0 && !submitting;

  const patch = (changes: Partial<BroadcastDraft>) =>
    onChange({ ...draft, ...changes });

  const cityOptions = useMemo(
    () =>
      cities
        .filter((c) => !draft.cityIds.includes(c.id))
        .map((c) => ({ value: c.id, label: c.name })),
    [cities, draft.cityIds],
  );
  const selectedCities = useMemo(
    () =>
      draft.cityIds.map(
        (id) => cities.find((c) => c.id === id) || { id, name: "Unknown city" },
      ),
    [cities, draft.cityIds],
  );

  const primaryLink = draftPrimaryLink(draft);
  const linkSummary =
    draft.links.length === 0
      ? ""
      : draft.links
          .map((row) => {
            if (row.linkType === "post") {
              return row.listingLabel || "Listing";
            }
            return pages.find((p) => p.key === row.pageKey)?.label || row.pageKey;
          })
          .filter(Boolean)
          .join(" · ");

  const addCity = (id: string) => {
    if (!id || draft.cityIds.includes(id)) return;
    if (draft.cityIds.length >= MAX_BROADCAST_CITIES) return;
    patch({ cityIds: [...draft.cityIds, id] });
    setCityPicker("");
  };

  const saveAttachment = (url: string) => {
    if (!attachKind) return;
    if (attachKind.key === "image") {
      patch({ media: [...draft.media, { kind: "image", url }] });
    } else {
      const rest = draft.media.filter((m) => m.kind !== attachKind.key);
      patch({ media: [...rest, { kind: attachKind.key, url }] });
    }
    setAttachKind(null);
  };
  const submit = () => {
    setTouched(true);
    if (!expanded) {
      setExpandedOverride(true);
      return;
    }
    if (canSubmit) onSubmit();
  };

  const collapsedPreview =
    draft.title.trim() ||
    draft.body.trim().slice(0, 80) ||
    (isEdit ? "Editing broadcast…" : "Write a message");

  const attachFooter = (
    <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2 border-t border-gray-100 bg-white px-4 py-2.5">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {kinds.map((kind) => {
          const Icon = KIND_ICONS[kind.key] || Paperclip;
          const atLimit = draft.media.length >= 5;
          const alreadyHasNonImage =
            kind.key !== "image" &&
            draft.media.some((m) => m.kind === kind.key);
          const disabled = expanded && (atLimit || alreadyHasNonImage);
          return (
            <Button
              key={kind.key}
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              className="h-8 gap-1.5 px-2.5 text-xs"
              onClick={() => {
                if (!expanded) setExpandedOverride(true);
                setAttachKind(kind);
              }}
              aria-label={`Attach ${kind.label}`}
            >
              <Icon className="size-3.5" />
              {kind.key === "image" ? "Image" : kind.label}
            </Button>
          );
        })}
      </div>
      <Button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        aria-label={isEdit ? "Save changes" : "Preview and send"}
        className="size-9 shrink-0 rounded-full bg-primary p-0 text-white hover:bg-primary/90"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div
      className={cn(
        "flex min-h-0 w-full min-w-0 shrink-0 flex-col overflow-hidden border-t border-gray-100 bg-white",
        expanded ? "max-h-[min(42vh,380px)]" : "max-h-none",
      )}
    >
      {isEdit && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-100 bg-amber-50 px-4 py-2">
          <p className="text-xs text-amber-800">
            Editing a sent broadcast. The in-app card updates for everyone; the
            phone notification was already delivered and is not sent again.
            Cities cannot change.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancelEdit}
            className="shrink-0"
          >
            Cancel
          </Button>
        </div>
      )}

      {!expanded ? (
        <>
          <div className="shrink-0">
            <PushLayoutComposer
              layoutTypes={layoutTypes}
              pages={pages}
              cityId={draft.cityIds[0]}
              imageUrl={draftImageUrl(draft)}
              titleHtml={draft.title}
              bodyHtml={draft.body}
              value={draftPushLayout(draft)}
              onChange={(next: PushLayoutDraft) =>
                patch({
                  pushType: next.layoutType ?? "AUTO",
                  bgColor: next.bgColor || "",
                  countdownEndsAt: next.countdownEndsAt || "",
                  actions: next.actions || [],
                  progressMax: next.progressMax ?? 100,
                  progress: next.progress ?? 0,
                  progressIndeterminate: next.progressIndeterminate === true,
                })
              }
            />
          </div>
          <button
            type="button"
            onClick={() => setExpandedOverride(true)}
            className="flex w-full shrink-0 items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50"
          >
            <MessageSquare className="size-4 shrink-0 text-gray-400" />
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-sm",
                draft.title.trim() || draft.body.trim()
                  ? "font-medium text-gray-800"
                  : "text-gray-500",
              )}
            >
              {collapsedPreview}
            </span>
            <span className="text-[11px] text-gray-400">Expand</span>
          </button>
          {attachFooter}
        </>
      ) : (
        <>
          <div className="flex shrink-0 items-center justify-end border-b border-gray-50 px-4 py-1">
            <button
              type="button"
              onClick={() => setExpandedOverride(false)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <ChevronDown className="size-3.5" />
              Hide composer
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
            <PushLayoutComposer
              layoutTypes={layoutTypes}
              pages={pages}
              cityId={draft.cityIds[0]}
              imageUrl={draftImageUrl(draft)}
              titleHtml={draft.title}
              bodyHtml={draft.body}
              value={draftPushLayout(draft)}
              onChange={(next: PushLayoutDraft) =>
                patch({
                  pushType: next.layoutType ?? "AUTO",
                  bgColor: next.bgColor || "",
                  countdownEndsAt: next.countdownEndsAt || "",
                  actions: next.actions || [],
                  progressMax: next.progressMax ?? 100,
                  progress: next.progress ?? 0,
                  progressIndeterminate: next.progressIndeterminate === true,
                })
              }
            />

            <div className="flex flex-wrap items-center gap-1.5 px-4 pt-2">
              <span className="text-xs font-medium text-gray-500">To</span>
              {selectedCities.map((city) => (
                <span
                  key={city.id}
                  className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2.5 py-1 text-xs font-medium text-primary"
                >
                  {city.name}
                  {!isEdit && (
                    <button
                      type="button"
                      onClick={() =>
                        patch({
                          cityIds: draft.cityIds.filter((id) => id !== city.id),
                        })
                      }
                      className="rounded-full p-0.5 hover:bg-white/60"
                      aria-label={`Remove ${city.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))}
              {!isEdit && draft.cityIds.length < MAX_BROADCAST_CITIES && (
                <div className="w-44">
                  <SearchableSelect
                    options={cityOptions}
                    value={cityPicker}
                    onValueChange={addCity}
                    loading={citiesLoading}
                    placeholder="Add city"
                    searchPlaceholder="Search city…"
                    emptyText="No more cities."
                  />
                </div>
              )}
            </div>

            {(draft.media.length > 0 || draft.links.length > 0) && (
              <div className="flex min-w-0 flex-wrap gap-2 px-4 pt-2">
                {draft.media.map((item, index) => {
                  const Icon = KIND_ICONS[item.kind] || Paperclip;
                  const invalid = !isHttpsUrl(item.url);
                  return (
                    <span
                      key={`${item.kind}-${item.url}-${index}`}
                      className={cn(
                        "inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs sm:max-w-64",
                        invalid
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-gray-200 bg-gray-50 text-gray-700",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate font-medium capitalize">
                        {item.kind}
                      </span>
                      <span className="min-w-0 truncate text-gray-400">
                        {item.url}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          patch({
                            media: draft.media.filter((_, i) => i !== index),
                          })
                        }
                        className="rounded-full p-0.5 hover:bg-black/5"
                        aria-label={`Remove ${item.kind}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}

                {draft.links.length > 0 && (
                  <span className="inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-lg border border-primary/20 bg-primary-light px-2 py-1.5 text-xs text-primary sm:max-w-72">
                    <span className="truncate font-medium">
                      {draft.links.length} link
                      {draft.links.length === 1 ? "" : "s"}
                      {linkSummary ? ` · ${linkSummary}` : ""}
                      {primaryLink.ctaLabel
                        ? ` · “${primaryLink.ctaLabel}”`
                        : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => patch({ links: [] })}
                      className="rounded-full p-0.5 hover:bg-white/60"
                      aria-label="Remove links"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
            )}

            <div className="min-w-0 space-y-2 px-4 pt-2">
              <FormattedTextField
                label="Card title"
                value={draft.title}
                onChange={(v) => patch({ title: v })}
                placeholder="Card title"
                ariaLabel="Card title"
                editorClassName="font-medium"
              />
              <FormattedTextField
                label="Card message (optional)"
                value={draft.body}
                onChange={(v) => patch({ body: v })}
                onFormatApplied={() => patch({ bodyFormat: "markdown" })}
                placeholder="Optional message"
                ariaLabel="Card message"
              />
            </div>

            <div className="space-y-2 px-4 py-3">
              <MultiLinkCtaEditor
                links={draft.links}
                pages={pages}
                cityId={draft.cityIds[0]}
                onChange={(links) => patch({ links })}
              />
            </div>
          </div>

          {attachFooter}

          {touched && errors.length > 0 && (
            <p className="shrink-0 px-4 pb-2 text-xs text-red-600">{errors[0]}</p>
          )}
        </>
      )}

      <AttachUrlDialog
        open={!!attachKind}
        kind={attachKind?.key || ""}
        kindLabel={attachKind?.label || ""}
        initialUrl={
          attachKind?.key === "image"
            ? ""
            : draft.media.find((m) => m.kind === attachKind?.key)?.url || ""
        }
        onClose={() => setAttachKind(null)}
        onSave={saveAttachment}
      />
    </div>
  );
}
