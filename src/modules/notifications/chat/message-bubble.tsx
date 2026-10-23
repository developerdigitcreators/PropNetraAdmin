'use client';

import { ReactNode } from 'react';
import { formatDisplayDate, formatDisplayDateTime } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import { MarkdownText } from './markdown-text';
import type { BroadcastMedia } from '@/services/notifications.service';
import {
  AlertCircle,
  Check,
  CheckCheck,
  Clock,
  FileText,
  Play,
} from 'lucide-react';

export type BubbleMessage = {
  id: string;
  title?: string | null;
  body?: string | null;
  bodyFormat?: string | null;
  imageUrl?: string | null;
  media?: BroadcastMedia[];
  linkLabel?: string | null;
  timestamp?: string | null;
  edited?: boolean;
};

export type BubbleStatus = 'pending' | 'processing' | 'sent' | 'failed';

export function formatDateTime(value?: string | Date | null) {
  if (value == null || value === '') return '';
  return formatDisplayDateTime(value);
}

function StatusTick({ status }: { status: BubbleStatus }) {
  if (status === 'failed') {
    return <AlertCircle className="w-3.5 h-3.5 text-red-600" aria-label="Failed" />;
  }
  if (status === 'sent') {
    return <CheckCheck className="w-3.5 h-3.5 text-sky-600" aria-label="Sent" />;
  }
  if (status === 'processing') {
    return <Check className="w-3.5 h-3.5 text-gray-400" aria-label="Sending" />;
  }
  return <Clock className="w-3.5 h-3.5 text-gray-400" aria-label="Queued" />;
}

function MediaAttachment({ item }: { item: BroadcastMedia }) {
  const kind = (item.kind || '').toLowerCase();

  if (kind === 'image') {
    return (
      <a href={item.url} target="_blank" rel="noreferrer" className="block min-w-0">
        {/* Remote broadcast images are arbitrary hosts, so next/image config cannot cover them. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.url}
          alt=""
          className="max-h-56 w-full max-w-full rounded-2xl bg-gray-100 object-cover"
        />
      </a>
    );
  }

  const Icon = kind === 'video' ? Play : FileText;
  const label = kind === 'video' ? 'Video' : kind === 'pdf' ? 'PDF document' : item.kind;

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className="flex min-w-0 items-center gap-2 rounded-lg bg-black/5 px-2.5 py-2 text-xs text-gray-700 hover:bg-black/10"
    >
      <Icon className="h-4 w-4 shrink-0 text-gray-500" />
      <span className="shrink-0 font-medium">{label}</span>
      <span className="min-w-0 truncate text-gray-400">{item.url}</span>
    </a>
  );
}

type MessageBubbleProps = {
  message: BubbleMessage;
  align: 'left' | 'right';
  status?: BubbleStatus;
  /** Small line under the time — city names, delivery counts. */
  meta?: string;
  actions?: ReactNode;
};

export function MessageBubble({
  message,
  align,
  status,
  meta,
  actions,
}: MessageBubbleProps) {
  const isRight = align === 'right';
  const media = message.media?.length
    ? message.media
    : message.imageUrl
      ? [{ kind: 'image', url: message.imageUrl }]
      : [];

  return (
    <div className={cn('group flex w-full min-w-0', isRight ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'relative min-w-0 max-w-[min(30rem,85%)] overflow-hidden rounded-2xl border px-3 py-2 shadow-sm',
          isRight
            ? 'rounded-tr-sm border-primary/15 bg-primary-light'
            : 'rounded-tl-sm border-gray-100 bg-white',
        )}
      >
        {actions && (
          <div
            className={cn(
              'absolute top-1 z-10 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100',
              isRight ? '-left-9' : '-right-9',
            )}
          >
            {actions}
          </div>
        )}

        {message.title && (
          <p className="break-words text-sm font-semibold text-gray-900 [overflow-wrap:anywhere]">
            <MarkdownText value={message.title} format={message.bodyFormat} />
          </p>
        )}

        {media.length > 0 && (
          <div className="mt-1.5 min-w-0 space-y-1.5">
            {media.map((item, i) => (
              <MediaAttachment key={`${item.kind}-${i}`} item={item} />
            ))}
          </div>
        )}

        {message.body && (
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-700 [overflow-wrap:anywhere]">
            <MarkdownText value={message.body} format={message.bodyFormat} />
          </p>
        )}

        <div className="mt-1 flex items-center justify-end gap-1.5 text-[11px] text-gray-400">
          {message.edited && <span className="italic">edited</span>}
          <span>{formatDateTime(message.timestamp)}</span>
          {status && <StatusTick status={status} />}
        </div>

        {message.linkLabel && (
          <div className="-mx-3 mt-2 border-t border-black/5 px-3 pt-2 text-center">
            <span className="inline-flex min-w-[160px] max-w-full items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
              <span className="truncate">{message.linkLabel}</span>
            </span>
          </div>
        )}

        {meta && (
          <p className="mx-3 mt-2 break-words border-t border-black/5 px-3 pt-1.5 text-[11px] text-gray-400 [overflow-wrap:anywhere]">
            {meta}
          </p>
        )}
      </div>
    </div>
  );
}

export function DaySeparator({ label }: { label: string }) {
  return (
    <div className="flex justify-center py-1">
      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-gray-500 shadow-sm">
        {label}
      </span>
    </div>
  );
}

export function dayLabel(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return 'Today';
  if (same(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
