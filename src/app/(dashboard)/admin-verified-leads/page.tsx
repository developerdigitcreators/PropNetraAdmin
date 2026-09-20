'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { AdminVerifiedLeadsPanel } from '@/modules/listings/admin-verified-leads-panel';

export default function AdminVerifiedLeadsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <AdminVerifiedLeadsPanel />
    </Suspense>
  );
}
