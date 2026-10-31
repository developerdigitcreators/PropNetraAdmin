'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { formatMb, uploadAdminMedia } from '@/services/media.service';
import { uploadHintText, useAdminImageMaxBytes } from '@/components/image-url-or-upload';
import {
  developerHomeApiError,
  developerHomeService,
  type AdminTeamMember,
} from '@/services/developer-home.service';
import { useDialogUnsavedGuard, useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';
import { Loader2, UserPlus } from 'lucide-react';

const TEAM_NAME_MAX = 60;
const TEAM_ROLE_MAX = 60;
const TEAM_NAME_RE = /^[A-Za-z][A-Za-z .'-]*$/;
const PHONE_RE = /^(\+91)?[6-9]\d{9}$/;

type FieldErrors = { name?: string; phone?: string; designation?: string };

function validate(v: { name: string; phone: string; designation: string }): FieldErrors {
  const errs: FieldErrors = {};
  const name = v.name.trim();
  if (!name) errs.name = 'Name is required';
  else if (name.length < 2) errs.name = 'Name must be at least 2 characters';
  else if (!TEAM_NAME_RE.test(name)) errs.name = 'Use letters and spaces only';

  const phone = v.phone.replace(/\s+/g, '');
  if (!phone) errs.phone = 'Mobile number is required';
  else if (!PHONE_RE.test(phone)) errs.phone = 'Enter a valid 10-digit Indian mobile number';

  const role = v.designation.trim();
  if (!role) errs.designation = 'Role is required';
  else if (role.length < 2) errs.designation = 'Role must be at least 2 characters';
  else if (!/[A-Za-z]/.test(role)) errs.designation = 'Enter a valid role';
  return errs;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function TeamMemberFormDialog({
  open,
  developerId,
  member = null,
  pages = ['coming_soon'],
  onClose,
  onSaved,
}: {
  open: boolean;
  developerId: string;
  /** When set, dialog edits an existing member (PATCH). */
  member?: AdminTeamMember | null;
  pages?: string[];
  onClose: () => void;
  onSaved: (member: AdminTeamMember) => void;
}) {
  const isEdit = Boolean(member?.id);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const maxBytes = useAdminImageMaxBytes();
  const dirty =
    open &&
    (isEdit
      ? name.trim() !== (member?.name || '').trim() ||
        phone.replace(/\s+/g, '') !== (member?.phone || '').replace(/\s+/g, '') ||
        designation.trim() !== (member?.designation || '').trim() ||
        photoUrl !== (member?.photoUrl ?? null) ||
        isActive !== (member?.isActive ?? true)
      : !!(name.trim() || phone.trim() || designation.trim() || photoUrl));
  const { requestClose, dialog } = useDialogUnsavedGuard(dirty, { onSave: () => save() });
  const { dialog: leaveDialog } = useUnsavedChangesGuard({ dirty, onSave: () => save() });

  const close = async () => {
    if (saving) return;
    if (await requestClose()) onClose();
  };

  useEffect(() => {
    if (!open) return;
    if (member) {
      setName(member.name);
      setPhone(member.phone);
      setDesignation(member.designation || '');
      setPhotoUrl(member.photoUrl);
      setIsActive(member.isActive);
    } else {
      setName('');
      setPhone('');
      setDesignation('');
      setPhotoUrl(null);
      setIsActive(true);
    }
    setError('');
    setFieldErrors({});
  }, [open, member]);

  const clearField = (k: keyof FieldErrors) =>
    setFieldErrors((prev) => (prev[k] ? { ...prev, [k]: undefined } : prev));

  const pickPhoto = async (file?: File | null) => {
    if (!file) return;
    if (maxBytes && file.size > maxBytes) {
      setError(`Photo is too large. Max ${formatMb(maxBytes)}.`);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setUploading(true);
    setError('');
    try {
      setPhotoUrl(await uploadAdminMedia('team_member', file));
    } catch (err) {
      setError(developerHomeApiError(err, 'Could not upload photo'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const save = async () => {
    const cleanPhone = phone.replace(/\s+/g, '');
    const errs = validate({ name, phone: cleanPhone, designation });
    setFieldErrors(errs);
    if (Object.values(errs).some(Boolean)) return setError('');
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: name.trim().replace(/\s+/g, ' '),
        phone: cleanPhone,
        designation: designation.trim().replace(/\s+/g, ' '),
        photoUrl: photoUrl || undefined,
        isActive,
      };
      const saved = isEdit && member
        ? await developerHomeService.updateMember(developerId, member.id, {
            name: payload.name,
            phone: payload.phone,
            designation: payload.designation,
            photoUrl: payload.photoUrl,
            isActive: payload.isActive,
          })
        : await developerHomeService.createMember(developerId, {
            name: payload.name,
            phone: payload.phone,
            designation: payload.designation,
            ...(photoUrl ? { photoUrl } : {}),
            pages,
          });
      onSaved({ ...saved, microMarkets: saved.microMarkets ?? member?.microMarkets ?? [], assignments: saved.assignments ?? member?.assignments ?? [] });
    } catch (err) {
      setError(developerHomeApiError(err, 'Could not save team member'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => !v && void close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit team member' : 'Add team member'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update this member’s profile and photo.' : 'The member is added to this developer&apos;s team.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-dashed border-primary/40 bg-primary/5 flex items-center justify-center"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : name.trim() ? (
              <span className="text-lg font-semibold text-primary">{initials(name)}</span>
            ) : (
              <UserPlus className="h-6 w-6 text-primary" />
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void pickPhoto(e.target.files?.[0])}
          />
          {photoUrl && !uploading ? (
            <button type="button" className="text-xs text-primary" onClick={() => setPhotoUrl(null)}>
              Remove photo
            </button>
          ) : (
            <p className="text-xs text-gray-500">No photo? A name avatar is created automatically.</p>
          )}
          <p className="text-xs text-gray-500">{uploadHintText(maxBytes, '400×400')}</p>
        </div>

        <div className="space-y-3">
          <Field label="Name *" error={fieldErrors.name}>
            <Input
              value={name}
              maxLength={TEAM_NAME_MAX}
              placeholder="e.g. Rohit Sharma"
              onChange={(e) => {
                setName(e.target.value);
                clearField('name');
              }}
            />
          </Field>
          <Field label="Mobile number *" error={fieldErrors.phone}>
            <Input
              value={phone}
              inputMode="numeric"
              maxLength={13}
              placeholder="10-digit mobile number"
              onChange={(e) => {
                setPhone(e.target.value.replace(/[^\d+]/g, ''));
                clearField('phone');
              }}
            />
          </Field>
          <Field label="Role / designation *" error={fieldErrors.designation}>
            <Input
              value={designation}
              maxLength={TEAM_ROLE_MAX}
              placeholder="e.g. Sales Manager"
              onChange={(e) => {
                setDesignation(e.target.value);
                clearField('designation');
              }}
            />
          </Field>
          {isEdit && (
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span className="text-sm font-medium text-gray-700">Active</span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => void close()} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving || uploading}>
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    {dialog}
    {leaveDialog}
    </>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
