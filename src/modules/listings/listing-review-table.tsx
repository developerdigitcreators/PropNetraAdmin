"use client";

import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { locationService } from "@/services/location.service";
import { listingConfigService } from "@/services/listing-config.service";
import {
  canToggleForSaleTitle,
  getCatalogSavedId,
  getCatalogSavedName,
  getReviewPickId,
  getReviewPickName,
  getReviewPickOriginalName,
  getHighlightedLocationName,
  getHighlightedPropertyName,
  getHighlightedMicroMarketId,
  getHighlightedMicroMarketName,
  getListingCategoryName,
  getListingDetailRows,
  getListingPrice,
  getListingPropertyTypeName,
  getSubmittedBy,
  hasCatalogSave,
  isForSaleTitleEnabled,
  isLocationPending,
  isMicroMarketPending,
  isPropertyNamePending,
  type ApproveListingReviewPayload,
  type ListingReviewItem,
  type SaveListingCatalogPayload,
  type RejectListingReviewPayload,
} from "@/services/listings.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchableSelect } from "@/components/common/searchable-select";
import { MultiSelect } from "@/components/common/multi-select";
import { ImageUrlOrUpload } from "@/components/image-url-or-upload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { newFirstCellClass, NewTag } from "@/components/common/new-row-marker";
import { cn } from "@/lib/utils";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Database,
  Loader2,
  Pencil,
  X,
} from "lucide-react";

type ListingReviewTableProps = {
  items: ListingReviewItem[];
  mode: "unverified" | "verified" | "rejected";
  onApprove: (
    id: string,
    payload: ApproveListingReviewPayload,
  ) => Promise<void>;
  onReject: (id: string, payload: RejectListingReviewPayload) => Promise<void>;
  onSaveToDb: (id: string, payload: SaveListingCatalogPayload) => Promise<void>;
  onToggleForSale: (id: string, enabled: boolean) => Promise<void>;
  onToggleActive?: (id: string, active: boolean) => Promise<void>;
};

type RowDraft = {
  forSale: boolean;
};

type CatalogField = "propertyName" | "location" | "microMarket";

type CatalogPick = {
  id: string;
  name: string;
};

const FIELD_LABEL: Record<CatalogField, string> = {
  propertyName: "Property name",
  location: "Location",
  microMarket: "Micro market",
};

const FIELD_PLACEHOLDER: Record<CatalogField, string> = {
  propertyName: "Select property name",
  location: "Select location",
  microMarket: "Select micro market",
};

type CatalogOption = {
  id: string;
  name: string;
  status?: string | null;
  propertyTypeId?: string;
  propertyTypeIds?: string[];
  propertyTypeName?: string;
  imageUrl?: string;
  microMarketId?: string;
  microMarketName?: string;
  locationIds?: string[];
};

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function asList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const nested =
      (data as { data?: unknown; items?: unknown }).data ??
      (data as { items?: unknown }).items;
    if (Array.isArray(nested)) return nested;
  }
  return [];
}

function typeNameKey(name?: string | null) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** One Apartment / SCO / Plot, regardless of Residential / Commercial / Pre-Leased rows. */
function uniquePropertyTypes(rows: any[]) {
  const byName = new Map<string, any>();
  const sorted = [...rows].sort((a, b) => {
    const aOrder = Number(a?.sort_order ?? a?.sortOrder ?? 9999);
    const bOrder = Number(b?.sort_order ?? b?.sortOrder ?? 9999);
    if (aOrder !== bOrder) return aOrder - bOrder;
    return String(a?.name || "").localeCompare(String(b?.name || ""));
  });
  for (const row of sorted) {
    const key = typeNameKey(row?.name);
    if (!key) continue;
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, row);
      continue;
    }
    const existingHasImage = Boolean(
      pickStr(existing.share_image_url, existing.shareImageUrl),
    );
    const rowHasImage = Boolean(pickStr(row.share_image_url, row.shareImageUrl));
    if (!existingHasImage && rowHasImage) byName.set(key, row);
  }
  return [...byName.values()];
}

function canonicalPropertyTypeId(
  propertyTypes: any[],
  rawId?: string | null,
  rawName?: string | null,
) {
  const unique = uniquePropertyTypes(propertyTypes);
  if (rawId) {
    const match = propertyTypes.find((t) => t.id === rawId);
    if (match) {
      const canon = unique.find(
        (t) => typeNameKey(t.name) === typeNameKey(match.name),
      );
      if (canon) return canon.id as string;
    }
    if (unique.some((t) => t.id === rawId)) return rawId;
  }
  if (rawName) {
    const canon = unique.find(
      (t) => typeNameKey(t.name) === typeNameKey(rawName),
    );
    if (canon) return canon.id as string;
  }
  return "";
}

type SaveLocationChip = {
  id: string;
  name: string;
  locked: boolean;
};

type SaveDraft = {
  forSale: boolean;
  propertyName: CatalogPick;
  location: CatalogPick;
  locations: SaveLocationChip[];
  locationDraft: CatalogPick;
  microMarket: CatalogPick;
  propertyTypeIds: string[];
  imageUrl: string;
  mmLocked: boolean;
};

function isApprovedCatalogStatus(status?: string | null) {
  if (!status) return true;
  return status === "approved" || status === "admin_added";
}

function asCatalogOptions(raw: unknown): CatalogOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => x as Record<string, unknown>)
    .filter((x) => typeof x.id === "string" && typeof x.name === "string")
    .filter((x) =>
      isApprovedCatalogStatus(typeof x.status === "string" ? x.status : null),
    )
    .map((x) => {
      const pt =
        x.property_type && typeof x.property_type === "object"
          ? (x.property_type as Record<string, unknown>)
          : null;
      const mm =
        x.micro_market && typeof x.micro_market === "object"
          ? (x.micro_market as Record<string, unknown>)
          : x.micromarket && typeof x.micromarket === "object"
            ? (x.micromarket as Record<string, unknown>)
            : null;
      return {
        id: x.id as string,
        name: x.name as string,
        status: typeof x.status === "string" ? x.status : null,
        propertyTypeId:
          pickStr(x.property_type_id, x.propertyTypeId, pt?.id) || undefined,
        propertyTypeIds: Array.isArray(x.propertyTypeIds)
          ? (x.propertyTypeIds as unknown[]).map((id) => pickStr(id)).filter(Boolean)
          : Array.isArray(x.property_types)
            ? (x.property_types as unknown[])
                .map((row) =>
                  row && typeof row === "object"
                    ? pickStr((row as Record<string, unknown>).id)
                    : pickStr(row),
                )
                .filter(Boolean)
            : undefined,
        propertyTypeName: pickStr(pt?.name, x.propertyTypeName) || undefined,
        imageUrl: pickStr(x.image_url, x.imageUrl) || undefined,
        microMarketId:
          pickStr(x.micro_market_id, x.microMarketId, x.micromarket_id, mm?.id) ||
          undefined,
        microMarketName: pickStr(mm?.name, x.microMarketName) || undefined,
        locationIds: Array.isArray(x.locations)
          ? (x.locations as unknown[])
              .map((loc) =>
                loc && typeof loc === "object"
                  ? pickStr((loc as Record<string, unknown>).id)
                  : pickStr(loc),
              )
              .filter(Boolean)
          : undefined,
      };
    });
}

function toSelectOptions(list: CatalogOption[]) {
  return list.map((item) => ({ value: item.id, label: item.name }));
}

function getFieldOriginal(
  item: ListingReviewItem,
  field: CatalogField,
): { name: string; id: string } {
  if (field === "propertyName") {
    return {
      name: getHighlightedPropertyName(item),
      id:
        typeof item.property_name?.id === "string" ? item.property_name.id : "",
    };
  }
  if (field === "location") {
    return {
      name: getHighlightedLocationName(item),
      id: typeof item.location?.id === "string" ? item.location.id : "",
    };
  }
  return {
    name: getHighlightedMicroMarketName(item),
    id: getHighlightedMicroMarketId(item),
  };
}

function catalogFieldStatus(
  item: ListingReviewItem,
  field: CatalogField,
): string | null | undefined {
  if (field === "propertyName") return item.property_name?.status;
  if (field === "location") return item.location?.status;
  return typeof item.highlights?.newMicroMarket === "object"
    ? item.highlights?.newMicroMarket?.status
    : null;
}

/** Listing field is already a real catalog row (not pending/custom). Empty ≠ approved. */
function isExplicitCatalogField(status: string | null | undefined): boolean {
  const s = String(status || "").toLowerCase();
  return s === "approved" || s === "admin_added";
}

/** Prefill Save / Reject right side from last catalog seed — never form pending text. */
function pickSeedFromCatalog(
  item: ListingReviewItem,
  field: CatalogField,
  originalName: string,
  originalId: string,
): CatalogPick {
  const savedId = getCatalogSavedId(item, field);
  const savedName = getCatalogSavedName(item, field);
  if (savedId || savedName) {
    return { id: savedId, name: savedName };
  }
  // If admin only pencil-edited the post, still preselect that pick in Reject/Save.
  const pickId = getReviewPickId(item, field);
  const pickName = getReviewPickName(item, field);
  if (pickId || pickName) {
    return { id: pickId, name: pickName };
  }
  if (isExplicitCatalogField(catalogFieldStatus(item, field))) {
    return { id: originalId, name: originalName };
  }
  return { id: "", name: "" };
}

