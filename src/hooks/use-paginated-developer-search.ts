'use client';

import { useCallback, useRef, useState } from 'react';
import {
  developerHomeService,
  type HomeDeveloperPreview,
  type PaginatedDeveloperSearch,
} from '@/services/developer-home.service';
import type { SearchableSelectOption } from '@/components/common/searchable-select';

export function developerPickerLabel(d: HomeDeveloperPreview) {
  return [d.companyName || d.name, d.companyName && d.name ? d.name : null].filter(Boolean).join(' · ');
}

type UsePaginatedDeveloperSearchOptions = {
  /** When set, badges show projectCount (including 0). */
  cityId?: string;
  /** Use home-sections search endpoint instead of /admin/developers/search. */
  useSectionSearch?: boolean;
  /** Only developers with at least N projects in `cityId` (section Add picker). */
  minProjects?: number;
  /** Exclude these developer ids from options (e.g. already in section). */
  excludeIds?: Set<string> | string[];
  showProjectCountBadge?: boolean;
};

export function usePaginatedDeveloperSearch(options: UsePaginatedDeveloperSearchOptions = {}) {
  const {
    cityId,
    useSectionSearch = false,
    minProjects,
    excludeIds,
    showProjectCountBadge = false,
  } = options;
  const excludeRef = useRef(excludeIds);
  excludeRef.current = excludeIds;

  const [selectOptions, setSelectOptions] = useState<SearchableSelectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const queryRef = useRef('');
  const pageRef = useRef(1);
  const cacheRef = useRef(new Map<string, HomeDeveloperPreview>());

  const toOptions = useCallback(
    (items: HomeDeveloperPreview[]) => {
      const exclude = excludeRef.current;
      const excludeSet =
        exclude instanceof Set ? exclude : exclude ? new Set(exclude) : new Set<string>();
      return items
        .filter((d) => !excludeSet.has(d.id))
        .map((d) => ({
          value: d.id,
          label: developerPickerLabel(d),
          ...(showProjectCountBadge || cityId
            ? {
                badge: Number(d.projectCount ?? 0),
                badgeVariant: 'projectCount' as const,
              }
            : {}),
        }));
    },
    [cityId, showProjectCountBadge],
  );

  const applyPage = useCallback(
    (page: number, data: PaginatedDeveloperSearch, append: boolean) => {
      data.items.forEach((d) => cacheRef.current.set(d.id, d));
      const nextOpts = toOptions(data.items);
      setSelectOptions((prev) => (append ? [...prev, ...nextOpts] : nextOpts));
      setHasMore(Boolean(data.hasMore));
      pageRef.current = page;
    },
    [toOptions],
  );

  const fetchPage = useCallback(
    async (q: string, page: number, append: boolean) => {
      const params = {
        q: q.trim() || undefined,
        page,
        limit: 20,
        ...(cityId ? { cityId } : {}),
        ...(minProjects != null ? { minProjects } : {}),
      };
      const data = useSectionSearch
        ? await developerHomeService.searchSectionDevelopersPage(params)
        : await developerHomeService.searchDevelopersPage(params);
      applyPage(page, data, append);
    },
    [applyPage, cityId, minProjects, useSectionSearch],
  );

  const onSearch = useCallback(
    (q: string) => {
      queryRef.current = q;
      setLoading(true);
      void fetchPage(q, 1, false)
        .catch(() => {
          setSelectOptions([]);
          setHasMore(false);
        })
        .finally(() => setLoading(false));
    },
    [fetchPage],
  );

  const onLoadMore = useCallback(() => {
    if (loadingMore || loading || !hasMore) return;
    setLoadingMore(true);
    void fetchPage(queryRef.current, pageRef.current + 1, true)
      .catch(() => setHasMore(false))
      .finally(() => setLoadingMore(false));
  }, [fetchPage, hasMore, loading, loadingMore]);

  const getDeveloper = useCallback((id: string) => cacheRef.current.get(id), []);

  const seedCache = useCallback((rows: HomeDeveloperPreview[]) => {
    rows.forEach((d) => cacheRef.current.set(d.id, d));
  }, []);

  return {
    selectOptions,
    loading,
    loadingMore,
    hasMore,
    onSearch,
    onLoadMore,
    getDeveloper,
    seedCache,
    cacheRef,
  };
}
