'use client';

import { useCallback, useEffect, useState } from 'react';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  referralApiError,
  referralService,
  type ReferralSaleMe,
} from '@/services/referral.service';
import { formatDisplayDateTime } from '@/lib/format-date';
import { Check, Copy, Gift, Loader2, RefreshCw } from 'lucide-react';

function planShort(code?: string | null) {
  if (!code) return '—';
  const map: Record<string, string> = {
    FREE_TRIAL: 'Free',
    FREE_LIFETIME: 'Free',
    NETWORK_PAID: 'Network',
    PRO: 'Pro',
    ELITE: 'Elite',
  };
  return map[code] || code.replace(/_/g, ' ');
}

export default function ReferralSalePage() {
  const [data, setData] = useState<ReferralSaleMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await referralService.getReferralSaleMe();
      setData(result);
    } catch (err) {
      setData(null);
      setError(referralApiError(err, 'Failed to load referral sale.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const copyLink = async () => {
    if (!data?.inviteUrl) return;
    try {
      await navigator.clipboard.writeText(data.inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError('Could not copy link.');
    }
  };

  return (
    <PermissionGuard permission="referral_sale:read">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Breadcrumb items={[{ label: 'Referral Sale' }]} />
            <h1 className="mt-2 text-2xl font-bold text-gray-900">Referral Sale</h1>
            <p className="mt-1 text-sm text-gray-500">
              Your invite link and direct invitees only (paid / free counts).
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

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {loading && !data ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : data ? (
          <>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                <Gift className="h-4 w-4 text-primary" />
                Your referral link
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Code <span className="font-mono font-semibold text-gray-800">{data.referralCode}</span>
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <code className="max-w-full flex-1 truncate rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-800">
                  {data.inviteUrl}
                </code>
                <Button type="button" size="sm" onClick={() => void copyLink()}>
                  {copied ? (
                    <Check className="mr-1.5 h-4 w-4" />
                  ) : (
                    <Copy className="mr-1.5 h-4 w-4" />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Direct invites', value: data.totals.direct },
                { label: 'Paid allottee', value: data.totals.paid },
                { label: 'Free allottee', value: data.totals.free },
              ].map((chip) => (
                <div
                  key={chip.label}
                  className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    {chip.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{chip.value}</p>
                </div>
              ))}
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-gray-900">Direct invitees</h2>
                <p className="text-xs text-gray-500">No chain — only people you invited.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Contact</th>
                      <th className="px-4 py-3 font-medium">Allottee</th>
                      <th className="px-4 py-3 font-medium">Plan</th>
                      <th className="px-4 py-3 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.invitees.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                          No direct invitees yet.
                        </td>
                      </tr>
                    ) : (
                      data.invitees.map((row) => (
                        <tr key={`${row.id}-${row.joinedAt}`} className="text-gray-800">
                          <td className="px-4 py-3 font-medium">{row.name}</td>
                          <td className="px-4 py-3">{row.contact || row.email || '—'}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                                row.allotteeType === 'paid'
                                  ? 'bg-teal-100 text-teal-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {row.allotteeType === 'paid' ? 'Paid' : 'Free'}
                            </span>
                          </td>
                          <td className="px-4 py-3">{planShort(row.planCode)}</td>
                          <td className="px-4 py-3 text-gray-600">
                            {formatDisplayDateTime(row.joinedAt)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </PermissionGuard>
  );
}
