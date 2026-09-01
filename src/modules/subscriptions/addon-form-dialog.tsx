'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  type AddonCatalogItem,
  type UpdateAddonPayload,
} from '@/services/subscriptions.service';
import { Loader2 } from 'lucide-react';

type AddonFormDialogProps = {
  open: boolean;
  addon: AddonCatalogItem | null;
  submitting: boolean;
  error: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: UpdateAddonPayload) => void;
};

export function AddonFormDialog({
  open,
  addon,
  submitting,
  error,
  onOpenChange,
  onSubmit,
}: AddonFormDialogProps) {
  const [displayName, setDisplayName] = useState('');
  const [coinCost, setCoinCost] = useState(0);
  const [quantity, setQuantity] = useState(0);
  const [enabled, setEnabled] = useState(false);
  const [description, setDescription] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!open || !addon) return;
    setLocalError('');
    setDisplayName(addon.displayName);
    setCoinCost(addon.coinCost);
    setQuantity(addon.quantity);
    setEnabled(addon.enabled);
    setDescription(addon.description || '');
  }, [open, addon]);

  const isAutomatic = addon?.type === 'LISTING_PRIORITY';

  const handleSubmit = () => {
    if (!displayName.trim()) {
      setLocalError('Display name is required.');
      return;
    }
    setLocalError('');
    onSubmit({
      displayName: displayName.trim(),
      coinCost: isAutomatic ? 0 : coinCost,
      quantity: isAutomatic ? 0 : quantity,
      enabled,
      description: description.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit add-on — {addon?.type}</DialogTitle>
          <DialogDescription>
            {isAutomatic
              ? 'Listing priority is automatic for top paid referrers — edit the label and description only.'
              : 'Coin cost and quantity control what the app charges for this pack.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Display name</label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          {!isAutomatic ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Coin cost</label>
                <Input
                  type="number"
                  min={0}
                  value={coinCost}
                  onChange={(e) => setCoinCost(Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Quantity (credits or hours)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value) || 0)}
                />
              </div>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          {!isAutomatic ? (
            <div className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-gray-800">Enabled in app</p>
                <p className="text-xs text-gray-500">Disabled add-ons are hidden from purchase.</p>
              </div>
              <Switch checked={enabled} onCheckedChange={(c) => setEnabled(Boolean(c))} />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
              This feature runs automatically in listing search — it is not enabled or purchased
              like other add-ons.
            </div>
          )}

          {(localError || error) && (
            <p className="text-sm text-red-600">{localError || error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save add-on
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
