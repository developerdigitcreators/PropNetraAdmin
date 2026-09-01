import {
  type BroadcastBodyFormat,
  type BroadcastLinkType,
  type CreateInAppPopupPayload,
  type InAppPopup,
  type PopupAudience,
  type PopupTimerDisplay,
  type UpdateInAppPopupPayload,
} from '@/services/notifications.service';
import { isHttpsUrl } from '../chat/draft';

const TITLE_MAX = 200;

export type PopupTargetMode = 'global' | 'city';

export type PopupDraft = {
  title: string;
  body: string;
  bodyFormat: BroadcastBodyFormat;
  imageUrl: string;
  backgroundColor: string;
  textColor: string;
  ctaColor: string;
  displayDurationSec: number;
  timerDisplay: PopupTimerDisplay;
  ctaLabel: string;
  targetMode: PopupTargetMode;
  stateId: string;
  cityId: string;
  audience: PopupAudience;
  linkType: BroadcastLinkType;
  listingId: string;
  listingLabel: string;
  pageKey: string;
};

export function emptyPopupDraft(): PopupDraft {
  return {
    title: '',
    body: '',
    bodyFormat: 'plain',
    imageUrl: '',
    backgroundColor: '#0F172A',
    textColor: '#FFFFFF',
    ctaColor: '#E11D48',
    displayDurationSec: 8,
    timerDisplay: 'progress_bar',
    ctaLabel: 'View',
    targetMode: 'global',
    stateId: '',
    cityId: '',
    audience: 'all',
    linkType: 'none',
    listingId: '',
    listingLabel: '',
    pageKey: '',
  };
}

export function popupLinkOk(draft: PopupDraft): boolean {
  if (draft.linkType === 'post') return !!draft.listingId;
  if (draft.linkType === 'page') return !!draft.pageKey;
  return true;
}

export function popupDraftErrors(draft: PopupDraft): string[] {
  const errors: string[] = [];
  if (!draft.title.trim()) errors.push('Title is required.');
  if (!draft.body.trim()) errors.push('Message is required.');
  if (draft.title.length > TITLE_MAX) errors.push(`Title must be under ${TITLE_MAX} characters.`);
  if (draft.targetMode === 'city') {
    if (!draft.stateId) errors.push('Pick a state or switch to all cities.');
    else if (!draft.cityId) errors.push('Pick a city in that state.');
  }
  if (draft.imageUrl.trim() && !isHttpsUrl(draft.imageUrl.trim())) {
    errors.push('Image must be a valid HTTPS link.');
  }
  if (!/^#[0-9A-Fa-f]{6}$/.test(draft.backgroundColor.trim())) {
    errors.push('Pick a valid background color.');
  }
  if (!/^#[0-9A-Fa-f]{6}$/.test(draft.textColor.trim())) {
    errors.push('Pick a valid text color.');
  }
  if (!/^#[0-9A-Fa-f]{6}$/.test(draft.ctaColor.trim())) {
    errors.push('Pick a valid button color.');
  }
  if (draft.displayDurationSec < 0 || draft.displayDurationSec > 60) {
    errors.push('Display duration must be between 0 and 60 seconds.');
  }
  if (!popupLinkOk(draft)) {
    errors.push(
      draft.linkType === 'post'
        ? 'Choose the listing this popup links to.'
        : 'Choose the page this popup links to.',
    );
  }
  return errors;
}

export function popupDraftIsSendable(draft: PopupDraft): boolean {
  return popupDraftErrors(draft).length === 0;
}

function draftPlacePayload(draft: PopupDraft) {
  if (draft.targetMode !== 'city' || !draft.stateId || !draft.cityId) {
    return { stateIds: [] as string[], cityIds: [] as string[] };
  }
  return {
    stateIds: [draft.stateId],
    cityIds: [draft.cityId],
  };
}

export function popupDraftToCreatePayload(draft: PopupDraft): CreateInAppPopupPayload {
  const imageUrl = draft.imageUrl.trim();
  const place = draftPlacePayload(draft);
  return {
    title: draft.title.trim(),
    body: draft.body.trim(),
    bodyFormat: draft.bodyFormat,
    ...(imageUrl ? { imageUrl } : {}),
    backgroundColor: draft.backgroundColor.trim().toUpperCase(),
    textColor: draft.textColor.trim().toUpperCase(),
    ctaColor: draft.ctaColor.trim().toUpperCase(),
    displayDurationSec: draft.displayDurationSec,
    timerDisplay: draft.displayDurationSec > 0 ? draft.timerDisplay : 'none',
    ctaLabel: draft.ctaLabel.trim() || 'View',
    ...place,
    audience: draft.audience,
    linkType: draft.linkType,
    ...(draft.linkType === 'post' && draft.listingId ? { listingId: draft.listingId } : {}),
    ...(draft.linkType === 'page' && draft.pageKey ? { pageKey: draft.pageKey } : {}),
    publish: true,
  };
}

