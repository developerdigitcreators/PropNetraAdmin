"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
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
  CircleHelp,
  Search,
  MessageSquare,
  Headset,
  BarChart3,
  Trash2,
  UserX,
  PlusSquare,
  CreditCard,
  Package,
  Gift,
  ClipboardList,
} from "lucide-react";
import { PermissionGuard } from "@/components/common/permission-guard";
import { useAuthStore } from "@/store/use-auth-store";
import {
  APP_USERS_ANY_READ,
  APP_USER_TAB_ACCESS,
  defaultAppUsersPath,
  readPermissionsForTab,
} from "@/modules/app-users/app-users-access";
import { dashboardService, type AdminDashboardSummary } from "@/services/dashboard.service";

type MenuChild = {
  name: string;
  path: string;
  permission?: string | string[];
  badgeKey?: keyof AdminDashboardSummary;
};
type MenuItem = {
  name: string;
  path: string;
  icon: typeof LayoutDashboard;
  permission?: string | string[];
  children?: MenuChild[];
  defaultChildPath?: string;
  badgeKey?: keyof AdminDashboardSummary;
};

const MENU_ITEMS: MenuItem[] = [
  {
    name: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
  },
  {
    name: "User Profile",
    path: "/user-analytics",
    icon: BarChart3,
    permission: "user_analytics:read",
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
    badgeKey: "reviewPending",
  },
  {
    name: "My Listings",
    path: "/my-listings",
    icon: ClipboardList,
    permission: "admin_my_listings:read",
    badgeKey: "myListingsActionable",
  },
  {
    name: "Add Post",
    path: "/add-post",
    icon: PlusSquare,
    permission: ["locations:read", "listings:create"],
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
    name: "Search Suggestions",
    path: "/search-suggestions",
    icon: Search,
    permission: "search_suggestions:read",
  },
  {
    name: "Notifications",
    path: "/notifications",
    icon: Bell,
    permission: "notifications:read",
  },
  {
    name: "FAQs",
    path: "/faqs",
    icon: CircleHelp,
    permission: "faqs:read",
  },
  {
    name: "Subscription Plans",
    path: "/subscription-plans",
    icon: CreditCard,
    permission: "subscriptions:read",
  },
  {
    name: "Subscribe now tracking",
    path: "/subscribe-now-tracking",
    icon: ClipboardList,
    permission: "subscribe_now_tracking:read",
  },
  {
    name: "Subscription Add-ons",
    path: "/subscription-addons",
    icon: Package,
    permission: "subscriptions:read",
  },
  {
    name: "Referral Benefits",
    path: "/referral-benefits",
    icon: Gift,
    permission: "subscriptions:read",
  },
  {
    name: "Referral Overview",
    path: "/referral-overview",
    icon: Gift,
    permission: "subscriptions:read",
  },
  {
    name: "Feedback",
    path: "/feedbacks",
    icon: MessageSquare,
    permission: "feedbacks:read",
    badgeKey: "feedbacks",
  },
  {
    name: "Support Tickets",
    path: "/support-tickets",
    icon: Headset,
    permission: "support_tickets:read",
    badgeKey: "supportTickets",
  },
  {
    name: "Account Deletion Requests",
    path: "/account-deletions",
    icon: UserX,
    permission: "account_deletions:read",
    badgeKey: "accountDeletions",
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
    name: "Deleted Items",
    path: "/deleted-items",
    icon: Trash2,
    permission: "recycle_bin:read",
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
      badgeKey:
        tab.path.includes("otp-issued")
          ? "otpIssued"
          : tab.path.includes("otp-verified")
            ? "otpVerified"
            : tab.path.includes("master-data")
              ? "documentsPending"
              : undefined,
    })),
  },
];

function SidebarBadge({ count }: { count: number }) {
  if (!count || count <= 0) return null;
  return (
    <span className="ml-auto rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "/app-users": pathname.startsWith("/app-users") || pathname.startsWith("/rbac/app-users"),
  });
  const [summary, setSummary] = useState<AdminDashboardSummary>({});

  useEffect(() => {
    let cancelled = false;
    void dashboardService
      .getSummary()
      .then((data) => {
        if (!cancelled) setSummary(data || {});
      })
      .catch(() => {
        if (!cancelled) setSummary({});
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const appUsersDefaultPath = defaultAppUsersPath(hasPermission);
  const badgeCount = (key?: keyof AdminDashboardSummary) =>
    key && typeof summary[key] === "number" ? Number(summary[key]) : 0;

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
            item.path === "/"
              ? pathname === "/"
              : pathname === item.path ||
                pathname.startsWith(`${item.path}/`) ||
                !!childActive ||
                (item.path === "/app-users" && pathname.startsWith("/rbac/app-users"));
          const expanded = openGroups[item.path] ?? isActive;
          const linkBody = (
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
                            className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                              childIsActive
                                ? "bg-primary-light/70 text-primary font-medium"
                                : "text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            <span className="flex-1">{child.name}</span>
                            <SidebarBadge count={badgeCount(child.badgeKey)} />
                          </Link>
                        );
                        return child.permission ? (
                          <PermissionGuard key={child.path} permission={child.permission}>
                            {link}
                          </PermissionGuard>
                        ) : (
                          <div key={child.path}>{link}</div>
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
                  <span className="flex-1">{item.name}</span>
                  <SidebarBadge count={badgeCount(item.badgeKey)} />
                </Link>
              )}
            </div>
          );

          if (!item.permission) {
            return <div key={item.path}>{linkBody}</div>;
          }

          return (
            <PermissionGuard key={item.path} permission={item.permission}>
              {linkBody}
            </PermissionGuard>
          );
        })}
      </nav>
    </aside>
  );
}
