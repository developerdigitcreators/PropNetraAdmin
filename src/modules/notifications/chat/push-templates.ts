/** Rich Android tray templates (data-only FCM; the app draws them natively). */
export const PUSH_TEMPLATE_LAYOUTS = [
  "BANNER_ONLY",
  "EXPANDABLE_IMAGE",
  "RIGHT_THUMBNAIL",
] as const;

export type PushTemplateLayout = (typeof PUSH_TEMPLATE_LAYOUTS)[number];

export const PUSH_TEMPLATE_META: Record<
  PushTemplateLayout,
  {
    label: string;
    description: string;
    recommendedSize: string;
    supportsExpanded: boolean;
  }
> = {
  BANNER_ONLY: {
    label: "Banner only",
    description:
      "Full-width banner image in the collapsed tray (MakeMyTrip style). Add an expanded image to show a different picture on expand.",
    recommendedSize: "1024×256",
    supportsExpanded: true,
  },
  EXPANDABLE_IMAGE: {
    label: "Expandable image",
    description:
      "Title + message with a small thumbnail and/or a big picture on expand (Domino's style). Choose where the image shows.",
    recommendedSize: "1024×512",
    supportsExpanded: true,
  },
  RIGHT_THUMBNAIL: {
    label: "Right thumbnail",
    description:
      "Title + message with a square thumbnail on the right (Telegram style). No big picture.",
    recommendedSize: "256×256",
    supportsExpanded: false,
  },
};

/** EXPANDABLE_IMAGE: where the image appears in the tray. */
export type PushImageDisplay = "both" | "collapsed" | "expanded";

export const PUSH_IMAGE_DISPLAY_OPTIONS: { key: PushImageDisplay; label: string }[] = [
  { key: "both", label: "Both: small thumbnail + big picture on expand" },
  { key: "collapsed", label: "Only collapsed (small thumbnail)" },
  { key: "expanded", label: "Only when expanded (big picture)" },
];

export function normalizeImageDisplay(value?: string | null): PushImageDisplay {
  return value === "collapsed" || value === "expanded" ? value : "both";
}

export function isPushTemplate(value?: string | null): value is PushTemplateLayout {
  return PUSH_TEMPLATE_LAYOUTS.includes(
    String(value || "").toUpperCase() as PushTemplateLayout,
  );
}

export function templateSupportsExpanded(value?: string | null): boolean {
  return isPushTemplate(value) && PUSH_TEMPLATE_META[value].supportsExpanded;
}
