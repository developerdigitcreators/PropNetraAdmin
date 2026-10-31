'use client';

import { ReactNode } from 'react';
import { Sidebar } from '@/components/common/sidebar';
import { Navbar } from '@/components/common/navbar';
import { AdminPageBack } from '@/components/common/admin-page-back';
import { AuthSessionGuard } from '@/components/common/auth-session-guard';
import { useHideContactsOnRouteChange } from '@/components/contact/contact-reveal-store';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  useHideContactsOnRouteChange();
  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-gray-50">
      <AuthSessionGuard />
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Navbar />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden p-6">
          <AdminPageBack />
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </main>
      </div>
    </div>
  );
}
