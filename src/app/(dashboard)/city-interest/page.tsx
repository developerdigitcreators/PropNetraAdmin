'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { PermissionGuard } from '@/components/common/permission-guard';
import { Breadcrumb } from '@/components/common/breadcrumb';
import { AdminDataTable } from '@/components/common/admin-data-table';
import { AdminListToolbar } from '@/components/common/admin-list-toolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { feedbackApiError } from '@/services/feedbacks.service';
import {
  cityInterestService,
  type CityInterestFilters,
  type CityInterestRow,
} from '@/services/city-interest.service';
import { Check, Loader2, Pencil, X } from 'lucide-react';

const ALL = 'all';

function FilterSelect({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: Array<{ id: string; name: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-gray-500">{label}</label>
      <Select value={value || ALL} onValueChange={(v) => onChange(!v || v === ALL ? '' : v)}>
        <SelectTrigger className="h-9 min-w-[200px] bg-white" disabled={disabled}>
          <SelectValue>
            {(v: string) => options.find((o) => o.id === v)?.name || 'All'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL} label="All">
            All
          </SelectItem>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id} label={o.name}>
              {o.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CityRow({
  row,
  canUpdate,
  onUpdated,
  onError,
}: {
  row: CityInterestRow;
  canUpdate: boolean;
  onUpdated: (row: CityInterestRow) => void;
  onError: (message: string) => void;
}) {
  const [addDraft, setAddDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [goalDraft, setGoalDraft] = useState<string | null>(null);
  const [goalSaving, setGoalSaving] = useState(false);

  useEffect(() => {
    if (!added) return;
    const id = window.setTimeout(() => setAdded(false), 2000);
    return () => window.clearTimeout(id);
  }, [added]);

  const addValue = Number.parseInt(addDraft, 10);
  const canAdd = Number.isFinite(addValue) && addValue > 0 && !adding;
  const goalValue = goalDraft == null ? NaN : Number.parseInt(goalDraft, 10);
  const goalValid = Number.isFinite(goalValue) && goalValue >= 1;

  const saveAdd = async () => {
    if (!canAdd) return;
    setAdding(true);
    try {
      onUpdated(await cityInterestService.update(row.cityId, { addFake: addValue }));
      setAddDraft('');
      setAdded(true);
    } catch (err) {
      onError(feedbackApiError(err, 'Failed to save.'));
    } finally {
      setAdding(false);
    }
  };

  const saveGoal = async () => {
    if (!goalValid || goalSaving) return;
    setGoalSaving(true);
    try {
      onUpdated(await cityInterestService.update(row.cityId, { goal: goalValue }));
      setGoalDraft(null);
    } catch (err) {
      onError(feedbackApiError(err, 'Failed to update goal.'));
    } finally {
      setGoalSaving(false);
    }
  };

  return (
    <tr className="border-b border-gray-50 last:border-0">
      <td className="px-5 py-4 text-gray-600">{row.stateName || '—'}</td>
      <td className="px-5 py-4 font-medium text-gray-900">{row.cityName}</td>
      <td className="px-5 py-4">
        <span
          className={`rounded-md px-2 py-0.5 text-xs font-medium ${
            row.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {row.statusLabel}
        </span>
      </td>
      <td className="px-5 py-4 text-right text-gray-900">{row.actualRequests}</td>
      <td className="px-5 py-4 text-right text-gray-600">{row.manualPush}</td>
      <td className="px-5 py-4 text-right font-bold text-gray-900">{row.total}</td>
      <td className="px-5 py-4 text-right">
        {goalDraft != null ? (
          <form
            className="flex items-center justify-end gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              void saveGoal();
            }}
          >
            <Input
              autoFocus
              type="number"
              min={1}
              value={goalDraft}
              onChange={(e) => setGoalDraft(e.target.value)}
              className="h-8 w-20 text-right"
              aria-invalid={!goalValid}
            />
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-green-600"
              disabled={!goalValid || goalSaving}
              title="Save goal"
            >
              {goalSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-gray-400"
              onClick={() => setGoalDraft(null)}
              disabled={goalSaving}
              title="Cancel"
            >
              <X className="h-4 w-4" />
            </Button>
          </form>
        ) : (
          <span className="inline-flex items-center gap-1 text-gray-700">
            {row.goal}
            {canUpdate ? (
              <button
                type="button"
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                onClick={() => setGoalDraft(String(row.goal || ''))}
                title="Edit goal"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </span>
        )}
      </td>
      <td className="min-w-[150px] px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-orange-500" style={{ width: `${row.percent}%` }} />
          </div>
          <span className="w-10 text-right text-xs text-gray-500">{row.percent}%</span>
        </div>
      </td>
      <td className="px-5 py-4">
        {canUpdate ? (
          <form
            className="flex items-center justify-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void saveAdd();
            }}
          >
            <Input
              type="number"
              min={1}
              placeholder="Number"
              value={addDraft}
              onChange={(e) => setAddDraft(e.target.value)}
              className="h-8 w-24"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!canAdd}
              className={added ? 'bg-green-600 hover:bg-green-600' : undefined}
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : added ? (
                <Check className="h-4 w-4" />
              ) : (
                'Save'
              )}
            </Button>
          </form>
        ) : null}
      </td>
    </tr>
  );
}

export default function CityInterestPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canUpdate = hasPermission('city_interest', 'update');

  const [filters, setFilters] = useState<CityInterestFilters>({ states: [], cities: [] });
  const [stateId, setStateId] = useState('');
  const [cityId, setCityId] = useState('');
  const [rows, setRows] = useState<CityInterestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    cityInterestService
      .filters()
      .then(setFilters)
      .catch((err) => setError(feedbackApiError(err, 'Failed to load state and city filters.')));
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await cityInterestService.list({ stateId, cityId });
      setRows(list.filter((r) => !r.isActive));
    } catch (err) {
      setRows([]);
      setError(feedbackApiError(err, 'Failed to load city requests.'));
    } finally {
      setLoading(false);
    }
  }, [stateId, cityId]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const stateOptions = useMemo(() => {
    const withInactive = new Set(filters.cities.filter((c) => !c.isActive).map((c) => c.stateId));
    return filters.states.filter((s) => withInactive.has(s.id));
  }, [filters]);

  const cityOptions = useMemo(
    () => filters.cities.filter((c) => !c.isActive && (!stateId || c.stateId === stateId)),
    [filters.cities, stateId],
  );

  const totalPages = Math.max(1, Math.ceil(rows.length / limit));
  const pageRows = useMemo(
    () => rows.slice((page - 1) * limit, page * limit),
    [rows, page, limit],
  );

  const replaceRow = (next: CityInterestRow) =>
    setRows((list) => list.map((r) => (r.cityId === next.cityId ? next : r)));

  return (
    <PermissionGuard
      permission="city_interest:read"
      fallback={
        <div className="p-12 text-center text-gray-500">
          You do not have permission to view city requests.
        </div>
      }
    >
      <div className="space-y-6 max-w-7xl pb-16">
        <Breadcrumb items={[{ label: 'City Requests' }]} />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">City Requests</h1>
            <p className="mt-1 text-gray-500">
              Brokers asking for listings in each city. The app shows only the total; actual requests and
              manual push are split here.
            </p>
          </div>
          <AdminListToolbar onRefresh={() => void fetchList()} refreshBusy={loading} />
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <FilterSelect
            label="Select State"
            value={stateId}
            options={stateOptions}
            onChange={(v) => {
              setStateId(v);
              setCityId('');
              setPage(1);
            }}
          />
          <FilterSelect
            label="Select City"
            value={cityId}
            options={cityOptions}
            onChange={(v) => {
              setCityId(v);
              setPage(1);
            }}
          />
        </div>

        <AdminDataTable
          page={page}
          limit={limit}
          total={rows.length}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={(n: number) => {
            setLimit(n);
            setPage(1);
          }}
          loading={loading}
          error={error || null}
          isEmpty={!rows.length}
          emptyMessage="No inactive cities found."
          syncKey={rows.length}
        >
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/80">
              <tr>
                <th className="px-5 py-3 font-semibold text-gray-700">State</th>
                <th className="px-5 py-3 font-semibold text-gray-700">City</th>
                <th className="px-5 py-3 font-semibold text-gray-700">Status</th>
                <th className="px-5 py-3 text-right font-semibold text-gray-700">Actual Request</th>
                <th className="px-5 py-3 text-right font-semibold text-gray-700">Manual Push</th>
                <th className="px-5 py-3 text-right font-semibold text-gray-700">Total</th>
                <th className="px-5 py-3 text-right font-semibold text-gray-700">Goal</th>
                <th className="px-5 py-3 font-semibold text-gray-700">Progress</th>
                <th className="px-5 py-3 text-right font-semibold text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <CityRow
                  key={row.cityId}
                  row={row}
                  canUpdate={canUpdate}
                  onUpdated={replaceRow}
                  onError={setError}
                />
              ))}
            </tbody>
          </table>
        </AdminDataTable>
      </div>
    </PermissionGuard>
  );
}
