'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/common/searchable-select';
import { dbfFeaturedApiError } from '@/services/dbf-featured.service';
import { Loader2 } from 'lucide-react';

export type DbfPickOption = { value: string; label: string };

type DbfPickDialogProps = {
  open: boolean;
  title: string;
  description: string;
  fieldLabel: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  submitLabel: string;
  submitting: boolean;
  error: string;
  search: (q: string) => Promise<DbfPickOption[]>;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: string) => void;
};

export function DbfPickDialog({
  open,
  title,
  description,
  fieldLabel,
  placeholder,
  searchPlaceholder,
  emptyText,
  submitLabel,
  submitting,
  error,
  search,
  onOpenChange,
  onSubmit,
}: DbfPickDialogProps) {
  const [value, setValue] = useState('');
  const [label, setLabel] = useState('');
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<DbfPickOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!open) return;
    setValue('');
    setLabel('');
    setQuery('');
    setLocalError('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      search(query)
        .then((rows) => {
          if (!cancelled) setOptions(rows);
        })
        .catch((err) => {
          if (!cancelled) {
            setOptions([]);
            setLocalError(dbfFeaturedApiError(err, 'Failed to search.'));
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, query, search]);

  const handleSubmit = () => {
    if (!value) {
      setLocalError(`Select ${fieldLabel.toLowerCase()} first.`);
      return;
    }
    setLocalError('');
    onSubmit(value);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">{fieldLabel}</label>
            <SearchableSelect
              options={options}
              value={value}
              selectedLabel={label}
              onValueChange={(v) => {
                setValue(v);
                setLabel(options.find((o) => o.value === v)?.label || '');
              }}
              onSearch={setQuery}
              loading={loading}
              placeholder={placeholder}
              searchPlaceholder={searchPlaceholder}
              emptyText={emptyText}
            />
          </div>
          {(localError || error) && (
            <p className="text-sm text-red-600">{localError || error}</p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
