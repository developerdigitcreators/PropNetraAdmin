"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PermissionGuard } from "@/components/common/permission-guard";
import { Breadcrumb } from "@/components/common/breadcrumb";
import { SearchableSelect } from "@/components/common/searchable-select";
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
import { locationService } from "@/services/location.service";
import {
  listingCreateApiError,
  listingsService,
  type CreateFormField,
  type CreateFormOption,
  type CreateFormPrefill,
  type CreateFormProperty,
  type CreateFormSchema,
  type StaffAssignee,
} from "@/services/listings.service";
import { BannerSlotCarousel } from "@/modules/listings/banner-slot-carousel";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/use-auth-store";
import { isSuperAdmin } from "@/lib/super-admin";
import { useFloatingToast } from "@/components/common/floating-toast";
import {
  SALES_TEAM_SECTION_ID,
  SalesTeamCard,
} from "@/modules/listings/sales-team-card";
import { RealtyAvenueBrandingCard } from "@/modules/listings/realty-avenue-branding-card";

const SKIP_DETAIL_KEYS = new Set([
  "category",
  "category_id",
  "building_type",
  "building_type_id",
  "property_type",
  "property_type_id",
  "property_name",
  "property_name_id",
  "location",
  "location_id",
  "micro_market",
  "micro_market_id",
  "micromarket",
  "price",
  "price_on_request",
  "owner_user_id",
  "owner",
]);

