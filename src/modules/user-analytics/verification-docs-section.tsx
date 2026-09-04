'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { axiosClient } from '@/lib/axios-client';
import { ExternalLink, Loader2 } from 'lucide-react';

type DocRow = {
  id: string;
  docType: string;
  fileUrl: string;
  fileName: string | null;
  status: string;
  adminRemark: string | null;
  createdAt: string;
  isReupload?: boolean;
};

type CurrentDoc = DocRow & {
  previousRejection?: { remark: string | null; createdAt: string } | null;
};

const TYPE_LABEL: Record<string, string> = {
  AADHAAR: 'Aadhaar',
  RERA: 'RERA',
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending_review: {
    label: 'Pending review',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  approved: {
    label: 'Approved',
    className: 'bg-green-50 text-green-800 border-green-200',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-50 text-red-800 border-red-200',
  },
  reupload_required: {
    label: 'Reupload needed',
    className: 'bg-red-50 text-red-800 border-red-200',
  },
};

function unwrap<T>(response: { data?: { data?: T } | T }): T {
  const body = response.data as { data?: T } | T;
  if (body && typeof body === 'object' && 'data' in body && body.data !== undefined) {
    return body.data as T;
  }
  return body as T;
}

function typeLabel(type: string) {
  return TYPE_LABEL[type] || type.replace(/_/g, ' ');
}

function formatWhen(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Latest file per type. Older rejected copies stay as a one-line note, not a second card. */
function currentDocuments(docs: DocRow[]): CurrentDoc[] {
  const sorted = [...docs].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );
  const latest = new Map<string, CurrentDoc>();
  for (const row of sorted) {
    const existing = latest.get(row.docType);
    if (!existing) {
      latest.set(row.docType, { ...row, previousRejection: null });
      continue;
    }
    if (
      !existing.previousRejection &&
      (row.status === 'rejected' || row.status === 'reupload_required')
    ) {
      existing.previousRejection = {
        remark: row.adminRemark,
        createdAt: row.createdAt,
      };
    }
  }
  return [...latest.values()];
}

export function VerificationDocsSection({ userId }: { userId: string }) {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [summaryLabel, setSummaryLabel] = useState<string | null>(null);
  const [summaryStatus, setSummaryStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [remarkById, setRemarkById] = useState<Record<string, string>>({});

  const current = useMemo(() => currentDocuments(docs), [docs]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosClient.get(
        `/admin/users/${encodeURIComponent(userId)}/verification-documents`,
      );
      const data = unwrap<{
        documents?: DocRow[];
        summary?: { label?: string | null; status?: string | null };
      }>(response);
      setDocs(Array.isArray(data?.documents) ? data.documents : []);
      setSummaryLabel(data?.summary?.label || null);
      setSummaryStatus(data?.summary?.status || null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(
        e?.response?.data?.error?.message || 'Could not load documents.',
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

  const reject = async (docId: string) => {
    const remark = (remarkById[docId] || '').trim();
    if (!remark) {
      setError('Add a reason before rejecting. The user will see this on Profile.');
      return;
    }
    setBusyId(docId);
    setError('');
    try {
      await axiosClient.post(
        `/admin/users/${encodeURIComponent(userId)}/verification-documents/${encodeURIComponent(docId)}/request-reupload`,
        { remark },
      );
      setRemarkById((prev) => ({ ...prev, [docId]: '' }));
      await load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e?.response?.data?.error?.message || 'Reject failed.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  const summaryClass =
    summaryStatus === 'rejected'
      ? 'bg-red-50 text-red-800 border-red-200'
      : summaryStatus === 'approved'
        ? 'bg-green-50 text-green-800 border-green-200'
        : summaryStatus === 'reuploaded'
          ? 'bg-violet-50 text-violet-800 border-violet-200'
          : summaryStatus === 'new_document_added'
            ? 'bg-sky-50 text-sky-800 border-sky-200'
            : 'bg-amber-50 text-amber-800 border-amber-200';

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
          Documents
        </p>
        {summaryLabel ? (
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${summaryClass}`}
          >
            {summaryLabel}
          </span>
        ) : null}
      </div>
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}
      {current.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-sm text-gray-500">
          No documents uploaded yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {current.map((d) => {
            const status = STATUS_META[d.status] || {
              label: d.status.replace(/_/g, ' '),
              className: 'bg-gray-50 text-gray-700 border-gray-200',
            };
            const needsReview = d.status === 'pending_review';
            const waitingForReupload =
              d.status === 'rejected' || d.status === 'reupload_required';
            const busy = busyId === d.id;
            return (
              <li
                key={d.id}
                className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 space-y-2.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {typeLabel(d.docType)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-500">
                      {d.isReupload ? 'Updated file · ' : ''}
                      {formatWhen(d.createdAt) || 'Date unknown'}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${status.className}`}
                  >
                    {d.isReupload && d.status === 'pending_review'
                      ? 'Reuploaded · pending'
                      : status.label}
                  </span>
                </div>

                {d.fileUrl ? (
                  <a
                    href={d.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open file
                    {d.fileName ? (
                      <span className="font-normal text-gray-500 truncate max-w-[180px]">
                        {d.fileName}
                      </span>
                    ) : null}
                  </a>
                ) : null}

                {d.adminRemark && d.status !== 'pending_review' ? (
                  <p className="text-xs text-gray-600">
                    Reason: {d.adminRemark}
                  </p>
                ) : null}

                {d.previousRejection ? (
                  <p className="rounded-md bg-white px-2.5 py-1.5 text-[11px] text-gray-500 border border-gray-100">
                    Earlier file was rejected
                    {d.previousRejection.remark
                      ? `: ${d.previousRejection.remark}`
                      : '.'}{' '}
                    This is the new upload.
                  </p>
                ) : null}

                {waitingForReupload ? (
                  <p className="rounded-md border border-amber-100 bg-amber-50/80 px-2.5 py-1.5 text-[11px] text-amber-800">
                    Waiting for the user to reupload. Approve and Reject unlock after a new file is submitted.
                  </p>
                ) : null}

                {needsReview ? (
                  <div className="space-y-2 pt-0.5">
                    <Input
                      placeholder="Reason for rejection (required)"
                      value={remarkById[d.id] || ''}
                      onChange={(e) =>
                        setRemarkById((prev) => ({ ...prev, [d.id]: e.target.value }))
                      }
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => approve(d.id)}
                      >
                        {busy ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : null}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-700 hover:bg-red-50"
                        disabled={busy}
                        onClick={() => reject(d.id)}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
