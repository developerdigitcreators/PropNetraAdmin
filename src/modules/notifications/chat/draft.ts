import {
  type BroadcastBodyFormat,
  type BroadcastFormat,
  type BroadcastLinkType,
  type BroadcastMedia,
  type BroadcastPayload,
  type NotificationCampaign,
  type UpdateCampaignPayload,
} from "@/services/notifications.service";
import {
  inferAdminLayoutType,
  toBroadcastPushFields,
  type PushActionDraft,
  type PushLayoutDraft,
  type PushLayoutType,
} from "./push-layout-composer";

/** Matches the backend's MaxLength on title and cardTitle. */
const TITLE_MAX = 200;

/** What the composer holds while the admin is typing. */
export type BroadcastDraft = {
  title: string;
  body: string;
  bodyFormat: BroadcastBodyFormat;
  media: BroadcastMedia[];
  cityIds: string[];
  linkType: BroadcastLinkType;
  listingId: string;
  listingLabel: string;
  pageKey: string;
  /** Optional CTA button label when post/page is linked (card + push). */
  ctaLabel: string;
  pushType: PushLayoutType;
  bgColor: string;
  countdownEndsAt: string;
  actions: PushActionDraft[];
  progressMax: number;
  progress: number;
  progressIndeterminate: boolean;
};

export function emptyDraft(cityIds: string[] = []): BroadcastDraft {
  return {
    title: "",
    body: "",
    bodyFormat: "plain",
    media: [],
    cityIds,
    linkType: "none",
    listingId: "",
    listingLabel: "",
    pageKey: "",
    ctaLabel: "",
    pushType: "AUTO",
    bgColor: "",
    countdownEndsAt: "",
    actions: [],
    progressMax: 100,
    progress: 0,
    progressIndeterminate: false,
  };
}

