import { axiosClient } from '@/lib/axios-client';

export type AdminMediaKind =
  | 'property_type'
  | 'property_name'
  | 'share_og'
  | 'banner'
  | 'popup'
  | 'icon';

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
