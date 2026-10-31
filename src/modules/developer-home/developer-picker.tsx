'use client';

import { useEffect } from 'react';
import { SearchableSelect } from '@/components/common/searchable-select';
import {
  developerPickerLabel,
  usePaginatedDeveloperSearch,
} from '@/hooks/use-paginated-developer-search';
import type { HomeDeveloperPreview } from '@/services/developer-home.service';

type DeveloperPickerProps = {
  cityId: string;
  value: string;
  onValueChange: (developerId: string, developer?: HomeDeveloperPreview) => void;
  excludeDeveloperIds?: string[];
  disabled?: boolean;
};

export function DeveloperPicker({
  cityId,
  value,
  onValueChange,
  excludeDeveloperIds,
  disabled,
}: DeveloperPickerProps) {
  const devSearch = usePaginatedDeveloperSearch({
    cityId,
    useSectionSearch: true,
    minProjects: 1,
    excludeIds: excludeDeveloperIds,
    showProjectCountBadge: true,
  });

  useEffect(() => {
    devSearch.onSearch('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityId]);

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700">Developer</label>
      <SearchableSelect
        options={devSearch.selectOptions}
        value={value}
        selectedLabel={
          value && devSearch.getDeveloper(value)
            ? developerPickerLabel(devSearch.getDeveloper(value)!)
            : ''
        }
        onValueChange={(id) => onValueChange(id, devSearch.getDeveloper(id))}
        onSearch={devSearch.onSearch}
        hasMore={devSearch.hasMore}
        onLoadMore={devSearch.onLoadMore}
        loadingMore={devSearch.loadingMore}
        searchDebounceMs={250}
        loading={devSearch.loading}
        disabled={disabled || !cityId}
        placeholder={cityId ? 'Select a developer' : 'Select picker city first'}
        searchPlaceholder="Search by company, name or phone"
        emptyText={cityId ? 'No developers with projects in this city.' : 'Select a city.'}
        portalMenu
        listMaxHeightClass="max-h-72"
      />
    </div>
  );
}
