"use client";

/**
 * Developer User hub listing create/edit — field keys and limits mirror
 * `propnetra backend/src/modules/listings/constants/developer-project.ts`
 * and normalization in `developer-details.util.ts`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listingCreateApiError,
  listingsService,
  type CreateFormField,
  type CreateFormOption,
  type CreateFormSchema,
  type MyListingDetail,
} from "@/services/listings.service";
import { developerHomeService, type AdminTeamMember } from "@/services/developer-home.service";
import { adminUsersService } from "@/services/admin-users.service";
import { sanitizeListingDetailsForSave } from "@/modules/developer-user/sanitize-listing-details-for-save";
import {
  buildDetailsPayloadFromStrings,
  catalogOptionDisplayName,
  coalesceSelectDetailValue,
  dependsOnChecked,
  developerDetailModulesToRender,
  extractComplexDynamic,
  isBooleanType,
  isCheckedDetail,
  isComplexFieldType,
  isMediaGalleryType,
  isNumberType,
  isSelectType,
  isTextareaType,
  percentFieldsFor,
  renderModuleFields,
  seedStringDetailsFromDynamic,
  schemaSelectDisplayLabel,
  allSchemaFields,
} from "@/modules/developer-user/developer-user-listing-form-utils";
import {
  floorRowsFromDynamic,
  floorRowsToApi,
  ListingBrochureFieldEditor,
  ListingFloorTableEditor,
  ListingLocationAdvantageFieldEditor,
  ListingTeamMembersFieldEditor,
  locationAdvantageToApiPayload,
  parseLocationAdvantageFromDynamic,
  validateLocationAdvantageForSave,
  type FloorRow,
} from "@/modules/developer-user/developer-user-listing-field-editors";
import {
  availableUnitsToApi,
  ListingAttachLayoutsFieldEditor,
  ListingAvailableUnitsFieldEditor,
  ListingDevAboutFieldEditor,
  ListingDevAreaTypeFieldEditor,
  ListingDevChargesFieldEditor,
  ListingDevMediaGalleryFieldEditor,
  ListingDevMultiSelectFieldEditor,
  ListingGeoFieldEditor,
  ListingSiteLayoutFieldEditor,
  parseAvailableUnitsFromDynamic,
} from "@/modules/developer-user/developer-user-listing-dev-field-editors";
import type { DevAvailableUnitRow } from "@/lib/developer-form-limits";
import { DeveloperUserListingShell } from "@/modules/developer-user/developer-user-listing-shell";
import { DEV_FIELD, stripProjectPrefixForEdit } from "@/lib/developer-form-limits";
import {
  parseNewLaunchFrameUrl,
  type NewLaunchFeaturedResponse,
} from "@/lib/new-launch-frame";
import { ListingNewLaunchFrameEditor } from "@/modules/developer-user/listing-new-launch-frame-editor";
import { Loader2, Info } from "lucide-react";
import type { CreateFormCatalogFields } from "@/modules/listings/create-form-catalog-section";

type Props = {
  userId: string;
  listingId: string;
  onBack: () => void;
  onSaved?: () => void;
  onBreadcrumbTitle?: (title: string) => void;
};

function matchOptionId(
  options: CreateFormOption[],
  name: string | null | undefined,
): string {
  if (!name) return "";
  const n = name.trim().toLowerCase();
  return options.find((o) => o.name.trim().toLowerCase() === n)?.id || "";
}

export function DeveloperUserListingEditPage({
  userId,
  listingId,
  onBack,
  onSaved,
  onBreadcrumbTitle,
}: Props) {
  const isCreate = listingId === "new";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<MyListingDetail | null>(null);
  const loadedDynamicRef = useRef<Record<string, unknown>>({});

  const [categories, setCategories] = useState<CreateFormOption[]>([]);
  const [buildingTypes, setBuildingTypes] = useState<CreateFormOption[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<CreateFormOption[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [buildingTypeId, setBuildingTypeId] = useState("");
  const [propertyTypeId, setPropertyTypeId] = useState("");
  const [schema, setSchema] = useState<CreateFormSchema | null>(null);
  const [details, setDetails] = useState<Record<string, string>>({});
  const [complex, setComplex] = useState<Record<string, unknown>>({});
  const [floorRows, setFloorRows] = useState<FloorRow[]>([]);
  const [teamMembers, setTeamMembers] = useState<AdminTeamMember[]>([]);
  const [newLaunchFeatured, setNewLaunchFeatured] =
    useState<NewLaunchFeaturedResponse | null>(null);
  const [newLaunchFrameUrl, setNewLaunchFrameUrl] = useState<string | null>(null);
  const [newLaunchFeaturedError, setNewLaunchFeaturedError] = useState("");
  const [showAvailableUnit, setShowAvailableUnit] = useState(true);

  const isDeveloperCategory = useMemo(() => {
    const cat = categories.find((c) => c.id === categoryId);
    return (
      cat?.name?.toLowerCase().includes("developer") ||
      detail?.categoryName?.toLowerCase().includes("developer") ||
      false
    );
  }, [categories, categoryId, detail?.categoryName]);

  const [stateId, setStateId] = useState("");
  const [cityId, setCityId] = useState("");
  const [propertyNameId, setPropertyNameId] = useState("");
  const [propertySuffix, setPropertySuffix] = useState("");
  const [projectPrefix, setProjectPrefix] = useState<string | null>(null);
  const [locationId, setLocationId] = useState("");
  const [customLocation, setCustomLocation] = useState("");
  const [microMarketId, setMicroMarketId] = useState("");
  const [customMicroMarket, setCustomMicroMarket] = useState("");
  const [microMarketName, setMicroMarketName] = useState("");
  const [catalogWarning, setCatalogWarning] = useState("");
  const [allPostFormPropertyTypes, setAllPostFormPropertyTypes] = useState<
    Array<CreateFormOption & { building_type_id?: string }>
  >([]);

  const lockCore =
    !isCreate && String(detail?.status || "").toLowerCase() === "published";

  const availableUnitRows: DevAvailableUnitRow[] = useMemo(
    () => parseAvailableUnitsFromDynamic(complex[DEV_FIELD.availableUnits]),
    [complex],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    const loadTypeOptions = async (
      catId: string,
      btId?: string,
      ptId?: string,
      btName?: string | null,
      ptName?: string | null,
    ) => {
      const { buildingTypes: bts, propertyTypes: pts } =
        await listingsService.getDeveloperUserPostFormTypeOptions(userId, catId);
      if (cancelled) return;
      const activeBts = bts.filter((r) => r.is_active !== false);
      setAllPostFormPropertyTypes(pts);
      setBuildingTypes(activeBts);
      let nextBt =
        btId && activeBts.some((b) => b.id === btId)
          ? btId
          : matchOptionId(activeBts, btName);
      setBuildingTypeId(nextBt);
      const ptsForBt = nextBt
        ? pts.filter((p) => p.building_type_id === nextBt)
        : pts;
      if (nextBt) {
        setPropertyTypes(ptsForBt.filter((r) => r.is_active !== false));
        const nextPt =
          ptId && ptsForBt.some((p) => p.id === ptId)
            ? ptId
            : matchOptionId(ptsForBt, ptName);
        setPropertyTypeId(nextPt);
      } else {
        setPropertyTypes([]);
        setPropertyTypeId("");
      }
    };

    if (isCreate) {
      void Promise.all([
        listingsService.getDeveloperUserPostFormCategories(userId),
        developerHomeService.listTeam(userId).catch(() => []),
      ])
        .then(async ([cats, team]) => {
          if (cancelled) return;
          setDetail(null);
          setTeamMembers(team);
          setCategories(cats);
          setProjectPrefix(null);
          setShowAvailableUnit(true);
          const catId =
            cats.find((c) => c.name?.toLowerCase().includes("developer"))?.id ||
            cats[0]?.id ||
            "";
          setCategoryId(catId);
          if (catId) await loadTypeOptions(catId);
          void adminUsersService
            .getMasterProfile(userId)
            .then((profile) => {
              if (cancelled) return;
              const prefix =
                (profile.user as { projectPrefix?: string | null })
                  ?.projectPrefix ?? null;
              setProjectPrefix(prefix);
            })
            .catch(() => undefined);
        })
        .catch((err) => {
          if (!cancelled)
            setError(listingCreateApiError(err, "Failed to load form."));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }

    void Promise.all([
      listingsService.getAdminUserListingDetail(userId, listingId),
      listingsService.getDeveloperUserPostFormCategories(userId),
      developerHomeService.listTeam(userId).catch(() => []),
    ])
      .then(async ([d, cats, team]) => {
        if (cancelled) return;
        setDetail(d);
        setShowAvailableUnit(d.showAvailableUnit !== false);
        setTeamMembers(team);
        setCategories(cats);
        setProjectPrefix(d.projectPrefix ?? null);
        const dyn = {
          ...(d.dynamicData || {}),
          ...(d.form?.dynamicData || {}),
        };
        loadedDynamicRef.current = dyn;
        setComplex(extractComplexDynamic(null, dyn));
        setNewLaunchFrameUrl(parseNewLaunchFrameUrl(dyn));
        setFloorRows(floorRowsFromDynamic(dyn._tableRows ?? dyn.floor_pricing));

        const catId =
          String(d.categoryId || d.category?.id || "") ||
          matchOptionId(cats, d.categoryName) ||
          cats.find((c) => c.name?.toLowerCase().includes("developer"))?.id ||
          "";
        setCategoryId(catId);
        setStateId(String(d.stateId || ""));
        setCityId(String(d.cityId || ""));
        setPropertyNameId(String(d.propertyNameId || ""));
        setLocationId(String(d.locationId || ""));
        setMicroMarketId(String(d.micromarketId || ""));
        const fullName = stripProjectPrefixForEdit(
          d.projectPrefix,
          String(d.propertyName || d.title || ""),
        );
        setPropertySuffix(fullName);
        setCustomLocation(d.locationId ? "" : String(d.locationName || ""));
        setCustomMicroMarket(d.micromarketId ? "" : String(d.microMarketName || ""));
        setMicroMarketName(String(d.microMarketName || ""));

        const btId = d.buildingType?.id || "";
        const ptId = d.propertyType?.id || "";
        if (catId) {
          await loadTypeOptions(
            catId,
            btId,
            ptId,
            d.buildingTypeName || d.buildingType?.name,
            d.propertyTypeName || d.propertyType?.name,
          );
        }
      })
      .catch((err) => {
        if (!cancelled)
          setError(listingCreateApiError(err, "Failed to load listing."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, listingId, isCreate]);

  useEffect(() => {
    if (isCreate || !listingId) {
      setNewLaunchFeatured(null);
      setNewLaunchFrameUrl(null);
      return;
    }
    let cancelled = false;
    setNewLaunchFeaturedError("");
    void listingsService
      .getAdminUserListingNewLaunchFeatured(userId, listingId)
      .then((res) => {
        if (cancelled) return;
        setNewLaunchFeatured({
          ...res,
          featured: res.featured === true,
        });
        setNewLaunchFrameUrl(
          res.frameUrl ?? parseNewLaunchFrameUrl(loadedDynamicRef.current),
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setNewLaunchFeatured({
            listingId,
            featured: false,
            frameUrl: parseNewLaunchFrameUrl(loadedDynamicRef.current),
          });
          setNewLaunchFeaturedError(
            listingCreateApiError(
              err,
              "Could not verify New Launch placement (check API permissions).",
            ),
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [userId, listingId, isCreate]);

  useEffect(() => {
    if (!buildingTypeId) {
      setPropertyTypes([]);
      return;
    }
    const filtered = allPostFormPropertyTypes.filter(
      (p) => p.building_type_id === buildingTypeId,
    );
    setPropertyTypes(filtered);
    setPropertyTypeId((prev) =>
      prev && filtered.some((p) => p.id === prev) ? prev : "",
    );
  }, [buildingTypeId, allPostFormPropertyTypes]);

  useEffect(() => {
    if (!categoryId) return;
    let cancelled = false;
    void listingsService
      .getDeveloperUserPostFormTypeOptions(userId, categoryId)
      .then(({ buildingTypes: bts, propertyTypes: pts }) => {
        if (cancelled) return;
        setAllPostFormPropertyTypes(pts);
        setBuildingTypes(bts.filter((r) => r.is_active !== false));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [categoryId, userId]);

  useEffect(() => {
    if (!categoryId || !buildingTypeId || !propertyTypeId) {
      setSchema(null);
      return;
    }
    let cancelled = false;
    void listingsService
      .getCreateSchema({ categoryId, buildingTypeId, propertyTypeId })
      .then((next) => {
        if (cancelled) return;
        setSchema(next);
        const dyn = loadedDynamicRef.current;
        setDetails(seedStringDetailsFromDynamic(next, dyn));
        setComplex(extractComplexDynamic(next, dyn));
      })
      .catch(() => !cancelled && setSchema(null));
    return () => {
      cancelled = true;
    };
  }, [categoryId, buildingTypeId, propertyTypeId]);

  const updateDetail = useCallback(
    (key: string, value: string) => {
      setDetails((prev) => {
        const next = { ...prev, [key]: value };
        if (!isCheckedDetail(value)) {
          for (const percent of percentFieldsFor(schema, key))
            delete next[percent.key];
        }
        return next;
      });
    },
    [schema],
  );

  const uploadImages = useCallback(
    async (files: File[]) => {
      setUploading(true);
      try {
        const { images } = await listingsService.uploadAdminUserListingMedia(
          userId,
          files,
        );
        return images;
      } finally {
        setUploading(false);
      }
    },
    [userId],
  );

  const uploadVideos = useCallback(
    async (files: File[]) => {
      setUploading(true);
      try {
        const { videos } = await listingsService.uploadAdminUserListingVideos(
          userId,
          files,
        );
        return videos;
      } finally {
        setUploading(false);
      }
    },
    [userId],
  );

  const uploadBrochure = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const { url } = await listingsService.uploadAdminUserListingBrochure(
          userId,
          file,
        );
        return url;
      } finally {
        setUploading(false);
      }
    },
    [userId],
  );

  const uploadNewLaunchFrame = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const { url } = await listingsService.uploadAdminUserNewLaunchFrame(
          userId,
          file,
        );
        return url;
      } catch (err) {
        throw new Error(
          listingCreateApiError(err, "New Launch frame upload failed."),
        );
      } finally {
        setUploading(false);
      }
    },
    [userId],
  );

  const renderField = useCallback(
    (field: CreateFormField) => {
      const type = field.type.toLowerCase();
      const key = field.key;

      if (key === DEV_FIELD.newLaunchFrame) {
        return null;
      }

      if (
        key === DEV_FIELD.headerMedia ||
        (isMediaGalleryType(type) &&
          (key.includes("header") || key === DEV_FIELD.headerMedia))
      ) {
        const showNewLaunchBlock = !isCreate && isDeveloperCategory;
        const canUploadNewLaunchFrame = newLaunchFeatured?.featured === true;
        const newLaunchPending =
          !isCreate && isDeveloperCategory && newLaunchFeatured === null;
        return (
          <>
            <ListingDevMediaGalleryFieldEditor
              key={field.key}
              field={field}
              value={complex[field.key]}
              variant="header"
              onChange={(next) =>
                setComplex((prev) => ({ ...prev, [field.key]: next }))
              }
              onUploadImages={uploadImages}
              onUploadVideos={uploadVideos}
              uploading={uploading}
            />
            {newLaunchPending ? (
              <p className="text-xs text-gray-500 sm:col-span-2">
                Checking New Launch home eligibility…
              </p>
            ) : null}
            {newLaunchFeaturedError ? (
              <p className="text-xs text-amber-700 sm:col-span-2">{newLaunchFeaturedError}</p>
            ) : null}
            {showNewLaunchBlock ? (
              <>
                {!canUploadNewLaunchFrame && !newLaunchPending ? (
                  <p className="text-xs text-amber-700 sm:col-span-2">
                    This project is not on a New Launch home section yet — upload and save
                    anyway; the frame appears on the app home only after you add it under
                    Developer Home → New Launch Projects and save that section.
                  </p>
                ) : null}
                <ListingNewLaunchFrameEditor
                  frameUrl={newLaunchFrameUrl}
                  onFrameUrlChange={setNewLaunchFrameUrl}
                  onUpload={uploadNewLaunchFrame}
                  uploading={uploading}
                  placements={newLaunchFeatured?.placements}
                  disabled={newLaunchPending}
                />
              </>
            ) : null}
          </>
        );
      }
      if (type === "media_gallery" && key !== DEV_FIELD.headerMedia && !key.includes("header")) {
        return (
          <ListingDevMediaGalleryFieldEditor
            key={field.key}
            field={field}
            value={complex[field.key]}
            variant="gallery"
            onChange={(next) =>
              setComplex((prev) => ({ ...prev, [field.key]: next }))
            }
            onUploadImages={uploadImages}
            onUploadVideos={uploadVideos}
            uploading={uploading}
          />
        );
      }
      if (type === "geo" || key === DEV_FIELD.geo) {
        return (
          <ListingGeoFieldEditor
            key={field.key}
            field={field}
            value={complex[field.key]}
            onChange={(next) =>
              setComplex((prev) => ({ ...prev, [field.key]: next }))
            }
          />
        );
      }
      if (key === DEV_FIELD.about || (isTextareaType(type) && key === DEV_FIELD.about)) {
        const html =
          typeof complex[field.key] === "string"
            ? String(complex[field.key])
            : details[field.key] ?? "";
        return (
          <ListingDevAboutFieldEditor
            key={field.key}
            field={field}
            value={html}
            onChange={(next) => {
              setComplex((prev) => ({ ...prev, [field.key]: next }));
              updateDetail(field.key, next);
            }}
          />
        );
      }
      if (type === "multi_select" || key === DEV_FIELD.amenities) {
        return (
          <ListingDevMultiSelectFieldEditor
            key={field.key}
            field={field}
            value={complex[field.key]}
            onChange={(ids) =>
              setComplex((prev) => ({ ...prev, [field.key]: ids }))
            }
          />
        );
      }
      if (type === "team_members") {
        return (
          <ListingTeamMembersFieldEditor
            key={field.key}
            field={field}
            value={complex[field.key]}
            members={teamMembers}
            developerUserId={userId}
            onChange={(ids) =>
              setComplex((prev) => ({ ...prev, [field.key]: ids }))
            }
          />
        );
      }
      if (type === "table") {
        return (
          <ListingFloorTableEditor
            key={field.key}
            field={field}
            rows={floorRows}
            onChange={setFloorRows}
          />
        );
      }
      if (type === "available_units" || key === DEV_FIELD.availableUnits) {
        return (
          <ListingAvailableUnitsFieldEditor
            key={field.key}
            field={field}
            value={complex[field.key]}
            onChange={(rows) => {
              setComplex((prev) => ({
                ...prev,
                [field.key]: availableUnitsToApi(rows),
              }));
            }}
          />
        );
      }
      if (key === DEV_FIELD.charges) {
        return (
          <ListingDevChargesFieldEditor
            key={field.key}
            field={field}
            value={details[field.key] ?? ""}
            onChange={(v) => updateDetail(field.key, v)}
          />
        );
      }
      if (key === DEV_FIELD.areaType) {
        return (
          <ListingDevAreaTypeFieldEditor
            key={field.key}
            field={field}
            value={details[field.key] ?? ""}
            onChange={(v) => updateDetail(field.key, v)}
          />
        );
      }
      if (type === "attach_layouts" || key === DEV_FIELD.attachLayouts) {
        return (
          <ListingAttachLayoutsFieldEditor
            key={field.key}
            field={field}
            value={complex[field.key]}
            units={availableUnitRows}
            onChange={(rows) =>
              setComplex((prev) => ({ ...prev, [field.key]: rows }))
            }
            onUploadImages={uploadImages}
            uploading={uploading}
          />
        );
      }
      if (type === "site_layout" || key === DEV_FIELD.siteLayout || key === DEV_FIELD.specification) {
        return (
          <ListingSiteLayoutFieldEditor
            key={field.key}
            field={field}
            value={complex[field.key]}
            onChange={(next) =>
              setComplex((prev) => ({ ...prev, [field.key]: next }))
            }
            onUploadImages={uploadImages}
            uploading={uploading}
          />
        );
      }
      if (type === "brochure") {
        return (
          <ListingBrochureFieldEditor
            key={field.key}
            field={field}
            value={complex[field.key]}
            onChange={(next) =>
              setComplex((prev) => ({ ...prev, [field.key]: next }))
            }
            onUploadPdf={uploadBrochure}
            uploading={uploading}
          />
        );
      }
      if (type === "location_advantage") {
        return (
          <ListingLocationAdvantageFieldEditor
            key={`${listingId}-${field.key}`}
            field={field}
            value={complex[field.key]}
            onChange={(next) =>
              setComplex((prev) => ({ ...prev, [field.key]: next }))
            }
          />
        );
      }
      if (field.slot === "banner" || type === "banner") {
        return null;
      }
      if (isComplexFieldType(field.type)) {
        return null;
      }

      const value = details[field.key] ?? "";
      if (isBooleanType(field.type)) {
        const paired = percentFieldsFor(schema, field.key).length > 0;
        return (
          <div
            key={field.key}
            className={
              paired
                ? "flex items-center gap-3"
                : "flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
            }
          >
            <label className="text-sm font-medium text-gray-700">{field.label}</label>
            <Switch
              checked={isCheckedDetail(value)}
              onCheckedChange={(checked) =>
                updateDetail(field.key, checked ? "true" : "false")
              }
            />
          </div>
        );
      }
      if (dependsOnChecked(field) && isNumberType(field.type)) {
        const parentOn = isCheckedDetail(details[field.dependsOn?.field || ""]);
        if (!parentOn) return null;
        return (
          <div key={field.key} className="relative min-w-[8rem] flex-1">
            <Input
              type="number"
              value={value}
              onChange={(e) => updateDetail(field.key, e.target.value.replace("%", ""))}
              className="pr-8"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
              {field.suffix || "%"}
            </span>
          </div>
        );
      }
      if (isSelectType(field.type) && (field.options?.length || 0) > 0) {
        const coerced = coalesceSelectDetailValue(field, value);
        const displayLabel = schemaSelectDisplayLabel(field, value);
        return (
          <div key={field.key} className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{field.label}</label>
            <Select
              value={coerced || undefined}
              onValueChange={(v) => updateDetail(field.key, v ?? "")}
            >
              <SelectTrigger className="w-full">
                {displayLabel ? (
                  <span className="truncate">{displayLabel}</span>
                ) : (
                  <SelectValue placeholder={`Select ${field.label}`} />
                )}
              </SelectTrigger>
              <SelectContent>
                {field.options!.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      }
      if (isTextareaType(field.type)) {
        return (
          <div key={field.key} className="space-y-2 sm:col-span-2">
            <label className="text-sm font-medium text-gray-700">{field.label}</label>
            <textarea
              className="min-h-[100px] w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              value={value}
              onChange={(e) => updateDetail(field.key, e.target.value)}
            />
          </div>
        );
      }
      return (
        <div key={field.key} className="space-y-2">
          <label className="text-sm font-medium text-gray-700">{field.label}</label>
          <Input
            type={isNumberType(field.type) ? "number" : "text"}
            value={value}
            onChange={(e) => updateDetail(field.key, e.target.value)}
            placeholder={field.placeholder || field.label}
          />
        </div>
      );
    },
    [
      availableUnitRows,
      complex,
      details,
      floorRows,
      isCreate,
      isDeveloperCategory,
      listingId,
      newLaunchFeatured,
      newLaunchFrameUrl,
      schema,
      teamMembers,
      updateDetail,
      uploadBrochure,
      uploadImages,
      uploadNewLaunchFrame,
      uploadVideos,
      uploading,
      userId,
    ],
  );

  const catalogFields: CreateFormCatalogFields = useMemo(
    () => ({
      stateId,
      cityId,
      propertyNameId,
      customPropertyName: propertySuffix,
      locationId,
      customLocation,
      microMarketId,
      microMarketName,
      customMicroMarket,
    }),
    [
      stateId,
      cityId,
      propertyNameId,
      propertySuffix,
      locationId,
      customLocation,
      microMarketId,
      microMarketName,
      customMicroMarket,
    ],
  );

  const applyCatalogFields = useCallback((patch: Partial<CreateFormCatalogFields>) => {
    if (patch.stateId !== undefined) setStateId(patch.stateId);
    if (patch.cityId !== undefined) setCityId(patch.cityId);
    if (patch.propertyNameId !== undefined) setPropertyNameId(patch.propertyNameId);
    if (patch.customPropertyName !== undefined)
      setPropertySuffix(patch.customPropertyName);
    if (patch.locationId !== undefined) setLocationId(patch.locationId);
    if (patch.customLocation !== undefined) setCustomLocation(patch.customLocation);
    if (patch.microMarketId !== undefined) setMicroMarketId(patch.microMarketId);
    if (patch.microMarketName !== undefined) setMicroMarketName(patch.microMarketName);
    if (patch.customMicroMarket !== undefined)
      setCustomMicroMarket(patch.customMicroMarket);
  }, []);

  const title = useMemo(
    () =>
      isCreate
        ? "Add listing"
        : detail?.title || detail?.propertyName || "Edit listing",
    [detail, isCreate],
  );

  useEffect(() => {
    onBreadcrumbTitle?.(title);
  }, [title, onBreadcrumbTitle]);

  const schemaModules = useMemo(
    () => developerDetailModulesToRender(schema),
    [schema],
  );

  const save = async () => {
    if (!categoryId || !buildingTypeId || !propertyTypeId) return;
    if (!isCreate && !detail) return;
    setSaving(true);
    setError("");
    try {
      for (const field of allSchemaFields(schema)) {
        if (field.type.toLowerCase() !== "location_advantage") continue;
        const st = parseLocationAdvantageFromDynamic(complex[field.key]);
        const locErr = validateLocationAdvantageForSave(st);
        if (locErr) {
          setError(locErr);
          setSaving(false);
          return;
        }
      }

      const edited = buildDetailsPayloadFromStrings(schema, details, complex);
      for (const field of allSchemaFields(schema)) {
        if (field.type.toLowerCase() !== "location_advantage") continue;
        const st = parseLocationAdvantageFromDynamic(complex[field.key]);
        edited[field.key] = locationAdvantageToApiPayload(st);
      }
      const merged = sanitizeListingDetailsForSave({
        ...loadedDynamicRef.current,
        ...edited,
      });
      if (floorRows.length) {
        merged._tableRows = floorRows;
      }
      if (isDeveloperCategory) {
        merged[DEV_FIELD.newLaunchFrame] = newLaunchFrameUrl;
      }
      const floorPricing = floorRowsToApi(floorRows);
      const suffix = propertySuffix.trim();
      const payload = {
        category_id: categoryId,
        building_type_id: buildingTypeId,
        property_type_id: propertyTypeId,
        city_id: cityId || undefined,
        forSaleInLocation: false,
        ...(propertyNameId
          ? { property_name_id: propertyNameId }
          : suffix
            ? { property_name: suffix }
            : {}),
        ...(locationId
          ? { location_id: locationId }
          : customLocation.trim()
            ? { location: customLocation.trim() }
            : {}),
        ...(microMarketId
          ? { micro_market_id: microMarketId }
          : customMicroMarket.trim() || microMarketName.trim()
            ? {
                microMarket:
                  customMicroMarket.trim() || microMarketName.trim(),
              }
            : {}),
        details: merged,
        ...(floorPricing.length ? { floor_pricing: floorPricing } : {}),
        ...(isDeveloperCategory ? { showAvailableUnit } : {}),
        editSection: "admin_developer_hub",
      };
      if (isCreate) {
        await listingsService.postAdminUserListing(userId, payload);
      } else {
        await listingsService.patchAdminUserListing(userId, listingId, payload);
      }
      onSaved?.();
      onBack();
    } catch (err) {
      setError(listingCreateApiError(err, "Failed to save listing."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500">
            {[detail?.locationName, detail?.microMarketName, detail?.cityName]
              .filter(Boolean)
              .join(" · ")}{" "}
            {!isCreate ? `· Status: ${detail?.status}` : null}
          </p>
        </div>
        <Button type="button" disabled={saving} onClick={() => void save()}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isCreate ? "Create draft" : "Save as owner"}
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      ) : null}

      <div className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">Listing type</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Category</label>
            <Select
              value={categoryId || undefined}
              onValueChange={(v) => setCategoryId(v ?? "")}
              disabled={lockCore || categories.length <= 1}
            >
              <SelectTrigger>
                {catalogOptionDisplayName(
                  categories,
                  categoryId,
                  detail?.categoryName ?? detail?.category?.name,
                ) ? (
                  <span className="truncate">
                    {catalogOptionDisplayName(
                      categories,
                      categoryId,
                      detail?.categoryName ?? detail?.category?.name,
                    )}
                  </span>
                ) : (
                  <SelectValue placeholder="Category" />
                )}
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Building type</label>
            <Select
              value={buildingTypeId || undefined}
              onValueChange={(v) => setBuildingTypeId(v ?? "")}
              disabled={lockCore || !categoryId}
            >
              <SelectTrigger>
                {catalogOptionDisplayName(
                  buildingTypes,
                  buildingTypeId,
                  detail?.buildingTypeName ?? detail?.buildingType?.name,
                ) ? (
                  <span className="truncate">
                    {catalogOptionDisplayName(
                      buildingTypes,
                      buildingTypeId,
                      detail?.buildingTypeName ?? detail?.buildingType?.name,
                    )}
                  </span>
                ) : (
                  <SelectValue placeholder="Building type" />
                )}
              </SelectTrigger>
              <SelectContent>
                {buildingTypes.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Property type</label>
            <Select
              value={propertyTypeId || undefined}
              onValueChange={(v) => setPropertyTypeId(v ?? "")}
              disabled={lockCore || !buildingTypeId}
            >
              <SelectTrigger>
                {catalogOptionDisplayName(
                  propertyTypes,
                  propertyTypeId,
                  detail?.propertyTypeName ?? detail?.propertyType?.name,
                ) ? (
                  <span className="truncate">
                    {catalogOptionDisplayName(
                      propertyTypes,
                      propertyTypeId,
                      detail?.propertyTypeName ?? detail?.propertyType?.name,
                    )}
                  </span>
                ) : (
                  <SelectValue placeholder="Property type" />
                )}
              </SelectTrigger>
              <SelectContent>
                {propertyTypes.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <DeveloperUserListingShell
        propertyTypeId={propertyTypeId}
        disabled={false}
        mode={isCreate ? "create" : "edit"}
        projectPrefix={projectPrefix}
        propertySuffix={propertySuffix}
        onPropertySuffixChange={setPropertySuffix}
        propertyNameId={propertyNameId}
        catalogFields={catalogFields}
        onCatalogFieldsChange={applyCatalogFields}
        onError={(msg) => setError(msg)}
        onCatalogWarning={(msg) => setCatalogWarning(msg)}
        locationSelectedLabel={detail?.locationName || undefined}
        microMarketSelectedLabel={detail?.microMarketName || undefined}
        stateSelectedLabel={detail?.stateName || undefined}
        citySelectedLabel={detail?.cityName || undefined}
        postFormUserId={userId}
        locationEnabledBeforePropertyType
        suppressPrefillForPropertyId={
          isCreate ? undefined : detail?.propertyNameId || undefined
        }
      />
      {catalogWarning ? (
        <p className="-mt-4 text-xs text-amber-700">{catalogWarning}</p>
      ) : null}

      {schema ? (
        <div className="space-y-6">
          {schemaModules.map((mod) =>
            mod.fields.length ? (
              <div
                key={mod.key}
                className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
              >
                <h2 className="text-sm font-semibold text-gray-900">{mod.label}</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {renderModuleFields(mod, renderField)}
                </div>
              </div>
            ) : null,
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          Form schema could not be loaded. Check category, building type, and property type.
        </p>
      )}

      {isDeveloperCategory ? (
        <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Admin settings</h2>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 rounded border-gray-300"
              checked={showAvailableUnit}
              onChange={(e) => setShowAvailableUnit(e.target.checked)}
            />
            <span className="flex flex-col gap-1">
              <span className="inline-flex items-center gap-1.5 font-medium text-gray-800">
                Show Available unit
                <span
                  className="inline-flex text-gray-400"
                  title="When enabled, the app shows the info icon next to price on the project page; tapping opens available unit details."
                  aria-label="When enabled, the app shows the info icon next to price on the project page; tapping opens available unit details."
                >
                  <Info className="size-4" />
                </span>
              </span>
              <span className="text-xs font-normal text-gray-500">
                Controls the info icon beside price on the Developer Property Detail page (not
                shown on developer listing forms in the app).
              </span>
            </span>
          </label>
        </div>
      ) : null}
    </div>
  );
}
