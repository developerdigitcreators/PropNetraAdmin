'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ImageUrlOrUpload } from '@/components/image-url-or-upload';
import {
  subscriptionApiError,
  subscriptionsService,
} from '@/services/subscriptions.service';
import { Loader2 } from 'lucide-react';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canUpdate: boolean;
};

export function PlanPopupBannerDialog({
  open,
  onOpenChange,
  canUpdate,
}: Props) {
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    subscriptionsService
      .getPlanPopupBanner()
      .then((data) => {
        if (!cancelled) setImageUrl(data.imageUrl || '');
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            subscriptionApiError(err, 'Failed to load plan popup banner.'),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleSave = async () => {
    if (!canUpdate || saving) return;
    setSaving(true);
    setError('');
    try {
      const next = await subscriptionsService.setPlanPopupBanner(
        imageUrl.trim() || null,
      );
      setImageUrl(next.imageUrl || '');
      onOpenChange(false);
    } catch (err) {
      setError(subscriptionApiError(err, 'Failed to save banner image.'));
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!canUpdate || saving) return;
    setSaving(true);
    setError('');
    try {
      await subscriptionsService.setPlanPopupBanner(null);
      setImageUrl('');
      onOpenChange(false);
    } catch (err) {
      setError(subscriptionApiError(err, 'Failed to clear banner image.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upgrade / Unlock plan banner</DialogTitle>
          <DialogDescription>
            One image for all users on the unlock and upgrade plan popup in the
            app (fixed height ~160px). Leave empty to hide the banner.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <ImageUrlOrUpload
              label="Banner image"
              value={imageUrl}
              onChange={setImageUrl}
              kind="banner"
              hint="Upload or paste a public HTTPS image URL shown on unlock & upgrade plan screens."
              previewClassName="h-28 w-full rounded border bg-gray-50 object-cover"
            />
            {error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : null}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {canUpdate && imageUrl ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleClear()}
              disabled={saving || loading}
            >
              Remove banner
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          {canUpdate ? (
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || loading}
            >
              {saving ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : null}
              Save
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
