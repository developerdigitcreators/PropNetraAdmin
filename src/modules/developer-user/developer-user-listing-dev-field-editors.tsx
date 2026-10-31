"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
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
import { parseDeveloperSingleImageUrl } from "@/lib/developer-single-image-field";
import {
  DEV_ABOUT_MAX,
  DEV_AREA_TYPES,
  DEV_BHK_OPTIONS,
  DEV_CHARGE_OPTIONS,
  DEV_EXTRA_SPACE_OPTIONS,
  DEV_FIELD,
  DEV_GALLERY_MAX_IMAGES,
  DEV_GALLERY_MAX_VIDEOS,
  DEV_HEADER_MAX_IMAGES,
  DEV_HEADER_MAX_VIDEOS,
  DEV_MAX_LAYOUTS,
  DEV_MAX_YOUTUBE,
  type DevAttachLayoutRow,
  type DevAvailableUnitRow,
} from "@/lib/developer-form-limits";
import { Loader2, Plus, Trash2, Upload, X, Bold, Italic, Underline, Strikethrough } from "lucide-react";
import { cn } from "@/lib/utils";

export type DevGeoValue = {
  lat: number | null;
  lng: number | null;
  formattedAddress: string;
  placeId: string;
};

function parseGeo(raw: unknown): DevGeoValue {
  if (!raw || typeof raw !== "object") {
    return { lat: null, lng: null, formattedAddress: "", placeId: "" };
  }
  const src = raw as Record<string, unknown>;
  const latRaw = src.lat ?? src.latitude;
  const lngRaw = src.lng ?? src.longitude;
  const lat =
    typeof latRaw === "number" && Number.isFinite(latRaw) ? latRaw : null;
  const lng =
    typeof lngRaw === "number" && Number.isFinite(lngRaw) ? lngRaw : null;
  return {
    lat,
    lng,
    formattedAddress: String(
      src.formattedAddress ?? src.formatted_address ?? src.address ?? "",
    ).trim(),
    placeId: String(src.placeId ?? src.place_id ?? "").trim(),
  };
}

type GeoEditorProps = {
  field: CreateFormField;
  value: unknown;
  onChange: (next: DevGeoValue) => void;
};

export function ListingGeoFieldEditor({ field, value, onChange }: GeoEditorProps) {
  const geo = parseGeo(value);
  const patch = (p: Partial<DevGeoValue>) => onChange({ ...geo, ...p });

  return (
    <div className="space-y-3 sm:col-span-2">
      <label className="text-sm font-medium text-gray-700">{field.label}</label>
      <Input
        value={geo.formattedAddress}
        onChange={(e) => patch({ formattedAddress: e.target.value })}
        placeholder="Formatted address"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          type="number"
          step="any"
          value={geo.lat ?? ""}
          onChange={(e) => {
            const v = e.target.value.trim();
            patch({ lat: v ? Number(v) : null });
          }}
          placeholder="Latitude"
        />
        <Input
          type="number"
          step="any"
          value={geo.lng ?? ""}
          onChange={(e) => {
            const v = e.target.value.trim();
            patch({ lng: v ? Number(v) : null });
          }}
          placeholder="Longitude"
        />
      </div>
      <Input
        value={geo.placeId}
        onChange={(e) => patch({ placeId: e.target.value })}
        placeholder="Place ID (optional)"
      />
    </div>
  );
}

type AboutEditorProps = {
  field: CreateFormField;
  value: string;
  onChange: (html: string) => void;
};

