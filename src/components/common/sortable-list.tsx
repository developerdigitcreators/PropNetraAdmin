"use client";

import {
  useCallback,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

/** Reorder array by moving index `from` to `to`. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return list;
  }
  const next = [...list];
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed);
  return next;
}

/** Assign 1-based sort order after a reorder. */
export function withSortOrders<T>(items: T[]): Array<T & { sortOrder: number }> {
  return items.map((item, index) => ({ ...item, sortOrder: index + 1 }));
}

type SortableTableBodyProps<T extends { id: string }> = {
  items: T[];
  disabled?: boolean;
  /** Called after drop with items in new order (sortOrder = index + 1). */
  onReorder: (ordered: Array<T & { sortOrder: number }>) => void | Promise<void>;
  /**
   * Render `<td>` cells for a row (do not wrap in `<tr>`).
   * Put `{dragHandle}` in the Sort Order column.
   */
  renderRow: (
    item: T,
    ctx: {
      index: number;
      sortOrder: number;
      dragHandle: ReactNode;
      isDragging: boolean;
      isDragOver: boolean;
    },
  ) => ReactNode;
  className?: string;
};

/**
 * Common table-body drag & drop for sort order.
 * Drag the grip handle → drop on another row → order becomes 1…n automatically.
 */
export function SortableTableBody<T extends { id: string }>({
  items,
  disabled = false,
  onReorder,
  renderRow,
  className,
}: SortableTableBodyProps<T>) {
  const [draft, setDraft] = useState<T[] | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const droppedRef = useRef(false);
  const dragElRef = useRef<HTMLElement | null>(null);

  const displayItems = draft ?? items;

  const clearDragUi = useCallback(() => {
    if (dragElRef.current) {
      dragElRef.current.style.opacity = "1";
      dragElRef.current = null;
    }
    setDragIndex(null);
    setOverIndex(null);
  }, []);

  const handleDragStart = useCallback(
    (e: DragEvent, index: number) => {
      if (disabled || busy) {
        e.preventDefault();
        return;
      }
      droppedRef.current = false;
      setDraft(items);
      setDragIndex(index);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
      if (e.currentTarget instanceof HTMLElement) {
        e.currentTarget.style.opacity = "0.55";
        dragElRef.current = e.currentTarget;
      }
    },
    [busy, disabled, items],
  );

  const handleDragEnd = useCallback(() => {
    clearDragUi();
    // Only discard draft if drop did not commit a reorder
    if (!droppedRef.current) {
      setDraft(null);
    }
  }, [clearDragUi]);

  const handleDragOver = useCallback(
    (e: DragEvent, index: number) => {
      if (disabled || busy || dragIndex === null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (overIndex !== index) setOverIndex(index);
    },
    [busy, disabled, dragIndex, overIndex],
  );

  const handleDrop = useCallback(
    async (e: DragEvent, toIndex: number) => {
      e.preventDefault();
      if (disabled || busy || dragIndex === null) return;

      const fromIndex = dragIndex;
      const base = draft ?? items;
      droppedRef.current = true;
      clearDragUi();

      if (fromIndex === toIndex) {
        setDraft(null);
        return;
      }

      const reordered = moveItem(base, fromIndex, toIndex);
      const withOrders = withSortOrders(reordered);
      setDraft(withOrders);
      setBusy(true);
      try {
        await onReorder(withOrders);
        setDraft(null);
      } catch (err) {
        console.error(err);
        setDraft(null);
      } finally {
        setBusy(false);
      }
    },
    [busy, clearDragUi, disabled, draft, dragIndex, items, onReorder],
  );

  return (
    <tbody className={cn("divide-y divide-gray-100", className)}>
      {displayItems.map((item, index) => {
        const sortOrder = index + 1;
        const isDragging = dragIndex === index;
        const isDragOver =
          overIndex === index && dragIndex !== null && dragIndex !== index;

        const dragHandle = (
          <button
            type="button"
            draggable={!disabled && !busy}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
            disabled={disabled || busy}
            aria-label={`Drag to reorder (position ${sortOrder})`}
            title="Drag to change sort order"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 select-none",
              disabled || busy
                ? "cursor-not-allowed opacity-50"
                : "cursor-grab active:cursor-grabbing hover:bg-gray-50 hover:text-gray-900",
            )}
          >
            <GripVertical className="h-3.5 w-3.5 shrink-0" />
            <span className="tabular-nums font-medium">{sortOrder}</span>
          </button>
        );

        return (
          <tr
            key={item.id}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            className={cn(
              "hover:bg-gray-50/50 transition-colors",
              isDragging && "opacity-50",
              isDragOver && "bg-primary-light/40 ring-1 ring-inset ring-primary/30",
            )}
          >
            {renderRow(item, {
              index,
              sortOrder,
              dragHandle,
              isDragging,
              isDragOver,
            })}
          </tr>
        );
      })}
    </tbody>
  );
}

