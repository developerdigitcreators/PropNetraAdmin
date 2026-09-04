"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/common/searchable-select";
import { ImageUrlOrUpload } from "@/components/image-url-or-upload";
import { FormattedTextField } from "@/modules/notifications/chat/formatted-text-field";
import {
  LinkPickerDialog,
  LinkTypeToggle,
} from "@/modules/notifications/chat/link-picker";
import {
  flattenPopupAudiences,
  notificationApiError,
  notificationsService,
  type BroadcastKeyLabel,
  type BroadcastLinkType,
  type PopupAudience,
} from "@/services/notifications.service";
import { locationService } from "@/services/location.service";
import { Bell, Globe, Loader2, MapPin, Send } from "lucide-react";

type NamedPlace = { id: string; name: string };

function parseNamedPlaces(data: unknown): NamedPlace[] {
  const rows = Array.isArray(data)
    ? data
    : data && typeof data === "object"
      ? ((data as Record<string, unknown>).items as unknown[]) ||
        ((data as Record<string, unknown>).states as unknown[]) ||
        ((data as Record<string, unknown>).cities as unknown[]) ||
        []
      : [];
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const r = (row && typeof row === "object" ? row : {}) as Record<
        string,
        unknown
      >;
      const id = typeof r.id === "string" ? r.id : "";
      const name = typeof r.name === "string" ? r.name : "";
      if (!id || !name) return null;
      return { id, name };
    })
    .filter(Boolean) as NamedPlace[];
}

type PushDraft = {
  title: string;
  body: string;
  imageUrl: string;
  linkType: BroadcastLinkType;
  listingId: string;
  listingLabel: string;
  pageKey: string;
  ctaLabel: string;
  targetMode: "global" | "city";
  stateId: string;
  cityId: string;
  audience: PopupAudience;
};

const emptyDraft = (): PushDraft => ({
  title: "",
  body: "",
  imageUrl: "",
  linkType: "none",
  listingId: "",
  listingLabel: "",
  pageKey: "",
  ctaLabel: "",
  targetMode: "global",
  stateId: "",
  cityId: "",
  audience: "all",
});

type PushPanelProps = {
  pages: BroadcastKeyLabel[];
  canWrite: boolean;
  onToast: (message: string) => void;
};

