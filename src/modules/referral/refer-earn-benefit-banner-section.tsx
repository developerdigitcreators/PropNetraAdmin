'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  referralApiError,
  referralService,
  type ReferralBenefitBanner,
} from '@/services/referral.service';
import { ImageIcon, Loader2 } from 'lucide-react';

type Props = {
  canUpdate: boolean;
  /** From GET /admin/referral/settings when benefit-banner GET is unavailable */
  initialFromSettings?: ReferralBenefitBanner | null;
};

export function ReferEarnBenefitBannerSection({
  canUpdate,
  initialFromSettings,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [banner, setBanner] = useState<ReferralBenefitBanner>({
    mediaUrl: initialFromSettings?.mediaUrl ?? null,
    isActive: initialFromSettings?.isActive !== false,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const applyPayload = useCallback((next: ReferralBenefitBanner) => {
    setBanner(next);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await referralService.getBenefitBanner();
      applyPayload(data.benefitBanner);
    } catch {
      if (initialFromSettings) {
        applyPayload(initialFromSettings);
      } else {
        setError('Failed to load Refer & Earn banner.');
      }
    } finally {
      setLoading(false);
    }
  }, [applyPayload, initialFromSettings]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!initialFromSettings?.mediaUrl) return;
    setBanner((prev) => (prev.mediaUrl ? prev : initialFromSettings));
  }, [initialFromSettings]);

  const handlePickFile = async (file: File | undefined) => {
    if (!file || !canUpdate) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const data = await referralService.uploadBenefitBanner(file);
      applyPayload(data.benefitBanner);
      setNotice('Banner uploaded. Previous image was replaced.');
    } catch (err) {
      setError(referralApiError(err, 'Failed to upload banner image.'));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleHide = async () => {
    if (!canUpdate || !banner.mediaUrl) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const data = await referralService.updateBenefitBanner({ isActive: false });
      applyPayload(data.benefitBanner);
      setNotice('Banner hidden in the app. Image kept for admin preview.');
    } catch (err) {
      setError(referralApiError(err, 'Failed to hide banner.'));
    } finally {
      setBusy(false);
    }
  };

  const handleShow = async () => {
    if (!canUpdate || !banner.mediaUrl) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const data = await referralService.updateBenefitBanner({ isActive: true });
      applyPayload(data.benefitBanner);
      setNotice('Banner visible in the app again.');
    } catch (err) {
      setError(referralApiError(err, 'Failed to show banner.'));
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!canUpdate) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const data = await referralService.updateBenefitBanner({ mediaUrl: null });
      applyPayload(data.benefitBanner);
      setNotice('Banner image removed.');
    } catch (err) {
      setError(referralApiError(err, 'Failed to remove banner.'));
    } finally {
      setBusy(false);
    }
  };

  const hidden = !!banner.mediaUrl && banner.isActive === false;
  const previewUrl = banner.mediaUrl;

  return (
    <section className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-medium">Refer &amp; Earn banner</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Benefits page banner — one global image on the Refer &amp; Earn screen
          (not city-wise Banner Ads).
        </p>
        <ul className="mt-2 list-inside list-disc space-y-0.5 text-xs text-gray-600">
          <li>
            Yeh banner sab users ko Refer &amp; Earn page par daily limit reset
            section ke neeche dikhega.
          </li>
          <li>Sirf ek image; naya upload purani replace karega.</li>
          <li>City-wise Banner Ads se alag hai.</li>
        </ul>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="relative max-w-xl overflow-hidden rounded-lg border bg-gray-50">
                {previewUrl ? (
                  <>
                    <img
                      src={previewUrl}
                      alt="Refer & Earn benefits banner preview"
                      className="aspect-[3.2/1] w-full object-cover"
                    />
                    {hidden ? (
                      <span className="absolute left-2 top-2 rounded-md bg-gray-900/75 px-2 py-0.5 text-xs font-medium text-white">
                        Hidden
                      </span>
                    ) : null}
                  </>
                ) : (
                  <div className="flex aspect-[3.2/1] w-full items-center justify-center border border-dashed text-sm text-gray-400">
                    No banner image
                  </div>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void handlePickFile(e.target.files?.[0])}
              />
              {canUpdate ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => fileRef.current?.click()}
                  >
                    {busy ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ImageIcon className="mr-2 h-4 w-4" />
                    )}
                    {previewUrl ? 'Replace' : 'Upload image'}
                  </Button>
                  {previewUrl && banner.isActive !== false ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void handleHide()}
                    >
                      Hide
                    </Button>
                  ) : null}
                  {previewUrl && banner.isActive === false ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void handleShow()}
                    >
                      Show again
                    </Button>
                  ) : null}
                  {previewUrl ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      className="text-red-600 hover:text-red-700"
                      onClick={() => void handleRemove()}
                    >
                      Remove
                    </Button>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {notice}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
