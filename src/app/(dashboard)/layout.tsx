'use client';

import { ReactNode } from 'react';
import { Sidebar } from '@/components/common/sidebar';
import { Navbar } from '@/components/common/navbar';
import { AdminPageBack } from '@/components/common/admin-page-back';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 p-6 overflow-y-auto">
          <AdminPageBack />
          {children}
        </main>
      </div>
    </div>
  );
}
