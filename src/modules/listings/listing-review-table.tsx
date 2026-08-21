"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { locationService } from "@/services/location.service";
import { listingConfigService } from "@/services/listing-config.service";
import {
  canToggleForSaleTitle,
  getCatalogOriginalName,
  getCatalogSavedId,
  getCatalogSavedName,
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
  imageUrl?: string;
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

type SaveDraft = {
  forSale: boolean;
  propertyName: CatalogPick;
  location: CatalogPick;
  microMarket: CatalogPick;
  propertyTypeId: string;
  imageUrl: string;
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
      return {
        id: x.id as string,
        name: x.name as string,
        status: typeof x.status === "string" ? x.status : null,
        propertyTypeId:
          pickStr(x.property_type_id, x.propertyTypeId, pt?.id) || undefined,
        imageUrl: pickStr(x.image_url, x.imageUrl) || undefined,
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

function pickFromCatalog(
  item: ListingReviewItem,
  field: CatalogField,
  originalName: string,
  originalId: string,
): CatalogPick {
  const savedId = getCatalogSavedId(item, field);
  const savedName = getCatalogSavedName(item, field);
  if (savedId || savedName) {
    return { id: savedId, name: savedName || originalName };
  }
  return { id: originalId, name: originalName };
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

function resolveCatalogCell(
  item: ListingReviewItem,
  field: CatalogField,
  override?: FieldOverride,
): { value: string; pending: boolean; earlier: string } {
  const original = getFieldOriginal(item, field).name;
  const savedName = override?.name || getCatalogSavedName(item, field);
  const earlierRaw =
    override?.earlier ||
    getCatalogOriginalName(item, field) ||
    (savedName ? original : "");
  const value = savedName || original || "—";
  const earlier =
    savedName && earlierRaw && earlierRaw !== savedName ? earlierRaw : "";
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
              : earlier
                ? "inline-flex rounded-md bg-green-50 border border-green-200 px-2 py-1 text-sm font-semibold text-green-900"
                : pending
                  ? "inline-flex rounded-md bg-amber-50 border border-amber-200 px-2 py-1 text-sm font-semibold text-amber-900"
                  : "text-sm text-gray-800"
          }
        >
          {value}
        </span>
        {rejected ? (
          <p className="text-[10px] text-red-700 mt-1">
            {remark || "Rejected"}
          </p>
        ) : earlier ? (
          <p className="text-[10px] text-gray-500 mt-1">Earlier: {earlier}</p>
        ) : pending ? (
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
  allowCreate = true,
  onChange,
}: {
  options: CatalogOption[];
  value: CatalogPick;
  disabled?: boolean;
  loading?: boolean;
  placeholder: string;
  allowCreate?: boolean;
  onChange?: (next: CatalogPick) => void;
}) {
  const selectOptions = toSelectOptions(options);
  const known = options.some((o) => o.id === value.id);
  const selectValue = known ? value.id : "";
  const canCreate = !disabled && allowCreate;

  return (
    <SearchableSelect
      options={selectOptions}
      value={selectValue}
      selectedLabel={value.name}
      disabled={disabled}
      loading={loading}
      allowCreate={canCreate}
      editable={canCreate}
      placeholder={placeholder}
      emptyText="No options found."
      onValueChange={(id) => {
        if (!onChange) return;
        const found = options.find((o) => o.id === id);
        onChange({ id: id || "", name: found?.name || "" });
      }}
      onInputChange={
        canCreate ? (name) => onChange?.({ id: "", name }) : undefined
      }
      onCreate={canCreate ? (name) => onChange?.({ id: "", name }) : undefined}
    />
  );
}

function buildRowDraft(item: ListingReviewItem): RowDraft {
  return { forSale: isForSaleTitleEnabled(item) };
}

function buildSaveDraft(item: ListingReviewItem, forSale: boolean): SaveDraft {
  return {
    forSale,
    propertyName: pickFromCatalog(
      item,
      "propertyName",
      getHighlightedPropertyName(item),
      typeof item.property_name?.id === "string" ? item.property_name.id : "",
    ),
    location: pickFromCatalog(
      item,
      "location",
      getHighlightedLocationName(item),
      typeof item.location?.id === "string" ? item.location.id : "",
    ),
    microMarket: pickFromCatalog(
      item,
      "microMarket",
      getHighlightedMicroMarketName(item),
      getHighlightedMicroMarketId(item),
    ),
    propertyTypeId: pickStr(
      item.property_name?.property_type_id,
      item.property_type?.id,
    ),
    imageUrl: pickStr(item.property_name?.image_url),
  };
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

  const colCount = mode === "unverified" || mode === "verified" ? 9 : 7;

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
    setFieldEditPick(pickFromCatalog(item, field, original.name, original.id));
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

  useEffect(() => {
    if (!catalogDialogOpen) return;
    let cancelled = false;
    const load = async () => {
      setCatalogLoading(true);
      try {
        const [mm, locs, pns, pts] = await Promise.all([
          locationService.getMicroMarkets(),
          locationService.getLocations(),
          locationService.getPropertyNames(),
          listingConfigService.getPropertyTypes().catch(() => []),
        ]);
        if (cancelled) return;
        setMicroMarkets(asCatalogOptions(mm));
        setLocations(asCatalogOptions(locs));
        setPropertyNames(asCatalogOptions(pns));
        setPropertyTypes(asList(pts));
      } catch (err) {
        console.error(err);
        if (cancelled) return;
        setMicroMarkets([]);
        setLocations([]);
        setPropertyNames([]);
        setPropertyTypes([]);
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [catalogDialogOpen]);

  useEffect(() => {
    if (!saveOpen) return;
    const item = items.find((i) => i.id === saveOpen.id);
    setSaveDraft((prev) => {
      if (!prev || prev.forSale) return prev;
      const opt = propertyNames.find(
        (o) => o.id && o.id === prev.propertyName.id,
      );
      const nextType =
        canonicalPropertyTypeId(
          propertyTypes,
          prev.propertyTypeId || opt?.propertyTypeId || item?.property_type?.id,
          item?.property_type?.name,
        ) || prev.propertyTypeId;
      const nextImage =
        prev.imageUrl || opt?.imageUrl || pickStr(item?.property_name?.image_url);
      if (nextType === prev.propertyTypeId && nextImage === prev.imageUrl) {
        return prev;
      }
      return { ...prev, propertyTypeId: nextType, imageUrl: nextImage };
    });
  }, [propertyTypes, propertyNames, saveOpen?.id, items, saveOpen]);

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

    const locReady = !!(
      saveDraft.location.id || saveDraft.location.name.trim()
    );
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
    if (!saveDraft.forSale && (!saveDraft.propertyTypeId || !saveDraft.imageUrl.trim())) {
      alert("Property type and image URL are required when saving a property name.");
      return;
    }
    if (!mmReady) {
      alert("Select or enter a micro market.");
      return;
    }

    setBusyId(saveOpen.id);
    try {
      const payload: SaveListingCatalogPayload = saveDraft.forSale
        ? {
            savePropertyName: false,
            saveLocation: true,
            saveMicroMarket: true,
            locationId: saveDraft.location.id || undefined,
            locationName: saveDraft.location.name.trim() || undefined,
            microMarketId: saveDraft.microMarket.id || undefined,
            microMarketName: saveDraft.microMarket.name.trim() || undefined,
          }
        : {
            savePropertyName: true,
            saveLocation: true,
            saveMicroMarket: true,
            propertyNameId: saveDraft.propertyName.id || undefined,
            propertyName: saveDraft.propertyName.name.trim() || undefined,
            propertyTypeId: saveDraft.propertyTypeId || undefined,
            propertyNameImageUrl: saveDraft.imageUrl.trim() || undefined,
            locationId: saveDraft.location.id || undefined,
            locationName: saveDraft.location.name.trim() || undefined,
            microMarketId: saveDraft.microMarket.id || undefined,
            microMarketName: saveDraft.microMarket.name.trim() || undefined,
          };
      await onSaveToDb(saveOpen.id, payload);
      const originalItem = items.find((i) => i.id === saveOpen.id);
      if (originalItem && saveDraft) {
        if (!saveDraft.forSale) {
          rememberFieldOverride(
            saveOpen.id,
            "propertyName",
            saveDraft.propertyName.name.trim(),
            getHighlightedPropertyName(originalItem),
          );
        }
        rememberFieldOverride(
          saveOpen.id,
          "location",
          saveDraft.location.name.trim(),
          getHighlightedLocationName(originalItem),
        );
        rememberFieldOverride(
          saveOpen.id,
          "microMarket",
          saveDraft.microMarket.name.trim(),
          getHighlightedMicroMarketName(originalItem),
        );
      }
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
    if (
      !fieldEditPick.id ||
      !(
        fieldEdit.field === "propertyName"
          ? propertyNames
          : fieldEdit.field === "location"
            ? locations
            : microMarkets
      ).some((o) => o.id === fieldEditPick.id)
    ) {
      alert(
        `Select a ${FIELD_LABEL[fieldEdit.field].toLowerCase()} from the dropdown.`,
      );
      return;
    }

    const payload: SaveListingCatalogPayload =
      fieldEdit.field === "propertyName"
        ? {
            savePropertyName: true,
            saveLocation: false,
            saveMicroMarket: false,
            propertyNameId: fieldEditPick.id,
            propertyName: fieldEditPick.name.trim() || undefined,
          }
        : fieldEdit.field === "location"
          ? {
              savePropertyName: false,
              saveLocation: true,
              saveMicroMarket: false,
              locationId: fieldEditPick.id,
              locationName: fieldEditPick.name.trim() || undefined,
            }
          : {
              savePropertyName: false,
              saveLocation: false,
              saveMicroMarket: true,
              microMarketId: fieldEditPick.id,
              microMarketName: fieldEditPick.name.trim() || undefined,
            };

    setBusyId(fieldEdit.id);
    try {
      await onSaveToDb(fieldEdit.id, payload);
      const item = items.find((i) => i.id === fieldEdit.id);
      rememberFieldOverride(
        fieldEdit.id,
        fieldEdit.field,
        fieldEditPick.name.trim(),
        item
          ? getCatalogOriginalName(item, fieldEdit.field) ||
              getFieldOriginal(item, fieldEdit.field).name
          : "",
      );
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
    !!(saveDraft.location.id || saveDraft.location.name.trim()) &&
    !!(saveDraft.microMarket.id || saveDraft.microMarket.name.trim()) &&
    (saveDraft.forSale ||
      (!!(saveDraft.propertyName.id || saveDraft.propertyName.name.trim()) &&
        !!saveDraft.propertyTypeId &&
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
  const saveTypeId = saveDraft
    ? canonicalPropertyTypeId(
        propertyTypes,
        saveDraft.propertyTypeId,
        saveItem?.property_type?.name,
      )
    : "";
  const saveTypeName =
    saveTypeOptions.find((t) => t.id === saveTypeId)?.name ||
    propertyTypes.find((t) => t.id === saveDraft?.propertyTypeId)?.name ||
    saveItem?.property_type?.name ||
    "";
  const fieldEditItem = fieldEdit
    ? items.find((i) => i.id === fieldEdit.id)
    : null;
  const fieldEditOriginal =
    fieldEditItem && fieldEdit
      ? getFieldOriginal(fieldEditItem, fieldEdit.field).name
      : "";
  const fieldEditOptions = fieldEdit
    ? fieldEdit.field === "propertyName"
      ? propertyNames
      : fieldEdit.field === "location"
        ? locations
        : microMarkets
    : [];
  const fieldEditReady =
    !!fieldEditPick?.id &&
    fieldEditOptions.some((o) => o.id === fieldEditPick.id);

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
                <TableHead className="min-w-45">Listing</TableHead>
                <TableHead className="min-w-40">Property name</TableHead>
                <TableHead className="min-w-40">Location</TableHead>
                <TableHead className="min-w-40">Micro market</TableHead>
                <TableHead className="min-w-50">Title display</TableHead>
                {mode !== "rejected" ? (
                  <TableHead className="min-w-35">Save to DB</TableHead>
                ) : null}
                <TableHead className="min-w-35">Submitted by</TableHead>
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
                const pnRemark = item.rejectRemarks?.propertyName;
                const locRemark = item.rejectRemarks?.location;
                const mmRemark = item.rejectRemarks?.microMarket;
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
                const canEditField = mode !== "rejected";
                const rowBusy = busyId === item.id;
                const expanded = !!expandedIds[item.id];
                const detailRows = expanded ? getListingDetailRows(item) : [];

                return (
                  <Fragment key={item.id}>
                    <TableRow
                      className={expanded ? "bg-gray-50/40" : undefined}
                    >
                      <TableCell className="align-top w-10 px-2">
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

                      {mode !== "rejected" ? (
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

                      <TableCell className="align-top text-sm text-gray-700">
                        {getSubmittedBy(item)}
                        {(item.created_at || item.createdAt) && (
                          <p className="text-[10px] text-gray-400 mt-1">
                            {new Date(
                              item.created_at || item.createdAt!,
                            ).toLocaleString()}
                          </p>
                        )}
                      </TableCell>

                      {mode === "unverified" ? (
                        <TableCell className="align-top text-right">
                          <div className="inline-flex gap-2">
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
              Catalog only — the user post stays unchanged. Left is original,
              right is what will be saved (editable).
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
                      placeholder="Select or type property name"
                      onChange={(next) =>
                        setSaveDraft((prev) => {
                          if (!prev) return prev;
                          const opt = propertyNames.find(
                            (o) => o.id && o.id === next.id,
                          );
                          return {
                            ...prev,
                            propertyName: next,
                            propertyTypeId:
                              opt?.propertyTypeId || prev.propertyTypeId,
                            imageUrl: opt?.imageUrl || prev.imageUrl,
                          };
                        })
                      }
                    />
                  }
                />
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Property type <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={saveTypeId || undefined}
                    onValueChange={(v) =>
                      setSaveDraft((prev) =>
                        prev ? { ...prev, propertyTypeId: v ?? "" } : prev,
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      {saveTypeName ? (
                        <span className="truncate">{saveTypeName}</span>
                      ) : (
                        <SelectValue placeholder="Select Apartment, SCO, Plot…" />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {saveTypeOptions.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          Add property types under Agent Listing Attributes first.
                        </div>
                      ) : (
                        saveTypeOptions.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Image URL <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={saveDraft.imageUrl}
                    onChange={(e) =>
                      setSaveDraft((prev) =>
                        prev ? { ...prev, imageUrl: e.target.value } : prev,
                      )
                    }
                    placeholder="https://… (share / OG image)"
                  />
                  {saveDraft.imageUrl.trim() ? (
                    <img
                      src={saveDraft.imageUrl.trim()}
                      alt=""
                      className="h-16 w-28 object-cover rounded border bg-gray-50"
                    />
                  ) : null}
                </div>
                </>
              ) : null}

              <CompareField
                label="Location"
                original={originalLoc}
                right={
                  <CatalogPickSelect
                    options={locations}
                    value={saveDraft.location}
                    loading={catalogLoading}
                    placeholder="Select or type location"
                    onChange={(next) =>
                      setSaveDraft((prev) =>
                        prev ? { ...prev, location: next } : prev,
                      )
                    }
                  />
                }
              />

              <CompareField
                label="Micro market"
                original={originalMm}
                right={
                  <CatalogPickSelect
                    options={microMarkets}
                    value={saveDraft.microMarket}
                    loading={catalogLoading}
                    placeholder="Select or type micro market"
                    onChange={(next) =>
                      setSaveDraft((prev) =>
                        prev ? { ...prev, microMarket: next } : prev,
                      )
                    }
                  />
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
              Left is the current value. Right: pick a catalog value from the
              dropdown.
            </DialogDescription>
          </DialogHeader>

          {fieldEdit && fieldEditPick && (
            <div className="py-2">
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
                    placeholder={FIELD_PLACEHOLDER[fieldEdit.field]}
                    onChange={setFieldEditPick}
                  />
                }
              />
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
                ? "Select what to reject and add a remark for each. Listing stays off search (draft)."
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
              const showPn = !forSale && pnPending;
              const showLoc = locPending;
              const showMm = mmPending;

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

              const rejectPick = (field: CatalogField, options: CatalogOption[]) =>
                rejectCatalogDraft ? (
                  <CatalogPickSelect
                    options={options}
                    value={rejectCatalogDraft[field]}
                    loading={catalogLoading}
                    allowCreate={false}
                    placeholder={`Select ${FIELD_LABEL[field].toLowerCase()}`}
                    onChange={(next) =>
                      setRejectCatalogDraft((prev) =>
                        prev ? { ...prev, [field]: next } : prev,
                      )
                    }
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
                        right={rejectPick("propertyName", propertyNames)}
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
                        right={rejectPick("location", locations)}
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
                      <CompareField
                        label="Micro market"
                        original={getHighlightedMicroMarketName(item)}
                        right={rejectPick("microMarket", microMarkets)}
                      />
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
              Cancel
            </Button>
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
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
