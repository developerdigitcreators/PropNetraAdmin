'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/store/use-auth-store';
import { formatDisplayDateTime } from '@/lib/format-date';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  legalApiError,
  legalPagesService,
  type LegalPage,
  type LegalSlug,
} from '@/services/legal-pages.service';
import { Loader2 } from 'lucide-react';

const LABELS: Record<LegalSlug, string> = {
  terms: 'Terms & Conditions',
  privacy: 'Privacy Policy',
};

function isSlug(value: string): value is LegalSlug {
  return value === 'terms' || value === 'privacy';
}

export default function LegalPageEditor() {
  const params = useParams<{ slug: string }>();
  const slugParam = String(params.slug || '');
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canUpdate = hasPermission('legal_pages', 'update');
  const [page, setPage] = useState<LegalPage | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!isSlug(slugParam)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const next = await legalPagesService.get(slugParam);
      setPage(next);
      setTitle(next.title);
      setBody(next.body);
      setIsPublished(next.isPublished);
    } catch (err) {
      setError(legalApiError(err, 'Failed to load this page.'));
    } finally {
      setLoading(false);
    }
  }, [slugParam]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!isSlug(slugParam) || !canUpdate || saving) return;
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const next = await legalPagesService.update(slugParam, {
        title: title.trim(),
        body,
        isPublished,
      });
      setPage(next);
      setTitle(next.title);
      setBody(next.body);
      setIsPublished(next.isPublished);
      setNotice('Saved.');
    } catch (err) {
      setError(legalApiError(err, 'Failed to save this page.'));
    } finally {
      setSaving(false);
    }
  };

  if (!isSlug(slugParam)) {
    return (
      <div className="p-12 text-center text-gray-500">
        Unknown legal page.{' '}
        <Link href="/legal" className="text-primary underline">
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <PermissionGuard
      permission="legal_pages:read"
      fallback={
        <div className="p-12 text-center text-gray-500">
          You do not have permission to view legal pages.
        </div>
      }
    >
      <div className="max-w-3xl space-y-6 pb-16">
        <Breadcrumb
          items={[{ label: 'Terms & Privacy', href: '/legal' }, { label: LABELS[slugParam] }]}
        />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{LABELS[slugParam]}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Updated {formatDisplayDateTime(page?.updatedAt)}. Unpublished pages return 404 in the
            app.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-10 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : (
          <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
            {error ? (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
            ) : null}
            {notice ? (
              <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{notice}</div>
            ) : null}
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-gray-900">Title</span>
              <Input value={title} disabled={!canUpdate} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-gray-900">HTML body</span>
              <textarea
                value={body}
                disabled={!canUpdate}
                onChange={(e) => setBody(e.target.value)}
                rows={16}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-sm text-gray-900 outline-none focus:border-primary disabled:bg-gray-50"
              />
            </label>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Published</p>
                <p className="text-xs text-gray-500">Off means the app shows 404 for this page.</p>
              </div>
              <Switch
                checked={isPublished}
                disabled={!canUpdate}
                onCheckedChange={(checked) => setIsPublished(Boolean(checked))}
              />
            </div>
            {canUpdate ? (
              <Button onClick={() => void save()} disabled={saving}>
                {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
