'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { SearchableSelect } from '@/components/common/searchable-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { locationService } from '@/services/location.service';
import {
  isCreateCategoryDisabled,
  listingCreateApiError,
  listingsService,
  type CreateFormField,
  type CreateFormOption,
  type CreateFormPrefill,
  type CreateFormProperty,
  type CreateFormSchema,
} from '@/services/listings.service';
import { Loader2 } from 'lucide-react';

const SKIP_DETAIL_KEYS = new Set([
  'category',
  'category_id',
  'building_type',
  'building_type_id',
  'property_type',
  'property_type_id',
  'property_name',
  'property_name_id',
  'location',
  'location_id',
  'micro_market',
  'micro_market_id',
  'micromarket',
  'price',
  'price_on_request',
  'owner_user_id',
  'owner',
]);

function normalizeKey(key: string) {
  return key.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function isSelectType(type: string) {
  const t = type.toLowerCase();
  return t.includes('select') || t.includes('dropdown') || t === 'enum' || t === 'radio';
}

function isBooleanType(type: string) {
  const t = type.toLowerCase();
  return t === 'boolean' || t === 'switch' || t === 'checkbox' || t === 'toggle';
}

function isNumberType(type: string) {
  const t = type.toLowerCase();
  return t === 'number' || t === 'integer' || t === 'decimal' || t === 'currency';
}

function filterRenderableFields(fields: CreateFormField[]) {
  return fields.filter((field) => !SKIP_DETAIL_KEYS.has(normalizeKey(field.key)));
}

export function CreateVerifiedListingPanel() {
  const router = useRouter();

  const [categories, setCategories] = useState<CreateFormOption[]>([]);
  const [buildingTypes, setBuildingTypes] = useState<CreateFormOption[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<CreateFormOption[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [schema, setSchema] = useState<CreateFormSchema | null>(null);
  const [properties, setProperties] = useState<CreateFormProperty[]>([]);
  const [prefill, setPrefill] = useState<CreateFormPrefill | null>(null);

  const [categoryId, setCategoryId] = useState('');
  const [buildingTypeId, setBuildingTypeId] = useState('');
  const [propertyTypeId, setPropertyTypeId] = useState('');
  const [cityId, setCityId] = useState('');
  const [propertyNameId, setPropertyNameId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [microMarketId, setMicroMarketId] = useState('');
  const [microMarketName, setMicroMarketName] = useState('');
  const [price, setPrice] = useState('');
  const [priceOnRequest, setPriceOnRequest] = useState(false);
  const [details, setDetails] = useState<Record<string, string>>({});
  const [propertySearch, setPropertySearch] = useState('');

  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingBuildingTypes, setLoadingBuildingTypes] = useState(false);
  const [loadingPropertyTypes, setLoadingPropertyTypes] = useState(false);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [loadingPrefill, setLoadingPrefill] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;
    void listingsService
      .getCreateCategories()
      .then((rows) => {
        if (!cancelled) setCategories(rows.filter((r) => r.is_active !== false));
      })
      .catch((err) => {
        if (!cancelled) {
          setCategories([]);
          setError(listingCreateApiError(err, 'Failed to load categories.'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCategories(false);
      });

    void locationService
      .getCities()
      .then((data) => {
        if (cancelled) return;
        const rows = Array.isArray(data) ? data : [];
        setCities(
          rows
            .map((c: { id?: string; name?: string }) => ({
              id: String(c.id || ''),
              name: String(c.name || ''),
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
        if (!cancelled) setBuildingTypes(rows.filter((r) => r.is_active !== false));
      })
      .catch((err) => {
        if (!cancelled) {
          setBuildingTypes([]);
          setError(listingCreateApiError(err, 'Failed to load building types.'));
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
      .getCreatePropertyTypes(buildingTypeId)
      .then((rows) => {
        if (!cancelled) setPropertyTypes(rows.filter((r) => r.is_active !== false));
      })
      .catch((err) => {
        if (!cancelled) {
          setPropertyTypes([]);
          setError(listingCreateApiError(err, 'Failed to load property types.'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPropertyTypes(false);
      });
    return () => {
      cancelled = true;
    };
  }, [buildingTypeId]);

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
          setError(listingCreateApiError(err, 'Failed to load form schema.'));
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
          setError(listingCreateApiError(err, 'Failed to search properties.'));
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
      setLocationId('');
      setMicroMarketId('');
      setMicroMarketName('');
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
          setLocationId('');
        }
        if (next.cityId) {
          setCityId((prev) => prev || next.cityId || '');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setPrefill(null);
          setError(listingCreateApiError(err, 'Failed to load property prefill.'));
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
    return fields.length > 0 ? [{ key: 'details', label: 'Listing details', fields }] : [];
  }, [schema]);

  const detailFieldsCount = detailModules.reduce((sum, mod) => sum + mod.fields.length, 0);

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedBuildingType = buildingTypes.find((b) => b.id === buildingTypeId);
  const selectedPropertyType = propertyTypes.find((p) => p.id === propertyTypeId);
  const selectedProperty = properties.find((p) => p.id === propertyNameId);
  const selectedLocation =
    prefill?.locations.find((l) => l.id === locationId) ||
    (locationId
      ? { id: locationId, name: prefill?.locationName || locationId }
      : null);

  const canSubmit =
    !!categoryId &&
    !!buildingTypeId &&
    !!propertyTypeId &&
    !!propertyNameId &&
    !!locationId &&
    !!microMarketId &&
    (priceOnRequest || !!price.trim()) &&
    !submitting;

  const resetDownstreamFromCategory = () => {
    setBuildingTypeId('');
    setPropertyTypeId('');
    setPropertyNameId('');
    setLocationId('');
    setMicroMarketId('');
    setMicroMarketName('');
    setPrefill(null);
    setSchema(null);
    setDetails({});
    setPrice('');
    setPriceOnRequest(false);
  };

  const updateDetail = (key: string, value: string) => {
    setDetails((prev) => ({ ...prev, [key]: value }));
  };

  const renderField = (field: CreateFormField) => {
    const value = details[field.key] ?? '';
    if (isBooleanType(field.type)) {
      return (
        <div key={field.key} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
          <label className="text-sm font-medium text-gray-700">
            {field.label}
            {field.required ? <span className="text-red-500"> *</span> : null}
          </label>
          <Switch
            checked={value === 'true' || value === '1' || value === 'yes'}
            onCheckedChange={(checked) => updateDetail(field.key, checked ? 'true' : 'false')}
          />
        </div>
      );
    }

    if (isSelectType(field.type) && (field.options?.length || 0) > 0) {
      const selectedLabel = field.options?.find((o) => o.value === value)?.label;
      return (
        <div key={field.key} className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            {field.label}
            {field.required ? <span className="text-red-500"> *</span> : null}
          </label>
          <Select value={value || undefined} onValueChange={(v) => updateDetail(field.key, v ?? '')}>
            <SelectTrigger className="w-full">
              {selectedLabel ? <span>{selectedLabel}</span> : <SelectValue placeholder={`Select ${field.label}`} />}
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
          type={isNumberType(field.type) ? 'number' : 'text'}
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
    setError('');
    setSuccess('');
    try {
      const detailsPayload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(details)) {
        if (value === '' || value == null) continue;
        if (value === 'true') detailsPayload[key] = true;
        else if (value === 'false') detailsPayload[key] = false;
        else if (/^-?\d+(\.\d+)?$/.test(value)) detailsPayload[key] = Number(value);
        else detailsPayload[key] = value;
      }

      await listingsService.createVerifiedListing({
        category_id: categoryId,
        building_type_id: buildingTypeId,
        property_type_id: propertyTypeId,
        property_name_id: propertyNameId,
        location_id: locationId,
        micro_market_id: microMarketId,
        price_on_request: priceOnRequest,
        price: priceOnRequest ? null : Number(price),
        details: detailsPayload,
      });

      setSuccess('Verified listing created. It will appear under Approved Listings.');
      setTimeout(() => router.push('/moderation'), 800);
    } catch (err) {
      setError(listingCreateApiError(err, 'Failed to create verified listing.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PermissionGuard
      permission={['locations:read', 'listings:create']}
      fallback={
        <div className="p-12 text-center text-gray-500">
          You do not have permission to create verified listings.
        </div>
      }
    >
      <div className="mx-auto max-w-3xl space-y-6 pb-16">
        <Breadcrumb
          items={[
            { label: 'Review Listing', href: '/moderation' },
            { label: 'Add Post' },
          ]}
        />

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Add Post</h1>
          <p className="mt-1 text-gray-500">
            Create a verified listing from catalog only. It goes live as published + verified and
            notifies property-type + Verified Listing groups.
          </p>
        </div>

        {error ? <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div> : null}
        {success ? (
          <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</div>
        ) : null}

        <div className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <Select
              value={categoryId || undefined}
              onValueChange={(v) => {
                const next = v ?? '';
                const option = categories.find((c) => c.id === next);
                if (option && isCreateCategoryDisabled(option)) return;
                setError('');
                setCategoryId(next);
                resetDownstreamFromCategory();
              }}
              disabled={loadingCategories}
            >
              <SelectTrigger className="w-full">
                {selectedCategory ? (
                  <span>{selectedCategory.name}</span>
                ) : (
                  <SelectValue placeholder={loadingCategories ? 'Loading…' : 'Select category'} />
                )}
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => {
                  const disabled = isCreateCategoryDisabled(c);
                  return (
                    <SelectItem key={c.id} value={c.id} disabled={disabled}>
                      {c.name}
                      {disabled ? ' (coming soon)' : ''}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Building type</label>
            <Select
              value={buildingTypeId || undefined}
              onValueChange={(v) => {
                setBuildingTypeId(v ?? '');
                setPropertyTypeId('');
                setPropertyNameId('');
                setLocationId('');
                setMicroMarketId('');
                setMicroMarketName('');
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
                        ? 'Select category first'
                        : loadingBuildingTypes
                          ? 'Loading…'
                          : 'Select building type'
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
                setPropertyTypeId(v ?? '');
                setPropertyNameId('');
                setLocationId('');
                setMicroMarketId('');
                setMicroMarketName('');
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
                        ? 'Select building type first'
                        : loadingPropertyTypes
                          ? 'Loading…'
                          : 'Select property type'
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
            <label className="text-sm font-medium">City filter (optional)</label>
            <SearchableSelect
              options={cities.map((c) => ({ value: c.id, label: c.name }))}
              value={cityId}
              onValueChange={(v) => {
                setCityId(v);
                setPropertyNameId('');
                setLocationId('');
                setMicroMarketId('');
                setMicroMarketName('');
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
              onValueChange={setPropertyNameId}
              onSearch={setPropertySearch}
              loading={loadingProperties}
              disabled={!propertyTypeId}
              placeholder={
                !propertyTypeId ? 'Select property type first' : 'Search approved catalog only'
              }
              emptyText="No catalog properties found."
              selectedLabel={
                selectedProperty
                  ? selectedProperty.cityName
                    ? `${selectedProperty.name} · ${selectedProperty.cityName}`
                    : selectedProperty.name
                  : undefined
              }
            />
            <p className="text-xs text-gray-500">Free-text property names are not allowed.</p>
          </div>

          {loadingPrefill ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading location prefill…
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
                    onValueChange={(v) => setLocationId(v ?? '')}
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
                  <Input value={selectedLocation?.name || prefill.locationName || '—'} disabled />
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Micro market</label>
                <Input value={microMarketName || prefill.microMarketName || '—'} disabled />
              </div>
            </>
          ) : null}

          <div className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
            <div>
              <p className="text-sm font-medium text-gray-700">Price on request</p>
              <p className="text-xs text-gray-500">If on, numeric price is not sent.</p>
            </div>
            <Switch
              checked={priceOnRequest}
              onCheckedChange={(checked) => {
                setPriceOnRequest(checked);
                if (checked) setPrice('');
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
          ) : !propertyNameId ? (
            <p className="border-t border-gray-100 pt-4 text-sm text-gray-500">
              Select a property name to load the remaining form modules for this property type.
            </p>
          ) : detailFieldsCount > 0 ? (
            <div className="space-y-6 border-t border-gray-100 pt-4">
              {detailModules.map((mod) => (
                <div key={mod.key} className="space-y-4">
                  <h2 className="text-sm font-semibold text-gray-900">{mod.label}</h2>
                  <div className="grid gap-4 sm:grid-cols-2">{mod.fields.map(renderField)}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="border-t border-gray-100 pt-4 text-sm text-amber-700">
              No form-module fields are configured as visible for this category / building type /
              property type. Check Listings Config.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => router.push('/moderation')} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSubmit()}
              disabled={!canSubmit}
              className="bg-primary text-white hover:bg-primary/90"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create verified listing
            </Button>
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}
