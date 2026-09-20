'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

type Props = {
  children: ReactNode;
  className?: string;
  enabled?: boolean;
  /** Re-measure when this value changes (e.g. row count). */
  syncKey?: string | number;
  /**
   * Keep a horizontal scrollbar fixed to the viewport bottom while the table
   * is on-screen and overflowing — so users can H-scroll after scrolling the page.
   */
  stickyScrollbar?: boolean;
};

function getScrollParents(el: HTMLElement | null): Array<HTMLElement | Window> {
  const parents: Array<HTMLElement | Window> = [window];
  let node = el?.parentElement ?? null;
  while (node && node !== document.body) {
    const style = getComputedStyle(node);
    const oy = style.overflowY;
    const ox = style.overflowX;
    if (
      /(auto|scroll|overlay)/.test(oy) ||
      /(auto|scroll|overlay)/.test(ox)
    ) {
      parents.push(node);
    }
    node = node.parentElement;
  }
  return parents;
}

export function TableHScroll({
  children,
  className = '',
  enabled = true,
  syncKey,
  stickyScrollbar = false,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);
  const [barLeft, setBarLeft] = useState(0);
  const [barWidth, setBarWidth] = useState(0);
  const [showFixedBar, setShowFixedBar] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const measure = useCallback(() => {
    const el = tableRef.current;
    const wrap = wrapRef.current;
    if (!el) return;
    setScrollWidth(el.scrollWidth);
    setClientWidth(el.clientWidth);
    if (wrap && stickyScrollbar) {
      const rect = wrap.getBoundingClientRect();
      setBarLeft(rect.left);
      setBarWidth(rect.width);
    }
  }, [stickyScrollbar]);

  const updateFixedVisibility = useCallback(() => {
    if (!stickyScrollbar) {
      setShowFixedBar(false);
      return;
    }
    const wrap = wrapRef.current;
    const el = tableRef.current;
    if (!wrap || !el) {
      setShowFixedBar(false);
      return;
    }
    const rect = wrap.getBoundingClientRect();
    const overflowing = el.scrollWidth > el.clientWidth + 2;
    // Any part of the table still in the viewport (admin main scrolls, not window).
    const inView = rect.bottom > 64 && rect.top < window.innerHeight - 24;
    setShowFixedBar(overflowing && inView);
    setBarLeft(rect.left);
    setBarWidth(rect.width);

    if (barRef.current && tableRef.current) {
      barRef.current.scrollLeft = tableRef.current.scrollLeft;
    }
  }, [stickyScrollbar]);

  useLayoutEffect(() => {
    if (!enabled) return;
    measure();
    updateFixedVisibility();
  }, [enabled, syncKey, measure, updateFixedVisibility]);

  useEffect(() => {
    if (!enabled) return;
    measure();
    updateFixedVisibility();
    const el = tableRef.current;
    const wrap = wrapRef.current;
    if (!el) return;

    const onLayout = () => {
      measure();
      updateFixedVisibility();
    };

    const ro = new ResizeObserver(onLayout);
    ro.observe(el);
    if (wrap) ro.observe(wrap);
    const table = el.querySelector('table');
    if (table) ro.observe(table);

    const mo = new MutationObserver(onLayout);
    mo.observe(el, { childList: true, subtree: true, attributes: true });

    const scrollParents = getScrollParents(wrap);
    for (const parent of scrollParents) {
      parent.addEventListener('scroll', onLayout, { passive: true });
    }
    window.addEventListener('resize', onLayout);

    const raf = requestAnimationFrame(onLayout);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener('resize', onLayout);
      for (const parent of scrollParents) {
        parent.removeEventListener('scroll', onLayout);
      }
    };
  }, [enabled, syncKey, measure, updateFixedVisibility]);

  const onTableScroll = () => {
    if (syncing.current || !barRef.current || !tableRef.current) return;
    syncing.current = true;
    barRef.current.scrollLeft = tableRef.current.scrollLeft;
    syncing.current = false;
  };

  const onBarScroll = () => {
    if (syncing.current || !barRef.current || !tableRef.current) return;
    syncing.current = true;
    tableRef.current.scrollLeft = barRef.current.scrollLeft;
    syncing.current = false;
  };

  const needed = scrollWidth > clientWidth + 2;
  const barInnerWidth = Math.max(scrollWidth, clientWidth, 1);
  const showBar = stickyScrollbar && showFixedBar && needed && barWidth > 0;

  if (!enabled) {
    return <div className={`overflow-x-auto ${className}`}>{children}</div>;
  }

  const fixedBar =
    stickyScrollbar && mounted
      ? createPortal(
          <div
            ref={barRef}
            onScroll={onBarScroll}
            className={`fixed z-[60] h-3.5 overflow-y-hidden border border-gray-200 bg-gray-100 shadow-[0_-2px_8px_rgba(0,0,0,0.08)] transition-opacity ${
              showBar
                ? 'overflow-x-scroll opacity-100'
                : 'pointer-events-none overflow-x-hidden opacity-0'
            }`}
            style={{
              left: barLeft,
              width: Math.max(barWidth, 0),
              bottom: 0,
            }}
            title="Scroll table horizontally"
            aria-hidden={!showBar}
          >
            <div style={{ width: barInnerWidth, height: 1 }} />
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      {/* Horizontal only — full table height uses the page (main) vertical scroll. */}
      <div
        ref={tableRef}
        onScroll={onTableScroll}
        className="overflow-x-auto overflow-y-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="w-max min-w-full">{children}</div>
      </div>

      {stickyScrollbar ? (
        fixedBar
      ) : (
        <div
          ref={barRef}
          onScroll={onBarScroll}
          className={`h-3 shrink-0 overflow-y-hidden border-t border-gray-200 bg-gray-50 ${
            needed ? 'overflow-x-scroll' : 'overflow-x-hidden opacity-40'
          }`}
          title="Scroll table horizontally"
          aria-hidden={!needed}
        >
          <div style={{ width: barInnerWidth, height: 1 }} />
        </div>
      )}
    </div>
  );
}
