'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { MyListingsPanel } from '@/modules/listings/my-listings-panel';

export default function MyListingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <MyListingsPanel />
    </Suspense>
  );
}