export function ListingDevAboutFieldEditor({
  field,
  value,
  onChange,
}: AboutEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        underline: {},
      }),
      Placeholder.configure({ placeholder: field.placeholder || field.label }),
    ],
    content: value || "",
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      const textLen = ed.getText().length;
      if (textLen <= DEV_ABOUT_MAX) onChange(html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) editor.commands.setContent(value || "");
  }, [editor, value]);

  const charCount = editor?.getText().length ?? 0;
  const active = useEditorState({
    editor,
    selector: ({ editor: instance }) => ({
      bold: !!instance?.isActive("bold"),
      italic: !!instance?.isActive("italic"),
      underline: !!instance?.isActive("underline"),
      strike: !!instance?.isActive("strike"),
    }),
  });

  return (
    <div className="space-y-2 sm:col-span-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-gray-700">{field.label}</label>
        <span
          className={cn(
            "text-xs",
            charCount > DEV_ABOUT_MAX ? "text-red-600" : "text-gray-500",
          )}
        >
          {charCount}/{DEV_ABOUT_MAX}
        </span>
      </div>
      <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-100 bg-gray-50 px-2 py-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", active?.bold ? "bg-gray-200" : "")}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            disabled={!editor}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", active?.italic ? "bg-gray-200" : "")}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            disabled={!editor}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", active?.underline ? "bg-gray-200" : "")}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            disabled={!editor}
          >
            <Underline className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", active?.strike ? "bg-gray-200" : "")}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            disabled={!editor}
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
        </div>
        <div className="px-3 py-2">
          <EditorContent
            editor={editor}
            className="prose prose-sm max-w-none min-h-[120px] [&_.ProseMirror]:outline-none"
          />
        </div>
      </div>
    </div>
  );
}

function newUnitId() {
  return crypto.randomUUID();
}

export function parseAvailableUnitsFromDynamic(raw: unknown): DevAvailableUnitRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const src = row as Record<string, unknown>;
    return {
      id: String(src.id || newUnitId()),
      bhk: String(src.bhk || ""),
      extraSpace1: String(src.extraSpace1 ?? src.extra_space_1 ?? ""),
      extraSpace2: String(src.extraSpace2 ?? src.extra_space_2 ?? ""),
      size: String(src.size ?? src.area ?? ""),
      price: String(src.price ?? ""),
    };
  });
}

export function availableUnitsToApi(rows: DevAvailableUnitRow[]) {
  return rows
    .filter((r) => r.bhk.trim())
    .map((r) => ({
      id: r.id,
      bhk: r.bhk,
      extraSpace1: r.extraSpace1.trim() || null,
      extraSpace2: r.extraSpace2.trim() || null,
      size: Number(String(r.size).replace(/[^\d.]/g, "")) || 0,
      price: Number(String(r.price).replace(/[^\d.]/g, "")) || 0,
    }));
}

type UnitsEditorProps = {
  field: CreateFormField;
  value: unknown;
  onChange: (rows: DevAvailableUnitRow[]) => void;
};

