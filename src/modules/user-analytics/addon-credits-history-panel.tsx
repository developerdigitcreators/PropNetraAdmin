'use client';

import { useEffect, useMemo } from 'react';
import { AdminDataTable } from '@/components/common/admin-data-table';
import { AdminListToolbar } from '@/components/common/admin-list-toolbar';
import { useClientPagedRows } from '@/hooks/use-client-paged-rows';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { formatDisplayDate } from '@/lib/format-date';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export type AddonCreditsKind = 'listing' | 'buy_req' | 'builder';

export type CreditLotRow = {
  id: string;
  kind: string;
  amountRemaining: number;
  amountGranted: number;
  grantedAt: string;
  expiresAt: string;
  source: string;
  walletCoinsSpent?: number | null;
  topupOrderId?: string | null;
  active?: boolean;
  expiredAt?: string | null;
};

export type PurchaseTxnRow = {
  id: string;
  type: string;
  title: string;
  subtitle?: string | null;
  referralCoinsDelta: number;
  amountPaise?: number | null;
  addonType?: string | null;
  paymentOrderId?: string | null;
  meta?: Record<string, unknown> | null;
  occurredAt: string;
};

type StatusFilter = '' | 'expiring' | 'expired';

type HistoryRow = {
  id: string;
  title: string;
  remaining: number | null;
  grantedAt: string;
  expiresAt: string | null;
  expired: boolean;
  how: string;
  subtitle: string | null;
};

