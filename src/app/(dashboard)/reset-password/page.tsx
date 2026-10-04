'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useIsSuperAdmin } from '@/hooks/use-is-super-admin';
import { AdminPasswordResetPanel } from '@/modules/rbac/admin-password-reset-panel';

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

function ResetPasswordPageInner() {
  const searchParams = useSearchParams();
  const userId = String(searchParams.get('userId') || '').trim();
  const { superAdmin, ready } = useIsSuperAdmin();

  if (!ready) return <Spinner />;
  if (!superAdmin) {
    return (
      <div className="flex flex-col items-center gap-3 p-12 text-center">
        <ShieldAlert className="h-10 w-10 text-gray-300" />
        <p className="text-lg font-semibold text-gray-900">Access denied</p>
        <Link href="/" className="text-sm font-medium text-primary hover:underline">
          Go to dashboard
        </Link>
      </div>
    );
  }
  return <AdminPasswordResetPanel initialUserId={userId || undefined} />;
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ResetPasswordPageInner />
    </Suspense>
  );
}
