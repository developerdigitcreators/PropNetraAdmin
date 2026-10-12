'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { Button } from '@/components/ui/button';
import { useUrlFilters } from '@/hooks/use-url-filters';
import {
  ReferralLinkCard,
  SalesFilterBar,
  SalesInviteesTable,
  SalesStatCards,
} from '@/modules/referral/sales-performance-parts';
import {
  referralApiError,
  referralService,
  type SalesPerformance,
} from '@/services/referral.service';

const DEFAULTS = { from: '', to: '', q: '' };

export default function ReferralSalePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <ReferralSaleInner />
    </Suspense>
  );
}

function ReferralSaleInner() {
  const { filters, setFilters, resetFilters } = useUrlFilters(DEFAULTS);
  const [qDraft, setQDraft] = useState(filters.q);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [data, setData] = useState<SalesPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await referralService.getReferralSaleMe({
        from: filters.from || undefined,
        to: filters.to || undefined,
        q: filters.q || undefined,
        page,
        limit,
      });
      setData(result);
    } catch (err) {
      setData(null);
      setError(referralApiError(err, 'Failed to load referral sale.'));
    } finally {
      setLoading(false);
    }
  }, [filters.from, filters.to, filters.q, page, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyFilters = (update: Partial<typeof DEFAULTS>) => {
    setPage(1);
    setFilters(update);
  };

  return (
    <PermissionGuard permission="referral_sale:read">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Breadcrumb items={[{ label: 'Referral Sale' }]} />
            <h1 className="mt-2 text-2xl font-bold text-gray-900">Referral Sale</h1>
            <p className="mt-1 text-sm text-gray-500">
              Your invite link, the people you invited and the people they invited.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {data ? (
          <ReferralLinkCard
            title="Your referral link"
            referralCode={data.referralCode}
            inviteUrl={data.inviteUrl}
          />
        ) : null}

        <SalesFilterBar
          from={filters.from}
          to={filters.to}
          qDraft={qDraft}
          onFromChange={(v) => applyFilters({ from: v })}
          onToChange={(v) => applyFilters({ to: v })}
          onQDraftChange={setQDraft}
          onSearch={() => applyFilters({ q: qDraft.trim() })}
          onReset={() => {
            setQDraft('');
            setPage(1);
            resetFilters();
          }}
        />

        {data ? <SalesStatCards totals={data.totals} /> : null}

        <SalesInviteesTable
          data={data}
          loading={loading}
          error={error}
          showReferredBy={false}
          revealPrefix="referral-sale"
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setLimit(next);
            setPage(1);
          }}
        />
      </div>
    </PermissionGuard>
  );
}
