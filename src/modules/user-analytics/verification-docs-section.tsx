'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { axiosClient } from '@/lib/axios-client';
import { Loader2 } from 'lucide-react';

type DocRow = {
  id: string;
  docType: string;
  fileUrl: string;
  fileName: string | null;
  status: string;
  adminRemark: string | null;
  createdAt: string;
};

function unwrap<T>(response: { data?: { data?: T } | T }): T {
  const body = response.data as { data?: T } | T;
  if (body && typeof body === 'object' && 'data' in body && body.data !== undefined) {
    return body.data as T;
  }
  return body as T;
}

export function VerificationDocsSection({ userId }: { userId: string }) {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [summaryLabel, setSummaryLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [remarkById, setRemarkById] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosClient.get(
        `/admin/users/${encodeURIComponent(userId)}/verification-documents`,
      );
      const data = unwrap<{
        documents?: DocRow[];
        summary?: { label?: string | null };
      }>(response);
      setDocs(Array.isArray(data?.documents) ? data.documents : []);
      setSummaryLabel(data?.summary?.label || null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(
        e?.response?.data?.error?.message || 'Failed to load verification documents.',
      );
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (docId: string) => {
    setBusyId(docId);
    setError('');
    try {
      await axiosClient.post(
        `/admin/users/${encodeURIComponent(userId)}/verification-documents/${encodeURIComponent(docId)}/approve`,
      );
      await load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e?.response?.data?.error?.message || 'Approve failed.');
    } finally {
      setBusyId(null);
    }
  };

  const requestReupload = async (docId: string) => {
    const remark = (remarkById[docId] || '').trim();
    if (!remark) {
      setError('Enter a remark before requesting reupload.');
      return;
    }
    setBusyId(docId);
    setError('');
    try {
      await axiosClient.post(
        `/admin/users/${encodeURIComponent(userId)}/verification-documents/${encodeURIComponent(docId)}/request-reupload`,
        { remark },
      );
      await load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e?.response?.data?.error?.message || 'Reupload request failed.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <section className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Verification documents</h3>
        {summaryLabel ? (
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
            {summaryLabel}
          </span>
        ) : null}
      </div>
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents uploaded</p>
      ) : (
        <ul className="divide-y text-sm">
          {docs.map((d) => (
            <li key={d.id} className="space-y-2 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{d.docType}</span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{d.status}</span>
                <a
                  href={d.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary underline"
                >
                  {d.fileName || 'View file'}
                </a>
                <span className="ml-auto text-xs text-muted-foreground">
                  {d.createdAt ? new Date(d.createdAt).toLocaleString() : ''}
                </span>
              </div>
              {d.adminRemark ? (
                <p className="text-xs text-muted-foreground">Remark: {d.adminRemark}</p>
              ) : null}
              {d.status === 'pending_review' || d.status === 'reupload_required' ? (
                <div className="flex flex-wrap items-end gap-2">
                  <Button
                    size="sm"
                    disabled={busyId === d.id}
                    onClick={() => approve(d.id)}
                  >
                    {busyId === d.id ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : null}
                    Approve
                  </Button>
                  <div className="flex min-w-[200px] flex-1 flex-col gap-1.5 sm:flex-row sm:items-end">
                    <Input
                      placeholder="Remark (required to disapprove)"
                      value={remarkById[d.id] || ''}
                      onChange={(e) =>
                        setRemarkById((prev) => ({ ...prev, [d.id]: e.target.value }))
                      }
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === d.id}
                      onClick={() => requestReupload(d.id)}
                    >
                      Disapprove / Reupload
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
