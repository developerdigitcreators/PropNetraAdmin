'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

function readFromParams<T extends Record<string, string>>(
  params: URLSearchParams,
  defaults: T,
): T {
  const next = { ...defaults };
  for (const key of Object.keys(defaults) as Array<keyof T>) {
    const raw = params.get(String(key));
    if (raw != null && raw !== '') {
      next[key] = raw as T[keyof T];
    }
  }
  return next;
}

function sameFilters<T extends Record<string, string>>(a: T, b: T) {
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((key) => a[key] === b[key]);
}

function queryEqual(a: string, b: string) {
  const pa = new URLSearchParams(a);
  const pb = new URLSearchParams(b);
  const keys = new Set([...pa.keys(), ...pb.keys()]);
  for (const key of keys) {
    if (pa.get(key) !== pb.get(key)) return false;
  }
  return true;
}

/**
 * Hydrate filter state from URL on mount; write filter changes to the query
 * string so refresh keeps filters. Uses history.replaceState so Next.js does
 * not refetch the page (router.replace of the same route loops RSC requests).
 *
 * Non-filter query keys (e.g. userId) are preserved.
 */
export function useUrlFilters<T extends Record<string, string>>(defaults: T) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const defaultsRef = useRef(defaults);
  defaultsRef.current = defaults;

  const [filters, setFiltersState] = useState<T>(() =>
    readFromParams(searchParams, defaults),
  );

  const paramsKey = searchParams.toString();
  const managedKeys = Object.keys(defaults).join(',');

  useEffect(() => {
    const next = readFromParams(searchParams, defaultsRef.current);
    setFiltersState((prev) => (sameFilters(prev, next) ? prev : next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, managedKeys]);

  const syncUrl = useCallback(
    (next: T) => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      for (const key of Object.keys(defaultsRef.current) as Array<keyof T>) {
        const def = defaultsRef.current[key];
        const val = next[key];
        if (!val || val === def) params.delete(String(key));
        else params.set(String(key), String(val));
      }
      const qs = params.toString();
      const nextUrl = qs ? `${pathname}?${qs}` : pathname;
      const currentQs = window.location.search.startsWith('?')
        ? window.location.search.slice(1)
        : window.location.search;
      if (
        window.location.pathname === pathname &&
        queryEqual(currentQs, qs)
      ) {
        return;
      }
      window.history.replaceState(window.history.state, '', nextUrl);
    },
    [pathname],
  );

  const setFilters = useCallback(
    (update: Partial<T> | ((prev: T) => T)) => {
      setFiltersState((prev) => {
        const next =
          typeof update === 'function' ? update(prev) : { ...prev, ...update };
        if (sameFilters(prev, next)) return prev;
        return next;
      });
    },
    [],
  );

  const skipFirstSync = useRef(true);

  useEffect(() => {
    if (skipFirstSync.current) {
      skipFirstSync.current = false;
      return;
    }
    syncUrl(filters);
  }, [filters, syncUrl]);

  const replaceFilters = useCallback((next: T) => {
    setFiltersState((prev) => (sameFilters(prev, next) ? prev : next));
  }, []);

  const resetFilters = useCallback(() => {
    const next = { ...defaultsRef.current };
    setFiltersState((prev) => (sameFilters(prev, next) ? prev : next));
  }, []);

  return { filters, setFilters, replaceFilters, resetFilters };
}
