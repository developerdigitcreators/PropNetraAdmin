"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/common/searchable-select";
import {
  MAX_BROADCAST_CITIES,
  type BroadcastCity,
  type BroadcastKeyLabel,
} from "@/services/notifications.service";
import { AttachUrlDialog } from "./attach-url-dialog";
import { LinkPickerDialog, LinkTypeToggle } from "./link-picker";
import { FormattedTextField } from "./formatted-text-field";
import { type BroadcastDraft, draftErrors, draftImageUrl, draftPushLayout, isHttpsUrl } from "./draft";
import {
  PushLayoutComposer,
  type PushLayoutDraft,
} from "./push-layout-composer";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Image as ImageIcon,
  Link2,
  MessageSquare,
  Paperclip,
  Play,
  Plus,
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
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachKind, setAttachKind] = useState<BroadcastKeyLabel | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkPickerType, setLinkPickerType] = useState<"post" | "page">("post");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [expandedOverride, setExpandedOverride] = useState<boolean | null>(null);
  const [cityPicker, setCityPicker] = useState("");
  const [touched, setTouched] = useState(false);
  const attachRef = useRef<HTMLDivElement>(null);

  const isEdit = mode === "edit";
  const hasContent = Boolean(draft.title.trim() || draft.body.trim());
  const isEmpty = !hasContent;
  const [modeSnapshot, setModeSnapshot] = useState(mode);
  const [emptySnapshot, setEmptySnapshot] = useState(isEmpty);

  if (mode !== modeSnapshot) {
    setModeSnapshot(mode);
    setExpandedOverride(null);
    setAdvancedOpen(false);
  }
  if (isEmpty !== emptySnapshot) {
    setEmptySnapshot(isEmpty);
    if (isEmpty && !isEdit) {
      setExpandedOverride(null);
      setAdvancedOpen(false);
    }
  }

  const expanded = expandedOverride ?? (isEdit || hasContent);
  const errors = draftErrors(draft);
  const canSubmit = errors.length === 0 && !submitting;

  useEffect(() => {
    if (!attachOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!attachRef.current?.contains(e.target as Node)) setAttachOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAttachOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [attachOpen]);

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

  const linkLabel =
    draft.linkType === "post"
      ? draft.listingLabel || "Linked listing"
      : draft.linkType === "page"
        ? pages.find((p) => p.key === draft.pageKey)?.label || draft.pageKey
        : "";

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

  return (
    <div className="shrink-0 border-t border-gray-100 bg-white">
      {isEdit && (
        <div className="flex items-center justify-between gap-3 border-b border-amber-100 bg-amber-50 px-4 py-2">
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

      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpandedOverride(true)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
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
          <ChevronUp className="size-4 shrink-0 text-gray-400" aria-hidden />
        </button>
      ) : (
        <>
          <div className="flex items-center justify-end border-b border-gray-50 px-4 py-1.5">
            <button
              type="button"
              onClick={() => setExpandedOverride(false)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <ChevronDown className="size-3.5" />
              Hide composer
            </button>
          </div>
      <div className="flex flex-wrap items-center gap-1.5 px-4 pt-3">
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
                <X className="w-3 h-3" />
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

      {(draft.media.length > 0 || draft.linkType !== "none") && (
        <div className="flex flex-wrap gap-2 px-4 pt-2">
          {draft.media.map((item, index) => {
            const Icon = KIND_ICONS[item.kind] || Paperclip;
            const invalid = !isHttpsUrl(item.url);
            return (
              <span
                key={`${item.kind}-${item.url}-${index}`}
                className={cn(
                  "inline-flex max-w-64 items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs",
                  invalid
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-gray-200 bg-gray-50 text-gray-700",
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate font-medium capitalize">
                  {item.kind}
                </span>
                <span className="truncate text-gray-400">{item.url}</span>
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
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}

          {draft.linkType !== "none" && (
            <span className="inline-flex max-w-64 items-center gap-1.5 rounded-lg border border-primary/20 bg-primary-light px-2 py-1.5 text-xs text-primary">
              <Link2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate font-medium">{linkLabel}</span>
              <button
                type="button"
                onClick={() =>
                  patch({
                    linkType: "none",
                    listingId: "",
                    listingLabel: "",
                    pageKey: "",
                  })
                }
                className="rounded-full p-0.5 hover:bg-white/60"
                aria-label="Remove link"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}

      <div className="px-4 pt-2">
        <FormattedTextField
          label="Notification title"
          value={draft.title}
          onChange={(v) => patch({ title: v })}
          placeholder="Notification title"
          ariaLabel="Notification title"
          editorClassName="font-medium"
        />
      </div>

      <div className="flex items-end gap-2 px-4 py-3">
        <div className="relative" ref={attachRef}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setAttachOpen((o) => !o)}
            aria-label="Add attachment"
            className="rounded-full text-gray-500"
          >
            <Plus
              className={cn(
                "w-5 h-5 transition-transform",
                attachOpen && "rotate-45",
              )}
            />
          </Button>

          {attachOpen && (
            <div className="absolute bottom-12 left-0 z-50 w-52 overflow-hidden rounded-xl border border-gray-100 bg-white p-1 shadow-lg">
              {mediaKinds.map((kind) => {
                const Icon = KIND_ICONS[kind.key] || Paperclip;
                const atLimit = draft.media.length >= 5;
                const alreadyHasNonImage =
                  kind.key !== "image" &&
                  draft.media.some((m) => m.kind === kind.key);
                return (
                  <button
                    key={kind.key}
                    type="button"
                    disabled={atLimit || alreadyHasNonImage}
                    onClick={() => {
                      setAttachKind(kind);
                      setAttachOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                  >
                    <Icon className="w-4 h-4 text-gray-400" />
                    {kind.key === "image" ? "Image" : kind.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setLinkPickerType(
                    draft.linkType === "page" ? "page" : "post",
                  );
                  setLinkOpen(true);
                  setAttachOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <Link2 className="w-4 h-4 text-gray-400" />
                Link to post or page
              </button>
            </div>
          )}
        </div>

        <FormattedTextField
          label="Message"
          value={draft.body}
          onChange={(v) => patch({ body: v })}
          onFormatApplied={() => patch({ bodyFormat: "markdown" })}
          onEnterSubmit={submit}
          placeholder="Type a message"
          ariaLabel="Message"
          className="min-w-0 flex-1"
        />

        <Button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          aria-label={isEdit ? "Save changes" : "Preview and send"}
          className="size-10 shrink-0 rounded-full bg-primary p-0 text-white hover:bg-primary/90"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3 px-4 pb-3">
        <button
          type="button"
          onClick={() => setAdvancedOpen(true)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
        >
          In-app card options
          {(draft.cardTitle.trim() ||
            draft.cardBody.trim() ||
            draft.linkType !== "none") && (
            <span className="rounded-full bg-primary-light px-1.5 py-0.5 text-[10px] font-medium text-primary">
              Custom
            </span>
          )}
        </button>
        {touched && errors.length > 0 && (
          <p className="text-xs text-red-600">{errors[0]}</p>
        )}
      </div>

      <Dialog
        open={advancedOpen}
        onOpenChange={(next) => setAdvancedOpen(!!next)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>In-app card options</DialogTitle>
            <DialogDescription>
              The card shown inside Groups. Leave these empty to reuse the title
              and message above.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">
                Card title
              </label>
              <FormattedTextField
                value={draft.cardTitle}
                onChange={(v) => patch({ cardTitle: v })}
                placeholder="Optional"
                ariaLabel="Card title"
                fieldClassName="bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">
                Card message
              </label>
              <FormattedTextField
                value={draft.cardBody}
                onChange={(v) => patch({ cardBody: v })}
                onFormatApplied={() => patch({ bodyFormat: "markdown" })}
                placeholder="Optional"
                ariaLabel="Card message"
                fieldClassName="bg-white"
              />
            </div>
            <p className="text-xs text-gray-500">
              The app renders formatting in the card message only. Titles and
              the phone notification are drawn as plain text there, so bold or
              italic in a title will reach users as literal characters.
            </p>
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-700">
                Opens on tap
              </p>
              <LinkTypeToggle
                active={
                  draft.linkType === "page"
                    ? "page"
                    : draft.linkType === "post"
                      ? "post"
                      : "none"
                }
                onSelect={(type) => {
                  setLinkPickerType(type);
                  setLinkOpen(true);
                }}
              />
              {draft.linkType !== "none" && linkLabel ? (
                <p className="text-xs text-gray-500">{linkLabel}</p>
              ) : (
                <p className="text-xs text-gray-400">
                  Choose listing or internal page. A picker opens next.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => setAdvancedOpen(false)}
              className="bg-primary text-white hover:bg-primary/90"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <LinkPickerDialog
        open={linkOpen}
        pages={pages}
        cityId={draft.cityIds[0]}
        preferredType={linkPickerType}
        value={{
          linkType: draft.linkType,
          listingId: draft.listingId,
          listingLabel: draft.listingLabel,
          pageKey: draft.pageKey,
        }}
        onClose={() => setLinkOpen(false)}
        onSave={(next) => {
          patch(next);
          setLinkOpen(false);
        }}
      />
        </>
      )}
    </div>
  );
}
