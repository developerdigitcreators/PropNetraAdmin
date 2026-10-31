'use client';

import { useCallback } from 'react';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { maskContact, maskSecret } from '@/lib/contact-mask';
import { contactReveal, useRevealedKey } from '@/components/contact/contact-reveal-store';

type MaskedContactProps = {
  value?: string | null;
  /** Unique per value, e.g. `leads:${rowId}:buyer`. */
  revealKey: string;
  label?: string;
  className?: string;
  /** Rendered when there is no number. */
  empty?: string;
  /** `contact` masks digits only; `secret` masks full string (unit no, etc.). */
  variant?: 'contact' | 'secret';
};

export function MaskedContact({
  value,
  revealKey,
  label,
  className,
  empty = '—',
  variant = 'contact',
}: MaskedContactProps) {
  const open = useRevealedKey() === revealKey;
  const text = String(value ?? '').trim();
  const mask = variant === 'secret' ? maskSecret : maskContact;

  const reveal = useCallback(() => {
    contactReveal.show(revealKey);
  }, [revealKey]);

  const conceal = useCallback(() => {
    if (contactReveal.get() === revealKey) contactReveal.hideAll();
  }, [revealKey]);

  const holdProps = {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      reveal();
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.stopPropagation();
      conceal();
    },
    onPointerLeave: (e: React.PointerEvent) => {
      e.stopPropagation();
      conceal();
    },
    onPointerCancel: (e: React.PointerEvent) => {
      e.stopPropagation();
      conceal();
    },
  };

  if (!text) return empty ? <span className={className}>{empty}</span> : null;

  return (
    <span className={cn('inline-flex items-center gap-1.5 font-mono', className)}>
      {label ? <span className="font-sans text-gray-400">{label}:</span> : null}
      <span
        className={cn('select-none', open ? 'text-gray-900' : 'text-gray-600')}
        {...holdProps}
        title="Hold to reveal"
      >
        {open ? text : mask(text)}
      </span>
      <button
        type="button"
        className="inline-flex shrink-0 touch-none items-center text-gray-400 hover:text-gray-700"
        {...holdProps}
        aria-label="Hold to show value"
        title="Hold to reveal"
      >
        <Eye className="h-3.5 w-3.5" />
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
