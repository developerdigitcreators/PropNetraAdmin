/**
 * Drop-in from backend docs/push-layout-types/admin/PushLayoutComposer.tsx.
 * Chat column, above "Write a message". Groups card fields stay untouched.
 */
"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BroadcastKeyLabel } from "@/services/notifications.service";
import { LinkPickerDialog, LinkTypeToggle, type LinkSelection } from "./link-picker";
import { X } from "lucide-react";

export type PushLayoutType =
  | "TEXT"
  | "COLOR"
  | "IMAGE"
  | "COUNTDOWN"
  | "MULTI_ACTION"
  | "PROGRESS"
  | "AUTO";

export type PushActionDraft = {
  iconUrl: string;
  label: string;
  deepLink: string;
  listingLabel?: string;
};

export type PushLayoutDraft = {
  layoutType?: Exclude<PushLayoutType, "AUTO">;
  bgColor?: string;
  countdownEndsAt?: string;
  actions?: PushActionDraft[];
  progressMax?: number;
  progress?: number;
  progressIndeterminate?: boolean;
};

type LayoutOption = { key: string; label: string };

type Props = {
  layoutTypes?: LayoutOption[];
  pages?: BroadcastKeyLabel[];
  cityId?: string;
  imageUrl?: string;
  titleHtml?: string;
  bodyHtml?: string;
  value: PushLayoutDraft;
  onChange: (next: PushLayoutDraft) => void;
};

const DEFAULT_PEACH = "#f8d7c4";

const DEFAULT_OPTIONS: LayoutOption[] = [
  { key: "COUNTDOWN", label: "Countdown" },
  { key: "MULTI_ACTION", label: "Multi-action" },
  { key: "PROGRESS", label: "Progress" },
];

const SPECIAL_LAYOUTS = new Set(["COUNTDOWN", "MULTI_ACTION", "PROGRESS"]);

function hasColorMarkup(value?: string) {
  return /<span style="color:|<font color=|\{#[0-9a-fA-F]{3,6}\}/i.test(
    value || "",
  );
}

export function inferAdminLayoutType(input: {
  selected: PushLayoutType;
  titleHtml?: string;
  bodyHtml?: string;
  imageUrl?: string;
  bgColor?: string;
}): Exclude<PushLayoutType, "AUTO"> {
  if (input.selected !== "AUTO") return input.selected;
  if (
    hasColorMarkup(input.titleHtml) ||
    hasColorMarkup(input.bodyHtml) ||
    input.bgColor
  ) {
    return "COLOR";
  }
  if (input.imageUrl?.trim()) return "IMAGE";
  return "TEXT";
}

/** Merge into the existing POST /admin/notifications/broadcast body. */
export function toBroadcastPushFields(
  draft: PushLayoutDraft,
  selected: PushLayoutType,
  inferFrom: { titleHtml?: string; bodyHtml?: string; imageUrl?: string },
): Record<string, unknown> {
  const layoutType = inferAdminLayoutType({
    selected,
    titleHtml: inferFrom.titleHtml,
    bodyHtml: inferFrom.bodyHtml,
    imageUrl: inferFrom.imageUrl,
    bgColor: draft.bgColor,
  });
  const payload: Record<string, unknown> = { layoutType };
  if (draft.bgColor) payload.bgColor = draft.bgColor;
  if (layoutType === "COUNTDOWN" && draft.countdownEndsAt) {
    const ends = new Date(draft.countdownEndsAt);
    if (!Number.isNaN(ends.getTime())) {
      payload.countdownEndsAt = ends.toISOString();
    }
  }
  if (layoutType === "MULTI_ACTION") {
    payload.actions = (draft.actions || [])
      .filter((row) => row.label.trim() && row.deepLink.trim())
      .slice(0, 3)
      .map((row) => ({
        label: row.label.trim(),
        deepLink: row.deepLink.trim(),
        ...(row.iconUrl.trim() ? { iconUrl: row.iconUrl.trim() } : {}),
      }));
  }
  if (layoutType === "PROGRESS") {
    payload.progressIndeterminate = draft.progressIndeterminate === true;
    if (!draft.progressIndeterminate) {
      payload.progressMax = draft.progressMax ?? 100;
      payload.progress = draft.progress ?? 0;
    }
  }
  return payload;
}

export function emptyPushActions(): PushActionDraft[] {
  return [
    { iconUrl: "", label: "", deepLink: "" },
    { iconUrl: "", label: "", deepLink: "" },
  ];
}

