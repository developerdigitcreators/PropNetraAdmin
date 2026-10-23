import { cn } from '@/lib/utils';

/**
 * Unread dashboard rows: short left primary bar (not full cell height)
 * so adjacent rows stay visually separated.
 */
export function newRowClass(isNew?: boolean) {
  return isNew
    ? 'relative pl-3 before:pointer-events-none before:absolute before:left-0 before:top-1/2 before:h-[55%] before:min-h-[1.25rem] before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-primary before:content-[\'\']'
    : '';
}

export function NewTag({ show }: { show?: boolean }) {
  if (!show) return null;
  return (
    <span className="inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-primary text-white leading-none">
      New
    </span>
  );
}

export function newFirstCellClass(isNew?: boolean, className?: string) {
  return cn(className, newRowClass(isNew));
}
