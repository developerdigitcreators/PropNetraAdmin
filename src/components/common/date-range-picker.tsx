'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayISO() {
  return toISO(new Date());
}

function parseISO(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatNice(iso: string) {
  const d = parseISO(iso);
  if (!d) return iso;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatRange(from: string, to: string) {
  if (!from && !to) return '';
  if (!from || !to || from === to) return formatNice(from || to);
  const a = parseISO(from);
  const b = parseISO(to);
  if (!a || !b) return `${from} – ${to}`;
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) {
    return `${a.getDate()}–${b.getDate()} ${MONTHS[a.getMonth()]} ${a.getFullYear()}`;
  }
  if (a.getFullYear() === b.getFullYear()) {
    return `${a.getDate()} ${MONTHS[a.getMonth()]} – ${b.getDate()} ${MONTHS[b.getMonth()]} ${a.getFullYear()}`;
  }
  return `${formatNice(from)} – ${formatNice(to)}`;
}

function monthCells(view: Date) {
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return {
      iso: toISO(d),
      day: d.getDate(),
      inMonth: d.getMonth() === view.getMonth(),
    };
  });
}

type DateRangePickerProps = {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  label?: string;
};

export function DateRangePicker({
  from,
  to,
  onChange,
  label = 'Ends to',
}: DateRangePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => parseISO(from || to) || new Date());
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraftFrom(from);
    setDraftTo(to);
    setAnchor(null);
    setHover(null);
    setView(parseISO(from || to) || new Date());
  }, [open, from, to]);

  const apply = (nextFrom: string, nextTo: string) => {
    if (nextFrom === from && nextTo === to) return;
    onChange(nextFrom, nextTo);
  };

  const closeWithDraft = () => {
    const nextFrom = draftFrom || draftTo;
    const nextTo = draftTo || draftFrom;
    if (nextFrom && nextTo) apply(nextFrom, nextTo);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) closeWithDraft();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeWithDraft();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  });

  const previewFrom = anchor && hover && hover < anchor ? hover : draftFrom;
  const previewTo = anchor && hover && hover > anchor ? hover : draftTo;

  const cells = useMemo(() => monthCells(view), [view]);
  const display = formatRange(from, to);
  const hasValue = Boolean(from || to);

  const pick = (iso: string) => {
    if (!anchor) {
      setAnchor(iso);
      setDraftFrom(iso);
      setDraftTo(iso);
      setHover(iso);
      return;
    }
    const start = iso < anchor ? iso : anchor;
    const end = iso > anchor ? iso : anchor;
    setDraftFrom(start);
    setDraftTo(end);
    setAnchor(null);
    apply(start, end);
    setOpen(false);
  };

  const clear = () => {
    setDraftFrom('');
    setDraftTo('');
    setAnchor(null);
    apply('', '');
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      {label ? (
        <label className="mb-1 block text-xs text-gray-500">{label}</label>
      ) : null}
      <div
        className={cn(
          'flex h-8 w-full min-w-[220px] items-center gap-1 rounded-lg border border-input bg-transparent pl-2.5 pr-1 text-sm',
          open && 'border-ring ring-3 ring-ring/50',
        )}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2 py-1 text-left outline-none',
            !display && 'text-muted-foreground',
          )}
        >
          <CalendarDays className="size-3.5 shrink-0 text-gray-400" />
          <span className="min-w-0 truncate">
            {display || 'Select date or range'}
          </span>
        </button>
        {hasValue ? (
          <button
            type="button"
            aria-label="Clear date"
            className="rounded-full p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            onClick={clear}
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="absolute top-[calc(100%+6px)] left-0 z-50 w-[280px] rounded-xl border border-gray-100 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
              onClick={() =>
                setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))
              }
            >
              <ChevronLeft className="size-4" />
            </button>
            <p className="text-sm font-medium text-gray-800">
              {MONTHS[view.getMonth()]} {view.getFullYear()}
            </p>
            <button
              type="button"
              className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
              onClick={() =>
                setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))
              }
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-px text-center text-[10px] font-medium uppercase tracking-wide text-gray-400">
            {WEEKDAYS.map((d) => (
              <span key={d} className="py-1">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px">
            {cells.map((cell) => {
              const selected =
                previewFrom &&
                previewTo &&
                cell.iso >= previewFrom &&
                cell.iso <= previewTo;
              const start = cell.iso === previewFrom;
              const end = cell.iso === previewTo;
              const isToday = cell.iso === todayISO();
              const single = previewFrom && previewFrom === previewTo;
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onMouseEnter={() => {
                    if (anchor) setHover(cell.iso);
                  }}
                  onClick={() => pick(cell.iso)}
                  className={cn(
                    'h-8 text-xs tabular-nums',
                    cell.inMonth ? 'text-gray-800' : 'text-gray-300',
                    selected && !single && 'bg-primary/10',
                    start && 'rounded-l-md',
                    end && 'rounded-r-md',
                    (start || end || (selected && single)) &&
                      'bg-primary text-primary-foreground hover:bg-primary',
                    isToday && !selected && 'font-semibold text-primary',
                    !selected && 'hover:bg-gray-100 rounded-md',
                  )}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            One date for that day. Two dates for a range.
          </p>
        </div>
      ) : null}
    </div>
  );
}
