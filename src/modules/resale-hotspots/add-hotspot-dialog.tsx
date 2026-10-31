'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/common/searchable-select';
import { useDialogUnsavedGuard } from '@/hooks/use-unsaved-changes-guard';
import {
  resaleHotspotsApiError,
  resaleHotspotsService,
  type ResaleHotspotOption,
} from '@/services/resale-hotspots.service';
import { Loader2 } from 'lucide-react';

type AddHotspotDialogProps = {
  open: boolean;
  cityId: string;
  cityName?: string;
  submitting: boolean;
  error: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (microMarketId: string) => void;
};

export function AddHotspotDialog({
  open,
  cityId,
  cityName,
  submitting,
  error,
  onOpenChange,
  onSubmit,
}: AddHotspotDialogProps) {
  const [microMarketId, setMicroMarketId] = useState('');
  const [options, setOptions] = useState<ResaleHotspotOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const baselineRef = useRef('');

  useEffect(() => {
    if (!open) return;
    setMicroMarketId('');
    setLocalError('');
    baselineRef.current = JSON.stringify({ microMarketId: '' });
  }, [open]);

  useEffect(() => {
    if (!open || !cityId) return;
    let cancelled = false;
    setLoading(true);
    resaleHotspotsService
      .options(cityId)
      .then((rows) => {
        if (!cancelled) setOptions(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setOptions([]);
          setLocalError(resaleHotspotsApiError(err, 'Failed to load micromarkets.'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, cityId]);

  const selectOptions = useMemo(
    () => options.map((row) => ({ value: row.id, label: row.name })),
    [options],
  );

  const dirty =
    open &&
    baselineRef.current !== '' &&
    JSON.stringify({ microMarketId }) !== baselineRef.current;
  const { requestClose, dialog } = useDialogUnsavedGuard(dirty, {
    onSave: () => handleSubmit(),
  });

  const handleOpenChange = async (next: boolean) => {
    if (submitting) return;
    if (!next) {
      const ok = await requestClose();
      if (ok) onOpenChange(false);
      return;
    }
    onOpenChange(true);
  };

  const handleSubmit = () => {
    if (!microMarketId) {
      setLocalError('Select an approved micromarket.');
      return;
    }
    setLocalError('');
    onSubmit(microMarketId);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => void handleOpenChange(next)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add hotspot chip</DialogTitle>
            <DialogDescription>
              Approved micromarkets for {cityName || 'this city'} that are not already chips.
              App search uses this micromarket when the chip is tapped.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Micromarket</label>
              <SearchableSelect
                options={selectOptions}
                value={microMarketId}
                onValueChange={setMicroMarketId}
                loading={loading}
                disabled={!cityId}
                placeholder="Select micromarket"
                searchPlaceholder="Search micromarkets…"
                emptyText="No remaining approved micromarkets for this city."
              />
            </div>
            {(localError || error) && (
              <p className="text-sm text-red-600">{localError || error}</p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => void handleOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting || !microMarketId}>
                {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Add chip
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {dialog}
    </>
  );
}
