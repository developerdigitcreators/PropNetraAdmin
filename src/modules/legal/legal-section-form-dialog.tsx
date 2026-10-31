'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RichHtmlEditor } from '@/components/rich-text/rich-html-editor';
import { type LegalSection } from '@/services/legal-sections.service';
import { useDialogUnsavedGuard } from '@/hooks/use-unsaved-changes-guard';
import { Loader2 } from 'lucide-react';

function htmlHasText(html: string): boolean {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 0;
}

type LegalSectionFormDialogProps = {
  open: boolean;
  section?: LegalSection | null;
  submitting: boolean;
  error: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { title: string; bodyHtml: string; isActive: boolean }) => void;
};

export function LegalSectionFormDialog({
  open,
  section,
  submitting,
  error,
  onOpenChange,
  onSubmit,
}: LegalSectionFormDialogProps) {
  const isEdit = Boolean(section?.id);
  const [title, setTitle] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [localError, setLocalError] = useState('');
  const baselineRef = useRef('');

  useEffect(() => {
    if (!open) return;
    setLocalError('');
    const nextTitle = section?.title || '';
    const nextBody = section?.bodyHtml || '';
    const nextActive = section?.isActive !== false;
    setTitle(nextTitle);
    setBodyHtml(nextBody);
    setIsActive(nextActive);
    baselineRef.current = JSON.stringify({
      title: nextTitle,
      bodyHtml: nextBody,
      isActive: nextActive,
    });
  }, [open, section]);

  const snapshot = useMemo(
    () => JSON.stringify({ title, bodyHtml, isActive }),
    [title, bodyHtml, isActive],
  );
  const dirty = open && baselineRef.current !== '' && snapshot !== baselineRef.current;
  const { requestClose, dialog } = useDialogUnsavedGuard(dirty, {
    onSave: () => handleSubmit(),
  });

  const handleOpenChange = async (next: boolean) => {
    if (submitting) return;
    if (!next) {
      const ok = await requestClose();
      if (ok) onOpenChange(false);
      return;
    }
    onOpenChange(true);
  };

  const handleSubmit = () => {
    const nextTitle = title.trim();
    if (!nextTitle) {
      setLocalError('Title is required.');
      return;
    }
    if (nextTitle.length > 300) {
      setLocalError('Title must be 300 characters or fewer.');
      return;
    }
    if (!htmlHasText(bodyHtml)) {
      setLocalError('Description is required.');
      return;
    }
    if (bodyHtml.length > 50000) {
      setLocalError('Description is too long (max 50,000 characters).');
      return;
    }
    setLocalError('');
    onSubmit({ title: nextTitle, bodyHtml, isActive });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => void handleOpenChange(next)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit section' : 'Add section'}</DialogTitle>
            <DialogDescription>
              Section title and description appear on the legal page in the app. Formatting matches
              what users see.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Introduction"
                maxLength={300}
              />
            </div>
            <RichHtmlEditor
              label="Description"
              value={bodyHtml}
              onChange={setBodyHtml}
              placeholder="Write the section content…"
              minHeightClassName="min-h-[200px]"
            />
            <div className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-gray-800">Visible in app</p>
                <p className="text-xs text-gray-500">Hidden sections stay in admin only.</p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(Boolean(checked))}
              />
            </div>

            {(localError || error) && (
              <p className="text-sm text-red-600">{localError || error}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => void handleOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                {isEdit ? 'Save changes' : 'Add section'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {dialog}
    </>
  );
}
