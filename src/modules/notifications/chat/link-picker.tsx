'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/common/searchable-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import {
  notificationsService,
  type BroadcastKeyLabel,
  type BroadcastLinkType,
  type BroadcastListing,
} from '@/services/notifications.service';

export type LinkSelection = {
  linkType: BroadcastLinkType;
  listingId: string;
  listingLabel: string;
  pageKey: string;
};

type LinkPickerDialogProps = {
  open: boolean;
  pages: BroadcastKeyLabel[];
  cityId?: string;
  value: LinkSelection;
  onClose: () => void;
  onSave: (value: LinkSelection) => void;
};

export function LinkPickerDialog({
  open,
  pages,
  cityId,
  value,
  onClose,
  onSave,
}: LinkPickerDialogProps) {
  const [linkType, setLinkType] = useState<BroadcastLinkType>('post');
  const [listingId, setListingId] = useState('');
  const [listingLabel, setListingLabel] = useState('');
  const [pageKey, setPageKey] = useState('');
  const [listings, setListings] = useState<BroadcastListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    setLinkType(value.linkType === 'page' ? 'page' : 'post');
    setListingId(value.listingId);
    setListingLabel(value.listingLabel);
    setPageKey(value.pageKey || pages[0]?.key || '');
    setSearch('');
  }, [open, value, pages]);

  useEffect(() => {
    if (!open || linkType !== 'post') return;
    let cancelled = false;
    setListingsLoading(true);
    const timer = window.setTimeout(() => {
      notificationsService
        .getPublishedListings({ cityId, search })
        .then((items) => {
          if (!cancelled) setListings(items);
        })
        .catch(() => {
          if (!cancelled) setListings([]);
        })
        .finally(() => {
          if (!cancelled) setListingsLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, linkType, cityId, search]);

  const listingOptions = useMemo(
    () => listings.map((l) => ({ value: l.id, label: l.title })),
    [listings],
  );
  const pageLabel = pages.find((p) => p.key === pageKey)?.label || 'Select a page';

  const canSave = linkType === 'post' ? !!listingId : !!pageKey;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link this message</DialogTitle>
          <DialogDescription>
            Tapping the card opens what you pick here. The broadcast still goes to
            PropNetra Updates.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={linkType === 'post' ? 'default' : 'outline'}
              className={linkType === 'post' ? 'bg-primary text-white' : ''}
              onClick={() => setLinkType('post')}
            >
              Listing / project
            </Button>
            <Button
              type="button"
              variant={linkType === 'page' ? 'default' : 'outline'}
              className={linkType === 'page' ? 'bg-primary text-white' : ''}
              onClick={() => {
                setLinkType('page');
                if (!pageKey && pages[0]) setPageKey(pages[0].key);
              }}
            >
              Internal page
            </Button>
          </div>

          {linkType === 'post' ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Listing / project</label>
              <SearchableSelect
                options={listingOptions}
                value={listingId}
                selectedLabel={listingLabel}
                onValueChange={(v) => {
                  setListingId(v);
                  setListingLabel(listings.find((l) => l.id === v)?.title || '');
                }}
                onSearch={setSearch}
                loading={listingsLoading}
                placeholder="Select listing / project"
                searchPlaceholder="Search listings…"
                emptyText="No published listings found."
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Internal page</label>
              <Select value={pageKey || undefined} onValueChange={(v) => setPageKey(v ?? '')}>
                <SelectTrigger className="w-full">
                  <span>{pageLabel}</span>
                </SelectTrigger>
                <SelectContent>
                  {pages.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-gray-500">
                      No pages available.
                    </div>
                  ) : (
                    pages.map((p) => (
                      <SelectItem key={p.key} value={p.key}>
                        {p.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() =>
              onSave({ linkType: 'none', listingId: '', listingLabel: '', pageKey: '' })
            }
          >
            Remove link
          </Button>
          <Button
            onClick={() => onSave({ linkType, listingId, listingLabel, pageKey })}
            disabled={!canSave}
            className="bg-primary text-white hover:bg-primary/90"
          >
            Save link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
