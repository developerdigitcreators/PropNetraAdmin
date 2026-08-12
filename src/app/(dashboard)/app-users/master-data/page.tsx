'use client';

import { AppUsersTable } from '@/modules/app-users/app-users-table';

export default function MasterDataPage() {
  return (
    <div className="space-y-4">
      <AppUsersTable tab="master" />
    </div>
  );
}
