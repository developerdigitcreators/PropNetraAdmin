'use client';

import type { ReactNode } from 'react';
import { Loader2, RefreshCw, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type AdminListToolbarProps = {
  onRefresh: () => void;
  refreshDisabled?: boolean;
  refreshBusy?: boolean;
  /** When set, shows Reset filters button. */
  onReset?: () => void;
  resetDisabled?: boolean;
  className?: string;
  children?: ReactNode;
};

/**
 * Shared list action chrome: Refresh on every list page;
 * Reset whenever the page has filters.
 */
export function AdminListToolbar({
  onRefresh,
  refreshDisabled = false,
  refreshBusy = false,
  onReset,
  resetDisabled = false,
  className,
  children,
}: AdminListToolbarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {children}
      {onReset ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReset}
          disabled={resetDisabled}
        >
          <RotateCcw className="mr-1.5 size-3.5" />
          Reset
        </Button>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={refreshDisabled || refreshBusy}
      >
        {refreshBusy ? (
          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
        ) : (
          <RefreshCw className="mr-1.5 size-3.5" />
        )}
        Refresh
      </Button>
    </div>
  );
}
