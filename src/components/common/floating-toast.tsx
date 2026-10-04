"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastTone = "success" | "error";
export type ShowToast = (message: string, tone?: ToastTone) => void;

/** Page-level toast pinned bottom-right; auto-hides after 4s. */
export function useFloatingToast() {
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(
    null,
  );
  const timer = useRef<number | null>(null);

  const show = useCallback<ShowToast>((message, tone = "success") => {
    if (timer.current) window.clearTimeout(timer.current);
    setToast({ message, tone });
    timer.current = window.setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const node = toast ? (
    <div
      role="status"
      className={cn(
        "fixed bottom-6 right-6 z-[100] flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg",
        toast.tone === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-green-200 bg-green-50 text-green-800",
      )}
    >
      <span className="flex-1">{toast.message}</span>
      <button
        type="button"
        aria-label="Dismiss"
        className="opacity-60 hover:opacity-100"
        onClick={() => setToast(null)}
      >
        <X className="size-4" />
      </button>
    </div>
  ) : null;

  return { show, node };
}
