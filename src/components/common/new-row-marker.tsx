import { cn } from '@/lib/utils';

/** Left vertical bar on unread dashboard rows — no row background tint. */
export function newRowClass(isNew?: boolean) {
  return isNew ? 'border-l-4 border-l-primary' : '';
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