export function ListingAvailableUnitsFieldEditor({
  field,
  value,
  onChange,
}: UnitsEditorProps) {
  const [rows, setRows] = useState(() => parseAvailableUnitsFromDynamic(value));

  useEffect(() => {
    setRows(parseAvailableUnitsFromDynamic(value));
  }, [value]);

  const commit = (next: DevAvailableUnitRow[]) => {
    setRows(next);
    onChange(next);
  };

  const update = (index: number, patch: Partial<DevAvailableUnitRow>) => {
    commit(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  return (
    <div className="space-y-3 sm:col-span-2">
      <label className="text-sm font-medium text-gray-700">{field.label}</label>
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className="grid gap-2 rounded-lg border border-gray-100 p-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            <Select value={row.bhk || undefined} onValueChange={(v) => update(index, { bhk: v ?? "" })}>
              <SelectTrigger>
                <SelectValue placeholder="BHK" />
              </SelectTrigger>
              <SelectContent>
                {DEV_BHK_OPTIONS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={row.extraSpace1 || "_none_"}
              onValueChange={(v) =>
                update(index, { extraSpace1: v === "_none_" ? "" : v ?? "" })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Extra space 1" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none_">None</SelectItem>
                {DEV_EXTRA_SPACE_OPTIONS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={row.extraSpace2 || "_none_"}
              onValueChange={(v) =>
                update(index, { extraSpace2: v === "_none_" ? "" : v ?? "" })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Extra space 2" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none_">None</SelectItem>
                {DEV_EXTRA_SPACE_OPTIONS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              value={row.size}
              onChange={(e) => update(index, { size: e.target.value })}
              placeholder="Size (sq ft)"
            />
            <Input
              type="number"
              value={row.price}
              onChange={(e) => update(index, { price: e.target.value })}
              placeholder="Price"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-600"
              onClick={() => commit(rows.filter((_, i) => i !== index))}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Remove
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          commit([
            ...rows,
            {
              id: newUnitId(),
              bhk: "",
              extraSpace1: "",
              extraSpace2: "",
              size: "",
              price: "",
            },
          ])
        }
      >
        <Plus className="mr-1 h-4 w-4" />
        Add unit
      </Button>
    </div>
  );
}

export function parseAttachLayoutsFromDynamic(raw: unknown): DevAttachLayoutRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const src = row as Record<string, unknown>;
    return {
      unitId: String(src.unitId ?? src.unit_id ?? ""),
      imageUrl: String(src.imageUrl ?? src.image_url ?? src.image ?? ""),
    };
  });
}

type AttachLayoutsProps = {
  field: CreateFormField;
  value: unknown;
  units: DevAvailableUnitRow[];
  onChange: (rows: DevAttachLayoutRow[]) => void;
  onUploadImages: (files: File[]) => Promise<string[]>;
  uploading?: boolean;
};

export function ListingAttachLayoutsFieldEditor({
  field,
  value,
  units,
  onChange,
  onUploadImages,
  uploading,
}: AttachLayoutsProps) {
  const [rows, setRows] = useState(() => parseAttachLayoutsFromDynamic(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadIndex, setUploadIndex] = useState<number | null>(null);

  useEffect(() => {
    setRows(parseAttachLayoutsFromDynamic(value));
  }, [value]);

  const unitOptions = useMemo(() => {
    const opts = units
      .filter((u) => u.bhk)
      .map((u) => ({
        id: u.id,
        label: [u.bhk, u.extraSpace1, u.extraSpace2].filter(Boolean).join(" · "),
      }));
    for (const row of rows) {
      if (row.unitId && !opts.some((o) => o.id === row.unitId)) {
        opts.push({ id: row.unitId, label: "Saved unit — re-select if needed" });
      }
    }
    return opts;
  }, [units, rows]);

  const commit = (next: DevAttachLayoutRow[]) => {
    setRows(next);
    onChange(next);
  };

  return (
    <div className="space-y-3 sm:col-span-2">
      <label className="text-sm font-medium text-gray-700">{field.label}</label>
      {rows.map((row, index) => (
        <div key={index} className="flex flex-wrap items-start gap-3 rounded-lg border p-3">
          <Select
            value={row.unitId || undefined}
            onValueChange={(v) => {
              const next = [...rows];
              next[index] = { ...next[index], unitId: v ?? "" };
              commit(next);
            }}
          >
            <SelectTrigger className="w-48">
              <span className="truncate">
                {unitOptions.find((u) => u.id === row.unitId)?.label ||
                  (row.unitId ? "Select unit" : "Unit")}
              </span>
            </SelectTrigger>
            <SelectContent>
              {unitOptions.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {row.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.imageUrl} alt="" className="h-16 w-24 rounded object-cover" />
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => {
              setUploadIndex(index);
              inputRef.current?.click();
            }}
          >
            Upload image
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => commit(rows.filter((_, i) => i !== index))}
          >
            Remove
          </Button>
        </div>
      ))}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file || uploadIndex == null) return;
          void onUploadImages([file]).then(([url]) => {
            const next = [...rows];
            next[uploadIndex] = { ...next[uploadIndex], imageUrl: url };
            commit(next);
            setUploadIndex(null);
          });
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={rows.length >= DEV_MAX_LAYOUTS}
        onClick={() => commit([...rows, { unitId: "", imageUrl: "" }])}
      >
        Add layout ({rows.length}/{DEV_MAX_LAYOUTS})
      </Button>
    </div>
  );
}

type SiteLayoutProps = {
  field: CreateFormField;
  value: unknown;
  onChange: (next: { imageUrl: string }) => void;
  onUploadImages: (files: File[]) => Promise<string[]>;
  uploading?: boolean;
};

/** @deprecated Use parseDeveloperSingleImageUrl */
export function parseSiteLayoutImageUrl(value: unknown): string {
  return parseDeveloperSingleImageUrl(value);
}

export function ListingSiteLayoutFieldEditor({
  field,
  value,
  onChange,
  onUploadImages,
  uploading,
}: SiteLayoutProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const url = parseDeveloperSingleImageUrl(value);
  const uploadLabel = field.label?.trim()
    ? `Upload ${field.label.toLowerCase()}`
    : "Upload image";

  return (
    <div className="space-y-2 sm:col-span-2">
      <label className="text-sm font-medium text-gray-700">{field.label}</label>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="max-h-40 rounded-lg border object-contain" />
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
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
          {url ? `Replace ${field.label || "image"}` : uploadLabel}
        </Button>
        {url ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-gray-600"
            onClick={() => onChange({ imageUrl: "" })}
          >
            Remove
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-gray-500">One HTTPS image only (same as Site layout).</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          void onUploadImages([file]).then(([nextUrl]) =>
            onChange({ imageUrl: nextUrl }),
          );
        }}
      />
    </div>
  );
}

