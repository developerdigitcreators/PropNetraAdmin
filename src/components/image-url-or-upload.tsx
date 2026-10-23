'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  formatMb,
  getAdminMediaLimits,
  RECOMMENDED_SIZE,
  uploadAdminMedia,
  type AdminMediaKind,
} from '@/services/media.service';

type ImageUrlOrUploadProps = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  kind: AdminMediaKind;
  placeholder?: string;
  hint?: string;
  /** Suggested pixel size shown under the field (defaults per `kind`). */
  recommendedSize?: string;
  required?: boolean;
  /** Catalog pick: keep the preview, block URL edits and uploads. */
  readOnly?: boolean;
  error?: string;
  previewClassName?: string;
};

/** Loads the server image limit once; null until known. */
export function useAdminImageMaxBytes(): number | null {
  const [max, setMax] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    void getAdminMediaLimits().then((l) => {
      if (alive && l) setMax(l.imageMaxBytes);
    });
    return () => {
      alive = false;
    };
  }, []);
  return max;
}

export function uploadHintText(maxBytes: number | null, recommendedSize?: string) {
  return [
    maxBytes ? `Max ${formatMb(maxBytes)}` : null,
    recommendedSize ? `Recommended ${recommendedSize} px` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function ImageUrlOrUpload({
  label,
  value,
  onChange,
  kind,
  placeholder = 'https://…',
  hint = 'Paste a public HTTPS URL, or upload a file (stored on CDN).',
  recommendedSize,
  required,
  readOnly = false,
  error,
  previewClassName = 'h-16 w-28 rounded border bg-gray-50 object-cover',
}: ImageUrlOrUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const maxBytes = useAdminImageMaxBytes();
  const sizeHint = uploadHintText(maxBytes, recommendedSize ?? RECOMMENDED_SIZE[kind]);

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    if (maxBytes && file.size > maxBytes) {
      setUploadError(`Image is too large. Max ${formatMb(maxBytes)}.`);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setUploading(true);
    setUploadError('');
    try {
      const url = await uploadAdminMedia(kind, file);
      onChange(url);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Upload failed';
      setUploadError(String(msg));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium">
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </label>
        {!readOnly ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="h-8 gap-1.5"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0])}
            />
          </>
        ) : null}
      </div>
      {!readOnly ? (
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (uploadError) setUploadError('');
        }}
        placeholder={placeholder}
        disabled={uploading}
      />
      ) : null}
      {error || uploadError ? (
        <p className="text-xs text-red-600">{error || uploadError}</p>
      ) : (
        <p className="text-xs text-gray-500">{hint}</p>
      )}
      {!readOnly && sizeHint ? <p className="text-xs text-gray-500">{sizeHint}</p> : null}
      {value.trim() ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value.trim()}
          alt=""
          className={previewClassName}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : null}
    </div>
  );
}
