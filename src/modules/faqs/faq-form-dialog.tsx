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
import { type FaqItem } from '@/services/faqs.service';
import { useDialogUnsavedGuard } from '@/hooks/use-unsaved-changes-guard';
import { Loader2 } from 'lucide-react';

type FaqFormDialogProps = {
  open: boolean;
  faq?: FaqItem | null;
  submitting: boolean;
  error: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { question: string; answer: string; isActive: boolean }) => void;
};

export function FaqFormDialog({
  open,
  faq,
  submitting,
  error,
  onOpenChange,
  onSubmit,
}: FaqFormDialogProps) {
  const isEdit = Boolean(faq?.id);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [localError, setLocalError] = useState('');
  const baselineRef = useRef('');

  useEffect(() => {
    if (!open) return;
    setLocalError('');
    const nextQuestion = faq?.question || '';
    const nextAnswer = faq?.answer || '';
    const nextActive = faq?.isActive !== false;
    setQuestion(nextQuestion);
    setAnswer(nextAnswer);
    setIsActive(nextActive);
    baselineRef.current = JSON.stringify({
      question: nextQuestion,
      answer: nextAnswer,
      isActive: nextActive,
    });
  }, [open, faq]);

  const snapshot = useMemo(
    () => JSON.stringify({ question, answer, isActive }),
    [question, answer, isActive],
  );
  const dirty = open && baselineRef.current !== '' && snapshot !== baselineRef.current;
  const { requestClose, dialog } = useDialogUnsavedGuard(dirty);

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
    const nextQuestion = question.trim();
    const nextAnswer = answer.trim();
    if (!nextQuestion) {
      setLocalError('Question is required.');
      return;
    }
    if (!nextAnswer) {
      setLocalError('Answer is required.');
      return;
    }
    setLocalError('');
    onSubmit({ question: nextQuestion, answer: nextAnswer, isActive });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => void handleOpenChange(next)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit FAQ' : 'Add FAQ'}</DialogTitle>
            <DialogDescription>
              This question and answer appear in the app drawer under FAQs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Question</label>
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="When are NetraCoins credited?"
                maxLength={300}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Answer</label>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Write the answer users will see in the app."
                rows={6}
                maxLength={8000}
                className="w-full min-h-28 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-gray-800">Visible in app</p>
                <p className="text-xs text-gray-500">Hidden FAQs stay in admin only.</p>
              </div>
              <Switch checked={isActive} onCheckedChange={(checked) => setIsActive(Boolean(checked))} />
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
                {isEdit ? 'Save changes' : 'Add FAQ'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {dialog}
    </>
  );
}
