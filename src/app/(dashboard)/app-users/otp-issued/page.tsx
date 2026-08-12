'use client';

import { AppUsersTable } from '@/modules/app-users/app-users-table';

export default function OtpIssuedPage() {
  return (
    <div className="space-y-4">
      <AppUsersTable tab="otp_issued" />
    </div>
  );
}
