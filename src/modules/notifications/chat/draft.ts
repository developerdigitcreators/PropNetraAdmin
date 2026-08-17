import {
  type BroadcastBodyFormat,
  type BroadcastFormat,
  type BroadcastLinkType,
  type BroadcastMedia,
  type BroadcastPayload,
  type NotificationCampaign,
  type UpdateCampaignPayload,
} from "@/services/notifications.service";

/** Matches the backend's MaxLength on title and cardTitle. */
const TITLE_MAX = 200;

/** What the composer holds while the admin is typing. */
export type BroadcastDraft = {
  title: string;
  body: string;
  cardTitle: string;
  cardBody: string;
  bodyFormat: BroadcastBodyFormat;
  media: BroadcastMedia[];
  cityIds: string[];
  linkType: BroadcastLinkType;
  listingId: string;
  listingLabel: string;
  pageKey: string;
};

export function emptyDraft(cityIds: string[] = []): BroadcastDraft {
  return {
    title: "",
    body: "",
    cardTitle: "",
    cardBody: "",
    bodyFormat: "plain",
    media: [],
    cityIds,
    linkType: "none",
    listingId: "",
    listingLabel: "",
    pageKey: "",
  };
}

export function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function draftImageUrl(draft: BroadcastDraft): string {
  return draft.media.find((m) => m.kind === "image")?.url || "";
}

export function draftFormat(draft: BroadcastDraft): BroadcastFormat {
  return draftImageUrl(draft) ? "text_image" : "text";
}

export function draftLinkOk(draft: BroadcastDraft): boolean {
  if (draft.linkType === "post") return !!draft.listingId;
  if (draft.linkType === "page") return !!draft.pageKey;
  return true;
}

export function draftErrors(draft: BroadcastDraft): string[] {
  const errors: string[] = [];
  if (!draft.title.trim()) errors.push("Title is required.");
  if (!draft.body.trim()) errors.push("Message is required.");
  if (draft.title.length > TITLE_MAX)
    errors.push(`Title must be under ${TITLE_MAX} characters.`);
  if (draft.cardTitle.length > TITLE_MAX) {
    errors.push(`Card title must be under ${TITLE_MAX} characters.`);
  }
  if (draft.cityIds.length === 0) errors.push("Pick at least one city.");
  if (draft.media.some((m) => !isHttpsUrl(m.url))) {
    errors.push("Every attachment must be a valid HTTPS link.");
  }
  if (!draftLinkOk(draft)) {
    errors.push(
      draft.linkType === "post"
        ? "Choose the listing this message links to."
        : "Choose the page this message links to.",
    );
  }
  return errors;
}

export function draftIsSendable(draft: BroadcastDraft): boolean {
  return draftErrors(draft).length === 0;
}

export function draftToBroadcastPayload(
  draft: BroadcastDraft,
  channelId: string,
): BroadcastPayload {
  const imageUrl = draftImageUrl(draft);
  return {
    channelId,
    cityIds: draft.cityIds,
    title: draft.title.trim(),
    body: draft.body.trim(),
    bodyFormat: draft.bodyFormat,
    format: draftFormat(draft),
    linkType: draft.linkType,
    ...(draft.cardTitle.trim() ? { cardTitle: draft.cardTitle.trim() } : {}),
    ...(draft.cardBody.trim() ? { cardBody: draft.cardBody.trim() } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(draft.media.length ? { media: draft.media } : {}),
    ...(draft.linkType === "post" && draft.listingId
      ? { listingId: draft.listingId }
      : {}),
    ...(draft.linkType === "page" && draft.pageKey
      ? { pageKey: draft.pageKey }
      : {}),
  };
}

/**
 * Edit payload. Cities and channel are omitted on purpose — the backend keeps
 * them locked because feed cards are written per city.
 */
export function draftToUpdatePayload(
  draft: BroadcastDraft,
): UpdateCampaignPayload {
  const imageUrl = draftImageUrl(draft);
  return {
    title: draft.title.trim(),
    body: draft.body.trim(),
    cardTitle: draft.cardTitle.trim(),
    cardBody: draft.cardBody.trim(),
    bodyFormat: draft.bodyFormat,
    format: draftFormat(draft),
    media: draft.media,
    linkType: draft.linkType,
    ...(imageUrl ? { imageUrl } : {}),
    ...(draft.linkType === "post" && draft.listingId
      ? { listingId: draft.listingId }
      : {}),
    ...(draft.linkType === "page" && draft.pageKey
      ? { pageKey: draft.pageKey }
      : {}),
  };
}

export function campaignToDraft(
  campaign: NotificationCampaign,
): BroadcastDraft {
  const linkType = (campaign.linkType || "none") as BroadcastLinkType;
  const media: BroadcastMedia[] = campaign.media?.length
    ? campaign.media
    : campaign.imageUrl
      ? [{ kind: "image", url: campaign.imageUrl }]
      : [];
  return {
    title: campaign.title || "",
    body: campaign.body || "",
    cardTitle: campaign.cardTitle || "",
    cardBody: campaign.cardBody || "",
    bodyFormat: (campaign.bodyFormat === "markdown"
      ? "markdown"
      : "plain") as BroadcastBodyFormat,
    media,
    cityIds: campaign.cityIds || [],
    linkType: linkType === "post" || linkType === "page" ? linkType : "none",
    listingId: campaign.listingId || "",
    listingLabel: campaign.listingId ? "Linked listing" : "",
    pageKey: campaign.pageKey || "",
  };
}
