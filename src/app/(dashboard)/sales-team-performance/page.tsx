'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  type SalesTeamMember,
} from '@/services/referral.service';

const ALL = 'all';
const DEFAULTS = { staffUserId: ALL, from: '', to: '', q: '' };

export default function SalesTeamPerformancePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <SalesTeamPerformanceInner />
    </Suspense>
  );
}

function SalesTeamPerformanceInner() {
  const { filters, setFilters, resetFilters } = useUrlFilters(DEFAULTS);
  const [qDraft, setQDraft] = useState(filters.q);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [team, setTeam] = useState<SalesTeamMember[]>([]);
  const [data, setData] = useState<SalesPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    referralService
      .getSalesPerformanceTeam()
      .then((list) => {
        if (!cancelled) setTeam(list);
      })
      .catch(() => {
        if (!cancelled) setTeam([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await referralService.getSalesPerformance({
        staffUserId: filters.staffUserId || ALL,
        from: filters.from || undefined,
        to: filters.to || undefined,
        q: filters.q || undefined,
        page,
        limit,
      });
      setData(result);
    } catch (err) {
      setData(null);
      setError(referralApiError(err, 'Failed to load sales team performance.'));
    } finally {
      setLoading(false);
    }
  }, [filters.staffUserId, filters.from, filters.to, filters.q, page, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyFilters = (update: Partial<typeof DEFAULTS>) => {
    setPage(1);
    setFilters(update);
  };

  const isAll = !filters.staffUserId || filters.staffUserId === ALL;
  const teamLabel = (m: SalesTeamMember) => `${m.name} (${m.directCount})`;
  const staff = !isAll ? data?.staff : null;

  return (
    <PermissionGuard permission="sales_team_performance:read">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Breadcrumb items={[{ label: 'Sales Team Performance' }]} />
            <h1 className="mt-2 text-2xl font-bold text-gray-900">Sales Team Performance</h1>
            <p className="mt-1 text-sm text-gray-500">
              Invites, paid conversions and revenue brought in by each admin team member.
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

        <SalesFilterBar
          leading={
            <div>
              <label className="mb-1 block text-xs text-gray-500">Team</label>
              <Select
                value={filters.staffUserId || ALL}
                onValueChange={(v) => applyFilters({ staffUserId: v ? String(v) : ALL })}
              >
                <SelectTrigger className="h-9 min-w-[200px] bg-white">
                  <SelectValue placeholder="All team">
                    {(v: string) => {
                      if (!v || v === ALL) return 'All team';
                      const m = team.find((x) => x.id === v);
                      return m ? teamLabel(m) : data?.staff?.name || 'Team member';
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL} label="All team">
                    All team
                  </SelectItem>
                  {team.map((m) => (
                    <SelectItem key={m.id} value={m.id} label={teamLabel(m)}>
                      {teamLabel(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
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

        {staff ? (
          <ReferralLinkCard
            title={`${staff.name}'s referral link`}
            referralCode={staff.referralCode}
            inviteUrl={staff.inviteUrl}
          />
        ) : null}

        {data ? <SalesStatCards totals={data.totals} /> : null}

        <SalesInviteesTable
          data={data}
          loading={loading}
          error={error}
          showReferredBy={isAll}
          revealPrefix="sales-team-performance"
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