export function popupDraftToUpdatePayload(draft: PopupDraft): UpdateInAppPopupPayload {
  const imageUrl = draft.imageUrl.trim();
  const place = draftPlacePayload(draft);
  return {
    title: draft.title.trim(),
    body: draft.body.trim(),
    bodyFormat: draft.bodyFormat,
    imageUrl: imageUrl || null,
    backgroundColor: draft.backgroundColor.trim().toUpperCase(),
    textColor: draft.textColor.trim().toUpperCase(),
    ctaColor: draft.ctaColor.trim().toUpperCase(),
    displayDurationSec: draft.displayDurationSec,
    timerDisplay: draft.displayDurationSec > 0 ? draft.timerDisplay : 'none',
    ctaLabel: draft.ctaLabel.trim() || 'View',
    ...place,
    audience: draft.audience,
    linkType: draft.linkType,
    listingId: draft.linkType === 'post' ? draft.listingId || null : null,
    pageKey: draft.linkType === 'page' ? draft.pageKey || null : null,
  };
}

export function popupToDraft(
  popup: InAppPopup,
  cities: { id: string; stateId?: string }[] = [],
): PopupDraft {
  const linkType = (popup.linkType || 'none') as BroadcastLinkType;
  const global =
    popup.placeScope === 'global' ||
    (popup.cityIds.length === 0 && (popup.stateIds?.length ?? 0) === 0);
  const cityId = popup.cityIds[0] || '';
  const stateFromCity = cities.find((c) => c.id === cityId)?.stateId || '';
  return {
    title: popup.title || '',
    body: popup.body || '',
    bodyFormat: popup.bodyFormat === 'markdown' ? 'markdown' : 'plain',
    imageUrl: popup.imageUrl || '',
    backgroundColor: popup.backgroundColor || '#0F172A',
    textColor: popup.textColor || '#FFFFFF',
    ctaColor: popup.ctaColor || '#E11D48',
    displayDurationSec: popup.displayDurationSec ?? 8,
    timerDisplay: popup.timerDisplay || 'progress_bar',
    ctaLabel: popup.ctaLabel || 'View',
    targetMode: global ? 'global' : 'city',
    stateId: popup.stateIds?.[0] || stateFromCity,
    cityId,
    audience: popup.audience || 'all',
    linkType: linkType === 'post' || linkType === 'page' ? linkType : 'none',
    listingId: popup.listingId || '',
    listingLabel: popup.listingId ? 'Linked listing' : '',
    pageKey: popup.pageKey || '',
  };
}

export function popupTargetSummary(popup: InAppPopup): string {
  const parts: string[] = [];
  if (popup.placeScope === 'global') {
    parts.push('Global');
  } else if (popup.cityNames.length) {
    const state = popup.stateNames?.[0];
    parts.push(state ? `${state} · ${popup.cityNames.join(', ')}` : popup.cityNames.join(', '));
  } else if (popup.stateNames?.length) {
    parts.push(popup.stateNames.join(', '));
  } else {
    parts.push('City');
  }
  parts.push(popup.audienceLabel || 'All users');
  return parts.join(' · ');
}

export function popupStatusLabel(status: InAppPopup['status']): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'active':
      return 'Live';
    case 'expired':
      return 'Expired';
    default:
      return 'Inactive';
  }
}

export function popupDraftTargetSummary(
  draft: PopupDraft,
  states: { id: string; name: string }[],
  cities: { id: string; name: string }[],
  audienceLabel: string,
): string {
  const parts: string[] = [];
  if (draft.targetMode === 'global' || !draft.stateId) {
    parts.push('Global');
  } else {
    const stateName = states.find((s) => s.id === draft.stateId)?.name || 'State';
    const cityName = cities.find((c) => c.id === draft.cityId)?.name;
    parts.push(cityName ? `${stateName} · ${cityName}` : stateName);
  }
  parts.push(audienceLabel);
  return parts.join(' · ');
}
