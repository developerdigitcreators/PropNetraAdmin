'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { adminUsersService } from '@/services/admin-users.service';
import { rbacService } from '@/services/rbac.service';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

const INDIAN_MOBILE = /^[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const optionalEmail = z
  .string()
  .trim()
  .refine((v) => v === '' || EMAIL_RE.test(v), {
    message: 'Enter a valid email address',
  });

const schema = z.object({
  role_id: z.string().min(1, 'Role is required'),
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Name is too long'),
  contact: z
    .string()
    .trim()
    .regex(INDIAN_MOBILE, 'Enter a valid 10-digit Indian mobile number'),
  email: optionalEmail,
});

type FormData = z.infer<typeof schema>;

type AppRole = { id: string; name: string; audience?: string; label?: string };

const ADD_USER_ROLE_OPTIONS = [
  { key: 'agent', label: 'Agent' },
  { key: 'floor', label: 'Direct builder floor' },
] as const;

function roleKey(name?: string) {
  return String(name || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .trim();
}

function matchesAddUserRole(name: string | undefined, key: 'agent' | 'floor') {
  const n = roleKey(name);
  if (key === 'agent') return n === 'agent';
  return n === 'floor' || n.includes('direct builder') || n === 'builder floor';
}

function normalizeRoles(data: unknown): AppRole[] {
  const raw = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)
      ? (data as { data: AppRole[] }).data
      : [];
  return raw.filter((r) => r && r.id && r.name);
}

type ApiFieldIssue = { field: keyof FormData; message: string };

function asFormField(value: unknown): keyof FormData | null {
  const key = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (key === 'email' || key === 'email_id' || key === 'emailid') return 'email';
  if (
    key === 'contact' ||
    key === 'phone' ||
    key === 'mobile' ||
    key === 'contact_no' ||
    key === 'contact_number' ||
    key === 'phone_number' ||
    key === 'mobile_number'
  ) {
    return 'contact';
  }
  if (key === 'name' || key === 'full_name') return 'name';
  if (key === 'role_id' || key === 'role') return 'role_id';
  return null;
}

function defaultDuplicateMessage(field: keyof FormData): string {
  if (field === 'email') return 'Email already registered';
  if (field === 'contact') return 'Contact number already registered';
  return 'Already exists.';
}

function messageText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    return value
      .map((item) => messageText(item))
      .filter(Boolean)
      .join(' ');
  }
  if (value && typeof value === 'object') {
    const row = value as Record<string, unknown>;
    return messageText(row.message ?? row.msg ?? row.error ?? '');
  }
  return '';
}

