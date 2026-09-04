'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
  enabled?: boolean;
  /** Re-measure when this value changes (e.g. row count). */
  syncKey?: string | number;
};

export function TableHScroll({
  children,
  className = '',
  enabled = true,
  syncKey,
}: Props) {
  const tableRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);

  const measure = () => {
    const el = tableRef.current;
    if (!el) return;
    setScrollWidth(el.scrollWidth);
    setClientWidth(el.clientWidth);
  };

  useEffect(() => {
    if (!enabled) return;
    measure();
    const el = tableRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const table = el.querySelector('table');
    if (table) ro.observe(table);
    const mo = new MutationObserver(measure);
    mo.observe(el, { childList: true, subtree: true, attributes: true });
    window.addEventListener('resize', measure);
    const raf = requestAnimationFrame(measure);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [enabled, syncKey]);

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

  if (!enabled) {
    return <div className={`overflow-x-auto ${className}`}>{children}</div>;
  }

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${className}`}>
      <div
        ref={tableRef}
        onScroll={onTableScroll}
        className="min-h-0 flex-1 overflow-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      <div
        ref={barRef}
        onScroll={onBarScroll}
        className={`h-3 shrink-0 overflow-y-hidden border-t border-gray-200 bg-gray-50 ${
          needed ? 'overflow-x-scroll' : 'overflow-x-hidden opacity-40'
        }`}
        title="Scroll table horizontally"
      >
        <div style={{ width: Math.max(scrollWidth, clientWidth, 1), height: 1 }} />
      </div>
    </div>
  );
}
