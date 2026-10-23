'use client';

import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { maskContact } from '@/lib/contact-mask';
import { contactReveal, useRevealedKey } from '@/components/contact/contact-reveal-store';

type MaskedContactProps = {
  value?: string | null;
  /** Unique per number, e.g. `leads:${rowId}:buyer`. */
  revealKey: string;
  label?: string;
  className?: string;
  /** Rendered when there is no number. */
  empty?: string;
};

export function MaskedContact({ value, revealKey, label, className, empty = '—' }: MaskedContactProps) {
  const open = useRevealedKey() === revealKey;
  const text = String(value ?? '').trim();
  if (!text) return empty ? <span className={className}>{empty}</span> : null;
  return (
    <span className={cn('inline-flex items-center gap-1.5 font-mono', className)}>
      {label ? <span className="font-sans text-gray-400">{label}:</span> : null}
      <span>{open ? text : maskContact(text)}</span>
      <button
        type="button"
        className="inline-flex shrink-0 items-center text-gray-400 hover:text-gray-700"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          contactReveal.toggle(revealKey);
        }}
        aria-label={open ? 'Hide number' : 'Show number'}
        title={open ? 'Hide number' : 'Show number'}
      >
        {open ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </span>
  );
}

type NameWithContactProps = {
  name?: string | null;
  email?: string | null;
  contact?: string | null;
  revealKey: string;
  className?: string;
};

export function NameWithContact({ name, email, contact, revealKey, className }: NameWithContactProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="truncate font-medium text-gray-900">{name || '—'}</p>
      {email ? <p className="truncate text-xs text-gray-500">{email}</p> : null}
      {contact ? (
        <MaskedContact value={contact} revealKey={revealKey} className="text-xs text-gray-500" empty="" />
      ) : null}
    </div>
  );
}
