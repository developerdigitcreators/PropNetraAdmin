"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CreateFormField } from "@/services/listings.service";
import type { AdminTeamMember } from "@/services/developer-home.service";
import { Loader2, Upload, X } from "lucide-react";

function asUrlList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object" && "url" in item)
          return String((item as { url?: string }).url || "").trim();
        return "";
      })
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  if (value && typeof value === "object" && "url" in value) {
    const u = String((value as { url?: string }).url || "").trim();
    if (u) return [u];
  }
  return [];
}

type MediaEditorProps = {
  field: CreateFormField;
  value: unknown;
  onChange: (next: unknown) => void;
  onUploadImages: (files: File[]) => Promise<string[]>;
  onUploadVideos?: (files: File[]) => Promise<string[]>;
  uploading?: boolean;
};

export function ListingMediaFieldEditor({
  field,
  value,
  onChange,
  onUploadImages,
  onUploadVideos,
  uploading,
}: MediaEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const urls = asUrlList(value);
  const isVideo =
    field.type.toLowerCase().includes("video") ||
    field.key.toLowerCase().includes("video");

  return (
    <div className="space-y-2 sm:col-span-2">
      <label className="text-sm font-medium text-gray-700">
        {field.label}
        {field.required ? <span className="text-red-500"> *</span> : null}
      </label>
      <div className="flex flex-wrap gap-2">
        {urls.map((url) => (
          <div
            key={url}
            className="relative h-20 w-28 overflow-hidden rounded-lg border bg-gray-50"
          >
            {/\.(mp4|webm)/i.test(url) ? (
              <video src={url} className="h-full w-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt="" className="h-full w-full object-cover" />
            )}
            <button
              type="button"
              className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
              onClick={() => onChange(urls.filter((u) => u !== url))}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={isVideo ? "video/mp4,video/webm" : "image/*"}
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            e.target.value = "";
            if (!files.length) return;
            void (async () => {
              const added = isVideo && onUploadVideos
                ? await onUploadVideos(files)
                : await onUploadImages(files);
              onChange([...urls, ...added]);
            })();
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Upload
        </Button>
      </div>
    </div>
  );
}

type BrochureEditorProps = {
  field: CreateFormField;
  value: unknown;
  onChange: (next: unknown) => void;
  onUploadPdf: (file: File) => Promise<string>;
  uploading?: boolean;
};

export function ListingBrochureFieldEditor({
  field,
  value,
  onChange,
  onUploadPdf,
  uploading,
}: BrochureEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const url = asUrlList(value)[0] || "";

  return (
    <div className="space-y-2 sm:col-span-2">
      <label className="text-sm font-medium text-gray-700">{field.label}</label>
      {url ? (
        <div className="flex items-center gap-2 text-sm">
          <a href={url} target="_blank" rel="noreferrer" className="text-primary underline">
            View PDF
          </a>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
            Remove
          </Button>
        </div>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          void onUploadPdf(file).then((next) => onChange(next));
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Upload brochure
      </Button>
    </div>
  );
}

type TeamEditorProps = {
  field: CreateFormField;
  value: unknown;
  members: AdminTeamMember[];
  onChange: (ids: string[]) => void;
  developerUserId?: string;
};

export function ListingTeamMembersFieldEditor({
  field,
  value,
  members,
  onChange,
  developerUserId,
}: TeamEditorProps) {
  const selected = Array.isArray(value)
    ? value.map((v) => String(v)).filter(Boolean)
    : typeof value === "string" && value
      ? value.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((s) => s !== id));
    else onChange([...selected, id]);
  };

  return (
    <div className="space-y-2 sm:col-span-2">
      <label className="text-sm font-medium text-gray-700">{field.label}</label>
      <div className="flex flex-wrap gap-2">
        {members.map((m) => {
          const on = selected.includes(m.id);
          return (
            <Button
              key={m.id}
              type="button"
              size="sm"
              variant={on ? "default" : "outline"}
              onClick={() => toggle(m.id)}
            >
              {m.name}
            </Button>
          );
        })}
        {!members.length ? (
          <p className="text-sm text-gray-500">No team members for this developer.</p>
        ) : null}
      </div>
      {developerUserId ? (
        <Link
          href={`/developer-user?developerId=${encodeURIComponent(developerUserId)}&tab=team`}
          className="text-sm text-primary underline"
        >
          Add team member
        </Link>
      ) : null}
    </div>
  );
}

export type FloorRow = {
  floorNum: string;
  price: string;
  priceMode: "available" | "sold_out" | "price_on_request";
};

export function floorRowsFromDynamic(value: unknown): FloorRow[] {
  if (!Array.isArray(value)) return [];
  return value.map((row, index) => {
    const r = row as Record<string, unknown>;
    const sold =
      r.priceMode === "sold_out" ||
      r.status === "sold_out" ||
      r.isSold === true;
    const por = r.priceOnRequest === true || r.price_on_request === true;
    return {
      floorNum: String(r.floorNum ?? r.floorLabel ?? index),
      price: String(r.price ?? ""),
      priceMode: sold ? "sold_out" : por ? "price_on_request" : "available",
    };
  });
}

type FloorEditorProps = {
  field: CreateFormField;
  rows: FloorRow[];
  onChange: (rows: FloorRow[]) => void;
};

export function ListingFloorTableEditor({ field, rows, onChange }: FloorEditorProps) {
  const update = (index: number, patch: Partial<FloorRow>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  return (
    <div className="space-y-3 sm:col-span-2">
      <label className="text-sm font-medium text-gray-700">{field.label}</label>
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-3">
            <Input
              value={row.floorNum}
              onChange={(e) => update(index, { floorNum: e.target.value })}
              placeholder="Floor"
            />
            <Select
              value={row.priceMode}
              onValueChange={(v) =>
                update(index, { priceMode: v as FloorRow["priceMode"] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="sold_out">Sold out</SelectItem>
                <SelectItem value="price_on_request">On request</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={row.price}
              disabled={row.priceMode !== "available"}
              onChange={(e) => update(index, { price: e.target.value })}
              placeholder="Price"
            />
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange([...rows, { floorNum: "", price: "", priceMode: "available" }])
        }
      >
        Add floor
      </Button>
    </div>
  );
}

export function floorRowsToApi(rows: FloorRow[]) {
  return rows
    .filter((row) => String(row.floorNum).trim())
    .map((row, index) => {
      const floorNumber = Number(String(row.floorNum).replace(/\D/g, "")) || index;
      const soldOut = row.priceMode === "sold_out";
      const priceNum = Number(String(row.price).replace(/[^\d.]/g, ""));
      return {
        floorNumber,
        floorLabel: String(row.floorNum).trim() || undefined,
        price: soldOut || row.priceMode === "price_on_request" ? null : priceNum || null,
        status: soldOut ? "sold_out" : "available",
      };
    });
}

/** Matches backend `DEV_LOCATION_ADVANTAGE_TABS` (developer-project.ts). */
export const DEV_LOCATION_ADVANTAGE_TAB_LABELS = [
  "Education",
  "Hospital",
  "Transport",
  "Connectivity",
] as const;

export type DevLocationAdvantageTabLabel =
  (typeof DEV_LOCATION_ADVANTAGE_TAB_LABELS)[number];

export const DEV_MAX_LOCATION_ADVANTAGE_TABS = DEV_LOCATION_ADVANTAGE_TAB_LABELS.length;

export type LocationAdvantagePlaceRow = {
  name: string;
  distance: string;
};

export type LocationAdvantageTabRow = {
  tab: string;
  places: LocationAdvantagePlaceRow[];
  /** Loaded from API with a non-canonical category label (e.g. legacy "Schools"). */
  invalidLegacy?: boolean;
};

export type LocationAdvantageEditorState = {
  imageUrl: string;
  tabs: LocationAdvantageTabRow[];
};

export function canonicalLocationAdvantageTab(
  raw: string,
): DevLocationAdvantageTabLabel | null {
  const key = String(raw || "")
    .trim()
    .toLowerCase();
  if (!key) return null;
  for (const label of DEV_LOCATION_ADVANTAGE_TAB_LABELS) {
    if (label.toLowerCase() === key) return label;
  }
  return null;
}

function locationAdvantageParts(raw: unknown): { imageUrl: string; tabs: unknown[] } {
  if (Array.isArray(raw)) return { imageUrl: "", tabs: raw };
  if (raw && typeof raw === "object") {
    const src = raw as Record<string, unknown>;
    const imageUrl = String(src.imageUrl ?? src.image_url ?? "").trim();
    const tabs = Array.isArray(src.tabs) ? src.tabs : [];
    return { imageUrl, tabs };
  }
  return { imageUrl: "", tabs: [] };
}

export function parseLocationAdvantageFromDynamic(
  raw: unknown,
): LocationAdvantageEditorState {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const src = raw as Record<string, unknown>;
    if (Array.isArray(src.tabs)) {
      const imageUrl = String(src.imageUrl ?? src.image_url ?? "").trim();
      const tabs: LocationAdvantageTabRow[] = [];
      for (const t of src.tabs) {
        if (!t || typeof t !== "object") continue;
        const row = t as Record<string, unknown>;
        const rawTab = String(row.tab ?? row.name ?? "").trim();
        const canonical = rawTab ? canonicalLocationAdvantageTab(rawTab) : null;
        const placesRaw = Array.isArray(row.places) ? row.places : [];
        const places: LocationAdvantagePlaceRow[] = [];
        for (const p of placesRaw) {
          if (!p || typeof p !== "object") continue;
          const pr = p as Record<string, unknown>;
          places.push({
            name: String(pr.name ?? "").trim(),
            distance: String(pr.distance ?? "").trim(),
          });
        }
        const hadInvalidFlag = row.invalidLegacy === true;
        tabs.push({
          tab: canonical ?? rawTab,
          places: places.length ? places : [{ name: "", distance: "" }],
          invalidLegacy: hadInvalidFlag || Boolean(rawTab && !canonical),
        });
      }
      if (tabs.length || imageUrl) return { imageUrl, tabs };
    }
  }

  const { imageUrl, tabs: tabsRaw } = locationAdvantageParts(raw);
  const tabs: LocationAdvantageTabRow[] = [];
  for (const t of tabsRaw) {
    if (!t || typeof t !== "object") continue;
    const row = t as Record<string, unknown>;
    const rawTab = String(row.tab ?? row.name ?? "").trim();
    const canonical = rawTab ? canonicalLocationAdvantageTab(rawTab) : null;
    const placesRaw = Array.isArray(row.places) ? row.places : [];
    const places: LocationAdvantagePlaceRow[] = [];
    for (const p of placesRaw) {
      if (!p || typeof p !== "object") continue;
      const pr = p as Record<string, unknown>;
      places.push({
        name: String(pr.name ?? "").trim(),
        distance: String(pr.distance ?? "").trim(),
      });
    }
    tabs.push({
      tab: canonical ?? rawTab,
      places: places.length ? places : [{ name: "", distance: "" }],
      invalidLegacy: Boolean(rawTab && !canonical),
    });
  }
  return { imageUrl, tabs };
}

export function locationAdvantageToApiPayload(
  state: LocationAdvantageEditorState,
): { imageUrl: string | null; tabs: Array<{ tab: string; places: LocationAdvantagePlaceRow[] }> } {
  const tabs: Array<{ tab: string; places: LocationAdvantagePlaceRow[] }> = [];
  for (const row of state.tabs) {
    const tab = canonicalLocationAdvantageTab(row.tab);
    if (!tab) continue;
    const places = row.places
      .map((p) => ({
        name: p.name.trim(),
        distance: p.distance.trim(),
      }))
      .filter((p) => p.name || p.distance);
    if (!places.length) continue;
    tabs.push({
      tab,
      places: places.map((p) => ({
        name: p.name,
        distance: p.distance,
      })),
    });
  }
  const url = state.imageUrl.trim();
  return { imageUrl: url || null, tabs };
}

export function validateLocationAdvantageForSave(
  state: LocationAdvantageEditorState,
): string | null {
  if (state.tabs.length > DEV_MAX_LOCATION_ADVANTAGE_TABS) {
    return `At most ${DEV_MAX_LOCATION_ADVANTAGE_TABS} location categories are allowed.`;
  }
  const seen = new Set<string>();
  for (const row of state.tabs) {
    const tab = canonicalLocationAdvantageTab(row.tab);
    if (!tab) {
      const label = row.tab.trim() || "Unknown";
      return `Fix location category "${label}". Choose one of: ${DEV_LOCATION_ADVANTAGE_TAB_LABELS.join(", ")}.`;
    }
    const key = tab.toLowerCase();
    if (seen.has(key)) {
      return `Duplicate location category: ${tab}.`;
    }
    seen.add(key);
    for (const place of row.places) {
      const name = place.name.trim();
      const distance = place.distance.trim();
      if (!name && !distance) continue;
      if (!name) {
        return `${tab}: every place needs a name.`;
      }
    }
  }
  return null;
}

type LocationAdvantageEditorProps = {
  field: CreateFormField;
  value: unknown;
  onChange: (next: LocationAdvantageEditorState) => void;
};

export function ListingLocationAdvantageFieldEditor({
  field,
  value,
  onChange,
}: LocationAdvantageEditorProps) {
  const [state, setState] = useState(() => parseLocationAdvantageFromDynamic(value));

  const legacyWarnings = state.tabs.filter((t) => t.invalidLegacy && t.tab.trim());

  const commit = (next: LocationAdvantageEditorState) => {
    setState(next);
    onChange(next);
  };

  const setImageUrl = (imageUrl: string) => {
    commit({ ...state, imageUrl });
  };

  const updateTab = (index: number, patch: Partial<LocationAdvantageTabRow>) => {
    const tabs = state.tabs.map((row, i) =>
      i === index ? { ...row, ...patch, invalidLegacy: false } : row,
    );
    commit({ ...state, tabs });
  };

  const removeTab = (index: number) => {
    commit({ ...state, tabs: state.tabs.filter((_, i) => i !== index) });
  };

  const addTab = () => {
    if (state.tabs.length >= DEV_MAX_LOCATION_ADVANTAGE_TABS) return;
    const used = new Set(
      state.tabs
        .map((r) => canonicalLocationAdvantageTab(r.tab))
        .filter(Boolean)
        .map((l) => l!.toLowerCase()),
    );
    const nextLabel = DEV_LOCATION_ADVANTAGE_TAB_LABELS.find(
      (l) => !used.has(l.toLowerCase()),
    );
    commit({
      ...state,
      tabs: [
        ...state.tabs,
        {
          tab: nextLabel ?? "",
          places: [{ name: "", distance: "" }],
          invalidLegacy: !nextLabel,
        },
      ],
    });
  };

  const addPlace = (tabIndex: number) => {
    updateTab(tabIndex, {
      places: [...state.tabs[tabIndex].places, { name: "", distance: "" }],
    });
  };

  const updatePlace = (
    tabIndex: number,
    placeIndex: number,
    patch: Partial<LocationAdvantagePlaceRow>,
  ) => {
    const places = state.tabs[tabIndex].places.map((p, i) =>
      i === placeIndex ? { ...p, ...patch } : p,
    );
    updateTab(tabIndex, { places });
  };

  const removePlace = (tabIndex: number, placeIndex: number) => {
    const places = state.tabs[tabIndex].places.filter((_, i) => i !== placeIndex);
    updateTab(tabIndex, {
      places: places.length ? places : [{ name: "", distance: "" }],
    });
  };

  const usedTabsForIndex = (index: number) => {
    const set = new Set<string>();
    state.tabs.forEach((row, i) => {
      if (i === index) return;
      const c = canonicalLocationAdvantageTab(row.tab);
      if (c) set.add(c.toLowerCase());
    });
    return set;
  };

  return (
    <div className="space-y-4 sm:col-span-2">
      <label className="text-sm font-medium text-gray-700">{field.label}</label>

      {legacyWarnings.length ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Some saved categories are no longer valid (
          {legacyWarnings.map((t) => `"${t.tab}"`).join(", ")}). Pick a category from the list
          below before saving.
        </div>
      ) : null}

      <div className="space-y-1">
        <span className="text-xs font-medium text-gray-600">Map image URL (optional)</span>
        <Input
          value={state.imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://…"
        />
        {state.imageUrl.trim() ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={state.imageUrl.trim()}
            alt="Location map preview"
            className="mt-2 max-h-48 w-full rounded-lg border object-contain bg-gray-50"
          />
        ) : null}
      </div>

      <div className="space-y-4">
        {state.tabs.map((row, tabIndex) => {
          const canonical = canonicalLocationAdvantageTab(row.tab);
          const usedElsewhere = usedTabsForIndex(tabIndex);
          return (
            <div
              key={`${tabIndex}-${row.tab}`}
              className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={canonical ?? undefined}
                  onValueChange={(v) => updateTab(tabIndex, { tab: v ?? "", invalidLegacy: false })}
                >
                  <SelectTrigger className="w-full max-w-xs bg-white">
                    <SelectValue
                      placeholder={
                        row.invalidLegacy ? `Invalid: ${row.tab}` : "Select category"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {DEV_LOCATION_ADVANTAGE_TAB_LABELS.map((label) => (
                      <SelectItem
                        key={label}
                        value={label}
                        disabled={usedElsewhere.has(label.toLowerCase())}
                      >
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => removeTab(tabIndex)}
                >
                  Remove category
                </Button>
              </div>

              <div className="space-y-2">
                {row.places.map((place, placeIndex) => (
                  <div key={placeIndex} className="grid gap-2 sm:grid-cols-[1fr_8rem_auto]">
                    <Input
                      value={place.name}
                      onChange={(e) =>
                        updatePlace(tabIndex, placeIndex, { name: e.target.value })
                      }
                      placeholder="Place name"
                    />
                    <Input
                      value={place.distance}
                      onChange={(e) =>
                        updatePlace(tabIndex, placeIndex, { distance: e.target.value })
                      }
                      placeholder="Distance"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-gray-500"
                      onClick={() => removePlace(tabIndex, placeIndex)}
                      aria-label="Remove place"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addPlace(tabIndex)}
              >
                Add place
              </Button>
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={state.tabs.length >= DEV_MAX_LOCATION_ADVANTAGE_TABS}
        onClick={addTab}
      >
        Add category
      </Button>
      <p className="text-xs text-gray-500">
        Up to {DEV_MAX_LOCATION_ADVANTAGE_TABS} categories:{" "}
        {DEV_LOCATION_ADVANTAGE_TAB_LABELS.join(", ")}.
      </p>
    </div>
  );
}