function normalizeKey(key: string) {
  return key
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function isSelectType(type: string) {
  const t = type.toLowerCase();
  return (
    t.includes("select") ||
    t.includes("dropdown") ||
    t === "enum" ||
    t === "radio"
  );
}

function isBooleanType(type: string) {
  const t = type.toLowerCase();
  return (
    t === "boolean" || t === "switch" || t === "checkbox" || t === "toggle"
  );
}

function isNumberType(type: string) {
  const t = type.toLowerCase();
  return (
    t === "number" || t === "integer" || t === "decimal" || t === "currency"
  );
}

function filterRenderableFields(fields: CreateFormField[]) {
  return fields.filter(
    (field) =>
      field.slot === "banner" ||
      field.type === "banner" ||
      !SKIP_DETAIL_KEYS.has(normalizeKey(field.key)),
  );
}

function staffOptionLabel(s: { name?: string; email?: string | null; contact?: string }) {
  return [s.name || s.email || "Admin", s.contact].filter(Boolean).join(" — ");
}

export function CreateVerifiedListingPanel() {
  const router = useRouter();
  const authUser = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const activeRole = useAuthStore((s) => s.activeRole);
  const accessToken = useAuthStore((s) => s.accessToken);
  const superAdmin = useMemo(
    () => isSuperAdmin({ user: authUser, permissions, activeRole, accessToken }),
    [authUser, permissions, activeRole, accessToken],
  );
  const { show: showToast, node: toastNode } = useFloatingToast();
  const selfId = authUser?.id?.trim() || "";
  const [salesTeam, setSalesTeam] = useState<StaffAssignee[]>([]);
  const [salesTeamLoaded, setSalesTeamLoaded] = useState(false);
  const [connectedStaffUserId, setConnectedStaffUserId] = useState("");

  const [categories, setCategories] = useState<CreateFormOption[]>([]);
  const [buildingTypes, setBuildingTypes] = useState<CreateFormOption[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<CreateFormOption[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [schema, setSchema] = useState<CreateFormSchema | null>(null);
  const [properties, setProperties] = useState<CreateFormProperty[]>([]);
  const [prefill, setPrefill] = useState<CreateFormPrefill | null>(null);

  const [categoryId, setCategoryId] = useState("");
  const [buildingTypeId, setBuildingTypeId] = useState("");
  const [propertyTypeId, setPropertyTypeId] = useState("");
  const [cityId, setCityId] = useState("");
  const [propertyNameId, setPropertyNameId] = useState("");
  const [customPropertyName, setCustomPropertyName] = useState("");
  const [locationId, setLocationId] = useState("");
  const [customLocation, setCustomLocation] = useState("");
  const [microMarketId, setMicroMarketId] = useState("");
  const [microMarketName, setMicroMarketName] = useState("");
  const [customMicroMarket, setCustomMicroMarket] = useState("");
  const [price, setPrice] = useState("");
  const [priceOnRequest, setPriceOnRequest] = useState(false);
  const [details, setDetails] = useState<Record<string, string>>({});
  const [propertySearch, setPropertySearch] = useState("");
  const [leadContactName, setLeadContactName] = useState("");
  const [leadContactPhone, setLeadContactPhone] = useState("");
  const [leadUnitNo, setLeadUnitNo] = useState("");

  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingBuildingTypes, setLoadingBuildingTypes] = useState(false);
  const [loadingPropertyTypes, setLoadingPropertyTypes] = useState(false);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [loadingPrefill, setLoadingPrefill] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [baseline, setBaseline] = useState("");

  const formSnapshot = useMemo(
    () =>
      JSON.stringify({
        categoryId,
        buildingTypeId,
        propertyTypeId,
        cityId,
        propertyNameId,
        customPropertyName,
        locationId,
        customLocation,
        microMarketId,
        microMarketName,
        customMicroMarket,
        price,
        priceOnRequest,
        details,
        propertySearch,
        leadContactName,
        leadContactPhone,
        leadUnitNo,
      }),
    [
      categoryId,
      buildingTypeId,
      propertyTypeId,
      cityId,
      propertyNameId,
      customPropertyName,
      locationId,
      customLocation,
      microMarketId,
      microMarketName,
      customMicroMarket,
      price,
      priceOnRequest,
      details,
      propertySearch,
      leadContactName,
      leadContactPhone,
      leadUnitNo,
    ],
  );

  useEffect(() => {
    // Capture empty baseline once categories finish loading.
    if (loadingCategories || baseline) return;
    setBaseline(formSnapshot);
  }, [loadingCategories, formSnapshot, baseline]);

  const dirty = Boolean(baseline) && formSnapshot !== baseline;
  const [salesTeamDirty, setSalesTeamDirty] = useState(false);
  const [brandingDirty, setBrandingDirty] = useState(false);

  const { dialog } = useUnsavedChangesGuard({
    dirty: dirty || salesTeamDirty || brandingDirty,
  });

  const applySalesTeam = useCallback(
    (members: StaffAssignee[]) => {
      setSalesTeam(members);
      setSalesTeamLoaded(true);
      setConnectedStaffUserId((prev) => {
        if (!members.length) return selfId;
        return members.some((m) => m.id === prev) ? prev : "";
      });
    },
    [selfId],
  );

  useEffect(() => {
    let cancelled = false;
    void listingsService
      .getSalesTeam()
      .then((members) => {
        if (!cancelled) applySalesTeam(members);
      })
      .catch((err) => {
        if (cancelled) return;
        applySalesTeam([]);
        showToast(listingCreateApiError(err, "Failed to load sales team."), "error");
      });
    return () => {
      cancelled = true;
    };
  }, [applySalesTeam, showToast]);

  useEffect(() => {
    let cancelled = false;
    void listingsService
      .getCreateCategories()
      .then((rows) => {
        if (!cancelled)
          setCategories(rows.filter((r) => r.is_active !== false));
      })
      .catch((err) => {
        if (!cancelled) {
          setCategories([]);
          setError(listingCreateApiError(err, "Failed to load categories."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCategories(false);
      });

    void locationService
      .getCities({ activeOnly: true })
      .then((data) => {
        if (cancelled) return;
        const rows = Array.isArray(data) ? data : [];
        setCities(
          rows
            .map((c: { id?: string; name?: string }) => ({
              id: String(c.id || ""),
              name: String(c.name || ""),
            }))
            .filter((c) => c.id && c.name),
        );
      })
      .catch(() => {
        if (!cancelled) setCities([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!categoryId) {
      setBuildingTypes([]);
      return;
    }
    let cancelled = false;
    setLoadingBuildingTypes(true);
    void listingsService
      .getCreateBuildingTypes(categoryId)
      .then((rows) => {
        if (!cancelled)
          setBuildingTypes(rows.filter((r) => r.is_active !== false));
      })
      .catch((err) => {
        if (!cancelled) {
          setBuildingTypes([]);
          setError(
            listingCreateApiError(err, "Failed to load building types."),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingBuildingTypes(false);
      });
    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  useEffect(() => {
    if (!buildingTypeId) {
      setPropertyTypes([]);
      return;
    }
    let cancelled = false;
    setLoadingPropertyTypes(true);
    void listingsService
      .getCreatePropertyTypes(buildingTypeId, categoryId)
      .then((rows) => {
        if (!cancelled)
          setPropertyTypes(rows.filter((r) => r.is_active !== false));
      })
      .catch((err) => {
        if (!cancelled) {
          setPropertyTypes([]);
          setError(
            listingCreateApiError(err, "Failed to load property types."),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPropertyTypes(false);
      });
    return () => {
      cancelled = true;
    };
  }, [buildingTypeId, categoryId]);

  useEffect(() => {
    if (!categoryId || !buildingTypeId || !propertyTypeId) {
      setSchema(null);
      setDetails({});
      return;
    }
    let cancelled = false;
    setLoadingSchema(true);
    void listingsService
      .getCreateSchema({ categoryId, buildingTypeId, propertyTypeId })
      .then((next) => {
        if (cancelled) return;
        setSchema(next);
        setDetails({});
      })
      .catch((err) => {
        if (!cancelled) {
          setSchema(null);
          setError(listingCreateApiError(err, "Failed to load form schema."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSchema(false);
      });
    return () => {
      cancelled = true;
    };
  }, [categoryId, buildingTypeId, propertyTypeId]);

  useEffect(() => {
    if (!propertyTypeId) {
      setProperties([]);
      return;
    }
    let cancelled = false;
    setLoadingProperties(true);
    void listingsService
      .searchCreateProperties({
        q: propertySearch,
        propertyTypeId,
        cityId: cityId || undefined,
      })
      .then((rows) => {
        if (!cancelled) setProperties(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setProperties([]);
          setError(listingCreateApiError(err, "Failed to search properties."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingProperties(false);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyTypeId, cityId, propertySearch]);

  useEffect(() => {
    if (!propertyNameId) {
      setPrefill(null);
      setLocationId("");
      setMicroMarketId("");
      setMicroMarketName("");
      return;
    }
    let cancelled = false;
    setLoadingPrefill(true);
    void listingsService
      .getCreatePropertyPrefill(propertyNameId)
      .then((next) => {
        if (cancelled) return;
        setPrefill(next);
        setMicroMarketId(next.microMarketId);
        setMicroMarketName(next.microMarketName);
        if (next.locations.length === 1) {
          setLocationId(next.locations[0].id);
        } else if (next.locationId) {
          setLocationId(next.locationId);
        } else {
          setLocationId("");
        }
        if (next.cityId) {
          setCityId((prev) => prev || next.cityId || "");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setPrefill(null);
          setError(
            listingCreateApiError(err, "Failed to load property prefill."),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPrefill(false);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyNameId]);

  const detailModules = useMemo(() => {
    if (!schema) return [];
    if (schema.modules.length > 0) {
      return schema.modules
        .map((mod) => ({
          ...mod,
          fields: filterRenderableFields(mod.fields),
        }))
        .filter((mod) => mod.fields.length > 0);
    }
    const fields = filterRenderableFields(schema.fields);
    return fields.length > 0
      ? [{ key: "details", label: "Listing details", fields }]
      : [];
  }, [schema]);

  const detailFieldsCount = detailModules.reduce(
    (sum, mod) => sum + mod.fields.length,
    0,
  );

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedBuildingType = buildingTypes.find(
    (b) => b.id === buildingTypeId,
  );
  const selectedPropertyType = propertyTypes.find(
    (p) => p.id === propertyTypeId,
  );
  const connectedOptions = useMemo(
    () =>
      salesTeam.length
        ? salesTeam.map((m) => ({ value: m.id, label: staffOptionLabel(m) }))
        : selfId
          ? [
              {
                value: selfId,
                label: staffOptionLabel({
                  name: authUser?.name?.trim(),
                  email: authUser?.email,
                  contact: authUser?.contact?.trim(),
                }),
              },
            ]
          : [],
    [salesTeam, selfId, authUser?.name, authUser?.email, authUser?.contact],
  );
  const selectedProperty = properties.find((p) => p.id === propertyNameId);
  const isCustomProperty =
    !propertyNameId && customPropertyName.trim().length >= 2;
  const selectedLocation =
    prefill?.locations.find((l) => l.id === locationId) ||
    (locationId
      ? { id: locationId, name: prefill?.locationName || locationId }
      : null);

  const canSubmit =
    !!categoryId &&
    !!buildingTypeId &&
    !!propertyTypeId &&
    (!!propertyNameId || customPropertyName.trim().length >= 2) &&
    (!isCustomProperty || !!cityId) &&
    (!!locationId || customLocation.trim().length >= 2) &&
    (!!microMarketId ||
      customMicroMarket.trim().length >= 2 ||
      !!microMarketName.trim()) &&
    leadContactName.trim().length >= 2 &&
    /^\d{10}$/.test(leadContactPhone.trim()) &&
    !!connectedStaffUserId &&
    (priceOnRequest || !!price.trim()) &&
    !submitting;

  const resetDownstreamFromCategory = () => {
    setBuildingTypeId("");
    setPropertyTypeId("");
    setPropertyNameId("");
    setCustomPropertyName("");
    setLocationId("");
    setCustomLocation("");
    setMicroMarketId("");
    setMicroMarketName("");
    setCustomMicroMarket("");
    setPrefill(null);
    setSchema(null);
    setDetails({});
    setPrice("");
    setPriceOnRequest(false);
  };

  const updateDetail = (key: string, value: string) => {
    setDetails((prev) => ({ ...prev, [key]: value }));
  };

  const renderField = (field: CreateFormField) => {
    if (field.slot === "banner" || field.type === "banner") {
      return (
        <div key={field.key} className="space-y-2 sm:col-span-2">
          {field.label ? (
            <h3 className="text-sm font-medium text-gray-700">{field.label}</h3>
          ) : null}
          <BannerSlotCarousel
            bannerPlacement={field.bannerPlacement}
            cityId={cityId || undefined}
          />
        </div>
      );
    }
    const value = details[field.key] ?? "";
    if (isBooleanType(field.type)) {
      return (
        <div
          key={field.key}
          className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
        >
          <label className="text-sm font-medium text-gray-700">
            {field.label}
            {field.required ? <span className="text-red-500"> *</span> : null}
          </label>
          <Switch
            checked={value === "true" || value === "1" || value === "yes"}
            onCheckedChange={(checked) =>
              updateDetail(field.key, checked ? "true" : "false")
            }
          />
        </div>
      );
    }

    if (isSelectType(field.type) && (field.options?.length || 0) > 0) {
      const selectedLabel = field.options?.find(
        (o) => o.value === value,
      )?.label;
      return (
        <div key={field.key} className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            {field.label}
            {field.required ? <span className="text-red-500"> *</span> : null}
          </label>
          <Select
            value={value || undefined}
            onValueChange={(v) => updateDetail(field.key, v ?? "")}
          >
            <SelectTrigger className="w-full">
              {selectedLabel ? (
                <span>{selectedLabel}</span>
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

    return (
      <div key={field.key} className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          {field.label}
          {field.required ? <span className="text-red-500"> *</span> : null}
        </label>
        <Input
          type={isNumberType(field.type) ? "number" : "text"}
          value={value}
          onChange={(e) => updateDetail(field.key, e.target.value)}
          placeholder={field.placeholder || field.label}
        />
      </div>
    );
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const detailsPayload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(details)) {
        if (value === "" || value == null) continue;
        const field = schema?.fields.find((item) => item.key === key);
        if (field?.slot === "banner" || field?.type === "banner") continue;
        if (value === "true") detailsPayload[key] = true;
        else if (value === "false") detailsPayload[key] = false;
        else if (/^-?\d+(\.\d+)?$/.test(value))
          detailsPayload[key] = Number(value);
        else detailsPayload[key] = value;
      }

      const created = await listingsService.createVerifiedListing({
        category_id: categoryId,
        building_type_id: buildingTypeId,
        property_type_id: propertyTypeId,
        ...(propertyNameId
          ? { property_name_id: propertyNameId }
          : { property_name: customPropertyName.trim() }),
        ...(locationId
          ? { location_id: locationId }
          : { location: customLocation.trim() }),
        ...(microMarketId
          ? { micro_market_id: microMarketId }
          : {
              microMarket:
                customMicroMarket.trim() || microMarketName.trim(),
            }),
        city_id: cityId || undefined,
        price_on_request: priceOnRequest,
        price: priceOnRequest ? null : Number(price),
        lead_contact_name: leadContactName.trim(),
        lead_contact_phone: leadContactPhone.trim(),
        lead_unit_no: leadUnitNo.trim() || undefined,
        connected_staff_user_id: connectedStaffUserId,
        details: detailsPayload,
      });

      const pending = created?.meta?.pendingReview === true;
      showToast(
        pending
          ? "Internal post created. Sent to Review Listing for Save to DB / Approve."
          : "Internal post created. It will appear under Property listing.",
      );
      setBaseline(formSnapshot);
      setTimeout(
        () => router.push(pending ? "/moderation" : "/my-listings"),
        800,
      );
    } catch (err) {
      showToast(
        listingCreateApiError(err, "Failed to create internal post."),
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PermissionGuard
      permission={["locations:read", "listings:create"]}
      fallback={
        <div className="p-12 text-center text-gray-500">
          You do not have permission to create verified listings.
        </div>
      }
    >
      <div className="mx-auto max-w-3xl space-y-6 pb-16">
        <Breadcrumb
          items={[
            { label: "Review Listing", href: "/moderation" },
            { label: "Add Internal post" },
          ]}
        />

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Add Internal post
          </h1>
          <p className="mt-1 text-gray-500">
            Posts as Realty Avenue. Catalog properties go live as verified.
            A typed property name goes to Review Listing for the same Save-to-DB
            / Approve flow as the app. Owner contact stays admin-only.
          </p>
        </div>

        {superAdmin ? (
          <>
            <SalesTeamCard
              onSaved={applySalesTeam}
              onToast={showToast}
              onDirtyChange={setSalesTeamDirty}
            />
            <RealtyAvenueBrandingCard
              canEdit
              onToast={showToast}
              onDirtyChange={setBrandingDirty}
            />
          </>
        ) : null}

        {error ? (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <div className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <Select
              value={categoryId || undefined}
              onValueChange={(v) => {
                setError("");
                setCategoryId(v ?? "");
                resetDownstreamFromCategory();
              }}
              disabled={loadingCategories}
            >
              <SelectTrigger className="w-full">
                {selectedCategory ? (
                  <span>{selectedCategory.name}</span>
                ) : (
                  <SelectValue
                    placeholder={
                      loadingCategories ? "Loading…" : "Select category"
                    }
                  />
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

          <div className="space-y-2">
            <label className="text-sm font-medium">Building type</label>
            <Select
              value={buildingTypeId || undefined}
              onValueChange={(v) => {
                setBuildingTypeId(v ?? "");
                setPropertyTypeId("");
                setPropertyNameId("");
                setCustomPropertyName("");
                setLocationId("");
                setCustomLocation("");
                setMicroMarketId("");
                setMicroMarketName("");
                setCustomMicroMarket("");
                setPrefill(null);
                setSchema(null);
                setDetails({});
              }}
              disabled={!categoryId || loadingBuildingTypes}
            >
              <SelectTrigger className="w-full">
                {selectedBuildingType ? (
                  <span>{selectedBuildingType.name}</span>
                ) : (
                  <SelectValue
                    placeholder={
                      !categoryId
                        ? "Select category first"
                        : loadingBuildingTypes
                          ? "Loading…"
                          : "Select building type"
                    }
                  />
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

          <div className="space-y-2">
            <label className="text-sm font-medium">Property type</label>
            <Select
              value={propertyTypeId || undefined}
              onValueChange={(v) => {
                setPropertyTypeId(v ?? "");
                setPropertyNameId("");
                setCustomPropertyName("");
                setLocationId("");
                setCustomLocation("");
                setMicroMarketId("");
                setMicroMarketName("");
                setCustomMicroMarket("");
                setPrefill(null);
                setDetails({});
              }}
              disabled={!buildingTypeId || loadingPropertyTypes}
            >
              <SelectTrigger className="w-full">
                {selectedPropertyType ? (
                  <span>{selectedPropertyType.name}</span>
                ) : (
                  <SelectValue
                    placeholder={
                      !buildingTypeId
                        ? "Select building type first"
                        : loadingPropertyTypes
                          ? "Loading…"
                          : "Select property type"
                    }
                  />
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

          <div className="space-y-2">
            <label className="text-sm font-medium">
              City{isCustomProperty ? <span className="text-red-500"> *</span> : " filter (optional)"}
            </label>
            <SearchableSelect
              options={cities.map((c) => ({ value: c.id, label: c.name }))}
              value={cityId}
              onValueChange={(v) => {
                setCityId(v);
                setPropertyNameId("");
                setLocationId("");
                setCustomLocation("");
                setMicroMarketId("");
                setMicroMarketName("");
                setPrefill(null);
              }}
              disabled={!propertyTypeId}
              placeholder="All cities"
              emptyText="No cities found."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Property name <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={properties.map((p) => ({
                value: p.id,
                label: p.cityName ? `${p.name} · ${p.cityName}` : p.name,
              }))}
              value={propertyNameId}
              onValueChange={(v) => {
                setPropertyNameId(v);
                setCustomPropertyName("");
                setCustomLocation("");
                setCustomMicroMarket("");
              }}
              onSearch={setPropertySearch}
              onInputChange={(text) => {
                setPropertyNameId("");
                setCustomPropertyName(text);
                setPrefill(null);
                setLocationId("");
                setMicroMarketId("");
                setMicroMarketName("");
              }}
              onCreate={(q) => {
                setPropertyNameId("");
                setCustomPropertyName(q);
                setPrefill(null);
                setLocationId("");
                setMicroMarketId("");
                setMicroMarketName("");
              }}
              allowCreate
              editable
              loading={loadingProperties}
              disabled={!propertyTypeId}
              placeholder={
                !propertyTypeId
                  ? "Select property type first"
                  : "Search catalog or type a new property name"
              }
              emptyText="No catalog match. Type a name to send it for review."
              selectedLabel={
                customPropertyName ||
                (selectedProperty
                  ? selectedProperty.cityName
                    ? `${selectedProperty.name} · ${selectedProperty.cityName}`
                    : selectedProperty.name
                  : undefined)
              }
            />
            <p className="text-xs text-gray-500">
              Pick an approved name to go live now. Type a new name to create a
              pending catalog row for Review Listing.
            </p>
          </div>

          {loadingPrefill ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading location
              prefill…
            </div>
          ) : null}

          {prefill ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Location <span className="text-red-500">*</span>
                </label>
                {prefill.locations.length > 1 ? (
                  <Select
                    value={locationId || undefined}
                    onValueChange={(v) => setLocationId(v ?? "")}
                  >
                    <SelectTrigger className="w-full">
                      {selectedLocation ? (
                        <span>{selectedLocation.name}</span>
                      ) : (
                        <SelectValue placeholder="Select location" />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {prefill.locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={
                      selectedLocation?.name || prefill.locationName || "—"
                    }
                    disabled
                  />
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Micro market</label>
                <Input
                  value={microMarketName || prefill.microMarketName || "—"}
                  disabled
                />
              </div>
            </>
          ) : isCustomProperty ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Location <span className="text-red-500">*</span>
                </label>
                <Input
                  value={customLocation}
                  onChange={(e) => {
                    setCustomLocation(e.target.value);
                    setLocationId("");
                  }}
                  placeholder="Type location (goes to review if new)"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Micro market <span className="text-red-500">*</span>
                </label>
                <Input
                  value={customMicroMarket}
                  onChange={(e) => {
                    setCustomMicroMarket(e.target.value);
                    setMicroMarketId("");
                    setMicroMarketName(e.target.value);
                  }}
                  placeholder="Type micro market (goes to review if new)"
                />
              </div>
            </>
          ) : null}

          <div className="space-y-4 border-t border-gray-100 pt-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Seller contact (internal)
              </h2>
              <p className="text-xs text-gray-500">
                For admin-panel reference only. App users will not see this
                contact on reveal.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Unit No</label>
                <Input
                  value={leadUnitNo}
                  onChange={(e) => setLeadUnitNo(e.target.value)}
                  placeholder="e.g. A-1204"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Seller name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={leadContactName}
                  onChange={(e) => setLeadContactName(e.target.value)}
                  placeholder="Seller name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Seller phone <span className="text-red-500">*</span>
                </label>
                <Input
                  value={leadContactPhone}
                  onChange={(e) =>
                    setLeadContactPhone(
                      e.target.value.replace(/\D/g, "").slice(0, 10),
                    )
                  }
                  placeholder="10-digit mobile"
                  inputMode="numeric"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Connect admin panel user <span className="text-red-500">*</span>
              </label>
              {!selfId && !salesTeam.length ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Could not resolve the logged-in admin user. Sign out and sign
                  in again, then retry.
                </p>
              ) : (
                <SearchableSelect
                  options={connectedOptions}
                  value={connectedStaffUserId}
                  onValueChange={setConnectedStaffUserId}
                  disabled={!salesTeamLoaded || submitting}
                  loading={!salesTeamLoaded}
                  placeholder={
                    salesTeamLoaded ? "Select sales team member" : "Loading…"
                  }
                  searchPlaceholder="Search by name or contact"
                  emptyText="No sales team members."
                />
              )}
              {salesTeamLoaded && !salesTeam.length ? (
                <p className="text-xs text-amber-700">
                  No sales team configured. The post will be connected to you.
                  {superAdmin ? (
                    <>
                      {" "}
                      <button
                        type="button"
                        className="font-medium text-primary underline-offset-2 hover:underline"
                        onClick={() =>
                          document
                            .getElementById(SALES_TEAM_SECTION_ID)
                            ?.scrollIntoView({ behavior: "smooth" })
                        }
                      >
                        Set up sales team
                      </button>
                    </>
                  ) : null}
                </p>
              ) : null}
              <p className="text-xs text-gray-500">
                Leads for this post will be assigned to this user.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
            <div>
              <p className="text-sm font-medium text-gray-700">
                Price on request
              </p>
              <p className="text-xs text-gray-500">
                If on, numeric price is not sent.
              </p>
            </div>
            <Switch
              checked={priceOnRequest}
              onCheckedChange={(checked) => {
                setPriceOnRequest(checked);
                if (checked) setPrice("");
              }}
            />
          </div>

          {!priceOnRequest ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Price <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 15000000"
              />
            </div>
          ) : null}

          {loadingSchema ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading form fields…
            </div>
          ) : !propertyNameId && !isCustomProperty ? (
            <p className="border-t border-gray-100 pt-4 text-sm text-gray-500">
              Select or type a property name to load the remaining form modules
              for this property type.
            </p>
          ) : detailFieldsCount > 0 ? (
            <div className="space-y-6 border-t border-gray-100 pt-4">
              {detailModules.map((mod) => (
                <div key={mod.key} className="space-y-4">
                  <h2 className="text-sm font-semibold text-gray-900">
                    {mod.label}
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {mod.fields.map(renderField)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="border-t border-gray-100 pt-4 text-sm text-amber-700">
              No form-module fields are configured as visible for this category
              / building type / property type. Check Listings Config.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Link
              href="/moderation"
              className={`inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted ${
                submitting ? "pointer-events-none opacity-50" : ""
              }`}
              aria-disabled={submitting}
              onClick={(e) => {
                if (submitting) e.preventDefault();
              }}
            >
              Cancel
            </Link>
            <Button
              onClick={() => void handleSubmit()}
              disabled={!canSubmit}
              className="bg-primary text-white hover:bg-primary/90"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Internal post
            </Button>
          </div>
        </div>
      </div>
      {dialog}
      {toastNode}
    </PermissionGuard>
  );
}
