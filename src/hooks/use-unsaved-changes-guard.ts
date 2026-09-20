'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { UnsavedChangesDialog } from '@/components/common/unsaved-changes-dialog';
import { createElement } from 'react';

type UseUnsavedChangesGuardOptions = {
  dirty: boolean;
  /** When provided, dialog shows Save and runs this before leaving. */
  onSave?: () => void | Promise<void>;
};

/**
 * Blocks in-app link navigation and browser unload when `dirty` is true.
 * Confirm copy: “You have edited the data, do you want to save or not?”
 * Actions: Save (optional) / Leave without saving / Cancel.
 */
export function useUnsavedChangesGuard({
  dirty,
  onSave,
}: UseUnsavedChangesGuardOptions): { dialog: ReactNode } {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const pendingHref = useRef<string | null>(null);
  const allowLeave = useRef(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty || allowLeave.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!dirty || allowLeave.current) return;
      if (e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.hasAttribute('download')) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }
      if (anchor.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      let url: URL;
      try {
        url = new URL(href, window.location.origin);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === pathname &&
        url.search === window.location.search &&
        url.hash === window.location.hash
      ) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      pendingHref.current = `${url.pathname}${url.search}${url.hash}`;
      setOpen(true);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [dirty, pathname]);

  const cancel = useCallback(() => {
    pendingHref.current = null;
    setOpen(false);
  }, []);

  const leave = useCallback(() => {
    allowLeave.current = true;
    setOpen(false);
    const href = pendingHref.current;
    pendingHref.current = null;
    if (href) router.push(href);
    // Reset allow flag shortly so future edits still guard.
    window.setTimeout(() => {
      allowLeave.current = false;
    }, 0);
  }, [router]);

  const saveAndLeave = useCallback(async () => {
    if (!onSave) {
      leave();
      return;
    }
    setSaving(true);
    try {
      await onSave();
      leave();
    } catch {
      // Stay on page if save fails.
    } finally {
      setSaving(false);
    }
  }, [leave, onSave]);

  const dialog = createElement(UnsavedChangesDialog, {
    open,
    onOpenChange: (next: boolean) => {
      if (!next) cancel();
      else setOpen(true);
    },
    onSave: onSave ? () => void saveAndLeave() : undefined,
    onLeave: leave,
    onCancel: cancel,
    saving,
  });

  return { dialog };
}

/**
 * Guard closing a modal/dialog when local draft is dirty.
 * Returns true if the caller may proceed with close.
 */
export function useDialogUnsavedGuard(dirty: boolean) {
  const [open, setOpen] = useState(false);
  const resolveRef = useRef<((ok: boolean) => void) | null>(null);

  const requestClose = useCallback((): Promise<boolean> => {
    if (!dirty) return Promise.resolve(true);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, [dirty]);

  const finish = useCallback((ok: boolean) => {
    setOpen(false);
    resolveRef.current?.(ok);
    resolveRef.current = null;
  }, []);

  const dialog = createElement(UnsavedChangesDialog, {
    open,
    onOpenChange: (next: boolean) => {
      if (!next) finish(false);
    },
    onLeave: () => finish(true),
    onCancel: () => finish(false),
  });

  return { requestClose, dialog };
}
