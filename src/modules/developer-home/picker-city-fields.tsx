'use client';

import type { NamedRow } from '@/services/developer-home.service';

const selectCls =
  'h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60';

type PickerCityFieldsProps = {
  states: NamedRow[];
  cities: NamedRow[];
  stateId: string;
  cityId: string;
  onChange: (patch: { stateId?: string; cityId: string }) => void;
  disabled?: boolean;
};

/** Picker city inside Add wizard — independent from page display city. */
export function PickerCityFields({
  states,
  cities,
  stateId,
  cityId,
  onChange,
  disabled,
}: PickerCityFieldsProps) {
  const stateCities = cities.filter((c) => c.stateId === stateId);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-900">Filter developers &amp; projects by city</p>
      <div className="flex flex-wrap gap-3">
        <select
          className={selectCls}
          value={stateId}
          disabled={disabled}
          onChange={(e) => onChange({ stateId: e.target.value, cityId: '' })}
        >
          <option value="">Select state</option>
          {states.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          className={selectCls}
          value={cityId}
          disabled={disabled || !stateId}
          onChange={(e) => onChange({ cityId: e.target.value })}
        >
          <option value="">Select city</option>
          {stateCities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
