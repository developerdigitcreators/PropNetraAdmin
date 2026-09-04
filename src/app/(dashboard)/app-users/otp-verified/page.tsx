'use client';

import { AppUsersTable } from '@/modules/app-users/app-users-table';

export default function OtpVerifiedPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AppUsersTable tab="otp_verified" />
    </div>
  );
}
