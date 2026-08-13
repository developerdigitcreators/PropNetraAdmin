'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/use-auth-store';
import { defaultAppUsersPath } from '@/modules/app-users/app-users-access';

export default function AppUsersIndexPage() {
  const router = useRouter();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  useEffect(() => {
    router.replace(defaultAppUsersPath(hasPermission));
  }, [hasPermission, router]);

  return (
    <div className="py-16 flex justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}
