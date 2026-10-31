'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  listingCreateApiError,
  listingsService,
  type CreateFormField,
  type MyListingDetail,
} from '@/services/listings.service';
import { Loader2 } from 'lucide-react';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  listingId: string | null;
  onSaved?: () => void;
};

function fieldValue(details: Record<string, string>, key: string) {
  return details[key] ?? '';
}

export function DeveloperUserListingEditDialog({
  open,
  onOpenChange,
  userId,
  listingId,
  onSaved,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<MyListingDetail | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [details, setDetails] = useState<Record<string, string>>({});
  const [price, setPrice] = useState('');
  const [priceOnRequest, setPriceOnRequest] = useState(false);

  useEffect(() => {
    if (!open || !listingId) {
      setDetail(null);
      setError('');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    void Promise.all([
      listingsService.getAdminUserListingDetail(userId, listingId),
      listingsService.getCreateCategories(),
    ])
      .then(([d, categories]) => {
        if (cancelled) return;
        setDetail(d);
        const cat = categories.find(
          (c) => c.name?.toLowerCase() === String(d.categoryName || '').toLowerCase(),
        );
        setCategoryId(cat?.id || '');
        const dyn = { ...(d.dynamicData || {}), ...(d.form?.dynamicData || {}) };
        const asStrings: Record<string, string> = {};
        for (const [k, v] of Object.entries(dyn)) {
          if (v == null) continue;
          asStrings[k] = typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v);
        }
        setDetails(asStrings);
        const priceRaw = dyn.price ?? dyn.listing_price;
        setPriceOnRequest(Boolean(dyn.price_on_request || d.priceLabel === 'On request'));
        if (priceRaw != null && priceRaw !== '') setPrice(String(priceRaw));
        else setPrice('');
      })
      .catch((err) => {
        if (!cancelled) setError(listingCreateApiError(err, 'Failed to load listing.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, listingId, userId]);

  const [schemaFields, setSchemaFields] = useState<CreateFormField[]>([]);

  useEffect(() => {
    if (!open || !detail?.buildingType?.id || !detail?.propertyType?.id || !categoryId) {
      setSchemaFields([]);
      return;
    }
    let cancelled = false;
    void listingsService
      .getCreateSchema({
        categoryId,
        buildingTypeId: detail.buildingType.id,
        propertyTypeId: detail.propertyType.id,
      })
      .then((schema) => {
        if (cancelled) return;
        const fields = [
          ...schema.fields,
          ...schema.modules.flatMap((m) => m.fields),
        ].filter((f) => f.type !== 'banner' && f.slot !== 'banner');
        setSchemaFields(fields);
      })
      .catch(() => !cancelled && setSchemaFields([]));
    return () => {
      cancelled = true;
    };
  }, [open, detail, categoryId]);

  const title = useMemo(
    () => detail?.title || detail?.propertyName || 'Edit listing',
    [detail],
  );

  const updateDetail = (key: string, value: string) => {
    setDetails((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    if (!listingId || !detail?.buildingType?.id || !detail?.propertyType?.id || !categoryId) return;
    setSaving(true);
    setError('');
    try {
      const detailsPayload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(details)) {
        if (value === '' || value == null) continue;
        if (value === 'true') detailsPayload[key] = true;
        else if (value === 'false') detailsPayload[key] = false;
        else if (/^-?\d+(\.\d+)?$/.test(value)) detailsPayload[key] = Number(value);
        else detailsPayload[key] = value;
      }
      await listingsService.patchAdminUserListing(userId, listingId, {
        category_id: categoryId,
        building_type_id: detail.buildingType.id,
        property_type_id: detail.propertyType.id,
        price_on_request: priceOnRequest,
        price: priceOnRequest ? null : Number(price) || null,
        details: detailsPayload,
      });
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      setError(listingCreateApiError(err, 'Failed to save listing.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>Edit listing — {title}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto space-y-4 py-2">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 text-sm text-gray-600">
                <p>
                  <span className="font-medium text-gray-800">Location:</span>{' '}
                  {[detail?.locationName, detail?.microMarketName, detail?.cityName]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </p>
                <p>
                  <span className="font-medium text-gray-800">Status:</span> {detail?.status || '—'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={priceOnRequest} onCheckedChange={setPriceOnRequest} />
                <span className="text-sm text-gray-700">Price on request</span>
              </div>
              {!priceOnRequest && (
                <div className="space-y-1 max-w-xs">
                  <label className="text-sm font-medium text-gray-700">Price</label>
                  <Input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
              )}
              {schemaFields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">
                    {field.label}
                    {field.required ? ' *' : ''}
                  </label>
                  <Input
                    value={fieldValue(details, field.key)}
                    onChange={(e) => updateDetail(field.key, e.target.value)}
                    placeholder={field.placeholder || field.label}
                  />
                </div>
              ))}
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </>
          )}
        </div>
        <DialogFooter className="shrink-0 gap-2">
          <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={loading || saving || !listingId} onClick={() => void save()}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save as owner
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
