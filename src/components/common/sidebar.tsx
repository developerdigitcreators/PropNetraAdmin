'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Shield, MapPin, Settings, Building2 } from 'lucide-react';
import { PermissionGuard } from '@/components/common/permission-guard';

const MENU_ITEMS = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard, permission: 'dashboard:read' },
  { name: 'Listing Attributes', path: '/listings/attributes', icon: MapPin, permission: 'listing_categories:read' },
  { name: 'Form Modules', path: '/listings/form-modules', icon: Settings, permission: 'form_modules:read' },
  { name: 'Listings Config', path: '/listings/config', icon: Settings, permission: 'listings:read' },
  { name: 'Moderation Queue', path: '/moderation', icon: MapPin, permission: 'locations:read' },
  { name: 'Location Management', path: '/locations', icon: Building2, permission: 'locations:read' },
  { name: 'RBAC Roles', path: '/rbac/roles', icon: Shield, permission: 'rbac:read' },
  { name: 'Staff Users', path: '/rbac/users', icon: Users, permission: 'users:read' },
  { name: 'App Users', path: '/rbac/app-users', icon: Users, permission: 'users:read' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <span className="text-xl font-bold text-primary">PropNetra Admin</span>
      </div>
      
      <nav className="flex-1 py-6 px-3 space-y-1">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);

          return (
            <PermissionGuard key={item.path} permission={item.permission}>
              <Link
                href={item.path}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-primary-light text-primary' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-primary' : 'text-gray-400'}`} />
                {item.name}
              </Link>
            </PermissionGuard>
          );
        })}
      </nav>
    </aside>
  );
}
