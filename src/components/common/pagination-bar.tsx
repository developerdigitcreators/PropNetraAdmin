"use client";

import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type PaginationBarProps = {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export function PaginationBar({
  currentPage,
  totalItems,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: PaginationBarProps) {
  const safeCurrent = Math.max(1, currentPage || 1);
  const safeTotalPages = Math.max(1, totalPages || 1);
  const canPrev = safeCurrent > 1;
  const canNext = safeCurrent < safeTotalPages;

  const [goto, setGoto] = useState<string>("");

  const displayPages = useMemo(() => {
    // Build a "first / neighbors / last with ellipsis" pagination list.
    const pages: Array<number | "ellipsis"> = [];
    const pushEllipsis = () => {
      if (pages.length === 0) return;
      const last = pages[pages.length - 1];
      if (last !== "ellipsis") pages.push("ellipsis");
    };

    const addPage = (p: number) => {
      if (!pages.includes(p as any)) pages.push(p);
    };

    // Always show first and last.
    addPage(1);
    addPage(safeTotalPages);

    // Neighbors around current.
    const from = Math.max(2, safeCurrent - 1);
    const to = Math.min(safeTotalPages - 1, safeCurrent + 1);
    for (let p = from; p <= to; p++) addPage(p);

    const sorted = pages.filter((x) => typeof x === "number").sort((a, b) => (a as number) - (b as number));

    // Insert ellipsis for gaps.
    const result: Array<number | "ellipsis"> = [];
    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i] as number;
      const prev = i > 0 ? (sorted[i - 1] as number) : null;
      if (prev != null && p - prev > 1) {
        result.push("ellipsis");
      }
      result.push(p);
    }
    return result;
  }, [safeCurrent, safeTotalPages]);

  const showingFrom = totalItems === 0 ? 0 : (safeCurrent - 1) * pageSize + 1;
  const showingTo = totalItems === 0 ? 0 : Math.min(totalItems, safeCurrent * pageSize);

  const handleGoTo = () => {
    const n = Number(goto);
    if (!Number.isFinite(n)) return;
    const clamped = Math.min(safeTotalPages, Math.max(1, Math.floor(n)));
    onPageChange(clamped);
    setGoto("");
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
      <div className="text-xs text-gray-500">
        Items per page:{" "}
        <span className="inline-flex items-center gap-2">
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="h-7 w-17.5 px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 15, 20, 25, 50].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </span>
        <span className="ml-2">
          Showing {showingFrom}-{showingTo} of {totalItems} items
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="xs"
          disabled={!canPrev}
          onClick={() => canPrev && onPageChange(safeCurrent - 1)}
        >
          Prev
        </Button>

        <div className="flex items-center gap-2">
          {displayPages.map((p, idx) => {
            if (p === "ellipsis") {
              return (
                <span key={`e-${idx}`} className="text-gray-400 px-1 select-none">
                  ...
                </span>
              );
            }
            const isActive = p === safeCurrent;
            return (
              <Button
                key={p}
                variant={isActive ? "default" : "outline"}
                size="xs"
                className={isActive ? "bg-primary-light text-primary border-primary-light" : undefined}
                onClick={() => onPageChange(p)}
              >
                {p}
              </Button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="xs"
          disabled={!canNext}
          onClick={() => canNext && onPageChange(safeCurrent + 1)}
        >
          Next
        </Button>

        <div className="flex items-center gap-2 ml-2">
          <span className="text-xs text-gray-500">Go to:</span>
          <input
            className="h-7 w-17.5 border border-gray-200 rounded-md px-2 text-sm"
            type="number"
            min={1}
            max={safeTotalPages}
            value={goto}
            onChange={(e) => setGoto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleGoTo();
            }}
          />
          <Button variant="outline" size="xs" disabled={safeTotalPages <= 1} onClick={handleGoTo}>
            Page
          </Button>
        </div>
      </div>
    </div>
  );
}

