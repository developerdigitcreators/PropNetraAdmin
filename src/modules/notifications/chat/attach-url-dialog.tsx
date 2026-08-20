'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isHttpsUrl } from './draft';

const COPY: Record<string, { title: string; hint: string; placeholder: string }> = {
  image: {
    title: 'Attach image',
    hint: 'Shown inside the card and on the phone tray. Add more images from + if you need several.',
    placeholder: 'https://cdn.example.com/banner.jpg',
  },
  video: {
    title: 'Attach video',
    hint: 'Opens in the browser when tapped.',
    placeholder: 'https://cdn.example.com/clip.mp4',
  },
  pdf: {
    title: 'Attach PDF',
    hint: 'Brochures and price lists. Opens in the browser when tapped.',
    placeholder: 'https://cdn.example.com/brochure.pdf',
  },
};

type AttachUrlDialogProps = {
  kind: string;
  kindLabel: string;
  open: boolean;
  initialUrl?: string;
  onClose: () => void;
  onSave: (url: string) => void;
};

export function AttachUrlDialog({
  kind,
  kindLabel,
  open,
  initialUrl = '',
  onClose,
  onSave,
}: AttachUrlDialogProps) {
  const [url, setUrl] = useState(initialUrl);
  const copy = COPY[kind] || {
    title: `Attach ${kindLabel}`,
    hint: 'Paste a publicly reachable HTTPS link.',
    placeholder: 'https://…',
  };

  useEffect(() => {
    if (open) setUrl(initialUrl);
  }, [open, initialUrl]);

  const trimmed = url.trim();
  const valid = isHttpsUrl(trimmed);
  const showError = !!trimmed && !valid;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.hint}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <label className="text-sm font-medium">{kindLabel} link</label>
          <Input
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={copy.placeholder}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && valid) {
                e.preventDefault();
                onSave(trimmed);
              }
            }}
          />
          {showError && (
            <p className="text-xs text-red-600">Must be a valid HTTPS link.</p>
          )}
          <p className="text-xs text-gray-500">
            Files are hosted outside the admin, so paste a link that is already live.
          </p>
          {kind === 'image' && valid && (
            // Arbitrary external hosts, so next/image cannot be configured for these.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={trimmed}
              alt=""
              className="mt-2 max-h-40 w-full rounded-lg border border-gray-100 object-cover"
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => onSave(trimmed)}
            disabled={!valid}
            className="bg-primary text-white hover:bg-primary/90"
          >
            Attach
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