function fmtMoney(paise: number) {
  return `₹${(Math.max(0, paise) / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function isExpired(value?: string | null) {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}

function howPaidLabel(purchase: PurchaseTxnRow | null): string {
  if (!purchase) return 'Source unknown';
  const coins =
    Math.abs(Number(purchase.referralCoinsDelta || 0)) ||
    Number(purchase.meta?.referralCoinsUsed || 0) ||
    0;
  const cash = Number(purchase.amountPaise ?? purchase.meta?.amountPaise ?? 0);
  if (coins > 0 && cash > 0) {
    return `Both — ${coins} referral coins + ${fmtMoney(cash)} cash`;
  }
  if (coins > 0) {
    return `Referral coins — ${coins} coins`;
  }
  if (cash > 0) {
    return `Cash only — ${fmtMoney(cash)}`;
  }
  if (purchase.subtitle) return purchase.subtitle;
  return 'Pack purchase';
}

function matchPurchaseForLot(
  lot: CreditLotRow,
  purchases: PurchaseTxnRow[],
  usedIds: Set<string>,
): PurchaseTxnRow | null {
  if (lot.topupOrderId) {
    const byOrder = purchases.find(
      (p) =>
        !usedIds.has(p.id) &&
        p.paymentOrderId &&
        String(p.paymentOrderId) === String(lot.topupOrderId),
    );
    if (byOrder) return byOrder;
  }
  const grantedMs = new Date(lot.grantedAt).getTime();
  if (Number.isNaN(grantedMs)) return null;
  let best: PurchaseTxnRow | null = null;
  let bestDiff = Infinity;
  for (const p of purchases) {
    if (usedIds.has(p.id)) continue;
    const diff = Math.abs(new Date(p.occurredAt).getTime() - grantedMs);
    if (diff < bestDiff && diff <= 5 * 60 * 1000) {
      best = p;
      bestDiff = diff;
    }
  }
  return best;
}

function kindTitle(kind: AddonCreditsKind) {
  if (kind === 'builder') return 'Builder credits';
  if (kind === 'buy_req') return 'Buy-req credits';
  return 'Listing credits';
}

type AddonCreditsHistoryPanelProps = {
  kind: AddonCreditsKind;
  lots: CreditLotRow[];
  transactions: PurchaseTxnRow[];
  loading?: boolean;
  error?: string | null;
  onBack: () => void;
  onRefresh: () => void;
};

export function AddonCreditsHistoryPanel({
  kind,
  lots,
  transactions,
  loading = false,
  error = null,
  onBack,
  onRefresh,
}: AddonCreditsHistoryPanelProps) {
  const { filters, setFilters, resetFilters } = useUrlFilters({ status: '' });
  const statusFilter = filters.status as StatusFilter;

  const kindLots = useMemo(
    () =>
      lots
        .filter((lot) => String(lot.kind || '').toLowerCase() === kind)
        .slice()
        .sort(
          (a, b) =>
            new Date(b.grantedAt).getTime() - new Date(a.grantedAt).getTime(),
        ),
    [lots, kind],
  );

  const purchases = useMemo(
    () =>
      transactions.filter((t) => {
        const type = String(t.type || '').toLowerCase();
        // Plan checkout rows live in payment history — never in credit packs.
        if (type === 'plan_purchase') return false;
        if (/plan/.test(String(t.title || ''))) return false;
        if (!/addon_purchase|addon|spend/i.test(type)) {
          return false;
        }
        // Do not treat bare "purchase" as a match (that pulled in plan_purchase).
        const addon = String(
          t.addonType || t.meta?.addonType || '',
        ).toLowerCase();
        if (kind === 'listing') {
          if (!addon) {
            const title = String(t.title || '').toLowerCase();
            return /credit|pack|resale|listing|contact|rent/i.test(title);
          }
          return /listing|resale|rent/.test(addon);
        }
        if (kind === 'buy_req') return /buy/.test(addon);
        return /builder/.test(addon);
      }),
    [transactions, kind],
  );

  const remainingCredits = kindLots.reduce(
    (sum, lot) => sum + Number(lot.amountRemaining || 0),
    0,
  );

  const allRows = useMemo((): HistoryRow[] => {
    const usedPurchaseIds = new Set<string>();
    const fromLots = kindLots.map((lot) => {
      const purchase = matchPurchaseForLot(lot, purchases, usedPurchaseIds);
      if (purchase) usedPurchaseIds.add(purchase.id);
      return {
        id: lot.id,
        title: `+${lot.amountGranted} credits`,
        remaining: lot.amountRemaining,
        grantedAt: lot.grantedAt,
        expiresAt: lot.expiresAt,
        expired: !!lot.expiredAt || isExpired(lot.expiresAt),
        how: howPaidLabel(purchase),
        subtitle: purchase?.subtitle || null,
      };
    });

    const orphanPurchases = purchases
      .filter((p) => !usedPurchaseIds.has(p.id))
      .map((p) => ({
        id: `txn-${p.id}`,
        title: p.title || 'Pack purchase',
        remaining: null as number | null,
        grantedAt: p.occurredAt,
        expiresAt: null as string | null,
        expired: false,
        how: howPaidLabel(p),
        subtitle: p.subtitle || null,
      }));

    return [...fromLots, ...orphanPurchases].sort(
      (a, b) =>
        new Date(b.grantedAt).getTime() - new Date(a.grantedAt).getTime(),
    );
  }, [kindLots, purchases]);

  const filteredRows = useMemo(() => {
    if (statusFilter === 'expired') {
      return allRows.filter((r) => r.expired);
    }
    if (statusFilter === 'expiring') {
      return allRows.filter((r) => !r.expired && r.expiresAt);
    }
    return allRows;
  }, [allRows, statusFilter]);

  const {
    page,
    limit,
    total,
    totalPages,
    pageRows,
    onPageChange,
    onPageSizeChange,
    resetPage,
  } = useClientPagedRows(filteredRows, 25);

  useEffect(() => {
    resetPage();
  }, [statusFilter, resetPage]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2 mb-1 text-gray-600"
            onClick={onBack}
          >
            <ArrowLeft className="mr-1.5 size-3.5" />
            Back to subscription
          </Button>
          <h2 className="text-xl font-semibold text-gray-900">
            {kindTitle(kind)} history
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            How each pack was bought (referral coins, cash, or both) and when
            those credits expire.
          </p>
        </div>
        <AdminListToolbar
          onRefresh={onRefresh}
          refreshDisabled={loading}
          onReset={() => {
            resetFilters();
            resetPage();
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm font-medium text-gray-900">
          Credits left: {remainingCredits}
        </p>
        <Select
          value={statusFilter || 'all'}
          onValueChange={(v) => {
            setFilters({ status: v === 'all' ? '' : (v as StatusFilter) });
          }}
        >
          <SelectTrigger className="w-[180px]">
            <span className={!statusFilter ? 'text-muted-foreground' : ''}>
              {statusFilter === 'expiring'
                ? 'Expiring'
                : statusFilter === 'expired'
                  ? 'Expired'
                  : 'All statuses'}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="expiring">Expiring</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {error}
        </p>
      ) : null}

      <AdminDataTable
        page={page}
        limit={limit}
        total={total}
        totalPages={totalPages}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        loading={loading}
        isEmpty={!pageRows.length}
        emptyMessage="No credit history for this pack yet."
        syncKey={pageRows.length}
      >
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/80">
            <tr>
              <th className="px-4 py-3 font-semibold text-gray-700">Credits</th>
              <th className="px-4 py-3 font-semibold text-gray-700">How paid</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Detail</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Left in pack</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Got</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Expiry</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageRows.map((row) => {
              const expired = row.expired || isExpired(row.expiresAt);
              return (
                <tr key={row.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {row.title}
                  </td>
                  <td className="px-4 py-3 text-primary">{row.how}</td>
                  <td className="max-w-[220px] px-4 py-3 text-xs text-gray-500">
                    {row.subtitle || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {row.remaining != null ? row.remaining : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDisplayDate(row.grantedAt)}
                  </td>
                  <td className="px-4 py-3">
                    {row.expiresAt ? (
                      <span
                        className={
                          expired
                            ? 'font-medium text-red-600'
                            : 'text-gray-700'
                        }
                      >
                        {expired ? 'Expired' : 'Expiring'}{' '}
                        {formatDisplayDate(row.expiresAt)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </AdminDataTable>
    </div>
  );
}
