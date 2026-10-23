'use client';

import { useRef, useState } from 'react';
import { ImageIcon, Loader2, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadAdminMedia } from '@/services/media.service';
import { apiErrorInfo } from '@/services/password-reset.service';

export const COMPANY_LOGO_HINT = '5:3 ratio, recommended 600×360 px, minimum 300×180 px';

export function CompanyLogoField({
  value,
  onChange,
  onUploadingChange,
  error,
  disabled,
}: {
  value: string;
  onChange: (url: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
  error?: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setUploadError('');
    setUploading(true);
    onUploadingChange?.(true);
    try {
      onChange(await uploadAdminMedia('company_logo', file));
    } catch (err) {
      setUploadError(apiErrorInfo(err, (err as Error)?.message || 'Upload failed.').message);
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const shownError = uploadError || error;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex h-[60px] w-[100px] shrink-0 items-center justify-center overflow-hidden rounded-md border bg-gray-50">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Company" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-5 w-5 text-gray-300" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-1.5 h-4 w-4" />
            )}
            {value ? 'Replace' : 'Upload'}
          </Button>
          {value ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-red-500 hover:bg-red-50 hover:text-red-700"
              disabled={disabled || uploading}
              onClick={() => {
                setUploadError('');
                onChange('');
              }}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Remove
            </Button>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void pick(e.target.files?.[0])}
        />
      </div>
      <p className="text-xs text-gray-500">{COMPANY_LOGO_HINT}</p>
      {shownError ? <p className="text-xs text-red-500">{shownError}</p> : null}
    </div>
  );
}

export function SetupPendingBadge({ label }: { label?: string | null }) {
  return (
    <span
      className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800"
      title={label || undefined}
    >
      Setup pending
    </span>
  );
}

export const LOCKED_EMAIL_NOTE = 'Login email — locked for user';

type RoleShape = {
  userRoles?: Array<{ role?: { name?: string | null } | null } | null> | null;
  roleName?: string | null;
  appRole?: string | null;
};

export function isDeveloperUser(user: RoleShape | null | undefined) {
  const name = user?.userRoles?.[0]?.role?.name || user?.appRole || user?.roleName || '';
  return String(name).trim().toLowerCase() === 'developer';
}

export const PROJECT_PREFIX_HINT =
  'Shown before every property name, e.g. Suncity + Avenue = Suncity Avenue. Hidden from user.';
