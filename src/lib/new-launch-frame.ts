/** Keep in sync with backend `NEW_LAUNCH_FRAME_DIMENSIONS` / app cropper. */
export const NEW_LAUNCH_FRAME = {
  fieldKey: 'dev_new_launch_frame',
  aspectRatio: 4 / 5,
  outputWidth: 400,
  outputHeight: 500,
  cropAspectRatio: 0.8,
} as const;

export type NewLaunchFeaturedPlacement = {
  homeItemId: string;
  cityId: string;
  cityName: string;
  sectionKind: string;
};

export type NewLaunchFeaturedResponse = {
  listingId: string;
  featured: boolean;
  frameUrl: string | null;
  placements?: NewLaunchFeaturedPlacement[];
};

export function parseNewLaunchFrameUrl(dynamic: Record<string, unknown> | null | undefined): string | null {
  const raw = dynamic?.[NEW_LAUNCH_FRAME.fieldKey];
  if (typeof raw === 'string' && raw.trim().startsWith('https://')) return raw.trim();
  if (raw && typeof raw === 'object' && 'imageUrl' in raw) {
    const u = (raw as { imageUrl?: unknown }).imageUrl;
    if (typeof u === 'string' && u.trim().startsWith('https://')) return u.trim();
  }
  return null;
}
