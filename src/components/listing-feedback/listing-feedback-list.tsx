'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MaskedContact } from '@/components/contact/masked-contact';
import { useAuthStore } from '@/store/use-auth-store';
import { formatDisplayDateTime } from '@/lib/format-date';
import {
  listingFeedbackIssueLabels,
  listingFeedbacksService,
  type ListingFeedbackItem,
} from '@/services/listing-feedbacks.service';
import { feedbackApiError } from '@/services/feedbacks.service';

type Props = {
  listingId?: string | null;
  ownerUserId?: string | null;
  /** Show the listing title on each row (user profile view). */
  showListing?: boolean;
  title?: string;
};

/** Read-only agent feedback for one listing or all listings of one owner. */
export function ListingFeedbackList({ listingId, ownerUserId, showListing, title }: Props) {
  const canRead = useAuthStore((s) => s.hasPermission)('listing_feedbacks', 'read');
  const [items, setItems] = useState<ListingFeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!canRead || (!listingId && !ownerUserId)) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    listingFeedbacksService
      .list({
        listingId: listingId || undefined,
        ownerUserId: ownerUserId || undefined,
        limit: 50,
      })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setItems([]);
        setError(feedbackApiError(err, 'Failed to load listing feedback.'));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [canRead, listingId, ownerUserId]);

  if (!canRead || (!listingId && !ownerUserId)) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {title || 'Listing Feedback'} ({total})
      </p>
      {loading ? (
        <Loader2 className="mx-auto my-4 h-5 w-5 animate-spin text-primary" />
      ) : error ? (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 py-4 text-center text-sm text-gray-500">
          No listing feedback yet.
        </p>
      ) : (
        <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {items.map((row) => {
            const issues = listingFeedbackIssueLabels(row);
            return (
              <li
                key={row.id}
                className="rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-sm"
              >
                {showListing && (
                  <p className="font-medium text-gray-900">
                    {row.listing.title}
                    {row.listing.location && row.listing.location !== row.listing.title
                      ? ` · ${row.listing.location}`
                      : ''}
                  </p>
                )}
                <p className="flex flex-wrap items-center gap-1 text-xs text-gray-500">
                  Agent: {row.agent.name || '—'}
                  {row.agent.contact ? (
                    <>
                      {' · '}
                      <MaskedContact value={row.agent.contact} revealKey={`listing-feedback-list:${row.id}:agent`} />
                    </>
                  ) : null}
                </p>
                {issues.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {issues.map((label) => (
                      <Badge
                        key={label}
                        variant="secondary"
                        className="bg-orange-50 text-orange-700"
                      >
                        {label}
                      </Badge>
                    ))}
                  </div>
                )}
                {row.remarks && (
                  <p className="mt-1.5 whitespace-pre-wrap break-words text-gray-800">
                    {row.remarks}
                  </p>
                )}
                <p className="mt-1 text-[10px] text-gray-400">
                  {formatDisplayDateTime(row.createdAt)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
