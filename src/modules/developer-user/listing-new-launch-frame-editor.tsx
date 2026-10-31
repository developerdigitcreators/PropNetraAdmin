'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FixedAspectCropDialog } from '@/components/media/fixed-aspect-crop-dialog';
import { NEW_LAUNCH_FRAME, type NewLaunchFeaturedPlacement } from '@/lib/new-launch-frame';
import { Loader2, X } from 'lucide-react';

type Props = {
  frameUrl: string | null;
  onFrameUrlChange: (url: string | null) => void;
  onUpload: (file: File) => Promise<string>;
  uploading?: boolean;
  placements?: NewLaunchFeaturedPlacement[];
  disabled?: boolean;
};

export function ListingNewLaunchFrameEditor({
  frameUrl,
  onFrameUrlChange,
  onUpload,
  uploading,
  placements,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [localBusy, setLocalBusy] = useState(false);
  const [error, setError] = useState('');

  const placementHint =
    placements && placements.length > 0
      ? `Featured on New Launch in ${[...new Set(placements.map((p) => p.cityName))].join(', ')}.`
      : 'This project is on a New Launch home section.';

  const busy = uploading || localBusy;

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-dashed border-gray-200 bg-gray-50/80 p-3 sm:col-span-2">
      <div>
        <p className="text-sm font-medium text-gray-900">New Launch frame (home)</p>
        <p className="text-xs text-gray-500">
          {placementHint} Shown on developer home cards only — not the property detail top banner.
          Fixed crop {NEW_LAUNCH_FRAME.outputWidth}×{NEW_LAUNCH_FRAME.outputHeight} (4:5).
        </p>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <div className="flex flex-wrap items-start gap-3">
        {frameUrl ? (
          <div className="relative h-[125px] w-[100px] overflow-hidden rounded-lg border bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={frameUrl} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
              onClick={() => onFrameUrlChange(null)}
              aria-label="Remove frame"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
        {!disabled ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            {frameUrl ? 'Replace frame' : 'Upload frame'}
          </Button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          setError('');
          const reader = new FileReader();
          reader.onload = () => {
            setCropSrc(String(reader.result));
            setCropOpen(true);
          };
          reader.onerror = () => setError('Could not read image.');
          reader.readAsDataURL(file);
        }}
      />
      <FixedAspectCropDialog
        open={cropOpen}
        onOpenChange={(next) => {
          setCropOpen(next);
          if (!next) setCropSrc(null);
        }}
        imageSrc={cropSrc}
        aspect={NEW_LAUNCH_FRAME.aspectRatio}
        outputWidth={NEW_LAUNCH_FRAME.outputWidth}
        outputHeight={NEW_LAUNCH_FRAME.outputHeight}
        cropBoxWidth={240}
        cropBoxHeight={300}
        title="New Launch frame (4:5)"
        onConfirm={async (croppedFile) => {
          setLocalBusy(true);
          setError('');
          try {
            const url = await onUpload(croppedFile);
            onFrameUrlChange(url);
          } catch (err) {
            setError(
              err instanceof Error ? err.message : 'Upload failed.',
            );
            throw err;
          } finally {
            setLocalBusy(false);
          }
        }}
      />
    </div>
  );
}