export function PushPanel({ pages, canWrite, onToast }: PushPanelProps) {
  const [draft, setDraft] = useState<PushDraft>(emptyDraft);
  const [states, setStates] = useState<NamedPlace[]>([]);
  const [cities, setCities] = useState<NamedPlace[]>([]);
  const [audiences, setAudiences] = useState<BroadcastKeyLabel[]>([]);
  const [placesLoading, setPlacesLoading] = useState(true);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkPickerType, setLinkPickerType] = useState<"post" | "page">("post");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPlacesLoading(true);
    locationService
      .getStates()
      .then((data) => {
        if (!cancelled) setStates(parseNamedPlaces(data));
      })
      .catch(() => {
        if (!cancelled) setStates([]);
      })
      .finally(() => {
        if (!cancelled) setPlacesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    notificationsService
      .getPopupOptions()
      .then((options) => {
        if (!cancelled) setAudiences(flattenPopupAudiences(options.audiences));
      })
      .catch(() => {
        if (!cancelled) {
          setAudiences([
            { key: "all", label: "All users" },
            { key: "elite", label: "Elite" },
            { key: "pro", label: "Pro" },
            { key: "network", label: "Network" },
            { key: "network_unsubscribed", label: "Unsubscribed" },
            {
              key: "network_subscribed",
              label: "Subscribed (no Pro documents)",
            },
          ]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!draft.stateId) {
      setCities([]);
      return;
    }
    let cancelled = false;
    setCitiesLoading(true);
    notificationsService
      .getPopupCities(draft.stateId)
      .then((res) => {
        if (!cancelled) setCities(res.items);
      })
      .catch(() => {
        if (!cancelled) setCities([]);
      })
      .finally(() => {
        if (!cancelled) setCitiesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [draft.stateId]);

  const patch = (changes: Partial<PushDraft>) =>
    setDraft((prev) => ({ ...prev, ...changes }));

  const stateOptions = useMemo(
    () => states.map((s) => ({ value: s.id, label: s.name })),
    [states],
  );
  const cityOptions = useMemo(
    () => cities.map((c) => ({ value: c.id, label: c.name })),
    [cities],
  );

  const audienceLabel =
    audiences.find((a) => a.key === draft.audience)?.label || "All users";

  const linkLabel =
    draft.linkType === "post"
      ? draft.listingLabel || "Linked listing"
      : draft.linkType === "page"
        ? pages.find((p) => p.key === draft.pageKey)?.label || draft.pageKey
        : "";

  const errors = (() => {
    const list: string[] = [];
    if (!draft.title.trim()) list.push("Title is required.");
    if (draft.linkType === "post" && !draft.listingId) {
      list.push("Choose the listing this push links to.");
    }
    if (draft.linkType === "page" && !draft.pageKey) {
      list.push("Choose the page this push links to.");
    }
    if (draft.targetMode === "city" && !draft.stateId) {
      list.push("Pick a state.");
    }
    if (draft.targetMode === "city" && draft.stateId && !draft.cityId) {
      list.push("Pick a city.");
    }
    return list;
  })();

  const clearLink = () =>
    patch({
      linkType: "none",
      listingId: "",
      listingLabel: "",
      pageKey: "",
      ctaLabel: "",
    });

  const send = async () => {
    setTouched(true);
    if (errors.length || !canWrite || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await notificationsService.sendPushOnly({
        title: draft.title.trim(),
        ...(draft.body.trim() ? { body: draft.body.trim() } : {}),
        ...(draft.imageUrl.trim() ? { imageUrl: draft.imageUrl.trim() } : {}),
        linkType: draft.linkType,
        ...(draft.linkType === "post" && draft.listingId
          ? { listingId: draft.listingId }
          : {}),
        ...(draft.linkType === "page" && draft.pageKey
          ? { pageKey: draft.pageKey }
          : {}),
        ...(draft.ctaLabel.trim() ? { ctaLabel: draft.ctaLabel.trim() } : {}),
        ...(draft.targetMode === "city"
          ? {
              ...(draft.stateId ? { stateIds: [draft.stateId] } : {}),
              ...(draft.cityId ? { cityIds: [draft.cityId] } : {}),
            }
          : {}),
        audience: draft.audience,
      });
      setDraft(emptyDraft());
      setTouched(false);
      onToast(
        result.cityPushKilled
          ? "City push is killed — nothing was delivered."
          : `Push sent to ${result.pushSuccessCount}/${result.recipientCount} devices.`,
      );
    } catch (err) {
      setError(notificationApiError(err, "Failed to send push."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white">
          <Bell className="size-4" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Push Notification
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Phone tray only — no Groups history, no Connect feed, no General
            inbox.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <FormattedTextField
          label="Title"
          value={draft.title}
          onChange={(v) => patch({ title: v })}
          placeholder="Notification title"
          ariaLabel="Push title"
          editorClassName="font-medium"
        />
        <FormattedTextField
          label="Message (optional)"
          value={draft.body}
          onChange={(v) => patch({ body: v })}
          placeholder="Optional message"
          ariaLabel="Push message"
        />

        <div className="space-y-1.5">
          <ImageUrlOrUpload
            label="Image (optional)"
            value={draft.imageUrl}
            onChange={(url) => patch({ imageUrl: url })}
            kind="popup"
            placeholder="https://cdn.example.com/banner.jpg"
            hint="Paste HTTPS URL or upload."
            previewClassName="mt-2 max-h-32 rounded-2xl object-cover"
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-700">Link</p>
          <LinkTypeToggle
            allowNone
            active={
              draft.linkType === "page"
                ? "page"
                : draft.linkType === "post"
                  ? "post"
                  : "none"
            }
            onSelect={(type) => {
              if (!canWrite) return;
              if (type === "none") {
                clearLink();
                return;
              }
              setLinkPickerType(type);
              setLinkOpen(true);
            }}
          />
          {draft.linkType !== "none" ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">
                {draft.linkType === "post" ? "Post linked" : "Page linked"}
                {linkLabel ? ` · ${linkLabel}` : ""}
              </p>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700">
                  Button label (optional)
                </label>
                <Input
                  value={draft.ctaLabel}
                  onChange={(e) => patch({ ctaLabel: e.target.value })}
                  placeholder="e.g. View listing"
                  maxLength={40}
                  disabled={!canWrite}
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400">
              Normal sends with no deep link.
            </p>
          )}
        </div>

        <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700">
              Where to show
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={draft.targetMode === "global" ? "default" : "outline"}
                size="sm"
                disabled={!canWrite}
                className={
                  draft.targetMode === "global" ? "bg-primary text-white" : undefined
                }
                onClick={() =>
                  patch({ targetMode: "global", stateId: "", cityId: "" })
                }
              >
                <Globe className="mr-1.5 size-3.5" />
                All cities
              </Button>
              <Button
                type="button"
                variant={draft.targetMode === "city" ? "default" : "outline"}
                size="sm"
                disabled={!canWrite}
                className={
                  draft.targetMode === "city" ? "bg-primary text-white" : undefined
                }
                onClick={() => patch({ targetMode: "city" })}
              >
                <MapPin className="mr-1.5 size-3.5" />
                State & city
              </Button>
            </div>
          </div>

          {draft.targetMode === "city" && (
            <div className="space-y-3 border-t border-gray-200 pt-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700">State</label>
                <SearchableSelect
                  options={stateOptions}
                  value={draft.stateId}
                  onValueChange={(v) =>
                    patch({ stateId: v || "", cityId: "" })
                  }
                  loading={placesLoading}
                  placeholder="Select state"
                  searchPlaceholder="Search state…"
                  emptyText="No states found."
                  disabled={!canWrite}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700">City</label>
                <SearchableSelect
                  options={cityOptions}
                  value={draft.cityId}
                  onValueChange={(v) => patch({ cityId: v || "" })}
                  loading={placesLoading || citiesLoading}
                  placeholder={
                    draft.stateId ? "Select city" : "Select a state first"
                  }
                  searchPlaceholder="Search city…"
                  emptyText={
                    draft.stateId
                      ? "No cities in this state."
                      : "Pick a state to see cities."
                  }
                  disabled={!canWrite || !draft.stateId}
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5 border-t border-gray-200 pt-3">
            <label className="text-xs font-medium text-gray-700">Audience</label>
            <Select
              value={draft.audience}
              onValueChange={(v) => patch({ audience: v as PopupAudience })}
              disabled={!canWrite}
            >
              <SelectTrigger className="w-full bg-white">
                <span>{audienceLabel}</span>
              </SelectTrigger>
              <SelectContent>
                {audiences.map((item) => (
                  <SelectItem key={item.key} value={item.key}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-gray-400">
              Same as In-App Popup — badge, subscription, and Pro documents.
              Only matching users with city push ON receive this.
            </p>
          </div>
        </div>

        {(touched && errors[0]) || error ? (
          <p className="text-xs text-red-600">{error || errors[0]}</p>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={send}
            disabled={!canWrite || submitting || (touched && errors.length > 0)}
            className="bg-primary text-white hover:bg-primary/90"
          >
            {submitting ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Send className="mr-2 size-4" />
            )}
            Send push
          </Button>
        </div>
      </div>

      <LinkPickerDialog
        open={linkOpen}
        pages={pages}
        cityId={draft.cityId || undefined}
        preferredType={linkPickerType}
        value={{
          linkType: draft.linkType,
          listingId: draft.listingId,
          listingLabel: draft.listingLabel,
          pageKey: draft.pageKey,
        }}
        onClose={() => setLinkOpen(false)}
        onSave={(next) => {
          patch({ ...next, ctaLabel: draft.ctaLabel });
          setLinkOpen(false);
        }}
      />
    </div>
  );
}
