'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { AdminListToolbar } from '@/components/common/admin-list-toolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  emptySupportContact,
  supportContactApiError,
  supportContactService,
  type SupportContact,
} from '@/services/support-contact.service';
import { Loader2 } from 'lucide-react';

const FIELDS: Array<{ key: keyof SupportContact; label: string; type?: string }> = [
  { key: 'companyName', label: 'Company name' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'address', label: 'Address' },
  { key: 'latitude', label: 'Latitude' },
  { key: 'longitude', label: 'Longitude' },
  { key: 'mapLink', label: 'Map link' },
];

export default function SupportContactPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canUpdate = hasPermission('support_contact', 'update');
  const [form, setForm] = useState<SupportContact>(emptySupportContact);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setForm(await supportContactService.get());
    } catch (err) {
      setError(supportContactApiError(err, 'Failed to load contact details.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!canUpdate || saving) return;
    const lat = form.latitude.trim();
    const lng = form.longitude.trim();
    if (lat && !Number.isFinite(Number(lat))) {
      setError('Latitude must be a number.');
      return;
    }
    if (lng && !Number.isFinite(Number(lng))) {
      setError('Longitude must be a number.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      setForm(await supportContactService.update(form));
      setNotice('Saved.');
    } catch (err) {
      setError(supportContactApiError(err, 'Failed to save contact details.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PermissionGuard
      permission="support_contact:read"
      fallback={
        <div className="p-12 text-center text-gray-500">
          You do not have permission to view contact details.
        </div>
      }
    >
      <div className="max-w-3xl space-y-6 pb-16">
        <Breadcrumb items={[{ label: 'Contact Us' }]} />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Contact Us</h1>
            <p className="mt-1 text-gray-500">Company contact shown in the app.</p>
          </div>
          <AdminListToolbar onRefresh={() => void load()} refreshDisabled={loading} />
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
            {FIELDS.map((field) => (
              <label key={field.key} className="block space-y-1.5">
                <span className="text-sm font-medium text-gray-900">{field.label}</span>
                {field.key === 'address' ? (
                  <textarea
                    value={form.address}
                    disabled={!canUpdate}
                    rows={3}
                    onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary disabled:bg-gray-50"
                  />
                ) : (
                  <Input
                    type={field.type || 'text'}
                    value={form[field.key]}
                    disabled={!canUpdate}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  />
                )}
              </label>
            ))}
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
