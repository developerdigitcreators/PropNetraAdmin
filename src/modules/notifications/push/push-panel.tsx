"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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
  linksAreValid,
  linksToBroadcastCtas,
  MultiLinkCtaEditor,
  primaryFromLinks,
  type LinkCtaRow,
} from "@/modules/notifications/chat/multi-link-cta-editor";
import {
  flattenPopupAudiences,
  notificationApiError,
  notificationsService,
  type BroadcastKeyLabel,
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

type PushStyle = "default" | "lead_interest";

type PushDraft = {
  title: string;
  body: string;
  imageUrl: string;
  links: LinkCtaRow[];
  targetMode: "global" | "city";
  stateId: string;
  cityId: string;
  audience: PopupAudience;
  style: PushStyle;
};

const emptyDraft = (): PushDraft => ({
  title: "",
  body: "",
  imageUrl: "",
  links: [],
  targetMode: "global",
  stateId: "",
  cityId: "",
  audience: "all",
  style: "default",
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

  const errors = (() => {
    const list: string[] = [];
    if (!draft.title.trim()) list.push("Title is required.");
    if (!linksAreValid(draft.links)) {
      list.push("Each link needs a listing (post) or page selected.");
    }
    if (draft.targetMode === "city" && !draft.stateId) {
      list.push("Pick a state.");
    }
    if (draft.targetMode === "city" && draft.stateId && !draft.cityId) {
      list.push("Pick a city.");
    }
    return list;
  })();

  const send = async () => {
    setTouched(true);
    if (errors.length || !canWrite || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const primary = primaryFromLinks(draft.links);
      const ctas = linksToBroadcastCtas(draft.links);
      const isLead = draft.style === "lead_interest";
      const result = await notificationsService.sendPushOnly({
        title: draft.title.trim(),
        ...(draft.body.trim() ? { body: draft.body.trim() } : {}),
        ...(draft.imageUrl.trim() ? { imageUrl: draft.imageUrl.trim() } : {}),
        ...(isLead ? { layoutType: "LEAD_INTEREST" } : {}),
        linkType: primary.linkType,
        ...(primary.linkType === "post" && primary.listingId
          ? { listingId: primary.listingId }
          : {}),
        ...(primary.linkType === "page" && primary.pageKey
          ? { pageKey: primary.pageKey }
          : {}),
        ...(primary.ctaLabel.trim()
          ? { ctaLabel: primary.ctaLabel.trim() }
          : {}),
        ...(ctas.length ? { ctas } : {}),
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
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-700">Style</label>
          <Select
            value={draft.style}
            onValueChange={(v) =>
              patch({ style: v === "lead_interest" ? "lead_interest" : "default" })
            }
          >
            <SelectTrigger className="w-full">
              {draft.style === "lead_interest"
                ? "Lead interest (inquiry)"
                : "Default"}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="lead_interest">
                Lead interest (inquiry)
              </SelectItem>
            </SelectContent>
          </Select>
          {draft.style === "lead_interest" ? (
            <p className="text-[11px] text-gray-500">
              Tray shows circular profile photo + app badge. Title = name,
              message = listing line, image = photo.
            </p>
          ) : null}
        </div>

        <FormattedTextField
          label={draft.style === "lead_interest" ? "Name" : "Title"}
          value={draft.title}
          onChange={(v) => patch({ title: v })}
          placeholder={
            draft.style === "lead_interest" ? "Amit Verma" : "Notification title"
          }
          ariaLabel="Push title"
          editorClassName="font-medium"
        />
        <FormattedTextField
          label={
            draft.style === "lead_interest"
              ? "Listing line"
              : "Message (optional)"
          }
          value={draft.body}
          onChange={(v) => patch({ body: v })}
          placeholder={
            draft.style === "lead_interest"
              ? "3 BHK • Sector 150, Noida"
              : "Optional message"
          }
          ariaLabel="Push message"
        />

        <div className="space-y-1.5">
          <ImageUrlOrUpload
            label={
              draft.style === "lead_interest"
                ? "Profile photo"
                : "Image (optional)"
            }
            value={draft.imageUrl}
            onChange={(url) => patch({ imageUrl: url })}
            kind="popup"
            placeholder="https://cdn.example.com/banner.jpg"
            hint={
              draft.style === "lead_interest"
                ? "HTTPS profile photo URL (shown as circle + app badge)."
                : "Paste HTTPS URL or upload."
            }
            previewClassName="mt-2 max-h-32 rounded-2xl object-cover"
          />
        </div>

        <MultiLinkCtaEditor
          links={draft.links}
          pages={pages}
          cityId={draft.cityId || undefined}
          disabled={!canWrite}
          onChange={(links) => patch({ links })}
        />

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
          </div>
        </div>

        {(touched && errors[0]) || error ? (
          <p className="text-xs text-red-600">{error || errors[0]}</p>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => void send()}
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
    </div>
  );
}
