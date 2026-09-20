'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { AppUsersTable } from '@/modules/app-users/app-users-table';

export default function OtpVerifiedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <AppUsersTable tab="otp_verified" />
      </div>
    </Suspense>
  );
}