/** Prefill pencil edit from review_pick applied to the post — not Save-to-DB seed. */
function pickReviewFromCatalog(
  item: ListingReviewItem,
  field: CatalogField,
  originalName: string,
  originalId: string,
): CatalogPick {
  const pickId = getReviewPickId(item, field);
  const pickName = getReviewPickName(item, field);
  if (pickId || pickName) {
    return { id: pickId, name: pickName };
  }
  if (isExplicitCatalogField(catalogFieldStatus(item, field))) {
    return { id: originalId, name: originalName };
  }
  return { id: "", name: "" };
}

function listingPropertyTypeIds(
  propertyTypes: any[],
  item?: ListingReviewItem | null,
): Set<string> {
  const ids = new Set<string>();
  if (!item) return ids;
  const rawId = pickStr(item.property_type?.id, (item.propertyType as { id?: string } | undefined)?.id);
  if (rawId) ids.add(rawId);
  const nameKey = typeNameKey(getListingPropertyTypeName(item));
  if (nameKey && nameKey !== "—") {
    for (const type of propertyTypes) {
      if (typeNameKey(type?.name) === nameKey && typeof type?.id === "string") {
        ids.add(type.id);
      }
    }
  }
  return ids;
}

function catalogLinkedToPropertyType(
  item: ListingReviewItem | null | undefined,
  propertyTypes: any[],
  propertyNames: CatalogOption[],
  locations: CatalogOption[],
  microMarkets: CatalogOption[],
) {
  const typeIds = listingPropertyTypeIds(propertyTypes, item);
  const typeName = typeNameKey(item ? getListingPropertyTypeName(item) : "");
  const hasType = typeIds.size > 0 || (!!typeName && typeName !== "—");
  if (!hasType) {
    return { propertyNames, locations, microMarkets };
  }
  const linkedNames = propertyNames.filter((row) => {
    const ids = [
      ...(row.propertyTypeIds || []),
      ...(row.propertyTypeId ? [row.propertyTypeId] : []),
    ];
    if (ids.some((id) => typeIds.has(id))) return true;
    return !!typeName && typeName !== "—" && typeNameKey(row.propertyTypeName) === typeName;
  });
  const locationIds = new Set(
    linkedNames.flatMap((row) => row.locationIds || []).filter(Boolean),
  );
  const linkedLocations = locations.filter((row) => locationIds.has(row.id));
  const mmIds = new Set(
    [
      ...linkedNames.map((row) => row.microMarketId),
      ...linkedLocations.map((row) => row.microMarketId),
    ].filter(Boolean) as string[],
  );
  return {
    propertyNames: linkedNames,
    locations: linkedLocations,
    microMarkets: mmIds.size
      ? microMarkets.filter((row) => mmIds.has(row.id))
      : [],
  };
}

function CompareField({
  label,
  original,
  right,
  leftLabel = "Original",
  rightLabel = "Saved / corrected",
}: {
  label: string;
  original: string;
  right: ReactNode;
  leftLabel?: string;
  rightLabel?: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-gray-900">{label}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
            {leftLabel}
          </p>
          <div className="h-8 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-sm text-gray-700 flex items-center">
            <span className="truncate">{original || "—"}</span>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
            {rightLabel}
          </p>
          {right}
        </div>
      </div>
    </div>
  );
}

type FieldOverride = {
  name: string;
  earlier: string;
};

function isAppliedFromCatalog(
  item: ListingReviewItem,
  field: CatalogField,
  fieldOverrides: Record<string, Partial<Record<CatalogField, FieldOverride>>>,
): boolean {
  return !!(
    getReviewPickId(item, field) ||
    getReviewPickName(item, field) ||
    fieldOverrides[item.id]?.[field]?.name
  );
}

/** Fields still eligible for Reject (pending custom, not pencil-corrected). */
function hasPendingRejectTargets(
  item: ListingReviewItem,
  forSale: boolean,
  fieldOverrides: Record<string, Partial<Record<CatalogField, FieldOverride>>>,
): boolean {
  const showPn =
    !forSale &&
    isPropertyNamePending(item) &&
    !isAppliedFromCatalog(item, "propertyName", fieldOverrides);
  const showLoc =
    isLocationPending(item) &&
    !isAppliedFromCatalog(item, "location", fieldOverrides);
  const showMm =
    isMicroMarketPending(item) &&
    !isAppliedFromCatalog(item, "microMarket", fieldOverrides);
  return showPn || showLoc || showMm;
}

function resolveCatalogCell(
  item: ListingReviewItem,
  field: CatalogField,
  override?: FieldOverride,
): { value: string; pending: boolean; earlier: string } {
  const original = getFieldOriginal(item, field).name;
  // Table shows pencil review_pick only — Save-to-DB seed must not change the post cell.
  const savedName = override?.name || getReviewPickName(item, field);
  const hasAdminApply =
    !!override?.name ||
    !!getReviewPickId(item, field) ||
    !!getReviewPickName(item, field);
  // Earlier only after admin pencil apply — never user resubmit / catalog_save seed.
  const earlierRaw = hasAdminApply
    ? override?.earlier || getReviewPickOriginalName(item, field) || ""
    : "";
  const value = savedName || original || "—";
  const earlier =
    earlierRaw && earlierRaw !== value ? earlierRaw : "";
  const pending =
    !savedName &&
    (field === "propertyName"
      ? isPropertyNamePending(item)
      : field === "location"
        ? isLocationPending(item)
        : isMicroMarketPending(item));
  return { value, pending, earlier };
}

