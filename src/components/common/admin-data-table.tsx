'use client';

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { PaginationBar } from '@/components/common/pagination-bar';
import { TableHScroll } from '@/components/ui/table-h-scroll';
import { cn } from '@/lib/utils';

type AdminDataTableProps = {
  children: ReactNode;
  /** Current page from backend meta (1-based). */
  page: number;
  /** Page size sent to backend. */
  limit: number;
  /** Total matching rows from backend (not page length). */
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  isEmpty?: boolean;
  className?: string;
  /** Re-measure horizontal scroll when this changes (e.g. row count). */
  syncKey?: string | number;
  hidePaginationWhenEmpty?: boolean;
};

/**
 * Shared admin list shell:
 * - Server-side pagination via PaginationBar (parent refetches list API)
 * - Full table height (page / main vertical scroll — no inner V-scroll)
 * - Viewport-fixed H-scroll when columns overflow
 *
 * Filters must load from separate filter-options APIs — never from the current page rows.
 */
export function AdminDataTable({
  children,
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  loading = false,
  error = null,
  emptyMessage = 'No rows to show.',
  isEmpty = false,
  className,
  syncKey,
  hidePaginationWhenEmpty = true,
}: AdminDataTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
        <Loader2 className="size-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </p>
    );
  }

  if (isEmpty) {
    return (
      <p className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        {emptyMessage}
      </p>
    );
  }

  const showPagination = !(hidePaginationWhenEmpty && total === 0);

  return (
    <div className={cn('space-y-3 pb-6', className)}>
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <TableHScroll syncKey={syncKey} stickyScrollbar>
          {children}
        </TableHScroll>
      </div>
      {showPagination ? (
        <div className="relative z-0 pb-2">
          <PaginationBar
            currentPage={page}
            totalItems={total}
            pageSize={limit}
            totalPages={totalPages}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      ) : null}
    </div>
  );
}