/** Infer contact/email from free-text API messages (supports multi-line / joined messages). */
function inferDuplicateFieldsFromText(text: string): Array<{ field: keyof FormData; message: string }> {
  const found: Array<{ field: keyof FormData; message: string }> = [];
  const chunks = text
    .split(/[\n;|]+|(?:\s+and\s+)/i)
    .map((part) => part.trim())
    .filter(Boolean);
  const parts = chunks.length ? chunks : [text.trim()];

  for (const part of parts) {
    const lower = part.toLowerCase();
    const looksDuplicate = /\b(already|exist|duplicate|registered|in use|taken)\b/.test(lower);
    if (!looksDuplicate) continue;
    const mentionsContact = /\b(contact|phone|mobile)\b/.test(lower);
    const mentionsEmail = /\bemail\b/.test(lower);
    if (mentionsContact) {
      found.push({ field: 'contact', message: part || defaultDuplicateMessage('contact') });
    }
    if (mentionsEmail) {
      found.push({ field: 'email', message: part || defaultDuplicateMessage('email') });
    }
  }

  // Single sentence mentioning both fields, e.g. "Contact and email already registered"
  const lower = text.toLowerCase();
  if (
    /\b(already|exist|duplicate|registered|in use|taken)\b/.test(lower) &&
    /\b(contact|phone|mobile)\b/.test(lower) &&
    /\bemail\b/.test(lower)
  ) {
    found.push({ field: 'contact', message: defaultDuplicateMessage('contact') });
    found.push({ field: 'email', message: defaultDuplicateMessage('email') });
  }

  return found;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Collect all field-level API errors so contact + email duplicates can both show. */
function apiFieldErrors(
  err: unknown,
  opts?: { emailProvided?: boolean },
): { issues: ApiFieldIssue[]; message: string } {
  const root = asRecord((err as { response?: { data?: unknown } })?.response?.data);
  const nestedError = asRecord(root?.error);
  const nestedData = asRecord(root?.data);
  // Scan root + nested error + nested data so sibling `errors`/`details` are not missed
  // when API nests a string message under `error` but puts fields elsewhere.
  const candidates = [root, nestedError, nestedData].filter(Boolean) as Record<string, unknown>[];

  const fallback =
    messageText(nestedError?.message) ||
    messageText(root?.message) ||
    messageText(nestedData?.message) ||
    'Failed to add user.';

  const issues: ApiFieldIssue[] = [];
  const seen = new Set<keyof FormData>();

  const push = (fieldRaw: unknown, message?: unknown) => {
    const field = asFormField(fieldRaw);
    if (!field || seen.has(field)) return;
    seen.add(field);
    const msg = messageText(message) || defaultDuplicateMessage(field);
    issues.push({ field, message: msg });
  };

  const collectFrom = (obj: Record<string, unknown>) => {
    // { details: [{ field, message }] } or { errors: [...] }
    for (const key of ['details', 'errors', 'issues', 'fieldErrors', 'conflicts'] as const) {
      const list = obj[key];
      if (!Array.isArray(list)) continue;
      for (const item of list) {
        if (typeof item === 'string') {
          for (const inferred of inferDuplicateFieldsFromText(item)) {
            push(inferred.field, inferred.message);
          }
          const mapped = asFormField(item);
          if (mapped) push(mapped, defaultDuplicateMessage(mapped));
          continue;
        }
        if (!item || typeof item !== 'object') continue;
        const row = item as Record<string, unknown>;
        push(
          row.field ?? row.path ?? row.name ?? row.key ?? row.property,
          row.message ?? row.msg ?? row.error ?? row.reason,
        );
      }
    }

    // { errors: { contact: "...", email: "..." } } / details / fieldErrors maps
    for (const key of ['errors', 'details', 'fieldErrors', 'fields'] as const) {
      const map = obj[key];
      if (!map || typeof map !== 'object' || Array.isArray(map)) continue;
      for (const [mapKey, value] of Object.entries(map as Record<string, unknown>)) {
        push(mapKey, value);
      }
    }

    // { fields: ["contact", "email"] } / conflictingFields / duplicateFields
    for (const key of ['fields', 'conflictingFields', 'duplicateFields', 'conflictFields'] as const) {
      const list = obj[key];
      if (!Array.isArray(list)) continue;
      for (const field of list) {
        const mapped = asFormField(field);
        push(field, mapped ? defaultDuplicateMessage(mapped) : fallback);
      }
    }

    // { field: "contact" } or { field: ["contact", "email"] }
    if (Array.isArray(obj.field)) {
      for (const field of obj.field) {
        const mapped = asFormField(field);
        push(field, mapped ? defaultDuplicateMessage(mapped) : fallback);
      }
    } else if (typeof obj.field === 'string' && obj.field.includes(',')) {
      for (const part of obj.field.split(',')) {
        const mapped = asFormField(part);
        push(part, mapped ? defaultDuplicateMessage(mapped) : fallback);
      }
    } else if (obj.field) {
      push(obj.field, obj.message ?? fallback);
    }

    // Direct keys: { contact: "...", email: "..." }
    for (const key of ['contact', 'phone', 'mobile', 'email', 'email_id', 'contact_no'] as const) {
      if (obj[key] == null) continue;
      const value = obj[key];
      if (typeof value === 'boolean') {
        if (value) push(key, defaultDuplicateMessage(asFormField(key) || 'contact'));
        continue;
      }
      if (typeof value === 'string' || Array.isArray(value) || typeof value === 'object') {
        push(key, value);
      }
    }

    // message: string[] (NestJS / class-validator style)
    if (Array.isArray(obj.message)) {
      for (const item of obj.message) {
        const text = messageText(item);
        if (!text) continue;
        for (const inferred of inferDuplicateFieldsFromText(text)) {
          push(inferred.field, inferred.message);
        }
      }
    } else if (typeof obj.message === 'string') {
      for (const inferred of inferDuplicateFieldsFromText(obj.message)) {
        push(inferred.field, inferred.message);
      }
    }
  };

  for (const candidate of candidates) {
    collectFrom(candidate);
  }

  // Whole payload text scan — catches joined messages / odd shapes
  if (root) {
    try {
      const blob = JSON.stringify(root);
      for (const inferred of inferDuplicateFieldsFromText(blob)) {
        // Only use default messages from blob scan to avoid dumping JSON into UI
        push(inferred.field, defaultDuplicateMessage(inferred.field));
      }
    } catch {
      // ignore
    }
  }

  // If API only flagged contact but also returned a generic multi-conflict code and email was sent
  if (opts?.emailProvided && issues.some((i) => i.field === 'contact') && !seen.has('email')) {
    const blob = root ? JSON.stringify(root).toLowerCase() : fallback.toLowerCase();
    if (
      /\b(both|multiple)\b/.test(blob) ||
      /\bemail\b.*\b(already|exist|duplicate|registered)\b/.test(blob) ||
      /\b(already|exist|duplicate|registered)\b.*\bemail\b/.test(blob)
    ) {
      push('email', defaultDuplicateMessage('email'));
    }
  }

  return { issues, message: fallback };
}

function digitsOnly(value: string, max = 10) {
  return value.replace(/\D/g, '').slice(0, max);
}

export function OtpVerifiedAddUserModal({
  open,
  onOpenChange,
  roles = [],
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles?: AppRole[];
  onSuccess: () => void;
}) {
  const [formError, setFormError] = useState('');
  const [fetchedRoles, setFetchedRoles] = useState<AppRole[]>([]);

  const addRoles = useMemo(() => {
    const merged = [...normalizeRoles(roles), ...fetchedRoles];
    return ADD_USER_ROLE_OPTIONS.map((opt) => {
      const match = merged.find((r) => matchesAddUserRole(r.name, opt.key));
      return {
        id: match?.id || '',
        name: opt.key,
        label: opt.label,
      };
    });
  }, [roles, fetchedRoles]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      role_id: '',
      name: '',
      contact: '',
      email: '',
    },
  });

  const selectedRoleId = watch('role_id');
  const selectedRole = addRoles.find((r) => r.id === selectedRoleId);
  const contactReg = register('contact');
  const nameReg = register('name');
  const emailReg = register('email');

  useEffect(() => {
    if (!open) return;
    setFormError('');
    reset({
      role_id: '',
      name: '',
      contact: '',
      email: '',
    });
    rbacService
      .getRoles('app')
      .then((data) => setFetchedRoles(normalizeRoles(data)))
      .catch(() => setFetchedRoles([]));
  }, [open, reset]);

  const onSubmit = async (data: FormData) => {
    setFormError('');
    clearErrors();
    const emailProvided = Boolean(data.email?.trim());
    try {
      await adminUsersService.createOtpVerifiedUser({
        name: data.name.trim(),
        contact: data.contact.trim(),
        role_id: data.role_id,
        email: data.email?.trim() || undefined,
      });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const { issues, message } = apiFieldErrors(err, { emailProvided });
      if (issues.length > 0) {
        for (const issue of issues) {
          setError(issue.field, { type: 'server', message: issue.message });
        }
        // Keep a banner only when neither contact nor email got a field error
        const hasIdentityFieldError = issues.some(
          (issue) => issue.field === 'contact' || issue.field === 'email',
        );
        if (!hasIdentityFieldError) setFormError(message);
      } else {
        setFormError(message);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
          <DialogDescription>
            Adds the user to OTP Verified. No password is set — they complete signup themselves.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2" noValidate>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Role *</label>
            <Select
              value={selectedRoleId || null}
              onValueChange={(val) =>
                setValue('role_id', val || '', { shouldValidate: true, shouldTouch: true })
              }
            >
              <SelectTrigger
                className={`w-full max-w-full ${errors.role_id ? 'border-red-500' : ''}`}
              >
                <SelectValue placeholder="Choose a role...">
                  {selectedRole?.label || null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {addRoles.map((role) => (
                  <SelectItem
                    key={role.label}
                    value={role.id || `pending-${role.name}`}
                    label={role.label}
                    disabled={!role.id}
                  >
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role_id && (
              <p className="text-red-500 text-xs">{errors.role_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Name *</label>
            <Input
              placeholder="Full name"
              autoComplete="name"
              {...nameReg}
              onBlur={(e) => {
                e.target.value = e.target.value.trim();
                void nameReg.onBlur(e);
              }}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Contact no *</label>
            <Input
              placeholder="9876543210"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={10}
              {...contactReg}
              onChange={(e) => {
                e.target.value = digitsOnly(e.target.value);
                void contactReg.onChange(e);
              }}
              className={errors.contact ? 'border-red-500' : ''}
            />
            {errors.contact && (
              <p className="text-red-500 text-xs">{errors.contact.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Email id (optional)</label>
            <Input
              type="email"
              placeholder="name@example.com"
              autoComplete="email"
              {...emailReg}
              onBlur={(e) => {
                e.target.value = e.target.value.trim();
                void emailReg.onBlur(e);
              }}
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
          </div>

          {formError && <p className="text-red-500 text-xs">{formError}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary text-white hover:bg-primary/90"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add User
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
