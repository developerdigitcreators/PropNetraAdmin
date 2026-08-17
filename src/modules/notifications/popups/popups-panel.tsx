'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/common/searchable-select';
import {
  notificationsService,
  notificationApiError,
  flattenPopupAudiences,
  type BroadcastCity,
  type BroadcastKeyLabel,
  type InAppPopup,
  type PopupAudience,
  type PopupLocation,
} from '@/services/notifications.service';
import { FormattedTextField } from '@/modules/notifications/chat/formatted-text-field';
import { AttachUrlDialog } from '@/modules/notifications/chat/attach-url-dialog';
import {
  LinkPickerDialog,
  type LinkSelection,
} from '@/modules/notifications/chat/link-picker';
import { PopupPreviewDialog } from './popup-preview-dialog';
import {
  emptyPopupDraft,
  popupDraftErrors,
  popupDraftIsSendable,
  popupDraftTargetSummary,
  popupDraftToCreatePayload,
  popupDraftToUpdatePayload,
  popupStatusLabel,
  popupTargetSummary,
  popupToDraft,
  type PopupDraft,
} from './popup-draft';
import {
  Globe,
  Image as ImageIcon,
  Link2,
  Loader2,
  MapPin,
  Megaphone,
  Plus,
  RotateCw,
  Send,
  Trash2,
} from 'lucide-react';

type PopupsPanelProps = {
  cities: BroadcastCity[];
  citiesLoading: boolean;
  canWrite: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  popupsTick?: number;
  onToast: (message: string) => void;
};

function statusTone(status: InAppPopup['status']) {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'draft':
      return 'bg-amber-100 text-amber-800';
    case 'expired':
      return 'bg-gray-100 text-gray-600';
    default:
      return 'bg-gray-100 text-gray-500';
  }
}