type SortableGridProps<T extends { id: string }> = {
  items: T[];
  disabled?: boolean;
  onReorder: (ordered: Array<T & { sortOrder: number }>) => void | Promise<void>;
  className?: string;
  renderItem: (
    item: T,
    ctx: {
      index: number;
      sortOrder: number;
      dragHandle: ReactNode;
      isDragging: boolean;
      isDragOver: boolean;
    },
  ) => ReactNode;
};

/**
 * Common grid/card drag & drop for sort order (e.g. form module field options).
 */
export function SortableGrid<T extends { id: string }>({
  items,
  disabled = false,
  onReorder,
  className,
  renderItem,
}: SortableGridProps<T>) {
  const [draft, setDraft] = useState<T[] | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const droppedRef = useRef(false);
  const dragElRef = useRef<HTMLElement | null>(null);

  const displayItems = draft ?? items;

  const clearDragUi = useCallback(() => {
    if (dragElRef.current) {
      dragElRef.current.style.opacity = "1";
      dragElRef.current = null;
    }
    setDragIndex(null);
    setOverIndex(null);
  }, []);

  const handleDragStart = useCallback(
    (e: DragEvent, index: number) => {
      if (disabled || busy) {
        e.preventDefault();
        return;
      }
      droppedRef.current = false;
      setDraft(items);
      setDragIndex(index);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
      if (e.currentTarget instanceof HTMLElement) {
        e.currentTarget.style.opacity = "0.55";
        dragElRef.current = e.currentTarget;
      }
    },
    [busy, disabled, items],
  );

  const handleDragEnd = useCallback(() => {
    clearDragUi();
    if (!droppedRef.current) setDraft(null);
  }, [clearDragUi]);

  const handleDragOver = useCallback(
    (e: DragEvent, index: number) => {
      if (disabled || busy || dragIndex === null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (overIndex !== index) setOverIndex(index);
    },
    [busy, disabled, dragIndex, overIndex],
  );

  const handleDrop = useCallback(
    async (e: DragEvent, toIndex: number) => {
      e.preventDefault();
      if (disabled || busy || dragIndex === null) return;

      const fromIndex = dragIndex;
      const base = draft ?? items;
      droppedRef.current = true;
      clearDragUi();

      if (fromIndex === toIndex) {
        setDraft(null);
        return;
      }

      const reordered = moveItem(base, fromIndex, toIndex);
      const withOrders = withSortOrders(reordered);
      setDraft(withOrders);
      setBusy(true);
      try {
        await onReorder(withOrders);
        setDraft(null);
      } catch (err) {
        console.error(err);
        setDraft(null);
      } finally {
        setBusy(false);
      }
    },
    [busy, clearDragUi, disabled, draft, dragIndex, items, onReorder],
  );

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3", className)}>
      {displayItems.map((item, index) => {
        const sortOrder = index + 1;
        const isDragging = dragIndex === index;
        const isDragOver =
          overIndex === index && dragIndex !== null && dragIndex !== index;

        const dragHandle = (
          <button
            type="button"
            draggable={!disabled && !busy}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
            disabled={disabled || busy}
            aria-label={`Drag to reorder (position ${sortOrder})`}
            title="Drag to change sort order"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 select-none",
              disabled || busy
                ? "cursor-not-allowed opacity-50"
                : "cursor-grab active:cursor-grabbing hover:bg-gray-50 hover:text-gray-900",
            )}
          >
            <GripVertical className="h-3.5 w-3.5 shrink-0" />
            <span className="tabular-nums font-medium">{sortOrder}</span>
          </button>
        );

        return (
          <div
            key={item.id}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            className={cn(
              "transition-colors",
              isDragging && "opacity-50",
              isDragOver && "ring-2 ring-primary/40 rounded-lg",
            )}
          >
            {renderItem(item, {
              index,
              sortOrder,
              dragHandle,
              isDragging,
              isDragOver,
            })}
          </div>
        );
      })}
    </div>
  );
}
