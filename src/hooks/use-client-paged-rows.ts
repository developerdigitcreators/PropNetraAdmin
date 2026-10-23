'use client';

import { useMemo, useState, useCallback } from 'react';

/**
 * Client-side page slice for lists that still load the full result set.
 * Use with AdminDataTable until the API gains server pagination.
 */
export function useClientPagedRows<T>(rows: T[], initialPageSize = 25) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(initialPageSize);

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);

  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * limit;
    return rows.slice(start, start + limit);
  }, [rows, safePage, limit]);

  const onPageChange = useCallback((next: number) => {
    setPage(Math.max(1, next));
  }, []);

  const onPageSizeChange = useCallback((next: number) => {
    setLimit(next);
    setPage(1);
  }, []);

  const resetPage = useCallback(() => setPage(1), []);

  return {
    page: safePage,
    limit,
    total,
    totalPages,
    pageRows,
    onPageChange,
    onPageSizeChange,
    resetPage,
    setPage,
  };
}
