'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MultiSelect } from '@/components/common/multi-select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  formSuggestionApiError,
  formSuggestionsService,
  type CatalogOption,
} from '@/services/form-suggestions.service';
import { Loader2 } from 'lucide-react';

type SuggestionAddDialogProps = {
  open: boolean;
  kind: 'property' | 'location';
  propertyTypeId?: string;
  propertyTypeName?: string;
  cityId?: string;
  cityName?: string;
  submitting: boolean;
  error: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (ids: string[]) => void;
};

export function SuggestionAddDialog({
  open,
  kind,
  propertyTypeId,
  propertyTypeName,
  cityId,
  cityName,
  submitting,
  error,
  onOpenChange,
  onSubmit,
}: SuggestionAddDialogProps) {
  const [options, setOptions] = useState<CatalogOption[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!open) return;
    setSelected([]);
    setLoadError('');
    if (!cityId || (kind === 'property' && !propertyTypeId)) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const request =
      kind === 'property'
        ? formSuggestionsService.propertyNameOptions(propertyTypeId || '', cityId)
        : formSuggestionsService.locationOptions(cityId);
    request
      .then((rows) => {
        if (!cancelled) setOptions(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setOptions([]);
          setLoadError(formSuggestionApiError(err, 'Failed to load options.'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, kind, propertyTypeId, cityId]);

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {kind === 'property' ? 'Add property name suggestions' : 'Add location suggestions'}
          </DialogTitle>
          <DialogDescription>
            {kind === 'property'
              ? `Saved project names for ${propertyTypeName || 'this property type'}${cityName ? ` in ${cityName}` : ''} that are not suggestions yet.`
              : `Saved locations${cityName ? ` in ${cityName}` : ''} that are not suggestions yet.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
            <MultiSelect
              searchable
              options={options.map((option) => ({ value: option.id, label: option.name }))}
              values={selected}
              onChange={setSelected}
              placeholder="Select names"
              searchPlaceholder="Search"
              emptyText="Nothing left to add."
            />
          )}
          {loadError || error ? <p className="text-sm text-red-600">{loadError || error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={submitting || loading || selected.length === 0}
              onClick={() => onSubmit(selected)}
            >
              {submitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
