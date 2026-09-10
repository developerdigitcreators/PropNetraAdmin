'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { UserAnalyticsPanel } from '@/modules/user-analytics/user-analytics-panel';
import { UserProfileMasterPanel } from '@/modules/user-analytics/user-profile-master-panel';

function UserAnalyticsPageInner() {
  const searchParams = useSearchParams();
  const userId = String(searchParams.get('userId') || '').trim();
  if (userId) return <UserAnalyticsPanel />;
  return <UserProfileMasterPanel />;
}

export default function UserAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <UserAnalyticsPageInner />
    </Suspense>
  );
}