type MultiSelectProps = {
  field: CreateFormField;
  value: unknown;
  onChange: (values: string[]) => void;
};

export function ListingDevMultiSelectFieldEditor({
  field,
  value,
  onChange,
}: MultiSelectProps) {
  const selected = Array.isArray(value)
    ? value.map(String)
    : typeof value === "string" && value
      ? value.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
  const options = field.options ?? [];

  const toggle = (optValue: string) => {
    if (selected.includes(optValue)) onChange(selected.filter((s) => s !== optValue));
    else onChange([...selected, optValue]);
  };

  return (
    <div className="space-y-2 sm:col-span-2">
      <label className="text-sm font-medium text-gray-700">{field.label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const on = selected.includes(opt.value);
          return (
            <Button
              key={opt.value}
              type="button"
              size="sm"
              variant={on ? "default" : "outline"}
              onClick={() => toggle(opt.value)}
            >
              {opt.label}
            </Button>
          );
        })}
        {!options.length ? (
          <p className="text-sm text-gray-500">No options in schema.</p>
        ) : null}
      </div>
    </div>
  );
}

export type DevMediaGalleryValue = {
  mode?: "images" | "video";
  images: string[];
  videos: string[];
  youtube: string[];
  thumbnail?: string | null;
};

function parseMediaGallery(raw: unknown): DevMediaGalleryValue {
  if (Array.isArray(raw)) {
    return { mode: "images", images: raw.filter((u) => typeof u === "string"), videos: [], youtube: [] };
  }
  if (!raw || typeof raw !== "object") {
    return { images: [], videos: [], youtube: [] };
  }
  const src = raw as Record<string, unknown>;
  const list = (key: string) =>
    Array.isArray(src[key])
      ? (src[key] as unknown[]).map(String).filter(Boolean)
      : [];
  const videos = list("videos");
  const images = list("images");
  const thumbnail = src.thumbnail ? String(src.thumbnail) : null;
  const mode =
    src.mode === "video" || videos.length > 0
      ? "video"
      : src.mode === "images" || images.length > 0
        ? "images"
        : undefined;
  return {
    mode,
    images: mode === "video" ? (thumbnail ? [thumbnail] : []) : images,
    videos,
    youtube: list("youtube"),
    thumbnail,
  };
}