function toDatetimeLocal(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function draftPushLayout(draft: BroadcastDraft): PushLayoutDraft {
  return {
    layoutType: draft.pushType === "AUTO" ? undefined : draft.pushType,
    // Color layout hidden from admin for now.
    // ...(draft.bgColor.trim() ? { bgColor: draft.bgColor.trim() } : {}),
    ...(draft.countdownEndsAt
      ? { countdownEndsAt: draft.countdownEndsAt }
      : {}),
    ...(draft.actions.length ? { actions: draft.actions } : {}),
    progressMax: draft.progressMax,
    progress: draft.progress,
    progressIndeterminate: draft.progressIndeterminate,
  };
}

export function resolvedPushLayout(draft: BroadcastDraft) {
  return inferAdminLayoutType({
    selected: draft.pushType,
    titleHtml: draft.title,
    bodyHtml: draft.body,
    imageUrl: draftImageUrl(draft),
    bgColor: draft.bgColor.trim() || undefined,
  });
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

export function draftCtas(draft: BroadcastDraft): BroadcastPayload["ctas"] {
  if (draft.linkType === "none") return [];
  const label = draft.ctaLabel.trim();
  if (!label) return [];
  return [
    {
      label,
      ...(draft.linkType === "post" && draft.listingId
        ? { listingId: draft.listingId }
        : {}),
      ...(draft.linkType === "page" && draft.pageKey
        ? { screen: draft.pageKey }
        : {}),
    },
  ];
}

export function draftErrors(draft: BroadcastDraft): string[] {
  const errors: string[] = [];
  if (!draft.title.trim()) errors.push("Title is required.");
  if (draft.title.length > TITLE_MAX)
    errors.push(`Title must be under ${TITLE_MAX} characters.`);
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

  const layout = resolvedPushLayout(draft);
  if (layout === "IMAGE" && !draftImageUrl(draft)) {
    errors.push("Attach an image for Image push type.");
  }
  if (layout === "COUNTDOWN") {
    if (!draft.countdownEndsAt) {
      errors.push("Set when the countdown ends.");
    } else {
      const ends = new Date(draft.countdownEndsAt);
      if (Number.isNaN(ends.getTime()) || ends <= new Date()) {
        errors.push("Countdown must end in the future.");
      }
    }
  }
  if (layout === "MULTI_ACTION") {
    const actions = draft.actions.filter((row) => row.deepLink.trim());
    if (actions.length < 2 || actions.length > 3) {
      errors.push("Multi-action needs 2–3 actions with a link.");
    }
    if (
      draft.actions.some((row) => row.iconUrl.trim() && !isHttpsUrl(row.iconUrl))
    ) {
      errors.push("Action icons must be valid HTTPS links.");
    }
  }
  if (layout === "PROGRESS" && !draft.progressIndeterminate) {
    if (!draft.progressMax || draft.progressMax < 1) {
      errors.push("Set a progress maximum of at least 1.");
    } else if (draft.progress < 0 || draft.progress > draft.progressMax) {
      errors.push("Progress must be between 0 and the maximum.");
    }
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
  const title = draft.title.trim();
  const body = draft.body.trim();
  const ctas = draftCtas(draft);
  return {
    channelId,
    cityIds: draft.cityIds,
    title,
    body,
    // Same content for PropNetra Updates card + phone push.
    cardTitle: title,
    ...(body ? { cardBody: body } : {}),
    bodyFormat: draft.bodyFormat,
    format: draftFormat(draft),
    linkType: draft.linkType,
    ...(imageUrl ? { imageUrl } : {}),
    ...(draft.media.length ? { media: draft.media } : {}),
    ...(ctas?.length ? { ctas } : {}),
    ...(draft.linkType === "post" && draft.listingId
      ? { listingId: draft.listingId }
      : {}),
    ...(draft.linkType === "page" && draft.pageKey
      ? { pageKey: draft.pageKey }
      : {}),
    ...toBroadcastPushFields(draftPushLayout(draft), draft.pushType, {
      titleHtml: draft.title,
      bodyHtml: draft.body,
      imageUrl,
    }) as Partial<BroadcastPayload>,
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
  const title = draft.title.trim();
  const body = draft.body.trim();
  const ctas = draftCtas(draft);
  return {
    title,
    body,
    cardTitle: title,
    cardBody: body,
    bodyFormat: draft.bodyFormat,
    format: draftFormat(draft),
    media: draft.media,
    linkType: draft.linkType,
    ctas: ctas || [],
    ...(imageUrl ? { imageUrl } : {}),
    ...(draft.linkType === "post" && draft.listingId
      ? { listingId: draft.listingId }
      : {}),
    ...(draft.linkType === "page" && draft.pageKey
      ? { pageKey: draft.pageKey }
      : {}),
    ...toBroadcastPushFields(draftPushLayout(draft), draft.pushType, {
      titleHtml: draft.title,
      bodyHtml: draft.body,
      imageUrl,
    }) as Partial<UpdateCampaignPayload>,
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
  const title = campaign.cardTitle || campaign.title || "";
  const body = campaign.cardBody || campaign.body || "";
  return {
    title,
    body,
    bodyFormat: (campaign.bodyFormat === "markdown"
      ? "markdown"
      : "plain") as BroadcastBodyFormat,
    media,
    cityIds: campaign.cityIds || [],
    linkType: linkType === "post" || linkType === "page" ? linkType : "none",
    listingId: campaign.listingId || "",
    listingLabel: campaign.listingId ? "Linked listing" : "",
    pageKey: campaign.pageKey || "",
    ctaLabel: campaign.ctas?.[0]?.label || "",
    pushType:
      campaign.layoutType === "COUNTDOWN" ||
      campaign.layoutType === "MULTI_ACTION" ||
      campaign.layoutType === "PROGRESS"
        ? (campaign.layoutType as PushLayoutType)
        : "AUTO",
    bgColor: campaign.bgColor || "",
    countdownEndsAt: toDatetimeLocal(campaign.countdownEndsAt),
    actions: (campaign.actions || []).map((row) => ({
      iconUrl: row.iconUrl || "",
      label: row.label || "",
      deepLink: row.deepLink || "",
    })),
    progressMax: campaign.progressMax ?? 100,
    progress: campaign.progress ?? 0,
    progressIndeterminate: campaign.progressIndeterminate === true,
  };
}
