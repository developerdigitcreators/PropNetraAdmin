"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchableSelect } from "@/components/common/searchable-select";
import { Input } from "@/components/ui/input";
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
  type CreateFormPlaceLocation,
  type CreateFormPrefill,
  type CreateFormProperty,
} from "@/services/listings.service";
import { locationService } from "@/services/location.service";
import { Loader2 } from "lucide-react";

export type CreateFormCatalogFields = {
  stateId: string;
  cityId: string;
  propertyNameId: string;
  customPropertyName: string;
  locationId: string;
  customLocation: string;
  microMarketId: string;
  microMarketName: string;
  customMicroMarket: string;
};

type CreateFormCatalogSectionProps = {
  propertyTypeId: string;
  /** Hide property name picker (for sale in location title). Location fields still shown. */
  forSaleInLocation?: boolean;
  /** Developer hub: location only (property name in separate shell section). */
  hidePropertyName?: boolean;
  disabled?: boolean;
  fields: CreateFormCatalogFields;
  onFieldsChange: (patch: Partial<CreateFormCatalogFields>) => void;
  onError?: (message: string) => void;
  onCatalogWarning?: (message: string) => void;
  propertySelectedLabel?: string;
  /** When edit load has id but places list is empty — show name not UUID. */
  locationSelectedLabel?: string;
  microMarketSelectedLabel?: string;
  stateSelectedLabel?: string;
  citySelectedLabel?: string;
  /** Developer hub: state/city before property type (matches app shell). */
  locationEnabledBeforePropertyType?: boolean;
  /** Load approved places via app post-form API (owner-scoped). */
  postFormUserId?: string;
  mode?: "create" | "edit";
  /** Skip prefill API for this property id (existing listing row). */
  suppressPrefillForPropertyId?: string;
};

