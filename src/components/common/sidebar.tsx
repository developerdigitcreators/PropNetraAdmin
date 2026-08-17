"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Shield,
  MapPin,
  Settings,
  Building2,
  Image as ImageIcon,
  Bell,
  ChevronDown,
  Clapperboard,
} from "lucide-react";
import { PermissionGuard } from "@/components/common/permission-guard";
import { useAuthStore } from "@/store/use-auth-store";
import {
  APP_USERS_ANY_READ,
  APP_USER_TAB_ACCESS,
  defaultAppUsersPath,
  readPermissionsForTab,
} from "@/modules/app-users/app-users-access";

type MenuChild = { name: string; path: string; permission?: string | string[] };
type MenuItem = {
  name: string;
  path: string;
  icon: typeof LayoutDashboard;
  permission: string | string[];
  children?: MenuChild[];
  defaultChildPath?: string;
};

const MENU_ITEMS: MenuItem[] = [
  {
    name: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
    permission: "dashboard:read",
  },
  {
    name: "Agent Listing Attributes",
    path: "/listings/attributes",
    icon: MapPin,
    permission: "listing_categories:read",
  },
  {
    name: "Form Modules",
    path: "/listings/form-modules",
    icon: Settings,
    permission: "form_modules:read",
  },
  {
    name: "Listings Config",
    path: "/listings/config",
    icon: Settings,
    permission: "listings:read",
  },
  {
    name: "Review Listing",
    path: "/moderation",
    icon: MapPin,
    permission: "locations:read",
  },
  {
    name: "Location Management",
    path: "/locations",
    icon: Building2,
    permission: "locations:read",
  },
  {
    name: "Add Project Names",
    path: "/property-names",
    icon: Building2,
    permission: "property_names:read",
  },
  {
    name: "Banner Ads",
    path: "/banner-ads",
    icon: ImageIcon,
    permission: "ads:read",
  },
  {
    name: "NetraReels",
    path: "/netra-reels",
    icon: Clapperboard,
    permission: "netra_reels:read",
  },
  {
    name: "Notifications",
    path: "/notifications",
    icon: Bell,
    permission: "notifications:read",
  },
  {
    name: "RBAC Roles",
    path: "/rbac/roles",
    icon: Shield,
    permission: "rbac:read",
  },
  {
    name: "Staff Users",
    path: "/rbac/users",
    icon: Users,
    permission: "users:read",
  },
  {
    name: "App Users",
    path: "/app-users",
    icon: Users,
    permission: APP_USERS_ANY_READ,
    defaultChildPath: "/app-users/otp-issued",
    children: APP_USER_TAB_ACCESS.map((tab) => ({
      name: tab.name,
      path: tab.path,
      permission: readPermissionsForTab(tab.module),
    })),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "/app-users": pathname.startsWith("/app-users") || pathname.startsWith("/rbac/app-users"),
  });

  const appUsersDefaultPath = defaultAppUsersPath(hasPermission);

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <span className="text-xl font-bold text-primary">PropNetra Admin</span>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const hasChildren = !!item.children?.length;
          const childActive = item.children?.some(
            (c) => pathname === c.path || pathname.startsWith(`${c.path}/`),
          );
          const isActive =
            pathname === item.path ||
            pathname.startsWith(`${item.path}/`) ||
            !!childActive ||
            (item.path === "/app-users" && pathname.startsWith("/rbac/app-users"));
          const expanded = openGroups[item.path] ?? isActive;

          return (
            <PermissionGuard key={item.path} permission={item.permission}>
              <div>
                {hasChildren ? (
                  <>
                    <div className="flex items-center gap-0.5">
                      <Link
                        href={
                          item.path === "/app-users"
                            ? appUsersDefaultPath
                            : item.defaultChildPath || item.path
                        }
                        className={`flex-1 flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-primary-light text-primary"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <Icon
                          className={`w-5 h-5 mr-3 ${isActive ? "text-primary" : "text-gray-400"}`}
                        />
                        {item.name}
                      </Link>
                      <button
                        type="button"
                        aria-label={`Toggle ${item.name}`}
                        onClick={() =>
                          setOpenGroups((prev) => ({
                            ...prev,
                            [item.path]: !expanded,
                          }))
                        }
                        className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                        />
                      </button>
                    </div>
                    {expanded && (
                      <div className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-100 pl-2">
                        {item.children!.map((child) => {
                          const childIsActive =
                            pathname === child.path || pathname.startsWith(`${child.path}/`);
                          const link = (
                            <Link
                              key={child.path}
                              href={child.path}
                              className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                                childIsActive
                                  ? "bg-primary-light/70 text-primary font-medium"
                                  : "text-gray-600 hover:bg-gray-50"
                              }`}
                            >
                              {child.name}
                            </Link>
                          );
                          return child.permission ? (
                            <PermissionGuard key={child.path} permission={child.permission}>
                              {link}
                            </PermissionGuard>
                          ) : (
                            link
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.path}
                    className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary-light text-primary"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 mr-3 ${isActive ? "text-primary" : "text-gray-400"}`}
                    />
                    {item.name}
                  </Link>
                )}
              </div>
            </PermissionGuard>
          );
        })}
      </nav>
    </aside>
  );
}
