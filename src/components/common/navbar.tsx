'use client';

import { useAuthStore } from '@/store/use-auth-store';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { LogOut, User } from 'lucide-react';

export function Navbar() {
  const user = useAuthStore((state) => state.user);
  const activeRole = useAuthStore((state) => state.activeRole);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center space-x-4">
        {activeRole && (
          <span className="bg-primary-light text-primary px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase">
            {activeRole} Workspace
          </span>
        )}
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center text-sm text-gray-700">
          <User className="w-4 h-4 mr-2 text-gray-400" />
          {user?.name || user?.email || 'Admin User'}
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-500 hover:text-red-600">
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </header>
  );
}
