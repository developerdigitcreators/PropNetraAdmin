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
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/common/searchable-select';
import { DeleteRemarkDialog } from '@/components/common/delete-remark-dialog';
import {
  notificationsService,
  notificationApiError,
  DEFAULT_POPUP_TIMER_DISPLAYS,
  flattenPopupAudiences,
  type BroadcastCity,
  type BroadcastKeyLabel,
  type InAppPopup,
  type PopupAudience,
} from '@/services/notifications.service';
import { locationService } from '@/services/location.service';
import { FormattedTextField } from '@/modules/notifications/chat/formatted-text-field';
import { MultiLinkCtaEditor } from '@/modules/notifications/chat/multi-link-cta-editor';
import { ImageUrlOrUpload } from '@/components/image-url-or-upload';
import { PopupPreviewDialog } from './popup-preview-dialog';
import { formatDateTime } from '@/modules/notifications/chat/message-bubble';
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
  Loader2,
  MapPin,
  Megaphone,
  Plus,
  RotateCw,
  Send,
  Trash2,
} from 'lucide-react';

type NamedPlace = { id: string; name: string; stateId?: string };

function parseNamedPlaces(data: unknown): NamedPlace[] {
  const rows = Array.isArray(data)
    ? data
    : data && typeof data === 'object'
      ? ((data as Record<string, unknown>).items as unknown[]) ||
        ((data as Record<string, unknown>).data as unknown[]) ||
        ((data as Record<string, unknown>).states as unknown[]) ||
        ((data as Record<string, unknown>).cities as unknown[]) ||
        []
      : [];
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const r = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>;
      const id = typeof r.id === 'string' ? r.id : '';
      const name = typeof r.name === 'string' ? r.name : '';
      if (!id || !name) return null;
      const stateObj =
        r.state && typeof r.state === 'object' ? (r.state as Record<string, unknown>) : null;
      const stateId =
        (typeof r.stateId === 'string' && r.stateId) ||
        (typeof r.state_id === 'string' && r.state_id) ||
        (typeof stateObj?.id === 'string' && stateObj.id) ||
        undefined;
      return { id, name, ...(stateId ? { stateId } : {}) };
    })
    .filter((item): item is NamedPlace => !!item);
}

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
  const [audiences, setAudiences] = useState<BroadcastKeyLabel[]>([]);
  const [timerDisplays, setTimerDisplays] = useState<BroadcastKeyLabel[]>(
    DEFAULT_POPUP_TIMER_DISPLAYS,
  );
  const [states, setStates] = useState<NamedPlace[]>([]);
  const [allCities, setAllCities] = useState<NamedPlace[]>([]);
  const [placesLoading, setPlacesLoading] = useState(true);

  const [draft, setDraft] = useState<PopupDraft>(emptyPopupDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'resend'>('create');

  const [previewOpen, setPreviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [touched, setTouched] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<InAppPopup | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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
        setAudiences(flattenPopupAudiences(options.audiences));
        setTimerDisplays(options.timerDisplays?.length ? options.timerDisplays : DEFAULT_POPUP_TIMER_DISPLAYS);
      })
      .catch(() => {
        if (!cancelled) setPages([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setPlacesLoading(true);
    Promise.all([locationService.getStates(), locationService.getCities()])
      .then(([nextStates, nextCities]) => {
        if (cancelled) return;
        setStates(parseNamedPlaces(nextStates));
        setAllCities(parseNamedPlaces(nextCities));
      })
      .catch(() => {
        if (!cancelled) {
          setStates([]);
          setAllCities([]);
        }
      })
      .finally(() => {
        if (!cancelled) setPlacesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!draft.cityId || draft.stateId || allCities.length === 0) return;
    const inferred = allCities.find((c) => c.id === draft.cityId)?.stateId;
    if (!inferred) return;
    setDraft((d) => (d.stateId ? d : { ...d, stateId: inferred }));
  }, [allCities, draft.cityId, draft.stateId]);

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
    setDraft(popupToDraft(popup, allCities));
    setEditingId(popup.id);
    setSelectedId(popup.id);
    setFormMode('edit');
    setTouched(false);
    setSubmitError('');
  };

  const startResend = (popup: InAppPopup) => {
    if (!canWrite) return;
    setDraft(popupToDraft(popup, allCities));
    setEditingId(null);
    setSelectedId(popup.id);
    setFormMode('resend');
    setTouched(false);
    setSubmitError('');
    setPreviewOpen(true);
  };

  const citiesInState = useMemo(() => {
    const source = allCities.length > 0 ? allCities : cities;
    return source.filter((c) => c.stateId === draft.stateId);
  }, [allCities, cities, draft.stateId]);

  const stateOptions = useMemo(
    () => states.map((s) => ({ value: s.id, label: s.name })),
    [states],
  );

  const cityOptions = useMemo(
    () => citiesInState.map((c) => ({ value: c.id, label: c.name })),
    [citiesInState],
  );

  const audienceLabel =
    audiences.find((a) => a.key === draft.audience)?.label || 'All users';

  const targetSummary = popupDraftTargetSummary(
    draft,
    states,
    allCities.length > 0 ? allCities : cities,
    audienceLabel,
  );

  const errors = popupDraftErrors(draft);
  const canSubmit = popupDraftIsSendable(draft) && !submitting;
  const readOnly = !canWrite && !(editingId && canUpdate);

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

  const handleDelete = async (remark: string) => {
    if (!canDelete || !pendingDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await notificationsService.deletePopup(pendingDelete.id, remark);
      onToast('Popup deleted.');
      if (editingId === pendingDelete.id) resetForm();
      setPendingDelete(null);
      loadPopups();
    } catch (err) {
      setDeleteError(notificationApiError(err, 'Failed to delete popup.'));
      onToast(notificationApiError(err, 'Failed to delete popup.'));
    } finally {
      setDeleting(false);
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
                      {popupTargetSummary(popup)} · {popup.seenCount}/{popup.audienceTotal ?? 0}
                    </p>
                    {formatDateTime(popup.publishedAt || popup.createdAt) ? (
                      <p className="mt-0.5 text-[11px] text-gray-400">
                        {formatDateTime(popup.publishedAt || popup.createdAt)}
                      </p>
                    ) : null}
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
                    value={draft.body}
                    onChange={(v) => patch({ body: v })}
                    onFormatApplied={() => patch({ bodyFormat: 'markdown' })}
                    placeholder="Tell users about the offer"
                    ariaLabel="Popup message"
                    fieldClassName={readOnly ? 'pointer-events-none opacity-70' : undefined}
                  />
                </div>

                <div className={readOnly ? 'pointer-events-none opacity-70' : undefined}>
                  <ImageUrlOrUpload
                    label="Image (optional)"
                    value={draft.imageUrl}
                    onChange={(url) => patch({ imageUrl: url })}
                    kind="popup"
                    placeholder="https://cdn.example.com/sale.jpg"
                    hint="Paste HTTPS URL or upload."
                    previewClassName="mt-2 max-h-32 rounded-lg object-cover"
                  />
                </div>

                <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                  <div>
                    <p className="text-xs font-medium text-gray-700">Story appearance</p>
                    <p className="text-[11px] text-gray-500">
                      Full-screen popup with timer progress bar — like Instagram/WhatsApp stories.
                    </p>
                  </div>
                  {/* Color pickers hidden from admin for now.
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="space-y-1 text-xs text-gray-600">
                      Background
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={draft.backgroundColor}
                          disabled={readOnly}
                          onChange={(e) => patch({ backgroundColor: e.target.value.toUpperCase() })}
                          className="h-9 w-12 cursor-pointer rounded border border-gray-200 bg-white p-0.5"
                        />
                        <Input
                          value={draft.backgroundColor}
                          disabled={readOnly}
                          onChange={(e) => patch({ backgroundColor: e.target.value })}
                          className="h-9 font-mono text-xs"
                        />
                      </div>
                    </label>
                    <label className="space-y-1 text-xs text-gray-600">
                      Text color
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={draft.textColor}
                          disabled={readOnly}
                          onChange={(e) => patch({ textColor: e.target.value.toUpperCase() })}
                          className="h-9 w-12 cursor-pointer rounded border border-gray-200 bg-white p-0.5"
                        />
                        <Input
                          value={draft.textColor}
                          disabled={readOnly}
                          onChange={(e) => patch({ textColor: e.target.value })}
                          className="h-9 font-mono text-xs"
                        />
                      </div>
                    </label>
                    <label className="space-y-1 text-xs text-gray-600">
                      Button color
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={draft.ctaColor}
                          disabled={readOnly}
                          onChange={(e) => patch({ ctaColor: e.target.value.toUpperCase() })}
                          className="h-9 w-12 cursor-pointer rounded border border-gray-200 bg-white p-0.5"
                        />
                        <Input
                          value={draft.ctaColor}
                          disabled={readOnly}
                          onChange={(e) => patch({ ctaColor: e.target.value })}
                          className="h-9 font-mono text-xs"
                        />
                      </div>
                    </label>
                  </div>
                  */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1 text-xs text-gray-600">
                      Auto-close after (seconds)
                      <Input
                        type="number"
                        min={0}
                        max={60}
                        disabled={readOnly}
                        value={draft.displayDurationSec}
                        onChange={(e) =>
                          patch({
                            displayDurationSec: Math.min(
                              60,
                              Math.max(0, Number(e.target.value) || 0),
                            ),
                          })
                        }
                      />
                      <span className="text-[10px] text-gray-400">0 = user closes manually</span>
                    </label>
                    <label className="space-y-1 text-xs text-gray-600">
                      Timer indicator
                      <Select
                        value={draft.timerDisplay}
                        disabled={readOnly || draft.displayDurationSec <= 0}
                        onValueChange={(v) => {
                          if (!v) return;
                          patch({ timerDisplay: v as PopupDraft['timerDisplay'] });
                        }}
                      >
                        <SelectTrigger className="h-9 bg-white">
                          <SelectValue placeholder="Choose indicator" />
                        </SelectTrigger>
                        <SelectContent>
                          {timerDisplays.map((item) => (
                            <SelectItem key={item.key} value={item.key}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-[10px] text-gray-400">
                        {draft.displayDurationSec <= 0
                          ? 'Set seconds above to enable timer UI'
                          : 'Progress bar, countdown, or both'}
                      </span>
                    </label>
                  </div>
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
                          patch({ targetMode: 'global', stateId: '', cityId: '' })
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
                        State & city
                      </Button>
                    </div>
                  </div>

                  {draft.targetMode === 'city' && (
                    <div className="space-y-3 border-t border-gray-200 pt-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-700">State</label>
                        <SearchableSelect
                          options={stateOptions}
                          value={draft.stateId}
                          onValueChange={(v) =>
                            patch({ stateId: v || '', cityId: '' })
                          }
                          loading={placesLoading}
                          placeholder="Select state"
                          searchPlaceholder="Search state…"
                          emptyText="No states found."
                          disabled={readOnly}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-700">City</label>
                        <SearchableSelect
                          options={cityOptions}
                          value={draft.cityId}
                          onValueChange={(v) => patch({ cityId: v || '' })}
                          loading={placesLoading || citiesLoading}
                          placeholder={draft.stateId ? 'Select city' : 'Select a state first'}
                          searchPlaceholder="Search city…"
                          emptyText={
                            draft.stateId
                              ? 'No cities in this state.'
                              : 'Pick a state to see cities.'
                          }
                          disabled={readOnly || !draft.stateId}
                        />
                      </div>
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

                <div className="space-y-3">
                  <MultiLinkCtaEditor
                    links={draft.links}
                    pages={pages}
                    cityId={draft.cityId || undefined}
                    disabled={readOnly}
                    requireLabel
                    defaultLabel="View"
                    onChange={(links) => patch({ links })}
                  />
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
                          if (popup) setPendingDelete(popup);
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
                            <span className="font-medium text-gray-900">Sent:</span>{' '}
                            {formatDateTime(popup.publishedAt || popup.createdAt) || '—'}
                          </p>
                          <p className="mt-1">
                            <span className="font-medium text-gray-900">Seen by:</span>{' '}
                            {popup.seenCount}/{popup.audienceTotal ?? 0}
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

      <DeleteRemarkDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
            setDeleteError('');
          }
        }}
        title="Delete popup?"
        itemName={pendingDelete?.title}
        submitting={deleting}
        error={deleteError}
        onConfirm={handleDelete}
      />
    </>
  );
}
