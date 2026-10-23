'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

const PANEL_WIDTH = 272;
const PANEL_MAX_HEIGHT = 280;
const VIEWPORT_PAD = 8;

const EMOJI_GROUPS: { id: string; label: string; emojis: string[] }[] = [
  {
    id: 'smileys',
    label: 'Smileys',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉',
      '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛',
      '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨',
      '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😌', '😔', '😪',
      '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🥵', '🥶', '🥴',
      '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁',
      '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰',
      '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫',
    ],
  },
  {
    id: 'gestures',
    label: 'Gestures',
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞',
      '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👍', '👎',
      '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏',
      '💪', '🫶', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
      '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💯',
    ],
  },
  {
    id: 'objects',
    label: 'Objects',
    emojis: [
      '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '⭐', '🌟',
      '✨', '🔥', '💥', '💫', '🏠', '🏡', '🏢', '🏬', '🏗️', '🔑',
      '💰', '💵', '💸', '📈', '📉', '📊', '📱', '💻', '📸', '🔔',
      '📢', '📣', '📌', '📍', '📎', '📝', '✅', '❌', '⚠️', '⏰',
    ],
  },
  {
    id: 'nature',
    label: 'Nature',
    emojis: [
      '☀️', '🌤️', '⛅', '🌧️', '⛈️', '🌈', '❄️', '🌙', '🌸', '🌺',
      '🌻', '🌹', '🌷', '🍀', '🌴', '🌳', '🐶', '🐱', '🦁', '🐯',
    ],
  },
];

type EmojiPickerProps = {
  onSelect: (emoji: string) => void;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [groupId, setGroupId] = useState(EMOJI_GROUPS[0].id);
  const [coords, setCoords] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    maxHeight: PANEL_MAX_HEIGHT,
    openAbove: true,
  });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const group = EMOJI_GROUPS.find((g) => g.id === groupId) || EMOJI_GROUPS[0];

  useLayoutEffect(() => {
    if (!open) return;

    const place = () => {
      const button = buttonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const spaceAbove = rect.top - VIEWPORT_PAD;
      const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PAD;
      const openAbove = spaceAbove >= spaceBelow || spaceBelow < 160;
      const available = openAbove ? spaceAbove : spaceBelow;
      const maxHeight = Math.min(PANEL_MAX_HEIGHT, Math.max(160, available - 4));
      const left = clamp(
        rect.left,
        VIEWPORT_PAD,
        window.innerWidth - PANEL_WIDTH - VIEWPORT_PAD,
      );
      setCoords({
        top: rect.bottom + 4,
        bottom: window.innerHeight - rect.top + 4,
        left,
        maxHeight,
        openAbove,
      });
    };

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        title="Emoji"
        aria-label="Insert emoji"
        aria-expanded={open}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex size-6 items-center justify-center rounded text-base leading-none transition-colors',
          open
            ? 'bg-primary-light text-primary'
            : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700',
        )}
      >
        😊
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
              maxHeight: coords.maxHeight,
            }}
            className="fixed z-200 flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg"
          >
            <div className="flex shrink-0 gap-1 border-b border-gray-100 px-2 py-1.5">
              {EMOJI_GROUPS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setGroupId(item.id)}
                  className={cn(
                    'rounded-md px-2 py-1 text-[11px] font-medium',
                    item.id === groupId
                      ? 'bg-primary-light text-primary'
                      : 'text-gray-500 hover:bg-gray-50',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-8 content-start gap-0.5 overflow-y-auto p-2">
              {group.emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  title={emoji}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelect(emoji);
                    setOpen(false);
                  }}
                  className="flex size-7 items-center justify-center rounded text-lg hover:bg-gray-100"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
