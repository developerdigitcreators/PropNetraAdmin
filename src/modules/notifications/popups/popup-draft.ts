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
import {
  linksAreValid,
  linksFromPrimaryFields,
  linksToBroadcastCtas,
  primaryFromLinks,
  type LinkCtaRow,
} from '../chat/multi-link-cta-editor';

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
  targetMode: PopupTargetMode;
  stateId: string;
  cityId: string;
  audience: PopupAudience;
  links: LinkCtaRow[];
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
    targetMode: 'global',
    stateId: '',
    cityId: '',
    audience: 'all',
    links: [],
  };
}

export function popupLinkOk(draft: PopupDraft): boolean {
  return linksAreValid(draft.links);
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
  if (draft.displayDurationSec < 0 || draft.displayDurationSec > 60) {
    errors.push('Display duration must be between 0 and 60 seconds.');
  }
  if (!popupLinkOk(draft)) {
    errors.push('Each link needs a listing (post) or page selected.');
  }
  if (draft.links.some((row) => !row.label.trim())) {
    errors.push('Each link needs button text.');
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

function draftLinkPayload(draft: PopupDraft) {
  const primary = primaryFromLinks(draft.links);
  const ctas = linksToBroadcastCtas(draft.links);
  return {
    ctaLabel: primary.ctaLabel.trim() || (primary.linkType === 'none' ? 'View' : 'View'),
    linkType: primary.linkType,
    ...(primary.linkType === 'post' && primary.listingId
      ? { listingId: primary.listingId }
      : {}),
    ...(primary.linkType === 'page' && primary.pageKey
      ? { pageKey: primary.pageKey }
      : {}),
    ...(ctas.length ? { ctas } : {}),
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
    displayDurationSec: draft.displayDurationSec,
    timerDisplay: draft.displayDurationSec > 0 ? draft.timerDisplay : 'none',
    ...place,
    audience: draft.audience,
    ...draftLinkPayload(draft),
    publish: true,
  };
}

export function popupDraftToUpdatePayload(draft: PopupDraft): UpdateInAppPopupPayload {
  const imageUrl = draft.imageUrl.trim();
  const place = draftPlacePayload(draft);
  const primary = primaryFromLinks(draft.links);
  const ctas = linksToBroadcastCtas(draft.links);
  return {
    title: draft.title.trim(),
    body: draft.body.trim(),
    bodyFormat: draft.bodyFormat,
    imageUrl: imageUrl || null,
    displayDurationSec: draft.displayDurationSec,
    timerDisplay: draft.displayDurationSec > 0 ? draft.timerDisplay : 'none',
    ...place,
    audience: draft.audience,
    ctaLabel: primary.ctaLabel.trim() || 'View',
    linkType: primary.linkType,
    listingId: primary.linkType === 'post' ? primary.listingId || null : null,
    pageKey: primary.linkType === 'page' ? primary.pageKey || null : null,
    ctas,
  };
}

export function popupToDraft(
  popup: InAppPopup,
  cities: { id: string; stateId?: string }[] = [],
): PopupDraft {
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
    targetMode: global ? 'global' : 'city',
    stateId: popup.stateIds?.[0] || stateFromCity,
    cityId,
    audience: popup.audience || 'all',
    links: linksFromPrimaryFields({
      linkType: popup.linkType as BroadcastLinkType,
      listingId: popup.listingId,
      pageKey: popup.pageKey,
      ctaLabel: popup.ctaLabel,
      ctas: popup.ctas,
    }),
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
