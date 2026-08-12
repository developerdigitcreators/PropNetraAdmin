"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { locationService } from "@/services/location.service";
import {
  canToggleForSaleTitle,
  getHighlightedLocationName,
  getHighlightedPropertyName,
  getHighlightedMicroMarketId,
  getHighlightedMicroMarketName,
  getListingCategoryName,
  getListingDetailRows,
  getListingPrice,
  getListingPropertyTypeName,
  getSubmittedBy,
  isForSaleTitleEnabled,
  isLocationPending,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
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
  ChevronDown,
  ChevronRight,
  Database,
  Loader2,
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

type SaveDraft = {
  forSale: boolean;
  savePropertyName: boolean;
  saveLocation: boolean;
  propertyName: string;
  locationName: string;
  microMarketId: string;
};

function buildRowDraft(item: ListingReviewItem): RowDraft {
  return { forSale: isForSaleTitleEnabled(item) };
}

function buildSaveDraft(item: ListingReviewItem, forSale: boolean): SaveDraft {
  return {
    forSale,
    // Property-name mode (forSale OFF): no checkboxes — always save PN + location + MM.
    savePropertyName: !forSale,
    saveLocation: !forSale,
    propertyName: getHighlightedPropertyName(item),
    locationName: getHighlightedLocationName(item),
    microMarketId: getHighlightedMicroMarketId(item),
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
  const [rejectRemarksDraft, setRejectRemarksDraft] = useState<RejectListingReviewPayload>({});
  const [saveOpen, setSaveOpen] = useState<{ id: string } | null>(null);
  const [saveDraft, setSaveDraft] = useState<SaveDraft | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [microMarkets, setMicroMarkets] = useState<Array<{ id: string; name: string }>>([]);
  const [activeById, setActiveById] = useState<Record<string, boolean>>({});
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [isGrabbing, setIsGrabbing] = useState(false);
  const dragStateRef = useRef<{ startX: number; scrollLeft: number }>({ startX: 0, scrollLeft: 0 });
  const isGrabbingRef = useRef(false);

  const colCount =
    mode === "unverified" || mode === "verified" ? 9 : 7;

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

  useEffect(() => {
    if (!saveOpen) return;
    let cancelled = false;
    locationService
      .getMicroMarkets()
      .then((mm: unknown) => {
        if (cancelled) return;
        if (!Array.isArray(mm)) return;
        const list = mm
          .map((x) => x as Record<string, unknown>)
          .filter((x) => typeof x.id === "string" && typeof x.name === "string")
          .map((x) => ({ id: x.id as string, name: x.name as string }));
        setMicroMarkets(list);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setMicroMarkets([]);
      });
    return () => {
      cancelled = true;
    };
  }, [saveOpen]);

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

  const handleToggleActive = async (item: ListingReviewItem, active: boolean) => {
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
        const payload: RejectListingReviewPayload = {};
        if (rejectRemarksDraft.rejectPropertyName) {
          payload.rejectPropertyName = true;
          payload.propertyNameRemark =
            rejectRemarksDraft.propertyNameRemark?.trim() || undefined;
        }
        if (rejectRemarksDraft.rejectLocation) {
          payload.rejectLocation = true;
          payload.locationRemark =
            rejectRemarksDraft.locationRemark?.trim() || undefined;
        }
        if (rejectRemarksDraft.rejectMicroMarket) {
          payload.rejectMicroMarket = true;
          payload.microMarketRemark =
            rejectRemarksDraft.microMarketRemark?.trim() || undefined;
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

    if (saveDraft.forSale) {
      if (!saveDraft.saveLocation) {
        alert("Select location to save.");
        return;
      }
    } else {
      // Property-name mode: PN + location + micromarket are always included.
      if (!saveDraft.propertyName.trim() || !saveDraft.locationName.trim()) {
        alert("Property name and location are required.");
        return;
      }
    }
    if (!saveDraft.microMarketId) {
      alert("Select a micro market.");
      return;
    }

    setBusyId(saveOpen.id);
    try {
      const payload: SaveListingCatalogPayload = saveDraft.forSale
        ? {
            savePropertyName: false,
            saveLocation: true,
            saveMicroMarket: true,
            locationName: saveDraft.locationName.trim() || undefined,
            microMarketId: saveDraft.microMarketId,
          }
        : {
            savePropertyName: true,
            saveLocation: true,
            saveMicroMarket: true,
            propertyName: saveDraft.propertyName.trim(),
            locationName: saveDraft.locationName.trim(),
            microMarketId: saveDraft.microMarketId,
          };
      await onSaveToDb(saveOpen.id, payload);
      setSaveOpen(null);
      setSaveDraft(null);
    } catch (err) {
      console.error(err);
      alert("Failed to save to DB.");
    } finally {
      setBusyId(null);
    }
  };

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
  const saveLocPending = saveItem ? isLocationPending(saveItem) : false;

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
            dragStateRef.current = { startX: e.clientX, scrollLeft: el.scrollLeft };

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
                <TableHead className="text-right min-w-45">Approve / Reject</TableHead>
              ) : mode === "verified" ? (
                <TableHead className="text-right min-w-45">Active / Inactive</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const draft = getDraft(item);
              const pnPending = isPropertyNamePending(item);
              const locPending = isLocationPending(item);
              const pnHighlight = item.highlights?.newPropertyName;
              const pnStatus = pnHighlight && typeof pnHighlight === "object" ? pnHighlight.status : null;
              const pnRejected = mode === "rejected" && pnStatus === "rejected";

              const locHighlight = item.highlights?.newLocation;
              const locStatus =
                locHighlight && typeof locHighlight === "object" ? locHighlight.status : null;
              const locRejected = mode === "rejected" && locStatus === "rejected";

              const pnRemark = item.rejectRemarks?.propertyName;
              const locRemark = item.rejectRemarks?.location;
              const pn = getHighlightedPropertyName(item) || "—";
              const loc = getHighlightedLocationName(item) || "—";
              const canToggle = canToggleForSaleTitle(item);
              const canSave = pnPending || locPending;
              const rowBusy = busyId === item.id;
              const expanded = !!expandedIds[item.id];
              const detailRows = expanded ? getListingDetailRows(item) : [];

              return (
                <Fragment key={item.id}>
                  <TableRow className={expanded ? "bg-gray-50/40" : undefined}>
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
                      <span
                        className={
                          pnRejected
                            ? "inline-flex rounded-md bg-red-50 border border-red-200 px-2 py-1 text-sm font-semibold text-red-900"
                            : pnPending
                              ? "inline-flex rounded-md bg-amber-50 border border-amber-200 px-2 py-1 text-sm font-semibold text-amber-900"
                              : "text-sm text-gray-800"
                        }
                      >
                        {pn}
                      </span>
                      {pnRejected ? (
                        <p className="text-[10px] text-red-700 mt-1">
                          {pnRemark || "Rejected"}
                        </p>
                      ) : pnPending ? (
                        <p className="text-[10px] text-amber-700 mt-1">
                          Pending — not in DB
                        </p>
                      ) : null}
                    </TableCell>

                    <TableCell className="align-top">
                      <span
                        className={
                          locRejected
                            ? "inline-flex rounded-md bg-red-50 border border-red-200 px-2 py-1 text-sm font-semibold text-red-900"
                            : locPending
                              ? "inline-flex rounded-md bg-amber-50 border border-amber-200 px-2 py-1 text-sm font-semibold text-amber-900"
                              : "text-sm text-gray-800"
                        }
                      >
                        {loc}
                      </span>
                      {locRejected ? (
                        <p className="text-[10px] text-red-700 mt-1">
                          {locRemark || "Rejected"}
                        </p>
                      ) : locPending ? (
                        <p className="text-[10px] text-amber-700 mt-1">
                          Pending — not in DB
                        </p>
                      ) : null}
                    </TableCell>

                    <TableCell className="align-top">
                      <span className="text-sm text-gray-800">
                        {getHighlightedMicroMarketName(item) || "—"}
                      </span>
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
                        {canSave ? (
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
                          <span className="text-xs text-gray-400">Nothing pending</span>
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
                                <div key={row.key} className="text-sm min-w-0">
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save to DB</DialogTitle>
            <DialogDescription>
              Choose what to approve into the catalog. This does not approve or
              reject the listing.
            </DialogDescription>
          </DialogHeader>

          {saveDraft && (
            <div className="space-y-4 py-2">
              {!saveDraft.forSale ? (
                <div className="rounded-xl border border-gray-200 p-3 space-y-3">
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium text-gray-900">Property name</p>
                    <Input
                      value={saveDraft.propertyName}
                      onChange={(e) =>
                        setSaveDraft((prev) =>
                          prev ? { ...prev, propertyName: e.target.value } : prev,
                        )
                      }
                      placeholder="Edit property name"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-sm font-medium text-gray-900">Location</p>
                    <Input
                      value={saveDraft.locationName}
                      onChange={(e) =>
                        setSaveDraft((prev) =>
                          prev ? { ...prev, locationName: e.target.value } : prev,
                        )
                      }
                      placeholder="Edit location name"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-sm font-medium text-gray-900">Micro market</p>
                    <Select
                      value={saveDraft.microMarketId}
                      onValueChange={(v) =>
                        setSaveDraft((prev) =>
                          prev ? { ...prev, microMarketId: v || "" } : prev,
                        )
                      }
                      disabled={!microMarkets.length}
                    >
                      <SelectTrigger className="h-8">
                        <span className="truncate">
                          {microMarkets.find((mm) => mm.id === saveDraft.microMarketId)
                            ?.name ||
                            (saveItem
                              ? getHighlightedMicroMarketName(saveItem) ||
                                "Select micro market"
                              : "Select micro market")}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {microMarkets.length === 0 ? (
                          <SelectItem value="__none__" disabled>
                            No micro markets found
                          </SelectItem>
                        ) : (
                          microMarkets.map((mm) => (
                            <SelectItem key={mm.id} value={mm.id}>
                              {mm.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                saveLocPending && (
                  <div className="rounded-xl border border-gray-200 p-3 space-y-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <Checkbox
                        checked={saveDraft.saveLocation}
                        onCheckedChange={(v) =>
                          setSaveDraft((prev) =>
                            prev ? { ...prev, saveLocation: !!v } : prev,
                          )
                        }
                        className="mt-0.5"
                      />
                      <span className="text-sm">
                        <span className="font-medium text-gray-900">
                          Save location
                        </span>
                        <span className="block text-xs text-gray-500">
                          Default: not selected
                        </span>
                      </span>
                    </label>
                    {saveDraft.saveLocation && (
                      <>
                        <Input
                          value={saveDraft.locationName}
                          onChange={(e) =>
                            setSaveDraft((prev) =>
                              prev
                                ? { ...prev, locationName: e.target.value }
                                : prev,
                            )
                          }
                          placeholder="Edit location name"
                        />
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-900">
                            Micro market
                          </p>
                          <Select
                            value={saveDraft.microMarketId}
                            onValueChange={(v) =>
                              setSaveDraft((prev) =>
                                prev ? { ...prev, microMarketId: v || "" } : prev,
                              )
                            }
                            disabled={!microMarkets.length}
                          >
                            <SelectTrigger className="h-8">
                              <span className="truncate">
                                {microMarkets.find(
                                  (mm) => mm.id === saveDraft.microMarketId,
                                )?.name ||
                                  (saveItem
                                    ? getHighlightedMicroMarketName(saveItem) ||
                                      "Select micro market"
                                    : "Select micro market")}
                              </span>
                            </SelectTrigger>
                            <SelectContent>
                              {microMarkets.length === 0 ? (
                                <SelectItem value="__none__" disabled>
                                  No micro markets found
                                </SelectItem>
                              ) : (
                                microMarkets.map((mm) => (
                                  <SelectItem key={mm.id} value={mm.id}>
                                    {mm.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                  </div>
                )
              )}
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
              disabled={
                !!busyId ||
                !saveDraft ||
                (saveDraft.forSale
                  ? !saveDraft.saveLocation || !saveDraft.microMarketId
                  : !saveDraft.propertyName.trim() ||
                    !saveDraft.locationName.trim() ||
                    !saveDraft.microMarketId)
              }
              onClick={handleSaveToDb}
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
          if (!open && !busyId) setConfirm(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              {confirm?.action === "reject"
                ? "Select what to reject and add a remark for each. Listing stays off search (draft)."
                : "Listing will go live (published). Save to DB is separate — this will not save Property Name/location to catalog."}
            </DialogDescription>
          </DialogHeader>

          {confirm?.action === "reject" && (() => {
            const item = items.find((i) => i.id === confirm?.id);
            const pnPending = item ? isPropertyNamePending(item) : false;
            const locPending = item ? isLocationPending(item) : false;
            const mmHighlight = item?.highlights?.newMicroMarket;
            const mmStatus =
              mmHighlight && typeof mmHighlight === "object"
                ? mmHighlight.status
                : null;
            const mmPending = mmStatus === "pending";

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

            return (
              <div className="space-y-3 pt-2">
                {pnPending && (
                  <div className="rounded-xl border border-gray-200 p-3 space-y-2">
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
                    {rejectRemarksDraft.rejectPropertyName && (
                      <Input
                        value={rejectRemarksDraft.propertyNameRemark || ""}
                        onChange={(e) =>
                          setRejectRemarksDraft((prev) => ({
                            ...prev,
                            propertyNameRemark: e.target.value,
                          }))
                        }
                        placeholder="Enter PN reject remark"
                      />
                    )}
                  </div>
                )}

                {locPending && (
                  <div className="rounded-xl border border-gray-200 p-3 space-y-2">
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
                    {rejectRemarksDraft.rejectLocation && (
                      <Input
                        value={rejectRemarksDraft.locationRemark || ""}
                        onChange={(e) =>
                          setRejectRemarksDraft((prev) => ({
                            ...prev,
                            locationRemark: e.target.value,
                          }))
                        }
                        placeholder="Enter Location reject remark"
                      />
                    )}
                  </div>
                )}

                {mmPending && (
                  <div className="rounded-xl border border-gray-200 p-3 space-y-2">
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
                    {rejectRemarksDraft.rejectMicroMarket && (
                      <Input
                        value={rejectRemarksDraft.microMarketRemark || ""}
                        onChange={(e) =>
                          setRejectRemarksDraft((prev) => ({
                            ...prev,
                            microMarketRemark: e.target.value,
                          }))
                        }
                        placeholder="Enter MM reject remark"
                      />
                    )}
                  </div>
                )}

                {!pnPending && !locPending && !mmPending && (
                  <p className="text-xs text-amber-700">
                    Nothing pending to reject on this listing.
                  </p>
                )}

                {requiredMissing && (pnPending || locPending || mmPending) && (
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
              onClick={() => setConfirm(null)}
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
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
