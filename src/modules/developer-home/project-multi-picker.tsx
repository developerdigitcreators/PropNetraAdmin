'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  developerHomeApiError,
  developerHomeService,
  type HomePostPreview,
} from '@/services/developer-home.service';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ProjectMultiPickerProps = {
  cityId: string;
  developerId: string;
  excludeListingIds?: string[];
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  onPostsCacheUpdate?: (posts: HomePostPreview[]) => void;
  disabled?: boolean;
};

export function ProjectMultiPicker({
  cityId,
  developerId,
  excludeListingIds,
  selectedIds,
  onSelectedIdsChange,
  onPostsCacheUpdate,
  disabled,
}: ProjectMultiPickerProps) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<HomePostPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const pageRef = useRef(1);
  const queryRef = useRef('');

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const loadPage = useCallback(
    async (q: string, page: number, append: boolean) => {
      if (!cityId || !developerId) return;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError('');
      try {
        const result = await developerHomeService.searchPosts({
          cityId,
          developerId,
          q: q.trim() || undefined,
          page,
          limit: 20,
          excludeListingIds,
        });
        if (typeof result === 'object' && 'items' in result) {
          setItems((prev) => {
            const next = append ? [...prev, ...result.items] : result.items;
            onPostsCacheUpdate?.(next);
            return next;
          });
          setHasMore(result.hasMore);
          pageRef.current = page;
        }
      } catch (err) {
        if (!append) setItems([]);
        setHasMore(false);
        setError(developerHomeApiError(err, 'Failed to load projects.'));
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [cityId, developerId, excludeListingIds, onPostsCacheUpdate],
  );

  useEffect(() => {
    if (!cityId || !developerId) {
      setItems([]);
      setHasMore(false);
      return;
    }
    queryRef.current = '';
    setQuery('');
    pageRef.current = 1;
    void loadPage('', 1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityId, developerId, excludeListingIds?.join(',')]);

  useEffect(() => {
    if (!cityId || !developerId) return;
    if (query === '') return;
    const timer = window.setTimeout(() => {
      queryRef.current = query;
      pageRef.current = 1;
      void loadPage(query, 1, false);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, cityId, developerId, loadPage]);

  const toggle = (id: string) => {
    onSelectedIdsChange(
      selectedSet.has(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id],
    );
  };

  if (!developerId) {
    return (
      <p className="text-sm text-gray-500">Select a developer to see their projects in the picker city.</p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-gray-700">Projects</label>
        {selectedIds.length > 0 ? (
          <span className="text-xs text-gray-500">{selectedIds.length} selected</span>
        ) : null}
      </div>
      <Input
        value={query}
        disabled={disabled}
        placeholder="Search projects"
        onChange={(e) => setQuery(e.target.value)}
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <div className="max-h-52 overflow-y-auto rounded-md border border-gray-200 divide-y">
        {loading && items.length === 0 ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <p className="p-4 text-center text-sm text-gray-500">No projects found.</p>
        ) : (
          items.map((p) => {
            const on = selectedSet.has(p.id);
            return (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() => toggle(p.id)}
                className={cn(
                  'flex w-full items-start gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50',
                  on && 'bg-primary/5',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                    on ? 'border-primary bg-primary text-white' : 'border-gray-300',
                  )}
                >
                  {on ? '✓' : ''}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-gray-900">{p.title}</span>
                  <span className="block truncate text-xs text-gray-500">
                    {[p.location, p.priceLabel].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
      {hasMore ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loadingMore || disabled}
          onClick={() => void loadPage(queryRef.current, pageRef.current + 1, true)}
        >
          {loadingMore ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          Load more
        </Button>
      ) : null}
    </div>
  );
}