function CatalogValueCell({
  value,
  pending,
  earlier,
  rejected,
  remark,
  canEdit,
  disabled,
  onEdit,
}: {
  value: string;
  pending?: boolean;
  earlier?: string;
  rejected?: boolean;
  remark?: string;
  canEdit?: boolean;
  disabled?: boolean;
  onEdit?: () => void;
}) {
  return (
    <div className="flex items-start gap-1.5">
      <div className="min-w-0">
        <span
          className={
            rejected
              ? "inline-flex rounded-md bg-red-50 border border-red-200 px-2 py-1 text-sm font-semibold text-red-900"
              : pending
                ? "inline-flex rounded-md bg-amber-50 border border-amber-200 px-2 py-1 text-sm font-semibold text-amber-900"
                : earlier
                  ? "inline-flex rounded-md bg-green-50 border border-green-200 px-2 py-1 text-sm font-semibold text-green-900"
                  : "text-sm text-gray-800"
          }
        >
          {value}
        </span>
        {remark ? (
          <p className="text-[10px] text-red-700 mt-1">Reject remark: {remark}</p>
        ) : null}
        {earlier ? (
          <p className="text-[10px] text-gray-500 mt-1">Earlier: {earlier}</p>
        ) : null}
        {pending ? (
          <p className="text-[10px] text-amber-700 mt-1">Pending — not in DB</p>
        ) : null}
      </div>
      {canEdit ? (
        <button
          type="button"
          title="Edit"
          disabled={disabled}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onEdit}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function CatalogPickSelect({
  options,
  value,
  disabled,
  loading,
  placeholder,
  emptyText = "No options found.",
  allowCreate = true,
  onChange,
  onAdd,
}: {
  options: CatalogOption[];
  value: CatalogPick;
  disabled?: boolean;
  loading?: boolean;
  placeholder: string;
  emptyText?: string;
  allowCreate?: boolean;
  onChange?: (next: CatalogPick) => void;
  onAdd?: (name: string) => void;
}) {
  const selectOptions = toSelectOptions(options);
  const known = !!value.id && options.some((o) => o.id === value.id);
  const selectValue = known ? value.id : "";
  const canCreate = !disabled && allowCreate;

  return (
    <SearchableSelect
      options={selectOptions}
      value={selectValue}
      selectedLabel={value.name || undefined}
      disabled={disabled}
      loading={loading}
      allowCreate={canCreate}
      editable={canCreate}
      placeholder={placeholder}
      emptyText={emptyText}
      onValueChange={(id) => {
        if (!onChange) return;
        const found = options.find((o) => o.id === id);
        onChange({ id: id || "", name: found?.name || "" });
      }}
      onInputChange={
        canCreate ? (name) => onChange?.({ id: "", name }) : undefined
      }
      onCreate={
        canCreate
          ? (name) => {
              if (onAdd) onAdd(name);
              else onChange?.({ id: "", name });
            }
          : undefined
      }
    />
  );
}

function buildRowDraft(item: ListingReviewItem): RowDraft {
  return { forSale: isForSaleTitleEnabled(item) };
}

function buildSaveDraft(item: ListingReviewItem, forSale: boolean): SaveDraft {
  const location = pickSeedFromCatalog(
    item,
    "location",
    getHighlightedLocationName(item),
    typeof item.location?.id === "string" ? item.location.id : "",
  );
  const propertyName = pickSeedFromCatalog(
    item,
    "propertyName",
    getHighlightedPropertyName(item),
    typeof item.property_name?.id === "string" ? item.property_name.id : "",
  );
  const microMarket = pickSeedFromCatalog(
    item,
    "microMarket",
    getHighlightedMicroMarketName(item),
    getHighlightedMicroMarketId(item),
  );
  return {
    forSale,
    propertyName,
    location,
    microMarket,
    propertyTypeIds: [
      pickStr(item.property_name?.property_type_id, item.property_type?.id),
    ].filter(Boolean),
    imageUrl: pickStr(item.property_name?.image_url),
    locations:
      location.id || location.name
        ? [{ id: location.id, name: location.name, locked: false }]
        : [],
    locationDraft: { id: "", name: "" },
    mmLocked: false,
  };
}

function linkedMicroMarket(
  opt: CatalogOption | undefined,
  mmOptions: CatalogOption[],
): CatalogPick | null {
  if (!opt?.microMarketId && !opt?.microMarketName) return null;
  const mm = opt.microMarketId
    ? mmOptions.find((row) => row.id === opt.microMarketId)
    : mmOptions.find(
        (row) =>
          row.name.toLowerCase() === (opt.microMarketName || "").toLowerCase(),
      );
  if (mm) return { id: mm.id, name: mm.name };
  if (opt.microMarketId) {
    return { id: opt.microMarketId, name: opt.microMarketName || "" };
  }
  return null;
}

function chipsFromPropertyName(
  opt: CatalogOption | undefined,
  locationOptions: CatalogOption[],
): SaveLocationChip[] {
  if (!opt?.locationIds?.length) return [];
  return opt.locationIds.map((id) => {
    const loc = locationOptions.find((row) => row.id === id);
    return { id, name: loc?.name || id, locked: true };
  });
}

function primaryLocation(chips: SaveLocationChip[]): CatalogPick {
  const first = chips[0];
  return first ? { id: first.id, name: first.name } : { id: "", name: "" };
}

function addLocationChip(
  prev: SaveDraft,
  next: CatalogPick,
  locationOptions: CatalogOption[],
  mmOptions: CatalogOption[],
): SaveDraft {
  const name = next.name.trim();
  if (!next.id && !name) return prev;
  const loc = locationOptions.find((row) => row.id === next.id);
  const already = prev.locations.some(
    (chip) =>
      (next.id && chip.id === next.id) ||
      (!next.id && chip.name.toLowerCase() === name.toLowerCase()),
  );
  if (already) return { ...prev, locationDraft: { id: "", name: "" } };
  const chips: SaveLocationChip[] = [
    ...prev.locations,
    { id: next.id, name: loc?.name || name, locked: false },
  ];
  let microMarket = prev.microMarket;
  let mmLocked = prev.mmLocked;
  if (loc?.microMarketId) {
    const mm = mmOptions.find((row) => row.id === loc.microMarketId);
    if (mm) {
      microMarket = { id: mm.id, name: mm.name };
      mmLocked = true;
    }
  }
  return {
    ...prev,
    locations: chips,
    location: primaryLocation(chips),
    locationDraft: { id: "", name: "" },
    microMarket,
    mmLocked,
  };
}

function formatReviewLogAt(at?: string) {
  if (!at) return "";
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return at;
  return d.toLocaleString();
}

export function ListingReviewTable({
  items,
  mode,
  onApprove,
  onReject,
  onSaveToDb,
  onToggleForSale,
  onToggleActive,
}: ListingReviewTableProps) {
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    id: string;
    action: "approve" | "reject";
  } | null>(null);
  const [rejectRemarksDraft, setRejectRemarksDraft] =
    useState<RejectListingReviewPayload>({});
  const [rejectCatalogDraft, setRejectCatalogDraft] = useState<SaveDraft | null>(
    null,
  );
  const [saveOpen, setSaveOpen] = useState<{ id: string } | null>(null);
  const [saveDraft, setSaveDraft] = useState<SaveDraft | null>(null);
  const [fieldEdit, setFieldEdit] = useState<{
    id: string;
    field: CatalogField;
  } | null>(null);
  const [fieldEditPick, setFieldEditPick] = useState<CatalogPick | null>(null);
  const [fieldOverrides, setFieldOverrides] = useState<
    Record<string, Partial<Record<CatalogField, FieldOverride>>>
  >({});
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [microMarkets, setMicroMarkets] = useState<CatalogOption[]>([]);
  const [propertyNames, setPropertyNames] = useState<CatalogOption[]>([]);
  const [locations, setLocations] = useState<CatalogOption[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<any[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [activeById, setActiveById] = useState<Record<string, boolean>>({});
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [isGrabbing, setIsGrabbing] = useState(false);
  const dragStateRef = useRef<{ startX: number; scrollLeft: number }>({
    startX: 0,
    scrollLeft: 0,
  });
  const isGrabbingRef = useRef(false);

  const colCount = mode === "unverified" ? 9 : mode === "verified" ? 8 : 7;

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getDraft = (item: ListingReviewItem): RowDraft =>
    drafts[item.id] || buildRowDraft(item);

  const updateDraft = (
    id: string,
    patch: Partial<RowDraft>,
    fallback: ListingReviewItem,
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || buildRowDraft(fallback)), ...patch },
    }));
  };

  const openSaveDialog = (item: ListingReviewItem) => {
    const current = getDraft(item);
    setSaveDraft(buildSaveDraft(item, current.forSale));
    setSaveOpen({ id: item.id });
  };

  const openFieldEdit = (item: ListingReviewItem, field: CatalogField) => {
    const original = getFieldOriginal(item, field);
    setFieldEditPick(pickReviewFromCatalog(item, field, original.name, original.id));
    setFieldEdit({ id: item.id, field });
  };

  const closeFieldEdit = () => {
    setFieldEdit(null);
    setFieldEditPick(null);
  };

  const rememberFieldOverride = (
    id: string,
    field: CatalogField,
    name: string,
    earlier: string,
  ) => {
    setFieldOverrides((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: {
          name,
          earlier: prev[id]?.[field]?.earlier || earlier,
        },
      },
    }));
  };

  const catalogDialogOpen =
    !!saveOpen || confirm?.action === "reject" || !!fieldEdit;

  const reloadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const [mm, locs, pns, pts] = await Promise.all([
        locationService.getMicroMarkets(),
        locationService.getLocations(),
        locationService.getPropertyNames(),
        listingConfigService.getPropertyTypes().catch(() => []),
      ]);
      setMicroMarkets(asCatalogOptions(mm));
      setLocations(asCatalogOptions(locs));
      setPropertyNames(asCatalogOptions(pns));
      setPropertyTypes(asList(pts));
    } catch (err) {
      console.error(err);
      setMicroMarkets([]);
      setLocations([]);
      setPropertyNames([]);
      setPropertyTypes([]);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!catalogDialogOpen) return;
    void reloadCatalog();
  }, [catalogDialogOpen, reloadCatalog]);

  useEffect(() => {
    if (!saveOpen) return;
    const item = items.find((i) => i.id === saveOpen.id);
    setSaveDraft((prev) => {
      if (!prev || prev.forSale) return prev;
      const opt = propertyNames.find(
        (o) => o.id && o.id === prev.propertyName.id,
      );
      const fromOpt = [
        ...(opt?.propertyTypeIds || []),
        ...(opt?.propertyTypeId ? [opt.propertyTypeId] : []),
      ];
      const nextTypes = (
        fromOpt.length ? fromOpt : prev.propertyTypeIds.length
          ? prev.propertyTypeIds
          : [item?.property_type?.id || ""]
      )
        .map((id) =>
          canonicalPropertyTypeId(propertyTypes, id, item?.property_type?.name),
        )
        .filter(Boolean);
      const uniqueTypes = [...new Set(nextTypes.length ? nextTypes : prev.propertyTypeIds)];
      const nextImage =
        prev.imageUrl || opt?.imageUrl || pickStr(item?.property_name?.image_url);
      const locked = chipsFromPropertyName(opt, locations);
      const extra = prev.locations.filter(
        (chip) => !chip.locked && !locked.some((row) => row.id && row.id === chip.id),
      );
      const nextLocations = locked.length ? [...locked, ...extra] : prev.locations;
      const mm = linkedMicroMarket(opt, microMarkets);
      const sameTypes =
        uniqueTypes.length === prev.propertyTypeIds.length &&
        uniqueTypes.every((id) => prev.propertyTypeIds.includes(id));
      const nextMmLocked = opt ? !!mm : prev.mmLocked;
      if (
        sameTypes &&
        nextImage === prev.imageUrl &&
        nextLocations === prev.locations &&
        (!mm || mm.id === prev.microMarket.id) &&
        nextMmLocked === prev.mmLocked
      ) {
        return prev;
      }
      return {
        ...prev,
        propertyTypeIds: uniqueTypes.length ? uniqueTypes : prev.propertyTypeIds,
        imageUrl: nextImage,
        locations: nextLocations,
        location: primaryLocation(nextLocations),
        microMarket: mm || prev.microMarket,
        mmLocked: nextMmLocked,
      };
    });
  }, [propertyTypes, propertyNames, locations, microMarkets, saveOpen?.id, items, saveOpen]);

  const handleToggleForSale = async (
    item: ListingReviewItem,
    enabled: boolean,
  ) => {
    updateDraft(item.id, { forSale: enabled }, item);
    setBusyId(item.id);
    try {
      await onToggleForSale(item.id, enabled);
    } catch (err) {
      console.error(err);
      updateDraft(item.id, { forSale: !enabled }, item);
      alert("Failed to update title preference.");
    } finally {
      setBusyId(null);
    }
  };

  const getIsActive = (item: ListingReviewItem) => {
    if (typeof activeById[item.id] === "boolean") return activeById[item.id];
    if (typeof item.isActive === "boolean") return item.isActive;
    return true;
  };

  const handleToggleActive = async (
    item: ListingReviewItem,
    active: boolean,
  ) => {
    if (!onToggleActive) return;
    const prev = getIsActive(item);
    setActiveById((s) => ({ ...s, [item.id]: active }));
    setBusyId(item.id);
    try {
      await onToggleActive(item.id, active);
    } catch (err) {
      console.error(err);
      setActiveById((s) => ({ ...s, [item.id]: prev }));
      alert("Failed to update active status.");
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirm) return;
    const { id, action } = confirm;
    const item = items.find((i) => i.id === id);
    const draft = item ? getDraft(item) : { forSale: false };
    setBusyId(id);
    try {
      if (action === "reject") {
        const forSale = draft.forSale;
        const payload: RejectListingReviewPayload = {};
        if (!forSale && rejectRemarksDraft.rejectPropertyName) {
          payload.rejectPropertyName = true;
          payload.propertyNameRemark =
            rejectRemarksDraft.propertyNameRemark?.trim() || undefined;
          payload.propertyNameId =
            rejectCatalogDraft?.propertyName.id || undefined;
          payload.propertyName =
            rejectCatalogDraft?.propertyName.name.trim() || undefined;
        }
        if (rejectRemarksDraft.rejectLocation) {
          payload.rejectLocation = true;
          payload.locationRemark =
            rejectRemarksDraft.locationRemark?.trim() || undefined;
          payload.locationId = rejectCatalogDraft?.location.id || undefined;
          payload.locationName =
            rejectCatalogDraft?.location.name.trim() || undefined;
        }
        if (rejectRemarksDraft.rejectMicroMarket) {
          payload.rejectMicroMarket = true;
          payload.microMarketRemark =
            rejectRemarksDraft.microMarketRemark?.trim() || undefined;
          payload.microMarketId =
            rejectCatalogDraft?.microMarket.id || undefined;
          payload.microMarketName =
            rejectCatalogDraft?.microMarket.name.trim() || undefined;
        }

        const suggestedLocation = locations.find(
          (row) => row.id === rejectCatalogDraft?.location.id,
        );
        const suggestedMmId =
          rejectCatalogDraft?.microMarket.id ||
          suggestedLocation?.microMarketId ||
          "";
        const suggestedMm =
          microMarkets.find((row) => row.id === suggestedMmId) || null;
        payload.suggestion = {
          propertyName: rejectCatalogDraft?.propertyName.name.trim() || undefined,
          propertyNameId: rejectCatalogDraft?.propertyName.id || undefined,
          location: rejectCatalogDraft?.location.name.trim() || undefined,
          locationId: rejectCatalogDraft?.location.id || undefined,
          microMarket:
            rejectCatalogDraft?.microMarket.name.trim() ||
            suggestedMm?.name ||
            suggestedLocation?.microMarketName ||
            undefined,
          microMarketId: suggestedMmId || undefined,
        };

        if (
          !payload.rejectPropertyName &&
          !payload.rejectLocation &&
          !payload.rejectMicroMarket
        ) {
          alert("Select at least one item to reject.");
          setBusyId(null);
          return;
        }

        await onReject(id, payload);
        setRejectCatalogDraft(null);
      } else {
        await onApprove(id, { showForSaleInLocation: draft.forSale });
      }
      setConfirm(null);
    } catch (err) {
      console.error(err);
      alert(
        action === "reject"
          ? "Failed to reject listing."
          : "Failed to approve listing.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveToDb = async () => {
    if (!saveOpen || !saveDraft) return;

    const locReady =
      saveDraft.locations.some((chip) => chip.id || chip.name.trim()) ||
      !!saveDraft.locationDraft.name.trim();
    const mmReady = !!(
      saveDraft.microMarket.id || saveDraft.microMarket.name.trim()
    );
    const pnReady = !!(
      saveDraft.propertyName.id || saveDraft.propertyName.name.trim()
    );

    if (saveDraft.forSale) {
      if (!locReady) {
        alert("Select or enter a location.");
        return;
      }
    } else if (!pnReady || !locReady) {
      alert("Property name and location are required.");
      return;
    }
    if (!saveDraft.forSale && (!saveDraft.propertyTypeIds.length || !saveDraft.imageUrl.trim())) {
      alert("Property type and image URL are required when saving a property name.");
      return;
    }
    if (!mmReady) {
      alert("Select or enter a micro market.");
      return;
    }

    setBusyId(saveOpen.id);
    try {
      const merged =
        saveDraft.locationDraft.name.trim()
          ? addLocationChip(
              saveDraft,
              saveDraft.locationDraft,
              locations,
              microMarkets,
            )
          : saveDraft;
      const locationIds = merged.locations
        .map((chip) => chip.id)
        .filter(Boolean);
      const locationNames = merged.locations
        .filter((chip) => !chip.id && chip.name.trim())
        .map((chip) => chip.name.trim());
      const primary = merged.locations[0];
      const payload: SaveListingCatalogPayload = saveDraft.forSale
        ? {
            savePropertyName: false,
            saveLocation: true,
            saveMicroMarket: true,
            locationId: primary?.id || undefined,
            locationName: primary?.name.trim() || undefined,
            locationIds,
            locationNames,
            microMarketId: merged.microMarket.id || undefined,
            microMarketName: merged.microMarket.name.trim() || undefined,
          }
        : {
            savePropertyName: true,
            saveLocation: true,
            saveMicroMarket: true,
            propertyNameId: saveDraft.propertyName.id || undefined,
            propertyName: saveDraft.propertyName.name.trim() || undefined,
            propertyTypeId: saveDraft.propertyTypeIds[0] || undefined,
            propertyTypeIds: saveDraft.propertyTypeIds,
            propertyNameImageUrl: saveDraft.imageUrl.trim() || undefined,
            locationId: primary?.id || undefined,
            locationName: primary?.name.trim() || undefined,
            locationIds,
            locationNames,
            microMarketId: merged.microMarket.id || undefined,
            microMarketName: merged.microMarket.name.trim() || undefined,
          };
      await onSaveToDb(saveOpen.id, payload);
      await reloadCatalog();
      setSaveOpen(null);
      setSaveDraft(null);
    } catch (err) {
      console.error(err);
      alert("Failed to save to DB.");
    } finally {
      setBusyId(null);
    }
  };

  const handleFieldEditSave = async () => {
    if (!fieldEdit || !fieldEditPick) return;
    const editItem = items.find((row) => row.id === fieldEdit.id);
    const editMmId = (() => {
      if (!editItem || fieldEdit.field !== "location") return "";
      const fromPick = getReviewPickId(editItem, "microMarket");
      if (fromPick) return fromPick;
      const fromSeed = getCatalogSavedId(editItem, "microMarket");
      if (fromSeed) return fromSeed;
      const overrideName =
        fieldOverrides[editItem.id]?.microMarket?.name?.trim() || "";
      if (overrideName) {
        const match = microMarkets.find(
          (row) => row.name.toLowerCase() === overrideName.toLowerCase(),
        );
        if (match?.id) return match.id;
      }
      return getHighlightedMicroMarketId(editItem);
    })();
    const editOptions =
      fieldEdit.field === "propertyName"
        ? propertyNames
        : fieldEdit.field === "location"
          ? editMmId
            ? locations.filter((row) => row.microMarketId === editMmId)
            : []
          : microMarkets;
    if (!fieldEditPick.id || !editOptions.some((o) => o.id === fieldEditPick.id)) {
      alert(
        fieldEdit.field === "location" && !editMmId
          ? "Set a micro market first, then pick a location in that market."
          : `Select a ${FIELD_LABEL[fieldEdit.field].toLowerCase()} from the dropdown.`,
      );
      return;
    }

    const payload: SaveListingCatalogPayload =
      fieldEdit.field === "propertyName"
        ? (() => {
            const opt = propertyNames.find((row) => row.id === fieldEditPick.id);
            const primaryLocId = opt?.locationIds?.[0] || "";
            const loc =
              (primaryLocId &&
                locations.find((row) => row.id === primaryLocId)) ||
              null;
            const mmId = opt?.microMarketId || loc?.microMarketId || "";
            const mmName =
              (mmId && microMarkets.find((row) => row.id === mmId)?.name) ||
              opt?.microMarketName ||
              "";
            return {
              savePropertyName: true,
              saveLocation: !!loc?.id,
              saveMicroMarket: !!mmId,
              propertyNameId: fieldEditPick.id,
              propertyName: fieldEditPick.name.trim() || undefined,
              locationId: loc?.id || undefined,
              locationName: loc?.name || undefined,
              microMarketId: mmId || undefined,
              microMarketName: mmName || undefined,
              applyToListing: true,
            } as SaveListingCatalogPayload;
          })()
        : fieldEdit.field === "location"
          ? {
              savePropertyName: false,
              saveLocation: true,
              saveMicroMarket: false,
              locationId: fieldEditPick.id,
              locationName: fieldEditPick.name.trim() || undefined,
              applyToListing: true,
            }
          : {
              savePropertyName: false,
              saveLocation: false,
              saveMicroMarket: true,
              microMarketId: fieldEditPick.id,
              microMarketName: fieldEditPick.name.trim() || undefined,
              applyToListing: true,
            };

    setBusyId(fieldEdit.id);
    try {
      await onSaveToDb(fieldEdit.id, payload);
      const item = items.find((i) => i.id === fieldEdit.id);
      const earlierFor = (field: CatalogField) =>
        item ? getFieldOriginal(item, field).name : "";
      rememberFieldOverride(
        fieldEdit.id,
        fieldEdit.field,
        fieldEditPick.name.trim(),
        earlierFor(fieldEdit.field),
      );
      // PN pencil pick locks linked location + micro market onto the post.
      if (fieldEdit.field === "propertyName") {
        const opt = propertyNames.find((row) => row.id === fieldEditPick.id);
        const primaryLocId = opt?.locationIds?.[0] || "";
        const loc =
          (primaryLocId &&
            locations.find((row) => row.id === primaryLocId)) ||
          null;
        const mmId = opt?.microMarketId || loc?.microMarketId || "";
        const mmName =
          (mmId && microMarkets.find((row) => row.id === mmId)?.name) ||
          opt?.microMarketName ||
          "";
        if (loc?.id && loc.name) {
          rememberFieldOverride(
            fieldEdit.id,
            "location",
            loc.name,
            earlierFor("location"),
          );
        }
        if (mmId && mmName) {
          rememberFieldOverride(
            fieldEdit.id,
            "microMarket",
            mmName,
            earlierFor("microMarket"),
          );
        }
      }
      closeFieldEdit();
    } catch (err) {
      console.error(err);
      alert("Failed to save.");
    } finally {
      setBusyId(null);
    }
  };

  const saveDraftReady =
    !!saveDraft &&
    (saveDraft.locations.some((chip) => chip.id || chip.name.trim()) ||
      !!saveDraft.locationDraft.name.trim()) &&
    !!(saveDraft.microMarket.id || saveDraft.microMarket.name.trim()) &&
    (saveDraft.forSale ||
      (!!(saveDraft.propertyName.id || saveDraft.propertyName.name.trim()) &&
        saveDraft.propertyTypeIds.length > 0 &&
        !!saveDraft.imageUrl.trim()));

  if (items.length === 0) {
    return (
      <div className="bg-gray-50/50 border border-dashed border-gray-200 rounded-2xl p-16 text-center text-sm text-gray-500">
        {mode === "unverified"
          ? "No unverified listings pending review."
          : "No verified (published) listings yet."}
      </div>
    );
  }

  const saveItem = saveOpen ? items.find((i) => i.id === saveOpen.id) : null;
  const originalPn = saveItem ? getHighlightedPropertyName(saveItem) : "";
  const originalLoc = saveItem ? getHighlightedLocationName(saveItem) : "";
  const originalMm = saveItem ? getHighlightedMicroMarketName(saveItem) : "";
  const saveTypeOptions = uniquePropertyTypes(propertyTypes);
  const saveTypeIds = saveDraft
    ? [...new Set(
        saveDraft.propertyTypeIds
          .map((id) =>
            canonicalPropertyTypeId(
              propertyTypes,
              id,
              saveItem?.property_type?.name,
            ),
          )
          .filter(Boolean),
      )]
    : [];
  const fieldEditItem = fieldEdit
    ? items.find((i) => i.id === fieldEdit.id)
    : null;
  const dialogItem =
    saveItem ||
    fieldEditItem ||
    (confirm ? items.find((row) => row.id === confirm.id) : null) ||
    null;
  const linkedCatalog = catalogLinkedToPropertyType(
    dialogItem,
    propertyTypes,
    propertyNames,
    locations,
    microMarkets,
  );
  const linkedTypeLabel = (() => {
    const name = dialogItem ? getListingPropertyTypeName(dialogItem) : "";
    return name && name !== "—" ? name : "";
  })();
  const catalogEmptyText = (field: string) =>
    linkedTypeLabel
      ? `No ${field} linked to ${linkedTypeLabel}.`
      : "No options found.";
  const fieldEditOriginal =
    fieldEditItem && fieldEdit
      ? getFieldOriginal(fieldEditItem, fieldEdit.field).name
      : "";
  const fieldEditMmId = (() => {
    if (!fieldEditItem) return "";
    const fromPick = getReviewPickId(fieldEditItem, "microMarket");
    if (fromPick) return fromPick;
    const fromSeed = getCatalogSavedId(fieldEditItem, "microMarket");
    if (fromSeed) return fromSeed;
    const overrideName =
      fieldOverrides[fieldEditItem.id]?.microMarket?.name?.trim() || "";
    if (overrideName) {
      const match = microMarkets.find(
        (row) => row.name.toLowerCase() === overrideName.toLowerCase(),
      );
      if (match?.id) return match.id;
    }
    return getHighlightedMicroMarketId(fieldEditItem);
  })();
  const fieldEditMmName =
    (fieldEditMmId &&
      microMarkets.find((row) => row.id === fieldEditMmId)?.name) ||
    (fieldEditItem
      ? getReviewPickName(fieldEditItem, "microMarket") ||
        getCatalogSavedName(fieldEditItem, "microMarket") ||
        fieldOverrides[fieldEditItem.id]?.microMarket?.name ||
        getHighlightedMicroMarketName(fieldEditItem)
      : "");
  const fieldEditOptions = fieldEdit
    ? fieldEdit.field === "propertyName"
      ? propertyNames
      : fieldEdit.field === "location"
        ? fieldEditMmId
          ? locations.filter((row) => row.microMarketId === fieldEditMmId)
          : []
        : microMarkets
    : [];
  const fieldEditReady =
    !!fieldEditPick?.id &&
    fieldEditOptions.some((o) => o.id === fieldEditPick.id);
  const rejectDialogItem =
    confirm?.action === "reject"
      ? items.find((row) => row.id === confirm.id) || null
      : null;
  const rejectNothingPending =
    !!rejectDialogItem &&
    !hasPendingRejectTargets(
      rejectDialogItem,
      getDraft(rejectDialogItem).forSale,
      fieldOverrides,
    );

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div
          ref={scrollerRef}
          className={`overflow-x-auto ${isGrabbing ? "cursor-grabbing" : "cursor-grab"} ${isGrabbing ? "select-none" : ""}`}
          onMouseDown={(e) => {
            if (e.button !== 0) return; // left click only
            const el = scrollerRef.current;
            if (!el) return;
            if (el.scrollWidth <= el.clientWidth) return; // no horizontal scroll to drag

            // Prevent text selection while dragging.
            e.preventDefault();
            const prevUserSelect = document.body.style.userSelect;
            document.body.style.userSelect = "none";

            setIsGrabbing(true);
            isGrabbingRef.current = true;
            dragStateRef.current = {
              startX: e.clientX,
              scrollLeft: el.scrollLeft,
            };

            const handleMouseMove = (ev: MouseEvent) => {
              const sc = scrollerRef.current;
              if (!sc) return;
              if (!isGrabbingRef.current) return;
              const dx = ev.clientX - dragStateRef.current.startX;
              sc.scrollLeft = dragStateRef.current.scrollLeft - dx;
            };

            const handleMouseUp = () => {
              isGrabbingRef.current = false;
              setIsGrabbing(false);
              document.body.style.userSelect = prevUserSelect;
              window.removeEventListener("mousemove", handleMouseMove);
              window.removeEventListener("mouseup", handleMouseUp);
            };

            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
          }}
        >
          <Table className="min-w-300">
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="w-10" />
                <TableHead className="min-w-35">User Details</TableHead>
                <TableHead className="min-w-45">Listing</TableHead>
                <TableHead className="min-w-40">Property name</TableHead>
                <TableHead className="min-w-40">Location</TableHead>
                <TableHead className="min-w-40">Micro market</TableHead>
                <TableHead className="min-w-50">Title display</TableHead>
                {mode === "unverified" ? (
                  <TableHead className="min-w-35">Save to DB</TableHead>
                ) : null}
                {mode === "unverified" ? (
                  <TableHead className="text-right min-w-45">
                    Approve / Reject
                  </TableHead>
                ) : mode === "verified" ? (
                  <TableHead className="text-right min-w-45">
                    Active / Inactive
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const draft = getDraft(item);
                const pnHighlight = item.highlights?.newPropertyName;
                const pnStatus =
                  pnHighlight && typeof pnHighlight === "object"
                    ? pnHighlight.status
                    : null;
                const pnRejected =
                  mode === "rejected" && pnStatus === "rejected";

                const locHighlight = item.highlights?.newLocation;
                const locStatus =
                  locHighlight && typeof locHighlight === "object"
                    ? locHighlight.status
                    : null;
                const locRejected =
                  mode === "rejected" && locStatus === "rejected";

                const pnCell = resolveCatalogCell(
                  item,
                  "propertyName",
                  fieldOverrides[item.id]?.propertyName,
                );
                const locCell = resolveCatalogCell(
                  item,
                  "location",
                  fieldOverrides[item.id]?.location,
                );
                const mmCell = resolveCatalogCell(
                  item,
                  "microMarket",
                  fieldOverrides[item.id]?.microMarket,
                );
                const pnRemark =
                  item.rejectRemarks?.propertyName ||
                  item.resubmission?.rejectRemarks?.propertyName;
                const locRemark =
                  item.rejectRemarks?.location ||
                  item.resubmission?.rejectRemarks?.location;
                const mmRemark =
                  item.rejectRemarks?.microMarket ||
                  item.resubmission?.rejectRemarks?.microMarket;
                const canToggle = canToggleForSaleTitle(item);
                const mmHighlight = item.highlights?.newMicroMarket;
                const mmStatus =
                  mmHighlight && typeof mmHighlight === "object"
                    ? mmHighlight.status
                    : null;
                const mmRejected =
                  mode === "rejected" && mmStatus === "rejected";
                const catalogSaved = hasCatalogSave(item);
                const canSave =
                  pnCell.pending || locCell.pending || mmCell.pending;
                const canEditField = mode === "unverified";
                const rowBusy = busyId === item.id;
                const expanded = !!expandedIds[item.id];
                const detailRows = expanded ? getListingDetailRows(item) : [];

                return (
                  <Fragment key={item.id}>
                    <TableRow
                      className={expanded ? "bg-gray-50/40" : undefined}
                    >
                      <TableCell
                        className={cn(
                          "align-top w-10 px-2",
                          newFirstCellClass(item.isNew),
                        )}
                      >
                        <button
                          type="button"
                          aria-label={
                            expanded
                              ? "Collapse listing details"
                              : "Expand listing details"
                          }
                          aria-expanded={expanded}
                          onClick={() => toggleExpanded(item.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                        >
                          {expanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      </TableCell>

                      <TableCell className="align-top text-sm text-gray-700">
                        <div className="flex items-start gap-1.5">
                          <NewTag show={item.isNew} />
                          <div>
                            {getSubmittedBy(item)}
                            {(item.created_at || item.createdAt) && (
                              <p className="text-[10px] text-gray-400 mt-1">
                                {new Date(
                                  item.created_at || item.createdAt!,
                                ).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <p className="font-medium text-gray-900">
                            {getListingPropertyTypeName(item)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {getListingCategoryName(item)}
                          </p>
                          <p className="text-xs text-gray-600">
                            {getListingPrice(item)}
                          </p>
                          {item.status && (
                            <Badge
                              variant="secondary"
                              className={
                                item.status === "published"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-amber-100 text-amber-700"
                              }
                            >
                              {String(item.status).replace(/_/g, " ")}
                            </Badge>
                          )}
                          {item.resubmitted ? (
                            <Badge
                              variant="secondary"
                              className="bg-blue-100 text-blue-800"
                            >
                              Resubmitted
                              {item.resubmission?.count && item.resubmission.count > 1
                                ? ` ×${item.resubmission.count}`
                                : ""}
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>

                      <TableCell className="align-top">
                        <CatalogValueCell
                          value={pnCell.value}
                          pending={pnCell.pending}
                          earlier={pnCell.earlier}
                          rejected={pnRejected}
                          remark={pnRemark}
                          canEdit={canEditField}
                          disabled={rowBusy}
                          onEdit={() => openFieldEdit(item, "propertyName")}
                        />
                      </TableCell>

                      <TableCell className="align-top">
                        <CatalogValueCell
                          value={locCell.value}
                          pending={locCell.pending}
                          earlier={locCell.earlier}
                          rejected={locRejected}
                          remark={locRemark}
                          canEdit={canEditField}
                          disabled={rowBusy}
                          onEdit={() => openFieldEdit(item, "location")}
                        />
                      </TableCell>

                      <TableCell className="align-top">
                        <CatalogValueCell
                          value={mmCell.value}
                          pending={mmCell.pending}
                          earlier={mmCell.earlier}
                          rejected={mmRejected}
                          remark={mmRemark}
                          canEdit={canEditField}
                          disabled={rowBusy}
                          onEdit={() => openFieldEdit(item, "microMarket")}
                        />
                      </TableCell>

                      <TableCell className="align-top">
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2">
                          <div>
                            <p className="text-xs font-medium text-gray-900">
                              {draft.forSale
                                ? "For Sale in Location"
                                : "Property name"}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              {draft.forSale
                                ? "App title uses location"
                                : "App title uses Property Name"}
                            </p>
                          </div>
                          <Switch
                            checked={draft.forSale}
                            disabled={!canToggle || rowBusy}
                            onCheckedChange={(v) =>
                              handleToggleForSale(item, !!v)
                            }
                          />
                        </div>
                      </TableCell>

                      {mode === "unverified" ? (
                        <TableCell className="align-top">
                          {catalogSaved ? (
                            <button
                              type="button"
                              title="Saved to DB — click to review or edit"
                              disabled={rowBusy}
                              onClick={() => openSaveDialog(item)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-green-600 hover:bg-green-50 disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-6 h-6" />
                            </button>
                          ) : canSave ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={rowBusy}
                              onClick={() => openSaveDialog(item)}
                            >
                              <Database className="w-3.5 h-3.5 mr-1" />
                              Save to DB
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-400">
                              Nothing pending
                            </span>
                          )}
                        </TableCell>
                      ) : null}

                      {mode === "unverified" ? (
                        <TableCell className="align-top text-right">
                          <div className="inline-flex gap-2">
                            {hasPendingRejectTargets(
                              item,
                              getDraft(item).forSale,
                              fieldOverrides,
                            ) ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                disabled={
                                  rowBusy || item.actions?.canReject === false
                                }
                                onClick={() => {
                                  setRejectRemarksDraft({
                                    rejectPropertyName: false,
                                    rejectLocation: false,
                                    rejectMicroMarket: false,
                                    propertyNameRemark: "",
                                    locationRemark: "",
                                    microMarketRemark: "",
                                  });
                                  setRejectCatalogDraft(
                                    buildSaveDraft(item, getDraft(item).forSale),
                                  );
                                  setConfirm({ id: item.id, action: "reject" });
                                }}
                              >
                                <X className="w-3.5 h-3.5 mr-1" />
                                Reject
                              </Button>
                            ) : null}
                            <Button
                              size="sm"
                              className="bg-primary text-white hover:bg-primary/90"
                              disabled={
                                rowBusy || item.actions?.canApprove === false
                              }
                              onClick={() =>
                                setConfirm({ id: item.id, action: "approve" })
                              }
                            >
                              {rowBusy ? (
                                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5 mr-1" />
                              )}
                              Approve
                            </Button>
                          </div>
                        </TableCell>
                      ) : mode === "verified" ? (
                        <TableCell className="align-top text-right">
                          <div className="flex items-center justify-end gap-3">
                            <span className="text-xs text-gray-500">
                              {getIsActive(item) ? "Active" : "Inactive"}
                            </span>
                            <Switch
                              checked={getIsActive(item)}
                              disabled={
                                rowBusy ||
                                item.actions?.canToggleActive === false ||
                                !onToggleActive
                              }
                              onCheckedChange={(checked) =>
                                handleToggleActive(item, !!checked)
                              }
                            />
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>

                    {expanded && (
                      <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                        <TableCell colSpan={colCount} className="px-4 py-4">
                          <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <div className="mb-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Listing details
                              </p>
                            </div>
                            {detailRows.length === 0 ? (
                              <p className="text-sm text-gray-400">
                                No extra form fields on this listing.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
                                {detailRows.map((row) => (
                                  <div
                                    key={row.key}
                                    className="text-sm min-w-0"
                                  >
                                    <span className="text-gray-400">
                                      {row.label}:{" "}
                                    </span>
                                    <span className="text-gray-800 wrap-break-word">
                                      {row.value}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <p className="mt-3 text-[11px] text-gray-400 font-mono truncate">
                              ID: {item.id}
                            </p>
                            {(() => {
                              const logs = Array.isArray(item.reviewLogs)
                                ? item.reviewLogs
                                : Array.isArray(item.review_logs)
                                  ? item.review_logs
                                  : [];
                              if (!logs.length) return null;
                              return (
                                <div className="mt-4 border-t border-gray-100 pt-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                                    Approve / reject log
                                  </p>
                                  <ul className="space-y-1.5">
                                    {logs.map((log, idx) => {
                                      const row = log as {
                                        action?: string;
                                        adminName?: string;
                                        at?: string;
                                      };
                                      return (
                                        <li
                                          key={`${row.at || idx}-${row.action || idx}`}
                                          className="text-sm text-gray-700"
                                        >
                                          <span className="font-medium capitalize">
                                            {row.action || "update"}
                                          </span>
                                          {" · "}
                                          {row.adminName || "Admin"}
                                          {row.at ? ` · ${formatReviewLogAt(row.at)}` : ""}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              );
                            })()}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog
        open={!!saveOpen}
        onOpenChange={(open) => {
          if (!open && !busyId) {
            setSaveOpen(null);
            setSaveDraft(null);
          }
        }}
      >
        <DialogContent className="max-w-xl sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Save to DB</DialogTitle>
            <DialogDescription>
              catalog only — the user post stays unchanged. Left is original,
              right is what will be saved (editable). Picking a catalog property
              name locks micro market to that name’s linked market.
            </DialogDescription>
          </DialogHeader>

          {saveDraft && (
            <div className="space-y-4 py-2">
              {!saveDraft.forSale ? (
                <>
                <CompareField
                  label="Property name"
                  original={originalPn}
                  right={
                    <CatalogPickSelect
                      options={propertyNames}
                      value={saveDraft.propertyName}
                      loading={catalogLoading}
                      emptyText="No property names found."
                      placeholder="Select or type property name"
                      onChange={(next) =>
                        setSaveDraft((prev) => {
                          if (!prev) return prev;
                          const opt = propertyNames.find(
                            (o) => o.id && o.id === next.id,
                          );
                          if (!opt) {
                            const nextLocations = prev.locations.filter((chip) => !chip.locked);
                            return {
                              ...prev,
                              propertyName: next,
                              locations: nextLocations,
                              location: primaryLocation(nextLocations),
                              mmLocked: false,
                            };
                          }
                          const locked = chipsFromPropertyName(opt, locations);
                          const extra = prev.locations.filter(
                            (chip) =>
                              !chip.locked &&
                              !locked.some((row) => row.id && row.id === chip.id),
                          );
                          const nextLocations = locked.length
                            ? [...locked, ...extra]
                            : prev.locations;
                          const mm = linkedMicroMarket(opt, microMarkets);
                          const typeIds = [
                            ...(opt.propertyTypeIds || []),
                            ...(opt.propertyTypeId ? [opt.propertyTypeId] : []),
                          ]
                            .map((id) =>
                              canonicalPropertyTypeId(propertyTypes, id, opt.propertyTypeName),
                            )
                            .filter(Boolean);
                          return {
                            ...prev,
                            propertyName: next,
                            propertyTypeIds: typeIds.length ? [...new Set(typeIds)] : prev.propertyTypeIds,
                            imageUrl: opt.imageUrl || prev.imageUrl,
                            microMarket: mm || prev.microMarket,
                            locations: nextLocations,
                            location: primaryLocation(nextLocations),
                            mmLocked: !!mm,
                          };
                        })
                      }
                    />
                  }
                />
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Property types <span className="text-red-500">*</span>
                  </label>
                  <MultiSelect
                    options={saveTypeOptions.map((t) => ({ value: t.id, label: t.name }))}
                    values={saveTypeIds}
                    onChange={(ids) =>
                      setSaveDraft((prev) =>
                        prev ? { ...prev, propertyTypeIds: ids } : prev,
                      )
                    }
                    placeholder="Select Apartment, SCO, Plot…"
                    emptyText="Add property types under Agent Listing Attributes first."
                  />
                </div>
                <ImageUrlOrUpload
                  label="Image URL"
                  value={saveDraft.imageUrl}
                  onChange={(url) =>
                    setSaveDraft((prev) =>
                      prev ? { ...prev, imageUrl: url } : prev,
                    )
                  }
                  kind="property_name"
                  required
                  placeholder="https://… (share / OG image)"
                  hint="Paste HTTPS URL or upload. Used as property-name share image."
                />
                </>
              ) : null}

              <CompareField
                label="Micro market"
                original={originalMm}
                right={
                  <CatalogPickSelect
                    options={
                      saveDraft.mmLocked && saveDraft.microMarket.id
                        ? microMarkets.filter((row) => row.id === saveDraft.microMarket.id)
                        : microMarkets
                    }
                    value={saveDraft.microMarket}
                    disabled={saveDraft.mmLocked}
                    allowCreate={!saveDraft.mmLocked}
                    loading={catalogLoading}
                    emptyText="No micro markets found."
                    placeholder={
                      saveDraft.mmLocked
                        ? "Locked to property name"
                        : "Select or type micro market"
                    }
                    onChange={(next) =>
                      setSaveDraft((prev) => {
                        if (!prev || prev.mmLocked) return prev;
                        const locked = prev.locations.filter((chip) => chip.locked);
                        const extra = prev.locations.filter((chip) => {
                          if (chip.locked) return false;
                          if (!next.id || !chip.id) return true;
                          const loc = locations.find((row) => row.id === chip.id);
                          return !loc?.microMarketId || loc.microMarketId === next.id;
                        });
                        const nextLocations = [...locked, ...extra];
                        return {
                          ...prev,
                          microMarket: next,
                          locations: nextLocations,
                          location: primaryLocation(nextLocations),
                        };
                      })
                    }
                  />
                }
              />

              <CompareField
                label="Locations"
                original={originalLoc}
                right={
                  <div className="space-y-2">
                    {saveDraft.locations.length ? (
                      <div className="flex flex-wrap gap-1">
                        {saveDraft.locations.map((chip, idx) => (
                          <span
                            key={`${chip.id || chip.name}-${idx}`}
                            className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-800"
                          >
                            {chip.name}
                            {chip.locked ? (
                              <span className="text-[10px] text-gray-400">locked</span>
                            ) : (
                              <button
                                type="button"
                                className="text-gray-400 hover:text-gray-700"
                                onClick={() =>
                                  setSaveDraft((prev) => {
                                    if (!prev) return prev;
                                    const nextLocations = prev.locations.filter(
                                      (_, i) => i !== idx,
                                    );
                                    return {
                                      ...prev,
                                      locations: nextLocations,
                                      location: primaryLocation(nextLocations),
                                      mmLocked:
                                        !!prev.propertyName.id ||
                                        (nextLocations.some((row) => {
                                          const loc = locations.find((l) => l.id === row.id);
                                          return !!loc?.microMarketId;
                                        }) &&
                                          prev.mmLocked),
                                    };
                                  })
                                }
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <CatalogPickSelect
                      options={(saveDraft.microMarket.id
                        ? locations.filter(
                            (row) => row.microMarketId === saveDraft.microMarket.id,
                          )
                        : locations
                      ).filter(
                        (row) => !saveDraft.locations.some((chip) => chip.id === row.id),
                      )}
                      value={saveDraft.locationDraft}
                      loading={catalogLoading}
                      emptyText={
                        saveDraft.microMarket.id
                          ? "No locations in this micro market."
                          : "No locations found."
                      }
                      placeholder="Select or add location"
                      onAdd={(name) =>
                        setSaveDraft((prev) =>
                          prev
                            ? addLocationChip(
                                prev,
                                { id: "", name },
                                locations,
                                microMarkets,
                              )
                            : prev,
                        )
                      }
                      onChange={(next) =>
                        setSaveDraft((prev) => {
                          if (!prev) return prev;
                          if (next.id) {
                            return addLocationChip(prev, next, locations, microMarkets);
                          }
                          return { ...prev, locationDraft: next };
                        })
                      }
                    />
                  </div>
                }
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={!!busyId}
              onClick={() => {
                setSaveOpen(null);
                setSaveDraft(null);
              }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-primary text-white hover:bg-primary/90"
              disabled={!!busyId || !saveDraftReady}
              onClick={handleSaveToDb}
            >
              {busyId && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!fieldEdit}
        onOpenChange={(open) => {
          if (!open && !busyId) closeFieldEdit();
        }}
      >
        <DialogContent className="max-w-xl sm:max-w-xl overflow-visible">
          <DialogHeader>
            <DialogTitle>
              Edit {fieldEdit ? FIELD_LABEL[fieldEdit.field] : ""}
            </DialogTitle>
            <DialogDescription>
              Left is the current value. Right: pick an approved catalog name.
              {fieldEdit?.field === "propertyName"
                ? " Choosing a property name also overrides Location and Micro market from that name’s catalog links."
                : " Custom names that are not in the list stay on the left until you choose one from DB or reject the listing."}
            </DialogDescription>
          </DialogHeader>

          {fieldEdit && fieldEditPick && (
            <div className="py-2 space-y-2">
              <CompareField
                label={FIELD_LABEL[fieldEdit.field]}
                original={fieldEditOriginal}
                leftLabel="Current"
                rightLabel="Select from DB"
                right={
                  <CatalogPickSelect
                    options={fieldEditOptions}
                    value={fieldEditPick}
                    loading={catalogLoading}
                    allowCreate={false}
                    emptyText={
                      fieldEdit.field === "location"
                        ? fieldEditMmId
                          ? `No locations in ${fieldEditMmName || "this micro market"}.`
                          : "Set a micro market first."
                        : "No options found."
                    }
                    placeholder={FIELD_PLACEHOLDER[fieldEdit.field]}
                    onChange={setFieldEditPick}
                  />
                }
              />
              {fieldEdit.field === "location" && fieldEditMmName ? (
                <p className="text-xs text-gray-500">
                  Showing locations for micro market: {fieldEditMmName}
                </p>
              ) : null}
              {fieldEdit.field === "location" && !fieldEditMmId ? (
                <p className="text-xs text-amber-700">
                  Pick / save a micro market on this listing first. Location
                  options are limited to that market.
                </p>
              ) : null}
              {fieldEditOriginal &&
              !fieldEditOptions.some(
                (o) => o.name.toLowerCase() === fieldEditOriginal.toLowerCase(),
              ) ? (
                <p className="text-xs text-amber-700">
                  “{fieldEditOriginal}” is not in the catalog. Pick an approved
                  name from DB, or reject this listing with a remark.
                </p>
              ) : null}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={!!busyId}
              onClick={closeFieldEdit}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-primary text-white hover:bg-primary/90"
              disabled={!!busyId || !fieldEditReady}
              onClick={handleFieldEditSave}
            >
              {busyId && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!confirm}
        onOpenChange={(open) => {
          if (!open && !busyId) {
            setConfirm(null);
            setRejectCatalogDraft(null);
          }
        }}
      >
        <DialogContent className="max-w-xl sm:max-w-xl overflow-visible">
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              {confirm?.action === "reject"
                ? "Select what to reject and add a remark for each. Listing stays off search (draft). For location, pick micro market first, then search locations in that market."
                : "Listing will go live (published). Save to DB is separate — this will not save Property Name/location to catalog."}
            </DialogDescription>
          </DialogHeader>

          {confirm?.action === "reject" &&
            (() => {
              const item = items.find((i) => i.id === confirm?.id);
              const forSale = item ? getDraft(item).forSale : false;
              const pnPending = item ? isPropertyNamePending(item) : false;
              const locPending = item ? isLocationPending(item) : false;
              const mmPending = item ? isMicroMarketPending(item) : false;
              const showPn =
                !!item &&
                !forSale &&
                pnPending &&
                !isAppliedFromCatalog(item, "propertyName", fieldOverrides);
              const showLoc =
                !!item &&
                locPending &&
                !isAppliedFromCatalog(item, "location", fieldOverrides);
              const showMm =
                !!item &&
                mmPending &&
                !isAppliedFromCatalog(item, "microMarket", fieldOverrides);

              const anySelected =
                !!rejectRemarksDraft.rejectPropertyName ||
                !!rejectRemarksDraft.rejectLocation ||
                !!rejectRemarksDraft.rejectMicroMarket;

              const requiredMissing =
                (rejectRemarksDraft.rejectPropertyName &&
                  !rejectRemarksDraft.propertyNameRemark?.trim()) ||
                (rejectRemarksDraft.rejectLocation &&
                  !rejectRemarksDraft.locationRemark?.trim()) ||
                (rejectRemarksDraft.rejectMicroMarket &&
                  !rejectRemarksDraft.microMarketRemark?.trim()) ||
                !anySelected;

              const rejectMmId = rejectCatalogDraft?.microMarket.id || "";
              // Full PN catalog — do not hide options behind the seeded micro market.
              const rejectPnOptions = (() => {
                const pick = rejectCatalogDraft?.propertyName;
                if (
                  pick?.id &&
                  !propertyNames.some((row) => row.id === pick.id)
                ) {
                  return [
                    { id: pick.id, name: pick.name } as CatalogOption,
                    ...propertyNames,
                  ];
                }
                return propertyNames;
              })();
              // Location: pick micro market first, then search locations in that market.
              const rejectLocOptions = (() => {
                const base = rejectMmId
                  ? locations.filter((row) => row.microMarketId === rejectMmId)
                  : [];
                const pick = rejectCatalogDraft?.location;
                if (
                  pick?.id &&
                  !base.some((row) => row.id === pick.id)
                ) {
                  return [
                    { id: pick.id, name: pick.name } as CatalogOption,
                    ...base,
                  ];
                }
                return base;
              })();

              const applyRejectPick = (field: CatalogField, next: CatalogPick) => {
                setRejectCatalogDraft((prev) => {
                  if (!prev) return prev;
                  if (field === "microMarket") {
                    const locStillValid =
                      !next.id ||
                      !prev.location.id ||
                      locations.some(
                        (row) =>
                          row.id === prev.location.id &&
                          row.microMarketId === next.id,
                      );
                    return {
                      ...prev,
                      microMarket: next,
                      location: locStillValid
                        ? prev.location
                        : { id: "", name: "" },
                    };
                  }
                  if (field === "location") {
                    const loc = locations.find((row) => row.id === next.id);
                    const mmId = loc?.microMarketId || prev.microMarket.id || "";
                    const mm = mmId
                      ? microMarkets.find((row) => row.id === mmId)
                      : null;
                    return {
                      ...prev,
                      location: next,
                      microMarket: mm
                        ? { id: mm.id, name: mm.name }
                        : prev.microMarket,
                    };
                  }
                  return { ...prev, [field]: next };
                });
              };

              const rejectPick = (field: CatalogField, options: CatalogOption[]) =>
                rejectCatalogDraft ? (
                  <CatalogPickSelect
                    options={options}
                    value={rejectCatalogDraft[field]}
                    loading={catalogLoading}
                    allowCreate={false}
                    emptyText={
                      field === "location" && !rejectMmId
                        ? "Select a micro market first."
                        : "No options found."
                    }
                    placeholder={`Select ${FIELD_LABEL[field].toLowerCase()}`}
                    onChange={(next) => applyRejectPick(field, next)}
                  />
                ) : null;

              const remarkInput = (
                field: "propertyNameRemark" | "locationRemark" | "microMarketRemark",
                placeholder: string,
              ) => (
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                    Remark
                  </p>
                  <Input
                    value={rejectRemarksDraft[field] || ""}
                    onChange={(e) =>
                      setRejectRemarksDraft((prev) => ({
                        ...prev,
                        [field]: e.target.value,
                      }))
                    }
                    placeholder={placeholder}
                  />
                </div>
              );

              return (
                <div className="space-y-3 pt-2">
                  {showPn && item && (
                    <div className="rounded-xl border border-gray-200 p-3 space-y-3">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <Checkbox
                          checked={!!rejectRemarksDraft.rejectPropertyName}
                          onCheckedChange={(v) =>
                            setRejectRemarksDraft((prev) => ({
                              ...prev,
                              rejectPropertyName: !!v,
                            }))
                          }
                          className="mt-0.5"
                        />
                        <span className="text-sm font-medium text-gray-900">
                          Reject property name
                        </span>
                      </label>
                      <CompareField
                        label="Property name"
                        original={getHighlightedPropertyName(item)}
                        right={rejectPick("propertyName", rejectPnOptions)}
                      />
                      {rejectRemarksDraft.rejectPropertyName &&
                        remarkInput(
                          "propertyNameRemark",
                          "Enter PN reject remark",
                        )}
                    </div>
                  )}

                  {showLoc && item && (
                    <div className="rounded-xl border border-gray-200 p-3 space-y-3">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <Checkbox
                          checked={!!rejectRemarksDraft.rejectLocation}
                          onCheckedChange={(v) =>
                            setRejectRemarksDraft((prev) => ({
                              ...prev,
                              rejectLocation: !!v,
                            }))
                          }
                          className="mt-0.5"
                        />
                        <span className="text-sm font-medium text-gray-900">
                          Reject location
                        </span>
                      </label>
                      <CompareField
                        label="Location"
                        original={getHighlightedLocationName(item)}
                        right={
                          rejectCatalogDraft ? (
                            <div className="space-y-2">
                              <div className="space-y-1">
                                <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                  Micro market
                                </p>
                                {rejectPick("microMarket", microMarkets)}
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] uppercase tracking-wide text-gray-500">
                                  Location
                                </p>
                                {rejectPick("location", rejectLocOptions)}
                              </div>
                            </div>
                          ) : null
                        }
                      />
                      {rejectRemarksDraft.rejectLocation &&
                        remarkInput(
                          "locationRemark",
                          "Enter Location reject remark",
                        )}
                    </div>
                  )}

                  {showMm && item && (
                    <div className="rounded-xl border border-gray-200 p-3 space-y-3">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <Checkbox
                          checked={!!rejectRemarksDraft.rejectMicroMarket}
                          onCheckedChange={(v) =>
                            setRejectRemarksDraft((prev) => ({
                              ...prev,
                              rejectMicroMarket: !!v,
                            }))
                          }
                          className="mt-0.5"
                        />
                        <span className="text-sm font-medium text-gray-900">
                          Reject micro market
                        </span>
                      </label>
                      {showLoc ? (
                        <p className="text-xs text-gray-500">
                          Micro market is selected under Reject location (above).
                        </p>
                      ) : (
                        <CompareField
                          label="Micro market"
                          original={getHighlightedMicroMarketName(item)}
                          right={rejectPick("microMarket", microMarkets)}
                        />
                      )}
                      {rejectRemarksDraft.rejectMicroMarket &&
                        remarkInput(
                          "microMarketRemark",
                          "Enter MM reject remark",
                        )}
                    </div>
                  )}

                  {!showPn && !showLoc && !showMm && (
                    <p className="text-xs text-amber-700">
                      Nothing pending to reject on this listing.
                    </p>
                  )}

                  {requiredMissing && (showPn || showLoc || showMm) && (
                    <p className="text-xs text-red-600">
                      Select at least one option and fill its reject remark.
                    </p>
                  )}
                </div>
              );
            })()}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={!!busyId}
              onClick={() => {
                setConfirm(null);
                setRejectCatalogDraft(null);
              }}
            >
              {rejectNothingPending ? "Close" : "Cancel"}
            </Button>
            {rejectNothingPending ? null : (
              <Button
                className={`flex-1 ${
                  confirm?.action === "reject"
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-primary hover:bg-primary/90 text-white"
                }`}
                disabled={
                  !!busyId ||
                  (confirm?.action === "reject" &&
                    (() => {
                      const anySelected =
                        !!rejectRemarksDraft.rejectPropertyName ||
                        !!rejectRemarksDraft.rejectLocation ||
                        !!rejectRemarksDraft.rejectMicroMarket;
                      return (
                        !anySelected ||
                        (!!rejectRemarksDraft.rejectPropertyName &&
                          !rejectRemarksDraft.propertyNameRemark?.trim()) ||
                        (!!rejectRemarksDraft.rejectLocation &&
                          !rejectRemarksDraft.locationRemark?.trim()) ||
                        (!!rejectRemarksDraft.rejectMicroMarket &&
                          !rejectRemarksDraft.microMarketRemark?.trim())
                      );
                    })())
                }
                onClick={handleConfirmAction}
              >
                {busyId && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {confirm?.action === "reject" ? "Reject" : "Confirm"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
