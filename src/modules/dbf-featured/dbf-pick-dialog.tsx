'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/common/searchable-select';
import { dbfFeaturedApiError } from '@/services/dbf-featured.service';
import { Loader2 } from 'lucide-react';

export type DbfPickOption = {
  value: string;
  label: string;
  badge?: string | number;
  badgeVariant?: 'default' | 'projectCount';
};

export type DbfPickPageResult = {
  options: DbfPickOption[];
  hasMore: boolean;
};

type DbfPickDialogProps = {
  open: boolean;
  title: string;
  description: string;
  fieldLabel: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  submitLabel: string;
  submitting: boolean;
  error: string;
  /** Legacy single fetch (posts, DBF). Ignored when searchPage is set. */
  search?: (q: string) => Promise<DbfPickOption[]>;
  /** Paginated search: page 1 replaces options; later pages append. */
  searchPage?: (q: string, page: number) => Promise<DbfPickPageResult>;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: string) => void;
};

export function DbfPickDialog({
  open,
  title,
  description,
  fieldLabel,
  placeholder,
  searchPlaceholder,
  emptyText,
  submitLabel,
  submitting,
  error,
  search,
  searchPage,
  onOpenChange,
  onSubmit,
}: DbfPickDialogProps) {
  const [value, setValue] = useState('');
  const [label, setLabel] = useState('');
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<DbfPickOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [localError, setLocalError] = useState('');
  const pageRef = useRef(1);
  const queryRef = useRef('');
  const paginated = Boolean(searchPage);

  useEffect(() => {
    if (!open) return;
    setValue('');
    setLabel('');
    setQuery('');
    setLocalError('');
    setHasMore(false);
    pageRef.current = 1;
    queryRef.current = '';
  }, [open]);

  const runPageSearch = useCallback(
    async (q: string, page: number, append: boolean) => {
      if (!searchPage) return;
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const result = await searchPage(q, page);
        setOptions((prev) => (append ? [...prev, ...result.options] : result.options));
        setHasMore(result.hasMore);
        pageRef.current = page;
      } catch (err) {
        if (!append) setOptions([]);
        setHasMore(false);
        setLocalError(dbfFeaturedApiError(err, 'Failed to search.'));
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [searchPage],
  );

  useEffect(() => {
    if (!open || paginated) return;
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      search?.(query)
        .then((rows) => {
          if (!cancelled) setOptions(rows);
        })
        .catch((err) => {
          if (!cancelled) {
            setOptions([]);
            setLocalError(dbfFeaturedApiError(err, 'Failed to search.'));
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, query, paginated, search]);

  const handleSearch = (q: string) => {
    setQuery(q);
    queryRef.current = q;
    if (paginated) {
      setLocalError('');
      void runPageSearch(q, 1, false);
    }
  };

  const handleLoadMore = () => {
    if (!paginated || loadingMore || loading || !hasMore) return;
    void runPageSearch(queryRef.current, pageRef.current + 1, true);
  };

  useEffect(() => {
    if (!open || !paginated) return;
    void runPageSearch('', 1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, paginated]);

  const handleSubmit = () => {
    if (!value) {
      setLocalError(`Select ${fieldLabel.toLowerCase()} first.`);
      return;
    }
    setLocalError('');
    onSubmit(value);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">{fieldLabel}</label>
            <SearchableSelect
              options={options}
              value={value}
              selectedLabel={label}
              onValueChange={(v) => {
                setValue(v);
                setLabel(options.find((o) => o.value === v)?.label || '');
              }}
              onSearch={paginated ? handleSearch : setQuery}
              loading={loading}
              hasMore={paginated ? hasMore : false}
              onLoadMore={paginated ? handleLoadMore : undefined}
              loadingMore={loadingMore}
              searchDebounceMs={paginated ? 250 : 300}
              placeholder={placeholder}
              searchPlaceholder={searchPlaceholder}
              emptyText={emptyText}
            />
          </div>
          {(localError || error) && (
            <p className="text-sm text-red-600">{localError || error}</p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