export function CreateFormCatalogSection({
  propertyTypeId,
  forSaleInLocation = false,
  hidePropertyName = false,
  disabled = false,
  fields,
  onFieldsChange,
  onError,
  onCatalogWarning,
  propertySelectedLabel,
  locationSelectedLabel,
  microMarketSelectedLabel,
  stateSelectedLabel,
  citySelectedLabel,
  mode = "create",
  suppressPrefillForPropertyId,
  locationEnabledBeforePropertyType = false,
  postFormUserId,
}: CreateFormCatalogSectionProps) {
  const {
    stateId,
    cityId,
    propertyNameId,
    customPropertyName,
    locationId,
    customLocation,
    microMarketId,
    microMarketName,
    customMicroMarket,
  } = fields;

  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [states, setStates] = useState<{ id: string; name: string }[]>([]);
  const [properties, setProperties] = useState<CreateFormProperty[]>([]);
  const [prefill, setPrefill] = useState<CreateFormPrefill | null>(null);
  const [cityLocations, setCityLocations] = useState<CreateFormPlaceLocation[]>(
    [],
  );
  const [cityMicroMarkets, setCityMicroMarkets] = useState<
    { id: string; name: string }[]
  >([]);
  const [propertySearch, setPropertySearch] = useState("");
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [loadingPrefill, setLoadingPrefill] = useState(false);
  const [loadingPlaces, setLoadingPlaces] = useState(false);

  const isCustomProperty =
    !forSaleInLocation &&
    !propertyNameId &&
    customPropertyName.trim().length >= 2;

  useEffect(() => {
    let cancelled = false;
    void locationService
      .getStates({ activeOnly: true })
      .then((rows: Array<{ id: string | number; name: string }>) => {
        if (!cancelled) {
          setStates(
            rows.map((s) => ({ id: String(s.id), name: String(s.name) })),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setStates([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void locationService
      .getCities({ activeOnly: true, stateId: stateId || undefined })
      .then((rows: Array<{ id: string | number; name: string }>) => {
        if (!cancelled) {
          setCities(
            rows.map((c) => ({ id: String(c.id), name: String(c.name) })),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setCities([]);
      });
    return () => {
      cancelled = true;
    };
  }, [stateId]);

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
          onError?.(
            listingCreateApiError(err, "Failed to search catalog properties."),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingProperties(false);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyTypeId, cityId, propertySearch, onError]);

  useEffect(() => {
    if (!propertyNameId) {
      setPrefill(null);
      return;
    }
    if (
      mode === "edit" &&
      suppressPrefillForPropertyId &&
      propertyNameId === suppressPrefillForPropertyId
    ) {
      return;
    }
    let cancelled = false;
    setLoadingPrefill(true);
    void listingsService
      .getCreatePropertyPrefill(propertyNameId)
      .then((next) => {
        if (cancelled) return;
        setPrefill(next);
        onFieldsChange({
          microMarketId: next.microMarketId || microMarketId,
          microMarketName: next.microMarketName || microMarketName,
          cityId: cityId || next.cityId || "",
          locationId:
            locationId ||
            (next.locations.length === 1
              ? next.locations[0].id
              : next.locationId || ""),
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setPrefill(null);
          const msg = listingCreateApiError(err, "Failed to load property prefill.");
          if (mode === "edit") {
            onCatalogWarning?.(msg);
          } else {
            onError?.(msg);
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPrefill(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- prefill when catalog property id changes only
  }, [propertyNameId, mode, suppressPrefillForPropertyId]);

  const needsCityPlaces =
    Boolean(cityId) &&
    (locationEnabledBeforePropertyType ||
      isCustomProperty ||
      forSaleInLocation);

  const catalogLocationPickers =
    isCustomProperty ||
    forSaleInLocation ||
    (locationEnabledBeforePropertyType && Boolean(cityId));

  const stateCityReady =
    locationEnabledBeforePropertyType || Boolean(propertyTypeId);

  useEffect(() => {
    if (!needsCityPlaces) {
      setCityLocations([]);
      setCityMicroMarkets([]);
      setLoadingPlaces(false);
      return;
    }
    let cancelled = false;
    setLoadingPlaces(true);
    const loadPlaces = postFormUserId
      ? listingsService.getDeveloperUserPostFormPlaces(postFormUserId, cityId)
      : listingsService.getCreateFormPlaces(cityId);
    void loadPlaces
      .then((places) => {
        if (cancelled) return;
        setCityLocations(places.locations);
        setCityMicroMarkets(places.microMarkets);
      })
      .catch((err) => {
        if (!cancelled) {
          setCityLocations([]);
          setCityMicroMarkets([]);
          onError?.(
            listingCreateApiError(err, "Failed to load locations for city."),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPlaces(false);
      });
    return () => {
      cancelled = true;
    };
  }, [needsCityPlaces, cityId, onError, postFormUserId]);

  const selectedProperty = properties.find((p) => p.id === propertyNameId);
  const selectedLocation =
    prefill?.locations.find((l) => l.id === locationId) ||
    cityLocations.find((l) => l.id === locationId) ||
    (locationId
      ? {
          id: locationId,
          name: customLocation || prefill?.locationName || locationId,
          microMarketId: null,
          microMarketName: null,
        }
      : null);

  const cityOptions = useMemo(
    () => cities.map((c) => ({ value: c.id, label: c.name })),
    [cities],
  );

  const stateOptions = useMemo(
    () => states.map((s) => ({ value: s.id, label: s.name })),
    [states],
  );

  const patch = (next: Partial<CreateFormCatalogFields>) => {
    if (!disabled) onFieldsChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">State</label>
        <SearchableSelect
          options={stateOptions}
          value={stateId}
          selectedLabel={
            stateSelectedLabel ||
            states.find((s) => s.id === stateId)?.name ||
            undefined
          }
          onValueChange={(v) => {
            patch({
              stateId: v,
              cityId: "",
              propertyNameId: "",
              locationId: "",
              customLocation: "",
              microMarketId: "",
              microMarketName: "",
              customMicroMarket: "",
            });
          }}
          disabled={disabled || !stateCityReady}
          placeholder={
            stateCityReady ? "Select state" : "Select property type first"
          }
          emptyText="No states found."
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">
          City
          {isCustomProperty ? (
            <span className="text-red-500"> *</span>
          ) : (
            <span className="font-normal text-gray-500"> (catalog filter)</span>
          )}
        </label>
        <SearchableSelect
          options={cityOptions}
          value={cityId}
          selectedLabel={
            citySelectedLabel ||
            cities.find((c) => c.id === cityId)?.name ||
            undefined
          }
          onValueChange={(v) => {
            patch({
              cityId: v,
              propertyNameId: "",
              locationId: "",
              customLocation: "",
              microMarketId: "",
              microMarketName: "",
              customMicroMarket: "",
            });
          }}
          disabled={disabled || !stateCityReady}
          placeholder={
            !stateCityReady
              ? locationEnabledBeforePropertyType
                ? "Select state"
                : "Select property type first"
              : !stateId
                ? "Select state first"
                : "Select city"
          }
          emptyText="No cities found."
        />
      </div>

      {!forSaleInLocation && !hidePropertyName ? (
        <div className="space-y-2">
          <label className="text-sm font-medium">Property name</label>
          <SearchableSelect
            options={properties.map((p) => ({
              value: p.id,
              label: p.cityName ? `${p.name} · ${p.cityName}` : p.name,
            }))}
            value={propertyNameId}
            onValueChange={(v) => {
              patch({
                propertyNameId: v,
                customPropertyName: "",
                customLocation: "",
                customMicroMarket: "",
              });
            }}
            onSearch={setPropertySearch}
            onInputChange={(text) => {
              patch({
                propertyNameId: "",
                customPropertyName: text,
                locationId: "",
                microMarketId: "",
                microMarketName: "",
              });
            }}
            onCreate={(q) => {
              patch({
                propertyNameId: "",
                customPropertyName: q,
                locationId: "",
                microMarketId: "",
                microMarketName: "",
              });
            }}
            allowCreate
            editable
            loading={loadingProperties}
            disabled={disabled || !propertyTypeId}
            placeholder={
              !propertyTypeId
                ? "Select property type first"
                : "Search approved catalog or type a new name"
            }
            emptyText="No catalog match. Type a name for review."
            selectedLabel={
              customPropertyName ||
              propertySelectedLabel ||
              (selectedProperty
                ? selectedProperty.cityName
                  ? `${selectedProperty.name} · ${selectedProperty.cityName}`
                  : selectedProperty.name
                : undefined)
            }
          />
          <p className="text-xs text-gray-500">
            Approved catalog names only; new names follow the same review flow as internal
            post create.
          </p>
        </div>
      ) : null}

      {loadingPrefill ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading location prefill…
        </div>
      ) : null}

      {prefill && !forSaleInLocation ? (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium">Location</label>
            {prefill.locations.length > 1 ? (
              <Select
                value={locationId || undefined}
                onValueChange={(v) => patch({ locationId: v ?? "" })}
                disabled={disabled}
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
                value={selectedLocation?.name || prefill.locationName || "—"}
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
      ) : catalogLocationPickers ? (
        <>
          {!cityId && locationEnabledBeforePropertyType ? (
            <p className="text-sm text-amber-700">
              Select state and city to load approved location and micro-market options.
            </p>
          ) : loadingPlaces && needsCityPlaces ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading places…
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                {isCustomProperty || locationEnabledBeforePropertyType ? (
                  <SearchableSelect
                    options={cityLocations.map((loc) => ({
                      value: loc.id,
                      label: loc.name,
                    }))}
                    value={locationId}
                    onValueChange={(v) => {
                      const loc = cityLocations.find((row) => row.id === v);
                      patch({
                        locationId: v,
                        customLocation: "",
                        ...(loc?.microMarketId
                          ? {
                              microMarketId: loc.microMarketId,
                              microMarketName: loc.microMarketName || "",
                              customMicroMarket: "",
                            }
                          : {}),
                      });
                    }}
                    onInputChange={(text) => {
                      patch({ locationId: "", customLocation: text });
                    }}
                    onCreate={(q) => {
                      patch({ locationId: "", customLocation: q });
                    }}
                    allowCreate
                    editable
                    disabled={disabled}
                    placeholder="Search location or type a new one"
                    emptyText="No saved locations. Type a name for review."
                    selectedLabel={
                      customLocation || locationSelectedLabel || undefined
                    }
                  />
                ) : (
                  <SearchableSelect
                    options={cityLocations.map((loc) => ({
                      value: loc.id,
                      label: loc.name,
                    }))}
                    value={locationId}
                    onValueChange={(v) => patch({ locationId: v, customLocation: "" })}
                    onInputChange={(text) =>
                      patch({ locationId: "", customLocation: text })
                    }
                    onCreate={(q) => patch({ locationId: "", customLocation: q })}
                    allowCreate
                    editable
                    disabled={disabled || !cityId}
                    placeholder={
                      cityId ? "Location" : "Select city to load locations"
                    }
                    emptyText="Select city first or type a location."
                    selectedLabel={
                      customLocation || locationSelectedLabel || undefined
                    }
                  />
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Micro market</label>
                <SearchableSelect
                  options={cityMicroMarkets.map((mm) => ({
                    value: mm.id,
                    label: mm.name,
                  }))}
                  value={microMarketId}
                  onValueChange={(v) => {
                    patch({
                      microMarketId: v,
                      customMicroMarket: "",
                      microMarketName:
                        cityMicroMarkets.find((row) => row.id === v)?.name || "",
                    });
                  }}
                  onInputChange={(text) => {
                    patch({
                      microMarketId: "",
                      customMicroMarket: text,
                      microMarketName: text,
                    });
                  }}
                  onCreate={(q) => {
                    patch({
                      microMarketId: "",
                      customMicroMarket: q,
                      microMarketName: q,
                    });
                  }}
                  allowCreate
                  editable
                  disabled={disabled || (!isCustomProperty && !cityId)}
                  placeholder={
                    cityId || isCustomProperty
                      ? "Search micro market or type a new one"
                      : "Select city first"
                  }
                  emptyText="No saved micro markets. Type a name for review."
                  selectedLabel={
                    customMicroMarket ||
                    microMarketName ||
                    microMarketSelectedLabel ||
                    undefined
                  }
                />
              </div>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
