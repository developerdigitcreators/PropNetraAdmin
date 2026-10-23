import { axiosClient } from '@/lib/axios-client';

export type AdminMediaKind =
  | 'property_type'
  | 'property_name'
  | 'share_og'
  | 'banner'
  | 'popup'
  | 'icon'
  | 'team_member'
  | 'company_logo';

export type MediaLimits = {
  imageMaxBytes: number;
  videoMaxBytes: number;
  chunkedVideoMaxBytes: number;
  pdfMaxBytes: number;
};

let limitsPromise: Promise<MediaLimits | null> | null = null;

/** Server-enforced upload limits, fetched once per session. */
export function getAdminMediaLimits(): Promise<MediaLimits | null> {
  if (!limitsPromise) {
    limitsPromise = axiosClient
      .get('/admin/media/limits')
      .then((res) => {
        const body = res.data?.data ?? res.data ?? {};
        return Number(body.imageMaxBytes) > 0 ? (body as MediaLimits) : null;
      })
      .catch(() => {
        limitsPromise = null;
        return null;
      });
  }
  return limitsPromise;
}

export const formatMb = (bytes: number) => {
  const mb = bytes / (1024 * 1024);
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
};

/** Suggested pixel size per admin upload kind (matches the app card the image fills). */
export const RECOMMENDED_SIZE: Record<AdminMediaKind, string> = {
  banner: '1200×480',
  popup: '1080×1350',
  icon: '256×256',
  property_type: '1200×630',
  property_name: '1200×630',
  share_og: '1200×630',
  team_member: '400×400',
  company_logo: '600×360',
};

export async function uploadAdminMedia(
  kind: AdminMediaKind,
  file: File,
): Promise<string> {
  const form = new FormData();
  form.append('kind', kind);
  form.append('file', file);

  const response = await axiosClient.post('/admin/media/upload', form, {
    headers: { 'Content-Type': undefined as unknown as string },
    transformRequest: [
      (data, headers) => {
        if (headers && typeof headers === 'object') {
          delete (headers as Record<string, unknown>)['Content-Type'];
        }
        return data;
      },
    ],
    timeout: 60000,
  });

  const payload = response.data || {};
  const url = String(payload.url || payload.secureUrl || '').trim();
  if (!/^https:\/\//i.test(url)) {
    throw new Error('Upload did not return an HTTPS image URL');
  }
  return url;
}
