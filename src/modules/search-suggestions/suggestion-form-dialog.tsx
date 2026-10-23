'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/common/searchable-select';
import {
  searchSuggestionsApiError,
  searchSuggestionsService,
  type SearchSuggestion,
  type SearchSuggestionPostOption,
} from '@/services/search-suggestions.service';
import { useDialogUnsavedGuard } from '@/hooks/use-unsaved-changes-guard';
import { Loader2 } from 'lucide-react';

type SuggestionFormDialogProps = {
  open: boolean;
  suggestion?: SearchSuggestion | null;
  stateId: string;
  cityId: string;
  cityName?: string;
  submitting: boolean;
  error: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { listingId: string; isActive: boolean }) => void;
};

export function SuggestionFormDialog({
  open,
  suggestion,
  stateId,
  cityId,
  cityName,
  submitting,
  error,
  onOpenChange,
  onSubmit,
}: SuggestionFormDialogProps) {
  const isEdit = Boolean(suggestion?.id);
  const [listingId, setListingId] = useState('');
  const [listingLabel, setListingLabel] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [posts, setPosts] = useState<SearchSuggestionPostOption[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [localError, setLocalError] = useState('');
  const baselineRef = useRef('');

  useEffect(() => {
    if (!open) return;
    setLocalError('');
    const nextListingId = suggestion?.listingId || '';
    const nextLabel = suggestion?.listing?.title || '';
    const nextActive = suggestion?.isActive !== false;
    setListingId(nextListingId);
    setListingLabel(nextLabel);
    setIsActive(nextActive);
    setSearch('');
    baselineRef.current = JSON.stringify({
      listingId: nextListingId,
      isActive: nextActive,
    });
  }, [open, suggestion]);

  useEffect(() => {
    if (!open || !cityId) return;
    let cancelled = false;
    setPostsLoading(true);
    const timer = window.setTimeout(() => {
      searchSuggestionsService
        .searchPosts({ cityId, q: search })
        .then((items) => {
          if (!cancelled) setPosts(items);
        })
        .catch((err) => {
          if (!cancelled) {
            setPosts([]);
            setLocalError(
              searchSuggestionsApiError(err, 'Failed to load developer projects.'),
            );
          }
        })
        .finally(() => {
          if (!cancelled) setPostsLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, cityId, search]);

  const options = useMemo(() => {
    const mapped = posts.map((post) => ({
      value: post.id,
      label: post.subtitle ? `${post.title} — ${post.subtitle}` : post.title,
    }));
    if (listingId && !mapped.some((o) => o.value === listingId) && listingLabel) {
      return [{ value: listingId, label: listingLabel }, ...mapped];
    }
    return mapped;
  }, [posts, listingId, listingLabel]);

  const dirty =
    open &&
    baselineRef.current !== '' &&
    JSON.stringify({ listingId, isActive }) !== baselineRef.current;
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
    if (!stateId || !cityId) {
      setLocalError('Select state and city first.');
      return;
    }
    if (!listingId) {
      setLocalError('Select a published Developer project.');
      return;
    }
    setLocalError('');
    onSubmit({ listingId, isActive });
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(next) => void handleOpenChange(next)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit suggestion' : 'Add suggestion'}</DialogTitle>
          <DialogDescription>
            Link a published Developer project for {cityName || 'this city'}. Resale listings
            are not allowed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Developer project</label>
            <SearchableSelect
              options={options}
              value={listingId}
              selectedLabel={listingLabel}
              onValueChange={(v) => {
                setListingId(v);
                const post = posts.find((p) => p.id === v);
                setListingLabel(post?.title || '');
              }}
              onSearch={setSearch}
              loading={postsLoading}
              disabled={!cityId}
              placeholder={cityId ? 'Select Developer project' : 'Select city first'}
              searchPlaceholder="Search published Developer projects…"
              emptyText="No published Developer projects found for this city."
            />
            <p className="text-xs text-gray-500">
              Only published Developer-category listings for this city appear here.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
            <div>
              <p className="text-sm font-medium text-gray-800">Active in app search</p>
              <p className="text-xs text-gray-500">Hidden suggestions stay in admin only.</p>
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
            <Button onClick={handleSubmit} disabled={submitting || !cityId}>
              {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Add suggestion'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    {dialog}
    </>
  );
}
