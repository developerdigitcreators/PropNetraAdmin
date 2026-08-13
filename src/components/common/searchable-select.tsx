'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown, Loader2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

export type SearchableSelectOption = {
  value: string;
  label: string;
};

type SearchableSelectProps = {
  options: SearchableSelectOption[];
  value?: string;
  onValueChange: (value: string) => void;
  /** Server-side search; when provided, options are not filtered client-side by query. */
  onSearch?: (query: string) => void;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  allowCreate?: boolean;
  /** Type directly in the field (Save to DB). Off = dropdown/search only. */
  editable?: boolean;
  selectedLabel?: string;
  onCreate?: (query: string) => void;
  onInputChange?: (text: string) => void;
};

export function SearchableSelect({
  options,
  value,
  onValueChange,
  onSearch,
  loading = false,
  disabled = false,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyText = 'No results found.',
  className,
  allowCreate = false,
  editable = false,
  selectedLabel,
  onCreate,
  onInputChange,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  );
  const displayLabel = selected?.label || selectedLabel || '';
  const filterText = editable ? displayLabel : query;
  const createQuery = filterText.trim();
  const canCreate =
    allowCreate &&
    !editable &&
    !!createQuery &&
    !options.some((o) => o.label.toLowerCase() === createQuery.toLowerCase());

  const filtered = useMemo(() => {
    if (onSearch) return options;
    const q = filterText.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, filterText, onSearch]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!onSearch || !open) return;
    const t = setTimeout(() => onSearch(filterText), filterText ? 300 : 0);
    return () => clearTimeout(t);
  }, [filterText, onSearch, open]);

  const pick = (next: string) => {
    onValueChange(next);
    setOpen(false);
    setQuery('');
  };

  const handleEditableChange = (text: string) => {
    setQuery(text);
    setOpen(true);
    if (!text.trim()) {
      onInputChange?.('');
      onValueChange('');
      return;
    }
    const match = options.find(
      (o) => o.label.toLowerCase() === text.trim().toLowerCase(),
    );
    if (match) {
      onValueChange(match.value);
      return;
    }
    onInputChange?.(text);
  };

  return (
    <div ref={rootRef} className={cn('relative w-full', className)}>
      {editable ? (
        <div
          className={cn(
            'flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors',
            'focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          <input
            disabled={disabled}
            value={displayLabel}
            placeholder={placeholder}
            onChange={(e) => handleEditableChange(e.target.value)}
            onFocus={() => setOpen(true)}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <span className="flex items-center gap-1 shrink-0">
            {displayLabel && !disabled && (
              <span
                role="button"
                tabIndex={-1}
                className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditableChange('');
                  onValueChange('');
                }}
              >
                <X className="size-3.5" />
              </span>
            )}
            <button
              type="button"
              disabled={disabled}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
              onClick={() => setOpen((o) => !o)}
            >
              <ChevronsUpDown className="size-4" />
            </button>
          </span>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            'flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors',
            'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
            'disabled:cursor-not-allowed disabled:opacity-50',
            !displayLabel && 'text-muted-foreground'
          )}
        >
          <span className="truncate text-left">
            {displayLabel || placeholder}
          </span>
          <span className="flex items-center gap-1 shrink-0">
            {value && !disabled && (
              <span
                role="button"
                tabIndex={-1}
                className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onValueChange('');
                  setQuery('');
                }}
              >
                <X className="size-3.5" />
              </span>
            )}
            <ChevronsUpDown className="size-4 text-muted-foreground" />
          </span>
        </button>
      )}

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-input bg-white shadow-md">
          {!editable && (
            <div className="relative border-b border-gray-100 p-2">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="pl-8"
              />
            </div>
          )}

          <div className="max-h-56 overflow-y-auto p-1">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-gray-500">
                <Loader2 className="size-4 animate-spin" /> Loading…
              </div>
            ) : filtered.length === 0 && !canCreate ? (
              <div className="px-3 py-6 text-center text-sm text-gray-500">{emptyText}</div>
            ) : (
              <>
                {filtered.map((option) => {
                  const active = option.value === value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => pick(option.value)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                        active ? 'bg-primary-light text-primary' : 'hover:bg-gray-50 text-gray-900'
                      )}
                    >
                      <Check className={cn('size-3.5 shrink-0', active ? 'opacity-100' : 'opacity-0')} />
                      <span className="truncate">{option.label}</span>
                    </button>
                  );
                })}
                {canCreate && onCreate && (
                  <button
                    type="button"
                    onClick={() => {
                      onCreate(createQuery);
                      setOpen(false);
                      setQuery('');
                    }}
                    className="mt-0.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-primary hover:bg-primary-light"
                  >
                    Use “{createQuery}”
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
