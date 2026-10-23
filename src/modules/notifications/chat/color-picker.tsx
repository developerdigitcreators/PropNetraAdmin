'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { TEXT_COLOR_SWATCHES, normalizeHex } from './text-color';

const PANEL_WIDTH = 220;
const VIEWPORT_PAD = 8;

type ColorPickerProps = {
  color?: string | null;
  onSelect: (color: string | null) => void;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function coordsFromButton(button: HTMLElement) {
  const rect = button.getBoundingClientRect();
  const spaceAbove = rect.top - VIEWPORT_PAD;
  const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PAD;
  const openAbove = spaceAbove >= spaceBelow || spaceBelow < 160;
  return {
    top: rect.bottom + 4,
    bottom: window.innerHeight - rect.top + 4,
    left: clamp(
      rect.left,
      VIEWPORT_PAD,
      window.innerWidth - PANEL_WIDTH - VIEWPORT_PAD,
    ),
    openAbove,
  };
}

export function ColorPicker({ color, onSelect }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    openAbove: true,
  });
  const [hexDraft, setHexDraft] = useState('#111827');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const nativeLockRef = useRef(false);
  const active = normalizeHex(color);

  useEffect(() => {
    if (open) setHexDraft(active || '#111827');
  }, [open, active]);

  useLayoutEffect(() => {
    if (!open) return;
    const button = buttonRef.current;
    if (button) setCoords(coordsFromButton(button));

    const place = () => {
      if (!buttonRef.current) return;
      setCoords(coordsFromButton(buttonRef.current));
    };
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      nativeLockRef.current = false;
      return;
    }

    const isInside = (event: Event) => {
      const path = event.composedPath();
      return (
        path.includes(buttonRef.current as EventTarget) ||
        path.includes(panelRef.current as EventTarget)
      );
    };

    const onPointerDown = (event: PointerEvent) => {
      // OS / Chrome color dialog is outside the panel; keep it open until done.
      if (nativeLockRef.current) return;
      if (isInside(event)) return;
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (nativeLockRef.current) return;
      if (event.key === 'Escape') setOpen(false);
    };

    const releaseNativeLock = () => {
      window.setTimeout(() => {
        nativeLockRef.current = false;
      }, 400);
    };

    const timer = window.setTimeout(() => {
      document.addEventListener('pointerdown', onPointerDown);
      document.addEventListener('keydown', onKeyDown);
      window.addEventListener('focus', releaseNativeLock);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('focus', releaseNativeLock);
    };
  }, [open]);

  const applyCustom = (value: string) => {
    const hex = normalizeHex(value);
    if (!hex) return;
    setHexDraft(hex);
    onSelect(hex);
  };

  const pick = (next: string | null) => {
    nativeLockRef.current = false;
    onSelect(next && next === active ? null : next);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        title="Text color"
        aria-label="Text color"
        aria-expanded={open}
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.stopPropagation();
          const button = buttonRef.current;
          if (!open && button) setCoords(coordsFromButton(button));
          setOpen((v) => !v);
        }}
        className={cn(
          'relative flex size-6 items-center justify-center rounded transition-colors',
          open
            ? 'bg-primary-light text-primary'
            : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700',
        )}
      >
        <span
          className="text-[11px] font-bold leading-none"
          style={active ? { color: active } : undefined}
        >
          A
        </span>
        <span
          className="absolute bottom-0.5 h-0.5 w-3 rounded-full"
          style={{ background: active || '#9ca3af' }}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              top: coords.openAbove ? undefined : coords.top,
              bottom: coords.openAbove ? coords.bottom : undefined,
              left: coords.left,
              width: PANEL_WIDTH,
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="fixed z-9999 overflow-hidden rounded-xl border border-gray-100 bg-white p-2 shadow-lg"
          >
            <p className="px-0.5 pb-1.5 text-[11px] font-medium text-gray-500">
              Text color
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              <button
                type="button"
                title="Default"
                onClick={() => pick(null)}
                className={cn(
                  'flex size-7 items-center justify-center rounded-md border bg-white text-[10px] font-semibold text-gray-500 hover:bg-gray-50',
                  !active
                    ? 'border-primary ring-1 ring-primary'
                    : 'border-gray-200',
                )}
              >
                A
              </button>
              {TEXT_COLOR_SWATCHES.map((swatch) => (
                <button
                  key={swatch.hex}
                  type="button"
                  title={swatch.label}
                  onClick={() => pick(swatch.hex)}
                  className={cn(
                    'size-7 rounded-md border border-black/10 hover:scale-105',
                    active === swatch.hex && 'ring-2 ring-primary ring-offset-1',
                  )}
                  style={{ background: swatch.hex }}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-md border border-gray-100 px-1.5 py-1.5">
              <input
                type="color"
                value={active || '#111827'}
                title="Custom color"
                aria-label="Custom color"
                onPointerDown={() => {
                  nativeLockRef.current = true;
                }}
                onFocus={() => {
                  nativeLockRef.current = true;
                }}
                onClick={(e) => e.stopPropagation()}
                onInput={(e) =>
                  applyCustom((e.target as HTMLInputElement).value)
                }
                onChange={(e) => {
                  applyCustom(e.target.value);
                  window.setTimeout(() => {
                    nativeLockRef.current = false;
                  }, 400);
                }}
                className="size-7 shrink-0 cursor-pointer rounded border border-gray-200 bg-white p-0"
              />
              <input
                type="text"
                value={hexDraft}
                spellCheck={false}
                aria-label="Hex color"
                onFocus={() => {
                  nativeLockRef.current = true;
                }}
                onChange={(e) => {
                  const next = e.target.value;
                  setHexDraft(next);
                  const hex = normalizeHex(next);
                  if (hex) onSelect(hex);
                }}
                onBlur={() => {
                  setHexDraft(active || '#111827');
                  nativeLockRef.current = false;
                }}
                className="min-w-0 flex-1 rounded border border-gray-200 bg-white px-1.5 py-1 font-mono text-[11px] text-gray-700 outline-none focus:border-ring"
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