export function PushLayoutComposer({
  layoutTypes = DEFAULT_OPTIONS,
  pages = [],
  cityId,
  imageUrl,
  titleHtml,
  bodyHtml,
  value,
  onChange,
}: Props) {
  const options = (layoutTypes?.length ? layoutTypes : DEFAULT_OPTIONS).filter(
    (item) => SPECIAL_LAYOUTS.has(item.key),
  );
  const selected: PushLayoutType = SPECIAL_LAYOUTS.has(value.layoutType || "")
    ? (value.layoutType as PushLayoutType)
    : "AUTO";
  const resolved = useMemo(
    () =>
      inferAdminLayoutType({
        selected,
        titleHtml,
        bodyHtml,
        imageUrl,
        bgColor: value.bgColor,
      }),
    [selected, titleHtml, bodyHtml, imageUrl, value.bgColor],
  );

  const set = (patch: Partial<PushLayoutDraft>) =>
    onChange({ ...value, ...patch });
  const [actionsOpen, setActionsOpen] = useState(false);
  const actions = value.actions?.length
    ? value.actions
    : emptyPushActions();

  return (
    <div className="flex flex-col gap-2.5 border-b border-gray-100 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <label
          className="text-xs font-medium text-gray-500"
          htmlFor="push-type"
        >
          Push type
        </label>
        <select
          id="push-type"
          className="h-8 rounded-lg border border-input bg-white px-2 py-1 text-sm text-gray-800"
          value={selected}
          onChange={(e) => {
            const next = e.target.value as PushLayoutType;
            onChange({
              ...value,
              layoutType: next === "AUTO" ? undefined : next,
              ...(next === "MULTI_ACTION" && !(value.actions || []).length
                ? { actions: emptyPushActions() }
                : {}),
            });
            setActionsOpen(next === "MULTI_ACTION");
          }}
        >
          <option value="AUTO">Default</option>
          {options.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </select>
        <label
          className="ml-1 text-xs font-medium text-gray-500"
          htmlFor="push-bg"
        >
          Card bg
        </label>
        <input
          id="push-bg"
          type="color"
          value={value.bgColor || DEFAULT_PEACH}
          onChange={(e) => set({ bgColor: e.target.value })}
          title="Leave on Default peach to omit bgColor (Android XML default)"
          className="size-8 cursor-pointer rounded border border-gray-200 bg-white p-0.5"
        />
        <button
          type="button"
          className="text-xs text-gray-500 underline hover:text-gray-700"
          onClick={() => set({ bgColor: undefined })}
        >
          Default peach
        </button>
      </div>

      {resolved === "COUNTDOWN" && (
        <label className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
          Ends at
          <Input
            type="datetime-local"
            className="w-auto"
            value={value.countdownEndsAt || ""}
            onChange={(e) => set({ countdownEndsAt: e.target.value })}
          />
        </label>
      )}

      {resolved === "MULTI_ACTION" && (
        <button
          type="button"
          onClick={() => setActionsOpen(true)}
          className="self-start text-xs font-medium text-primary hover:underline"
        >
          Edit actions ({actions.length})
        </button>
      )}

      <Dialog open={actionsOpen} onOpenChange={(next) => setActionsOpen(!!next)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Multi-action</DialogTitle>
            <DialogDescription>
              Add 2–3 actions. Each needs a label and a listing or internal page.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-1">
            {actions.map((row, index) => (
              <ActionRow
                key={index}
                index={index}
                row={row}
                pages={pages}
                cityId={cityId}
                value={value}
                onChange={onChange}
                onRemove={
                  actions.length > 1
                    ? () => removeAction(value, index, onChange)
                    : undefined
                }
              />
            ))}
            {actions.length < 3 && (
              <button
                type="button"
                className="self-start text-xs text-primary hover:underline"
                onClick={() =>
                  onChange({
                    ...value,
                    actions: [
                      ...actions,
                      { iconUrl: "", label: "", deepLink: "" },
                    ],
                  })
                }
              >
                Add action
              </button>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => setActionsOpen(false)}
              className="bg-primary text-white hover:bg-primary/90"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {resolved === "PROGRESS" && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
          <label className="flex items-center gap-1.5">
            <Checkbox
              checked={value.progressIndeterminate === true}
              onCheckedChange={(v) =>
                set({ progressIndeterminate: v === true })
              }
            />
            Indeterminate
          </label>
          {value.progressIndeterminate !== true && (
            <>
              <label className="flex items-center gap-1.5">
                Max
                <Input
                  type="number"
                  min={1}
                  className="w-20"
                  value={value.progressMax ?? 100}
                  onChange={(e) =>
                    set({ progressMax: Number(e.target.value) || 1 })
                  }
                />
              </label>
              <label className="flex items-center gap-1.5">
                Current
                <Input
                  type="number"
                  min={0}
                  className="w-20"
                  value={value.progress ?? 0}
                  onChange={(e) =>
                    set({ progress: Number(e.target.value) || 0 })
                  }
                />
              </label>
            </>
          )}
        </div>
      )}

      <p className="text-[11px] text-gray-400">
        Images attach from +. Color markup still uses the peach card. Countdown,
        multi-action, and progress add extra fields here.
      </p>
    </div>
  );
}

function ActionRow({
  index,
  row,
  pages,
  cityId,
  value,
  onChange,
  onRemove,
}: {
  index: number;
  row: PushActionDraft;
  pages: BroadcastKeyLabel[];
  cityId?: string;
  value: PushLayoutDraft;
  onChange: (next: PushLayoutDraft) => void;
  onRemove?: () => void;
}) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [preferredType, setPreferredType] = useState<"post" | "page">("post");
  const isPage = pages.some((p) => p.key === row.deepLink);
  const isListing = Boolean(row.deepLink) && !isPage;
  const selectedLabel = isPage
    ? pages.find((p) => p.key === row.deepLink)?.label || row.deepLink
    : isListing
      ? row.listingLabel || "Linked listing"
      : "";

  return (
    <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50/60 p-2.5">
      <div className="flex items-start gap-2">
        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
          <Input
            placeholder="Icon URL (https)"
            value={row.iconUrl}
            onChange={(e) =>
              setAction(value, index, { iconUrl: e.target.value }, onChange)
            }
          />
          <Input
            placeholder="Label"
            maxLength={40}
            value={row.label}
            onChange={(e) =>
              setAction(value, index, { label: e.target.value }, onChange)
            }
          />
        </div>
        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-gray-400 hover:text-red-600"
            aria-label={`Remove action ${index + 1}`}
            onClick={onRemove}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
      <LinkTypeToggle
        active={isPage ? "page" : isListing ? "post" : "none"}
        onSelect={(type) => {
          setPreferredType(type);
          setLinkOpen(true);
        }}
      />
      {selectedLabel ? (
        <p className="text-xs text-gray-500">{selectedLabel}</p>
      ) : null}
      <LinkPickerDialog
        open={linkOpen}
        pages={pages}
        cityId={cityId}
        preferredType={preferredType}
        value={linkValueFromDeepLink(row.deepLink, pages, row.listingLabel)}
        onClose={() => setLinkOpen(false)}
        onSave={(next) => {
          setAction(
            value,
            index,
            {
              deepLink: deepLinkFromSelection(next),
              listingLabel:
                next.linkType === "post" ? next.listingLabel : "",
            },
            onChange,
          );
          setLinkOpen(false);
        }}
      />
    </div>
  );
}

function linkValueFromDeepLink(
  deepLink: string,
  pages: BroadcastKeyLabel[],
  listingLabel?: string,
): LinkSelection {
  if (pages.some((p) => p.key === deepLink)) {
    return {
      linkType: "page",
      listingId: "",
      listingLabel: "",
      pageKey: deepLink,
    };
  }
  if (deepLink) {
    return {
      linkType: "post",
      listingId: deepLink,
      listingLabel: listingLabel || "Linked listing",
      pageKey: "",
    };
  }
  return {
    linkType: "none",
    listingId: "",
    listingLabel: "",
    pageKey: "",
  };
}

function deepLinkFromSelection(next: LinkSelection): string {
  if (next.linkType === "page") return next.pageKey;
  if (next.linkType === "post") return next.listingId;
  return "";
}

function setAction(
  value: PushLayoutDraft,
  index: number,
  patch: Partial<PushActionDraft>,
  onChange: (next: PushLayoutDraft) => void,
) {
  const actions = [...(value.actions || emptyPushActions())];
  actions[index] = { ...actions[index], ...patch };
  onChange({ ...value, actions });
}

function removeAction(
  value: PushLayoutDraft,
  index: number,
  onChange: (next: PushLayoutDraft) => void,
) {
  const actions = [...(value.actions || emptyPushActions())];
  if (actions.length <= 1) return;
  onChange({
    ...value,
    actions: actions.filter((_, i) => i !== index),
  });
}
