'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { AccountDeletionsPanel } from '@/modules/account-deletions/account-deletions-panel';

export default function AccountDeletionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <AccountDeletionsPanel />
    </Suspense>
  );
}
