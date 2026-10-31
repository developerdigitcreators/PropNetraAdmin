"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { PermissionGuard } from "@/components/common/permission-guard";
import { Breadcrumb } from "@/components/common/breadcrumb";
import { SearchableSelect } from "@/components/common/searchable-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  USER_PROFILE_READ_PERMISSIONS,
  canReadUserAnalyticsFeatures,
} from "@/modules/app-users/app-users-access";
import { useUrlFilters } from "@/hooks/use-url-filters";
import {
  developerPickerLabel,
  usePaginatedDeveloperSearch,
} from "@/hooks/use-paginated-developer-search";
import { DeveloperTeamPanel } from "@/modules/developer-team/developer-team-panel";
import { DeveloperComingSoonEditor } from "@/modules/developer-user/developer-coming-soon-editor";
import { DeveloperUserListingEditPage } from "@/modules/developer-user/developer-user-listing-edit-page";
import { MasterProfileBodyForHub } from "@/modules/user-analytics/master-profile-view";
import { UserListingsTab } from "@/modules/user-analytics/user-listings-tab";
import { adminUsersService } from "@/services/admin-users.service";
import type { HomeDeveloperPreview } from "@/services/developer-home.service";
import { useAuthStore } from "@/store/use-auth-store";
import { Loader2 } from "lucide-react";

const HUB_READ_PERMISSIONS = [
  "developer_user:read",
  "developer_team:read",
  "developer_home_sections:read",
  ...USER_PROFILE_READ_PERMISSIONS,
] as const;

type HubTab = "profile" | "listings" | "team" | "coming_soon";

export function DeveloperUserPanel() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <DeveloperUserContent />
    </Suspense>
  );
}

function DeveloperUserContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const paramsKey = searchParams.toString();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const permissions = useAuthStore((s) => s.permissions);

  const [developerId, setDeveloperIdState] = useState(
    () => searchParams.get("developerId") || "",
  );
  const [editListingId, setEditListingIdState] = useState(
    () => searchParams.get("editListingId") || "",
  );
  const [listingsRefreshKey, setListingsRefreshKey] = useState(0);
  const { filters, setFilters } = useUrlFilters<{ tab: HubTab }>({
    tab: "profile",
  });
  const tab = filters.tab;

  /** Keep in sync when URL changes (reload, back/forward, external link). */
  useEffect(() => {
    const nextDev = searchParams.get("developerId") || "";
    const nextEdit = searchParams.get("editListingId") || "";
    setDeveloperIdState((prev) => (prev === nextDev ? prev : nextDev));
    setEditListingIdState((prev) => (prev === nextEdit ? prev : nextEdit));
  }, [paramsKey, searchParams]);

  const replaceHubQuery = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      mutate(params);
      const qs = params.toString();
      window.history.replaceState(
        window.history.state,
        "",
        qs ? `${pathname}?${qs}` : pathname,
      );
    },
    [pathname],
  );

  const useSectionSearch = !permissions.has("developer_team:read");
  const devSearch = usePaginatedDeveloperSearch({ useSectionSearch });

  const [developer, setDeveloper] = useState<HomeDeveloperPreview | null>(null);
  const [pickerLabel, setPickerLabel] = useState("");

  const canProfile = USER_PROFILE_READ_PERMISSIONS.some((p) =>
    permissions.has(p),
  );
  const canListings = canReadUserAnalyticsFeatures(hasPermission);
  const canTeam = permissions.has("developer_team:read");
  const canComingSoon = permissions.has("developer_home_sections:read");

  const visibleTabs = useMemo(() => {
    const tabs: Array<{ id: HubTab; label: string }> = [];
    if (canProfile) tabs.push({ id: "profile", label: "Profile" });
    if (canListings) tabs.push({ id: "listings", label: "Listings" });
    if (canTeam) tabs.push({ id: "team", label: "Team members" });
    if (canComingSoon) tabs.push({ id: "coming_soon", label: "Coming Soon" });
    return tabs;
  }, [canProfile, canListings, canTeam, canComingSoon]);

  const setDeveloperId = useCallback(
    (id: string, label?: string) => {
      setDeveloperIdState(id);
      setEditListingIdState("");
      replaceHubQuery((params) => {
        if (id) params.set("developerId", id);
        else params.delete("developerId");
        params.delete("editListingId");
      });
      if (label) setPickerLabel(label);
      if (!id) {
        setDeveloper(null);
        setPickerLabel("");
      }
    },
    [replaceHubQuery],
  );

  const setEditListingId = useCallback(
    (listingId: string | null) => {
      setEditListingIdState(listingId || "");
      replaceHubQuery((params) => {
        if (listingId) {
          params.set("editListingId", listingId);
          params.set("tab", "listings");
        } else {
          params.delete("editListingId");
          params.set("tab", "listings");
        }
      });
      setFilters({ tab: "listings" });
    },
    [replaceHubQuery, setFilters],
  );

  useEffect(() => {
    devSearch.onSearch("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useSectionSearch]);

  useEffect(() => {
    if (!developerId) {
      setDeveloper(null);
      setPickerLabel("");
      return;
    }
    const cached = devSearch.getDeveloper(developerId);
    if (cached) {
      setDeveloper(cached);
      setPickerLabel(developerPickerLabel(cached));
      return;
    }
    if (!canProfile) {
      setDeveloper({
        id: developerId,
        name: pickerLabel || developerId,
        logoUrl: null,
      });
      return;
    }
    let cancelled = false;
    adminUsersService
      .getMasterProfile(developerId)
      .then((profile) => {
        if (cancelled) return;
        const label =
          [profile.user.companyName, profile.user.name]
            .filter(Boolean)
            .join(" · ") ||
          profile.user.name ||
          developerId;
        setPickerLabel(label);
        setDeveloper({
          id: developerId,
          name: profile.user.name || null,
          companyName: profile.user.companyName || null,
          logoUrl: profile.company?.logo || null,
        });
        devSearch.seedCache([
          {
            id: developerId,
            name: profile.user.name || null,
            companyName: profile.user.companyName || null,
            logoUrl: profile.company?.logo || null,
          },
        ]);
      })
      .catch(() => {
        if (!cancelled) {
          setDeveloper({
            id: developerId,
            name: pickerLabel || null,
            logoUrl: null,
          });
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [developerId, canProfile]);

  useEffect(() => {
    if (!visibleTabs.length) return;
    if (!visibleTabs.some((t) => t.id === tab)) {
      setFilters({ tab: visibleTabs[0].id });
    }
  }, [tab, visibleTabs, setFilters]);

  const [editListingTitle, setEditListingTitle] = useState("");

  const breadcrumbItems = useMemo(() => {
    const items: Array<{ label: string; href?: string; onClick?: () => void }> = [
      { label: "Developer User" },
    ];
    if (developerId) {
      items.push({
        label: "Listings",
        onClick: editListingId ? () => setEditListingId(null) : undefined,
      });
    }
    if (developerId && editListingId) {
      items.push({
        label:
          editListingId === "new"
            ? "Add listing"
            : editListingTitle || "Edit listing",
      });
    }
    return items;
  }, [developerId, editListingId, editListingTitle, setEditListingId]);

  const onProfileUpdated = useCallback(
    (profile: Awaited<ReturnType<typeof adminUsersService.getMasterProfile>>) => {
      if (!developerId || profile.user.id !== developerId) return;
      const label =
        [profile.user.companyName, profile.user.name].filter(Boolean).join(" · ") ||
        profile.user.name ||
        developerId;
      setPickerLabel(label);
      setDeveloper({
        id: developerId,
        name: profile.user.name || null,
        companyName: profile.user.companyName || null,
        logoUrl: profile.company?.logo || null,
      });
      devSearch.seedCache([
        {
          id: developerId,
          name: profile.user.name || null,
          companyName: profile.user.companyName || null,
          logoUrl: profile.company?.logo || null,
        },
      ]);
    },
    [developerId, devSearch],
  );

  const activeTab = visibleTabs.some((t) => t.id === tab)
    ? tab
    : visibleTabs[0]?.id;

  return (
    <PermissionGuard
      permission={[...HUB_READ_PERMISSIONS]}
      fallback={
        <div className="p-12 text-center text-gray-500">
          You do not have permission to view this page.
        </div>
      }
    >
      <div className="space-y-4 pb-24">
        <Breadcrumb items={breadcrumbItems} />
        {!developerId ? (
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Developer User
            </h1>
            <p className="text-gray-500 mt-1">
              Select a developer, then manage profile, listings, team, and
              Coming Soon visibility in one place.
            </p>
          </div>
        ) : (
          <h1 className="text-xl font-bold tracking-tight text-gray-900">
            Developer User
          </h1>
        )}

        {developerId && editListingId ? (
          <DeveloperUserListingEditPage
            userId={developerId}
            listingId={editListingId}
            onBack={() => setEditListingId(null)}
            onBreadcrumbTitle={setEditListingTitle}
            onSaved={() => {
              setEditListingId(null);
              setListingsRefreshKey((k) => k + 1);
            }}
          />
        ) : developerId && visibleTabs.length > 0 ? (
          <Tabs
            key={developerId}
            value={activeTab}
            onValueChange={(v) => setFilters({ tab: v as HubTab })}
            className="gap-0"
          >
            <div className="sticky top-[-23px] z-20 -mx-1 space-y-3 border-b border-gray-200/80 bg-gray-50/95 px-1 pb-3 pt-0 backdrop-blur-sm">
              <div className="rounded-xl border bg-white p-4 space-y-1.5 max-w-xl">
                <label className="text-sm font-medium text-gray-700">
                  Developer
                </label>
                <SearchableSelect
                  options={devSearch.selectOptions}
                  value={developerId}
                  selectedLabel={
                    developer ? developerPickerLabel(developer) : pickerLabel
                  }
                  onValueChange={(v) => {
                    const found = devSearch.getDeveloper(v);
                    const next = found || { id: v, name: null, logoUrl: null };
                    setDeveloper(next);
                    setDeveloperId(v, found ? developerPickerLabel(found) : "");
                  }}
                  onSearch={devSearch.onSearch}
                  hasMore={devSearch.hasMore}
                  onLoadMore={devSearch.onLoadMore}
                  loadingMore={devSearch.loadingMore}
                  searchDebounceMs={250}
                  loading={devSearch.loading}
                  placeholder="Select a developer"
                  searchPlaceholder="Search by company, name or phone"
                  emptyText="No developers found."
                />
              </div>
              <TabsList className="bg-white">
                {visibleTabs.map((t) => (
                  <TabsTrigger key={t.id} value={t.id}>
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {canProfile && (
              <TabsContent value="profile" className="mt-4">
                <MasterProfileBodyForHub
                  key={developerId}
                  userId={developerId}
                  active={activeTab === "profile"}
                  onProfileUpdated={onProfileUpdated}
                />
              </TabsContent>
            )}
            {canListings && (
              <TabsContent value="listings" className="mt-4">
                <UserListingsTab
                  key={developerId}
                  userId={developerId}
                  appRole="developer"
                  enableDeveloperListingEdit
                  refreshKey={listingsRefreshKey}
                  onEditListing={(id) => setEditListingId(id)}
                />
              </TabsContent>
            )}
            {canTeam && (
              <TabsContent value="team" className="mt-4">
                <DeveloperTeamPanel
                  key={developerId}
                  developer={
                    developer || {
                      id: developerId,
                      name: pickerLabel || null,
                      logoUrl: null,
                    }
                  }
                />
              </TabsContent>
            )}
            {canComingSoon && (
              <TabsContent value="coming_soon" className="mt-4">
                <DeveloperComingSoonEditor
                  key={developerId}
                  developerId={developerId}
                />
              </TabsContent>
            )}
          </Tabs>
        ) : (
          <div className="rounded-xl border bg-white p-4 space-y-1.5 max-w-xl">
            <label className="text-sm font-medium text-gray-700">
              Developer
            </label>
            <SearchableSelect
              options={devSearch.selectOptions}
              value={developerId}
              selectedLabel={
                developer ? developerPickerLabel(developer) : pickerLabel
              }
              onValueChange={(v) => {
                const found = devSearch.getDeveloper(v);
                const next = found || { id: v, name: null, logoUrl: null };
                setDeveloper(next);
                setDeveloperId(v, found ? developerPickerLabel(found) : "");
              }}
              onSearch={devSearch.onSearch}
              hasMore={devSearch.hasMore}
              onLoadMore={devSearch.onLoadMore}
              loadingMore={devSearch.loadingMore}
              searchDebounceMs={250}
              loading={devSearch.loading}
              placeholder="Select a developer"
              searchPlaceholder="Search by company, name or phone"
              emptyText="No developers found."
            />
          </div>
        )}

        {developerId && visibleTabs.length === 0 && (
          <p className="text-sm text-gray-500">
            You do not have permission to view any tabs for this developer.
          </p>
        )}

        {!developerId && (
          <p className="text-sm text-gray-500 text-center py-8 border border-dashed rounded-xl">
            Search and select a developer to get started.
          </p>
        )}
      </div>
    </PermissionGuard>
  );
}
