'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { AppUsersTable } from '@/modules/app-users/app-users-table';

export default function OtpIssuedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <div className="space-y-4">
        <AppUsersTable tab="otp_issued" />
      </div>
    </Suspense>
  );
}
