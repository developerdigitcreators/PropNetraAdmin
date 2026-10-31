'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { SearchableSelect } from '@/components/common/searchable-select';
import {
  developerPickerLabel,
  usePaginatedDeveloperSearch,
} from '@/hooks/use-paginated-developer-search';
import { DeveloperTeamPanel } from '@/modules/developer-team/developer-team-panel';
import type { HomeDeveloperPreview } from '@/services/developer-home.service';
import { Loader2 } from 'lucide-react';

function developerLabel(d: HomeDeveloperPreview) {
  return developerPickerLabel(d);
}

export default function DeveloperTeamPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <DeveloperTeamContent />
    </Suspense>
  );
}

function DeveloperTeamContent() {
  const [developer, setDeveloper] = useState<HomeDeveloperPreview | null>(null);
  const search = usePaginatedDeveloperSearch();

  useEffect(() => {
    search.onSearch('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const devOptions = useMemo(
    () =>
      search.selectOptions.map((o) => ({
        ...o,
        label: o.label,
      })),
    [search.selectOptions],
  );

  return (
    <PermissionGuard
      permission="developer_team:read"
      fallback={<div className="p-12 text-center text-gray-500">You do not have permission to view this page.</div>}
    >
      <div className="space-y-6 pb-24">
        <Breadcrumb items={[{ label: 'Developer Team Members' }]} />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Developer Team Members</h1>
          <p className="text-gray-500 mt-1">
            Manage a developer&apos;s sales team, the pages each member appears on, and the micro-markets they cover.
            Agents see these contacts grouped by micro-market and reveal numbers using developer-contact credits.
          </p>
        </div>

        <div className="bg-white rounded-xl border p-5 space-y-1.5 max-w-xl">
          <label className="text-sm font-medium text-gray-700">Developer</label>
          <SearchableSelect
            options={devOptions}
            value={developer?.id || ''}
            selectedLabel={developer ? developerLabel(developer) : ''}
            onValueChange={(v) => {
              const found = search.getDeveloper(v);
              setDeveloper(found || null);
            }}
            onSearch={search.onSearch}
            hasMore={search.hasMore}
            onLoadMore={search.onLoadMore}
            loadingMore={search.loadingMore}
            searchDebounceMs={250}
            loading={search.loading}
            placeholder="Select a developer"
            searchPlaceholder="Search by company, name or phone"
            emptyText="No developers found."
          />
        </div>

        {developer && <DeveloperTeamPanel developer={developer} />}
      </div>
    </PermissionGuard>
  );
}