export function PopupsPanel({
  cities,
  citiesLoading,
  canWrite,
  canUpdate,
  canDelete,
  popupsTick = 0,
  onToast,
}: PopupsPanelProps) {
  const [popups, setPopups] = useState<InAppPopup[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [pages, setPages] = useState<BroadcastKeyLabel[]>([]);
  const [linkTypes, setLinkTypes] = useState<BroadcastKeyLabel[]>([]);
  const [audiences, setAudiences] = useState<BroadcastKeyLabel[]>([]);
  const [locations, setLocations] = useState<PopupLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);

  const [draft, setDraft] = useState<PopupDraft>(emptyPopupDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'resend'>('create');

  const [previewOpen, setPreviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [touched, setTouched] = useState(false);

  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);

  const loadPopups = useCallback(async () => {
    setListLoading(true);
    try {
      const result = await notificationsService.listPopups({ page: 1, limit: 50 });
      setPopups(result.items);
    } catch {
      setPopups([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPopups();
  }, [loadPopups, popupsTick]);

  useEffect(() => {
    let cancelled = false;
    notificationsService
      .getPopupOptions()
      .then((options) => {
        if (cancelled) return;
        setPages(options.pageKeys);
        setLinkTypes(options.linkTypes);
        setAudiences(flattenPopupAudiences(options.audiences));
      })
      .catch(() => {
        if (!cancelled) setPages([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (draft.targetMode !== 'city' || !draft.cityId) {
      setLocations([]);
      return;
    }
    let cancelled = false;
    setLocationsLoading(true);
    notificationsService
      .getPopupLocations(draft.cityId)
      .then((result) => {
        if (!cancelled) setLocations(result.items);
      })
      .catch(() => {
        if (!cancelled) setLocations([]);
      })
      .finally(() => {
        if (!cancelled) setLocationsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [draft.cityId, draft.targetMode]);

  const patch = (changes: Partial<PopupDraft>) => setDraft((d) => ({ ...d, ...changes }));

  const resetForm = () => {
    setDraft(emptyPopupDraft());
    setEditingId(null);
    setSelectedId(null);
    setFormMode('create');
    setTouched(false);
    setSubmitError('');
  };

  const startEdit = (popup: InAppPopup) => {
    setDraft(popupToDraft(popup));
    setEditingId(popup.id);
    setSelectedId(popup.id);
    setFormMode('edit');
    setTouched(false);
    setSubmitError('');
  };

  const startResend = (popup: InAppPopup) => {
    if (!canWrite) return;
    setDraft(popupToDraft(popup));
    setEditingId(null);
    setSelectedId(popup.id);
    setFormMode('resend');
    setTouched(false);
    setSubmitError('');
    setPreviewOpen(true);
  };

  const cityOptions = useMemo(
    () => cities.map((c) => ({ value: c.id, label: c.name })),
    [cities],
  );

  const audienceLabel =
    audiences.find((a) => a.key === draft.audience)?.label || 'All users';

  const targetSummary = popupDraftTargetSummary(
    draft,
    cities,
    locations,
    audienceLabel,
  );

  const linkLabel =
    draft.linkType === 'post'
      ? draft.listingLabel || 'Linked listing'
      : draft.linkType === 'page'
        ? pages.find((p) => p.key === draft.pageKey)?.label || draft.pageKey
        : '';

  const errors = popupDraftErrors(draft);
  const canSubmit = popupDraftIsSendable(draft) && !submitting;
  const readOnly = !canWrite && !(editingId && canUpdate);

  const toggleLocation = (locationId: string) => {
    patch({
      locationIds: draft.locationIds.includes(locationId)
        ? draft.locationIds.filter((id) => id !== locationId)
        : [...draft.locationIds, locationId],
    });
  };

  const saveLink = (value: LinkSelection) => {
    patch({
      linkType: value.linkType,
      listingId: value.listingId,
      listingLabel: value.listingLabel,
      pageKey: value.pageKey,
    });
    setLinkOpen(false);
  };

  const openPreview = () => {
    setTouched(true);
    if (!popupDraftIsSendable(draft)) return;
    setSubmitError('');
    setPreviewOpen(true);
  };

  const confirmSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      if (editingId) {
        await notificationsService.updatePopup(editingId, popupDraftToUpdatePayload(draft));
        onToast('Popup updated.');
      } else {
        await notificationsService.createPopup(popupDraftToCreatePayload(draft));
        onToast(
          formMode === 'resend'
            ? 'Popup resent. Users who already saw the old one will see this new copy once.'
            : 'Popup published. Online users receive it over the socket.',
        );
      }
      setPreviewOpen(false);
      resetForm();
      loadPopups();
    } catch (err) {
      setSubmitError(
        notificationApiError(
          err,
          editingId ? 'Failed to save changes.' : 'Failed to publish popup.',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (popup: InAppPopup) => {
    if (!canDelete) return;
    if (!window.confirm(`Delete “${popup.title}”? Users who already saw it keep their receipt.`)) {
      return;
    }
    try {
      await notificationsService.deletePopup(popup.id);
      onToast('Popup deleted.');
      if (editingId === popup.id) resetForm();
      loadPopups();
    } catch (err) {
      onToast(notificationApiError(err, 'Failed to delete popup.'));
    }
  };

  const handlePublish = async (popup: InAppPopup) => {
    if (!canWrite) return;
    try {
      await notificationsService.publishPopup(popup.id);
      onToast('Draft published.');
      loadPopups();
    } catch (err) {
      onToast(notificationApiError(err, 'Failed to publish.'));
    }
  };

  const linkSelection: LinkSelection = {
    linkType: draft.linkType === 'page' ? 'page' : 'post',
    listingId: draft.listingId,
    listingLabel: draft.listingLabel,
    pageKey: draft.pageKey || pages[0]?.key || '',
  };

  return (
    <>
      <div className="flex h-[calc(100vh-19rem)] min-h-[520px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <aside className="flex w-full shrink-0 flex-col border-r border-gray-100 lg:w-80">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Popup history</p>
              <p className="text-[11px] text-gray-500">Once per user, in-app only</p>
            </div>
            {canWrite && (
              <Button variant="ghost" size="icon-sm" onClick={resetForm} aria-label="New popup">
                <Plus className="w-4 h-4" />
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {listLoading ? (
              <div className="flex items-center justify-center py-12 text-sm text-gray-400">
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                Loading…
              </div>
            ) : popups.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-gray-400">No popups yet.</p>
            ) : (
              popups.map((popup) => (
                <div
                  key={popup.id}
                  className={cn(
                    'mb-1 flex w-full items-start gap-1 rounded-xl px-2 py-1.5 transition-colors hover:bg-gray-50',
                    selectedId === popup.id && 'bg-primary-light/60 ring-1 ring-primary/20',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(popup.id);
                      if (canUpdate) startEdit(popup);
                    }}
                    className="min-w-0 flex-1 rounded-lg px-1 py-1 text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-1 text-sm font-medium text-gray-900">{popup.title}</p>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
                          statusTone(popup.status),
                        )}
                      >
                        {popupStatusLabel(popup.status)}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                      {popupTargetSummary(popup)} · {popup.seenCount} seen
                    </p>
                  </button>
                  {canWrite && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="Resend"
                      aria-label={`Resend ${popup.title}`}
                      onClick={() => startResend(popup)}
                      className="mt-0.5 shrink-0 text-gray-400 hover:text-gray-700"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </aside>

        <main className="hidden min-w-0 flex-1 flex-col lg:flex">
          <div className="shrink-0 border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                <Megaphone className="w-4 h-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {editingId ? 'Edit popup' : 'New in-app popup'}
                </p>
                <p className="text-xs text-gray-500">
                  Full-screen modal in the app — separate from Groups and phone tray
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {readOnly && !editingId ? (
              <p className="py-12 text-center text-sm text-gray-500">
                You have read-only access. Select a popup to view details.
              </p>
            ) : (
              <div className="mx-auto max-w-xl space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">Title</label>
                  <FormattedTextField
                    value={draft.title}
                    onChange={(v) => patch({ title: v })}
                    placeholder="Flash sale"
                    ariaLabel="Popup title"
                    editorClassName="font-medium"
                    fieldClassName={readOnly ? 'pointer-events-none opacity-70' : undefined}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">Message</label>
                  <FormattedTextField
                    multiline
                    value={draft.body}
                    onChange={(v) => patch({ body: v })}
                    onFormatApplied={() => patch({ bodyFormat: 'markdown' })}
                    placeholder="Tell users about the offer"
                    ariaLabel="Popup message"
                    fieldClassName={readOnly ? 'pointer-events-none opacity-70' : undefined}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">Image (optional)</label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={draft.imageUrl}
                      onChange={(e) => patch({ imageUrl: e.target.value })}
                      placeholder="https://cdn.example.com/sale.jpg"
                      readOnly={readOnly}
                      className="font-mono text-xs"
                    />
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setImageDialogOpen(true)}
                        aria-label="Attach image URL"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  {draft.imageUrl.trim() && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={draft.imageUrl.trim()}
                      alt=""
                      className="mt-2 max-h-32 rounded-lg object-cover"
                    />
                  )}
                </div>

                <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700">Where to show</label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={draft.targetMode === 'global' ? 'default' : 'outline'}
                        size="sm"
                        disabled={readOnly}
                        className={draft.targetMode === 'global' ? 'bg-primary text-white' : undefined}
                        onClick={() =>
                          patch({ targetMode: 'global', cityId: '', locationIds: [] })
                        }
                      >
                        <Globe className="mr-1.5 w-3.5 h-3.5" />
                        All cities
                      </Button>
                      <Button
                        type="button"
                        variant={draft.targetMode === 'city' ? 'default' : 'outline'}
                        size="sm"
                        disabled={readOnly}
                        className={draft.targetMode === 'city' ? 'bg-primary text-white' : undefined}
                        onClick={() => patch({ targetMode: 'city' })}
                      >
                        <MapPin className="mr-1.5 w-3.5 h-3.5" />
                        City & locations
                      </Button>
                    </div>
                  </div>

                  {draft.targetMode === 'city' && (
                    <div className="space-y-3 border-t border-gray-200 pt-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-700">City</label>
                        <SearchableSelect
                          options={cityOptions}
                          value={draft.cityId}
                          onValueChange={(v) =>
                            patch({ cityId: v || '', locationIds: [] })
                          }
                          loading={citiesLoading}
                          placeholder="Select city"
                          searchPlaceholder="Search city…"
                          emptyText="No cities found."
                          disabled={readOnly}
                        />
                      </div>

                      {draft.cityId && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-gray-700">
                              Locations
                            </label>
                            {!readOnly && draft.locationIds.length > 0 && (
                              <button
                                type="button"
                                onClick={() => patch({ locationIds: [] })}
                                className="text-[11px] text-gray-500 hover:text-gray-700"
                              >
                                Clear — whole city
                              </button>
                            )}
                          </div>
                          {locationsLoading ? (
                            <p className="text-xs text-gray-400">Loading locations…</p>
                          ) : locations.length === 0 ? (
                            <p className="text-xs text-gray-400">
                              No locations in this city — popup shows to everyone there.
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {locations.map((loc) => {
                                const active = draft.locationIds.includes(loc.id);
                                return (
                                  <button
                                    key={loc.id}
                                    type="button"
                                    disabled={readOnly}
                                    onClick={() => toggleLocation(loc.id)}
                                    className={cn(
                                      'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                                      active
                                        ? 'bg-primary text-white'
                                        : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50',
                                    )}
                                  >
                                    {loc.name}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          <p className="text-[11px] text-gray-400">
                            Pick none to target the whole city. Pick one or more
                            micro-markets to narrow further.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-1.5 border-t border-gray-200 pt-3">
                    <label className="text-xs font-medium text-gray-700">Audience</label>
                    <Select
                      value={draft.audience}
                      onValueChange={(v) =>
                        patch({ audience: v as PopupAudience })
                      }
                      disabled={readOnly}
                    >
                      <SelectTrigger className="w-full bg-white">
                        <span>{audienceLabel}</span>
                      </SelectTrigger>
                      <SelectContent>
                        {audiences.map((item) => (
                          <SelectItem key={item.key} value={item.key}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-gray-400">
                      Server matches badge, subscription, and Pro documents per
                      user — wrong audience never sees the modal.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700">Button link</label>
                  <div className="flex flex-wrap items-center gap-2">
                    {linkTypes.map((lt) => {
                      const key = lt.key as PopupDraft['linkType'];
                      const active = draft.linkType === key;
                      return (
                        <Button
                          key={lt.key}
                          type="button"
                          variant={active ? 'default' : 'outline'}
                          size="sm"
                          disabled={readOnly}
                          className={active ? 'bg-primary text-white' : undefined}
                          onClick={() =>
                            patch({
                              linkType: key,
                              ...(key === 'none'
                                ? { listingId: '', listingLabel: '', pageKey: '' }
                                : {}),
                            })
                          }
                        >
                          {lt.label}
                        </Button>
                      );
                    })}
                    {!readOnly && draft.linkType !== 'none' && (
                      <Button type="button" variant="outline" size="sm" onClick={() => setLinkOpen(true)}>
                        <Link2 className="mr-1.5 w-3.5 h-3.5" />
                        {linkLabel || 'Choose target'}
                      </Button>
                    )}
                  </div>
                  {draft.linkType !== 'none' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-700">Button label</label>
                      <Input
                        value={draft.ctaLabel}
                        onChange={(e) => patch({ ctaLabel: e.target.value })}
                        placeholder="View"
                        maxLength={40}
                        readOnly={readOnly}
                      />
                    </div>
                  )}
                </div>

                {touched && errors.length > 0 && (
                  <p className="text-sm text-red-600">{errors[0]}</p>
                )}

                {!readOnly && (
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {editingId && (
                      <Button type="button" variant="outline" onClick={resetForm}>
                        Cancel edit
                      </Button>
                    )}
                    {editingId && canWrite && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const popup = popups.find((p) => p.id === editingId);
                          if (popup) startResend(popup);
                        }}
                      >
                        <RotateCw className="mr-1.5 w-4 h-4" />
                        Resend
                      </Button>
                    )}
                    <Button
                      type="button"
                      onClick={openPreview}
                      disabled={!canSubmit}
                      className="bg-primary text-white hover:bg-primary/90"
                    >
                      <Send className="mr-2 w-4 h-4" />
                      {editingId ? 'Preview & save' : 'Preview & publish'}
                    </Button>
                    {editingId && canDelete && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="ml-auto text-red-600 hover:text-red-700"
                        onClick={() => {
                          const popup = popups.find((p) => p.id === editingId);
                          if (popup) handleDelete(popup);
                        }}
                      >
                        <Trash2 className="mr-1.5 w-4 h-4" />
                        Delete
                      </Button>
                    )}
                  </div>
                )}

                {selectedId && !canUpdate && (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
                    {(() => {
                      const popup = popups.find((p) => p.id === selectedId);
                      if (!popup) return null;
                      return (
                        <>
                          <p>
                            <span className="font-medium text-gray-900">Status:</span>{' '}
                            {popupStatusLabel(popup.status)}
                          </p>
                          <p className="mt-1">
                            <span className="font-medium text-gray-900">Target:</span>{' '}
                            {popupTargetSummary(popup)}
                          </p>
                          <p className="mt-1">
                            <span className="font-medium text-gray-900">Seen by:</span>{' '}
                            {popup.seenCount} users
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {popup.status === 'draft' && canWrite && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handlePublish(popup)}
                              >
                                Publish draft
                              </Button>
                            )}
                            {canWrite && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => startResend(popup)}
                              >
                                <RotateCw className="mr-1.5 w-3.5 h-3.5" />
                                Resend
                              </Button>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        <div className="flex flex-1 items-center justify-center lg:hidden">
          <p className="px-6 text-center text-sm text-gray-500">
            Open on a wider screen to create or edit popups.
          </p>
        </div>
      </div>

      <AttachUrlDialog
        open={imageDialogOpen}
        kind="image"
        kindLabel="Image"
        initialUrl={draft.imageUrl}
        onClose={() => setImageDialogOpen(false)}
        onSave={(url) => {
          patch({ imageUrl: url });
          setImageDialogOpen(false);
        }}
      />

      <LinkPickerDialog
        open={linkOpen}
        pages={pages}
        cityId={draft.cityId}
        value={linkSelection}
        onClose={() => setLinkOpen(false)}
        onSave={saveLink}
      />

      <PopupPreviewDialog
        open={previewOpen}
        draft={draft}
        targetSummary={targetSummary}
        mode={formMode}
        submitting={submitting}
        error={submitError}
        onClose={() => setPreviewOpen(false)}
        onConfirm={confirmSubmit}
      />
    </>
  );
}
