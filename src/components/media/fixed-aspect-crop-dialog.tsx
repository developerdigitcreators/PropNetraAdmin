'use client';

import { useCallback, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { exportCroppedImageBlob } from '@/lib/crop-image-export';

type FixedAspectCropDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string | null;
  aspect: number;
  outputWidth: number;
  outputHeight: number;
  /** Fixed crop box size in the cropper viewport (px). */
  cropBoxWidth: number;
  cropBoxHeight: number;
  title?: string;
  onConfirm: (file: File) => void | Promise<void>;
};

export function FixedAspectCropDialog({
  open,
  onOpenChange,
  imageSrc,
  aspect,
  outputWidth,
  outputHeight,
  cropBoxWidth,
  cropBoxHeight,
  title = 'Crop image',
  onConfirm,
}: FixedAspectCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setBusy(true);
    try {
      const blob = await exportCroppedImageBlob(
        imageSrc,
        croppedAreaPixels,
        outputWidth,
        outputHeight,
      );
      const file = new File([blob], `crop-${outputWidth}x${outputHeight}.jpg`, {
        type: 'image/jpeg',
      });
      await onConfirm(file);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Drag to position and zoom. Fixed 4:5 crop exports at {outputWidth}×{outputHeight}px.
          </DialogDescription>
        </DialogHeader>
        <div className="relative h-[min(60vh,420px)] w-full overflow-hidden rounded-lg bg-gray-900">
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              cropSize={{ width: cropBoxWidth, height: cropBoxHeight }}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              showGrid={false}
            />
          ) : null}
        </div>
        <label className="flex items-center gap-3 text-sm text-gray-600">
          <span className="shrink-0">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full"
          />
        </label>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleConfirm()} disabled={busy || !croppedAreaPixels}>
            {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
            Use crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
