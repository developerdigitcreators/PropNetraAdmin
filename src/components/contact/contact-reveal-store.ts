'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';

let revealedKey: string | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

/** Only one contact number is revealed at a time across the admin panel. */
export const contactReveal = {
  get: () => revealedKey,
  toggle: (key: string) => {
    revealedKey = revealedKey === key ? null : key;
    emit();
  },
  hideAll: () => {
    if (revealedKey === null) return;
    revealedKey = null;
    emit();
  },
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

export const useRevealedKey = () =>
  useSyncExternalStore(contactReveal.subscribe, contactReveal.get, () => null);

export function useHideContactsOnRouteChange() {
  const pathname = usePathname();
  useEffect(() => {
    contactReveal.hideAll();
  }, [pathname]);
}
