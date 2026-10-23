'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  notificationsService,
  type BroadcastCta,
  type BroadcastKeyLabel,
  type BroadcastLinkType,
} from '@/services/notifications.service';
import { LinkPickerDialog, type LinkSelection } from './link-picker';
import { Pencil, Plus, Trash2 } from 'lucide-react';

export const MAX_NOTIFICATION_LINKS = 3;

export type LinkCtaRow = {
  id: string;
  linkType: 'post' | 'page';
  listingId: string;
  listingLabel: string;
  pageKey: string;
  /** Button text shown on the notification / popup. */
  label: string;
};

export function newLinkCtaId() {
  return `link_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyLinkCtaRow(
  partial?: Partial<Omit<LinkCtaRow, 'id'>> & { id?: string },
): LinkCtaRow {
  return {
    id: partial?.id || newLinkCtaId(),
    linkType: partial?.linkType || 'post',
    listingId: partial?.listingId || '',
    listingLabel: partial?.listingLabel || '',
    pageKey: partial?.pageKey || '',
    label: partial?.label || '',
  };
}

/** Primary tap target = first link (backward-compatible fields). */
export function primaryFromLinks(links: LinkCtaRow[]): {
  linkType: BroadcastLinkType;
  listingId: string;
  listingLabel: string;
  pageKey: string;
  ctaLabel: string;
} {
  const first = links[0];
  if (!first) {
    return {
      linkType: 'none',
      listingId: '',
      listingLabel: '',
      pageKey: '',
      ctaLabel: '',
    };
  }
  return {
    linkType: first.linkType,
    listingId: first.linkType === 'post' ? first.listingId : '',
    listingLabel: first.linkType === 'post' ? first.listingLabel : '',
    pageKey: first.linkType === 'page' ? first.pageKey : '',
    ctaLabel: first.label,
  };
}

export function linksToBroadcastCtas(links: LinkCtaRow[]): BroadcastCta[] {
  return links
    .filter((row) =>
      row.linkType === 'post' ? !!row.listingId : !!row.pageKey,
    )
    .map((row) => ({
      label: row.label.trim() || (row.linkType === 'post' ? 'View listing' : 'Open page'),
      linkType: row.linkType,
      ...(row.linkType === 'post' && row.listingId
        ? { listingId: row.listingId }
        : {}),
      ...(row.linkType === 'page' && row.pageKey
        ? { pageKey: row.pageKey, screen: row.pageKey }
        : {}),
    }));
}

export function linksFromPrimaryFields(args: {
  linkType?: BroadcastLinkType | null;
  listingId?: string | null;
  listingLabel?: string;
  pageKey?: string | null;
  ctaLabel?: string | null;
  ctas?: BroadcastCta[] | null;
}): LinkCtaRow[] {
  const fromCtas = (args.ctas || [])
    .map((cta) => {
      const listingId = cta.listingId || '';
      const pageKey = cta.pageKey || cta.screen || '';
      const linkType: 'post' | 'page' | null =
        cta.linkType === 'post' || cta.linkType === 'page'
          ? cta.linkType
          : listingId
            ? 'post'
            : pageKey
              ? 'page'
              : null;
      if (!linkType) return null;
      return emptyLinkCtaRow({
        linkType,
        listingId: linkType === 'post' ? listingId : '',
        listingLabel: linkType === 'post' ? 'Linked listing' : '',
        pageKey: linkType === 'page' ? pageKey : '',
        label: cta.label || '',
      });
    })
    .filter(Boolean) as LinkCtaRow[];

  if (fromCtas.length) return fromCtas.slice(0, MAX_NOTIFICATION_LINKS);

  const linkType = args.linkType;
  if (linkType === 'post' && args.listingId) {
    return [
      emptyLinkCtaRow({
        linkType: 'post',
        listingId: args.listingId,
        listingLabel: args.listingLabel || 'Linked listing',
        label: args.ctaLabel || '',
      }),
    ];
  }
  if (linkType === 'page' && args.pageKey) {
    return [
      emptyLinkCtaRow({
        linkType: 'page',
        pageKey: args.pageKey,
        label: args.ctaLabel || '',
      }),
    ];
  }
  return [];
}

export function linksAreValid(links: LinkCtaRow[]): boolean {
  return links.every((row) =>
    row.linkType === 'post' ? !!row.listingId : !!row.pageKey,
  );
}

type MultiLinkCtaEditorProps = {
  links: LinkCtaRow[];
  pages: BroadcastKeyLabel[];
  cityId?: string;
  disabled?: boolean;
  /** When true, empty label is highlighted as incomplete (popups). */
  requireLabel?: boolean;
  defaultLabel?: string;
  onChange: (links: LinkCtaRow[]) => void;
};

export function MultiLinkCtaEditor({
  links,
  pages,
  cityId,
  disabled = false,
  requireLabel = false,
  defaultLabel = '',
  onChange,
}: MultiLinkCtaEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState<'post' | 'page'>('post');
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const canAdd = links.length < MAX_NOTIFICATION_LINKS && !disabled;

  const openAdd = (type: 'post' | 'page') => {
    if (!canAdd) return;
    setEditIndex(null);
    setPickerType(type);
    setPickerOpen(true);
  };

  const openEdit = (index: number) => {
    if (disabled) return;
    const row = links[index];
    if (!row) return;
    setEditIndex(index);
    setPickerType(row.linkType);
    setPickerOpen(true);
  };

  const applyPicker = (next: LinkSelection) => {
    setPickerOpen(false);
    if (next.linkType === 'none') {
      if (editIndex != null) {
        onChange(links.filter((_, i) => i !== editIndex));
      }
      setEditIndex(null);
      return;
    }
    if (next.linkType !== 'post' && next.linkType !== 'page') return;

    const base = {
      linkType: next.linkType as 'post' | 'page',
      listingId: next.linkType === 'post' ? next.listingId : '',
      listingLabel: next.linkType === 'post' ? next.listingLabel : '',
      pageKey: next.linkType === 'page' ? next.pageKey : '',
    };

    if (editIndex != null && links[editIndex]) {
      const copy = [...links];
      copy[editIndex] = { ...copy[editIndex], ...base };
      onChange(copy);
    } else if (links.length < MAX_NOTIFICATION_LINKS) {
      onChange([
        ...links,
        emptyLinkCtaRow({
          ...base,
          label: defaultLabel || '',
        }),
      ]);
    }
    setEditIndex(null);
  };

  const editingValue: LinkSelection =
    editIndex != null && links[editIndex]
      ? {
          linkType: links[editIndex].linkType,
          listingId: links[editIndex].listingId,
          listingLabel: links[editIndex].listingLabel,
          pageKey: links[editIndex].pageKey,
        }
      : { linkType: pickerType, listingId: '', listingLabel: '', pageKey: '' };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-gray-700">
          Links (post / page)
        </p>
        <p className="text-[11px] text-gray-400">
          Up to {MAX_NOTIFICATION_LINKS} · each with button text
        </p>
      </div>

      {links.length === 0 ? (
        <p className="text-xs text-gray-400">
          No deep links. Add a post or page — button text shows on the
          notification.
        </p>
      ) : (
        <ul className="space-y-2">
          {links.map((row, index) => {
            const dest =
              row.linkType === 'post'
                ? row.listingLabel || row.listingId || 'Listing'
                : pages.find((p) => p.key === row.pageKey)?.label ||
                  row.pageKey ||
                  'Page';
            const labelMissing = requireLabel && !row.label.trim();
            return (
              <li
                key={row.id}
                className="rounded-xl border border-gray-200 bg-gray-50/70 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-800">
                      <span className="mr-1.5 rounded bg-white px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-500 ring-1 ring-gray-200">
                        {row.linkType}
                      </span>
                      {dest}
                    </p>
                    {index === 0 ? (
                      <p className="mt-0.5 text-[11px] text-gray-400">
                        Primary tap target
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      disabled={disabled}
                      onClick={() => openEdit(index)}
                      aria-label="Edit link"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      disabled={disabled}
                      onClick={() =>
                        onChange(links.filter((_, i) => i !== index))
                      }
                      aria-label="Remove link"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  <label className="text-xs font-medium text-gray-700">
                    Button text
                    {requireLabel ? '' : ' (optional)'}
                  </label>
                  <Input
                    value={row.label}
                    onChange={(e) => {
                      const copy = [...links];
                      copy[index] = { ...row, label: e.target.value };
                      onChange(copy);
                    }}
                    placeholder={
                      row.linkType === 'post'
                        ? 'e.g. View listing'
                        : 'e.g. Open page'
                    }
                    maxLength={40}
                    disabled={disabled}
                    className={labelMissing ? 'border-amber-400' : undefined}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!canAdd}
          onClick={() => openAdd('post')}
        >
          <Plus className="mr-1 size-3.5" />
          Add post
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!canAdd}
          onClick={() => openAdd('page')}
        >
          <Plus className="mr-1 size-3.5" />
          Add page
        </Button>
        {links.length > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            className="text-gray-500"
            onClick={() => onChange([])}
          >
            Clear all
          </Button>
        ) : null}
      </div>

      <LinkPickerDialog
        open={pickerOpen}
        pages={pages}
        cityId={cityId}
        preferredType={pickerType}
        value={editingValue}
        onClose={() => {
          setPickerOpen(false);
          setEditIndex(null);
        }}
        onSave={applyPicker}
      />
    </div>
  );
}

/** Resolve listing titles for rows that only have listingId. */
export async function hydrateLinkListingLabels(
  links: LinkCtaRow[],
  cityId?: string,
): Promise<LinkCtaRow[]> {
  const need = links.filter((r) => r.linkType === 'post' && r.listingId && !r.listingLabel);
  if (!need.length) return links;
  try {
    const listings = await notificationsService.getPublishedListings({
      cityId,
      search: '',
    });
    const byId = new Map(listings.map((l) => [l.id, l.title]));
    return links.map((row) =>
      row.linkType === 'post' && row.listingId && !row.listingLabel
        ? { ...row, listingLabel: byId.get(row.listingId) || 'Linked listing' }
        : row,
    );
  } catch {
    return links;
  }
}