function normalizeHeaderPatch(next: DevMediaGalleryValue): DevMediaGalleryValue {
  if (next.videos.length > 0) {
    const thumb = next.thumbnail || next.images[0] || null;
    return {
      mode: "video",
      videos: next.videos.slice(0, DEV_HEADER_MAX_VIDEOS),
      images: [],
      youtube: [],
      thumbnail: thumb,
    };
  }
  return {
    mode: "images",
    images: next.images.slice(0, DEV_HEADER_MAX_IMAGES),
    videos: [],
    youtube: next.youtube ?? [],
    thumbnail: null,
  };
}

type DevMediaGalleryProps = {
  field: CreateFormField;
  value: unknown;
  onChange: (next: DevMediaGalleryValue) => void;
  onUploadImages: (files: File[]) => Promise<string[]>;
  onUploadVideos?: (files: File[]) => Promise<string[]>;
  uploading?: boolean;
  variant: "header" | "gallery";
};

export function ListingDevMediaGalleryFieldEditor({
  field,
  value,
  onChange,
  onUploadImages,
  onUploadVideos,
  uploading,
  variant,
}: DevMediaGalleryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadKind, setUploadKind] = useState<"image" | "video" | "thumb">("image");
  const state = parseMediaGallery(value);
  const isHeader = variant === "header";
  const maxImages = isHeader ? DEV_HEADER_MAX_IMAGES : DEV_GALLERY_MAX_IMAGES;
  const maxVideos = isHeader ? DEV_HEADER_MAX_VIDEOS : DEV_GALLERY_MAX_VIDEOS;
  const label =
    field.key === DEV_FIELD.headerMedia || isHeader
      ? "Top banner"
      : field.label;

  const patch = (next: DevMediaGalleryValue) => {
    const out = isHeader ? normalizeHeaderPatch(next) : next;
    onChange(out);
  };

  const isVideoMode = isHeader && (state.videos.length > 0 || state.mode === "video");
  const bannerImages = isVideoMode ? [] : state.images;
  const thumbUrl = isVideoMode
    ? state.thumbnail || null
    : null;

  return (
    <div className="space-y-2 sm:col-span-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {isHeader ? (
        <p className="text-xs text-gray-500">
          Upload up to {DEV_HEADER_MAX_IMAGES} images, or 1 video with one thumbnail image — not both.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {bannerImages.map((url) => (
          <div key={url} className="relative h-20 w-28 overflow-hidden rounded-lg border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
              onClick={() =>
                patch({
                  ...state,
                  mode: "images",
                  videos: [],
                  thumbnail: null,
                  images: bannerImages.filter((u) => u !== url),
                })
              }
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {state.videos.map((url) => (
          <div key={url} className="relative h-20 w-28 overflow-hidden rounded-lg border">
            <video src={url} className="h-full w-full object-cover" />
            <button
              type="button"
              className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
              onClick={() =>
                patch({
                  ...state,
                  mode: "images",
                  images: [],
                  videos: [],
                  thumbnail: null,
                })
              }
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {thumbUrl && isVideoMode ? (
          <div className="relative">
            <p className="mb-1 text-xs text-gray-500">Video thumbnail</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbUrl} alt="" className="h-20 w-28 rounded-lg border object-cover" />
            <button
              type="button"
              className="absolute right-1 top-6 rounded-full bg-black/60 p-0.5 text-white"
              onClick={() => patch({ ...state, thumbnail: null, images: [] })}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={
            uploading ||
            isVideoMode ||
            bannerImages.length >= maxImages
          }
          onClick={() => {
            setUploadKind("image");
            inputRef.current?.click();
          }}
        >
          Add image ({bannerImages.length}/{maxImages})
        </Button>
        {onUploadVideos && isHeader ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={
              uploading ||
              (!isVideoMode && bannerImages.length > 0) ||
              state.videos.length >= maxVideos
            }
            onClick={() => {
              setUploadKind("video");
              inputRef.current?.click();
            }}
          >
            Add video ({state.videos.length}/{maxVideos})
          </Button>
        ) : onUploadVideos ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading || state.videos.length >= maxVideos}
            onClick={() => {
              setUploadKind("video");
              inputRef.current?.click();
            }}
          >
            Add video ({state.videos.length}/{maxVideos})
          </Button>
        ) : null}
        {isHeader && isVideoMode ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => {
              setUploadKind("thumb");
              inputRef.current?.click();
            }}
          >
            {thumbUrl ? "Replace thumbnail" : "Video thumbnail"}
          </Button>
        ) : null}
      </div>
      {!isHeader ? (
        <div className="space-y-1">
          <span className="text-xs text-gray-600">YouTube links (max {DEV_MAX_YOUTUBE})</span>
          <Input
            placeholder="Paste URL and press Enter in field below"
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              const v = (e.target as HTMLInputElement).value.trim();
              if (!v || state.youtube.length >= DEV_MAX_YOUTUBE) return;
              patch({ ...state, youtube: [...state.youtube, v] });
              (e.target as HTMLInputElement).value = "";
            }}
          />
          <div className="flex flex-wrap gap-1">
            {state.youtube.map((link) => (
              <span
                key={link}
                className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs"
              >
                {link.slice(0, 40)}…
                <button type="button" onClick={() => patch({ ...state, youtube: state.youtube.filter((u) => u !== link) })}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept={
          uploadKind === "video"
            ? "video/mp4,video/webm"
            : "image/*"
        }
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          e.target.value = "";
          if (!files.length) return;
          void (async () => {
            if (uploadKind === "video" && onUploadVideos) {
              const videos = await onUploadVideos(files);
              patch({
                ...state,
                mode: "video",
                videos: videos.slice(0, maxVideos),
                images: [],
                thumbnail: state.thumbnail,
              });
            } else {
              const images = await onUploadImages(files);
              if (uploadKind === "thumb" && isVideoMode) {
                patch({
                  ...state,
                  mode: "video",
                  thumbnail: images[0] ?? state.thumbnail,
                  images: [],
                });
              } else if (isHeader) {
                const merged = [...bannerImages, ...images].slice(0, maxImages);
                patch({
                  ...state,
                  mode: "images",
                  images: merged,
                  videos: [],
                  thumbnail: null,
                });
              } else {
                const merged = [...state.images, ...images].slice(0, maxImages);
                patch({ ...state, images: merged });
              }
            }
          })();
        }}
      />
    </div>
  );
}

export function ListingDevChargesFieldEditor({
  field,
  value,
  onChange,
}: {
  field: CreateFormField;
  value: string;
  onChange: (v: string) => void;
}) {
  const chargeLabel =
    DEV_CHARGE_OPTIONS.find((c) => c.value === value)?.label ?? "";
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{field.label}</label>
      <Select value={value || undefined} onValueChange={(v) => onChange(v ?? "")}>
        <SelectTrigger>
          {chargeLabel ? (
            <span className="truncate">{chargeLabel}</span>
          ) : (
            <SelectValue placeholder="Select charges" />
          )}
        </SelectTrigger>
        <SelectContent>
          {DEV_CHARGE_OPTIONS.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ListingDevAreaTypeFieldEditor({
  field,
  value,
  onChange,
}: {
  field: CreateFormField;
  value: string;
  onChange: (v: string) => void;
}) {
  const areaLabel = DEV_AREA_TYPES.find((c) => c.value === value)?.label ?? "";
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{field.label}</label>
      <Select value={value || undefined} onValueChange={(v) => onChange(v ?? "")}>
        <SelectTrigger>
          {areaLabel ? (
            <span className="truncate">{areaLabel}</span>
          ) : (
            <SelectValue placeholder="Area type" />
          )}
        </SelectTrigger>
        <SelectContent>
          {DEV_AREA_TYPES.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
