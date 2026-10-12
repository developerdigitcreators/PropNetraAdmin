'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  listingFakeStatsService,
  type FakeStatsRole,
  type FakeStatsSchedule,
  type FakeStatsScheduleInput,
} from '@/services/listing-fake-stats.service';
import {
  ConfirmDialog,
  EMPTY_SCHEDULE,
  ScheduleForm,
  ScheduleStatusBadge,
  formatScheduleDate,
} from '@/modules/listing-fake-stats/schedule-parts';
import { Loader2, Pencil } from 'lucide-react';

export type RoleDraft = { viewsMinPerDay: string; viewsMaxPerDay: string; maxViews: string };

const ROLE_FIELDS: Array<[keyof RoleDraft, string]> = [
  ['viewsMinPerDay', 'Views min per day'],
  ['viewsMaxPerDay', 'Views max per day'],
  ['maxViews', 'Max fake views per listing'],
];

function hasInput(v: FakeStatsScheduleInput) {
  return Boolean(v.date || v.startTime || v.endTime);
}

export function ScheduleSection({
  cityId,
  role,
  label,
  scriptEnabled,
  counts,
  items,
  canUpdate,
  draft,
  onDraftChange,
  onSaveSettings,
  savingSettings,
  settingsError,
  adding,
  onCloseAdd,
  onChanged,
  onDirtyChange,
  onToast,
}: {
  cityId: string;
  role: FakeStatsRole;
  label: string;
  scriptEnabled: boolean;
  counts: Record<string, number>;
  items: FakeStatsSchedule[];
  canUpdate: boolean;
  draft: RoleDraft;
  onDraftChange: (draft: RoleDraft) => void;
  onSaveSettings: () => void;
  savingSettings: boolean;
  settingsError: string;
  adding: boolean;
  onCloseAdd: () => void;
  onChanged: () => void;
  onDirtyChange: (role: FakeStatsRole, dirty: boolean) => void;
  onToast: (message: string) => void;
}) {
  const [newRowFilled, setNewRowFilled] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cancelRow, setCancelRow] = useState<FakeStatsSchedule | null>(null);

  const dirty = (adding && newRowFilled) || editingId !== null;
  useEffect(() => {
    onDirtyChange(role, dirty);
  }, [role, dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(role, false), [role, onDirtyChange]);

  const pending = counts.pending ?? items.filter((r) => r.status === 'pending').length;
  const running = counts.running ?? items.filter((r) => r.status === 'running').length;
  const issue = counts.issue ?? items.filter((r) => r.status === 'issue').length;

  const closeAdd = () => {
    setNewRowFilled(false);
    onCloseAdd();
  };

  const create = async (value: FakeStatsScheduleInput) => {
    await listingFakeStatsService.createSchedule(cityId, { role, ...value });
    closeAdd();
    onToast('Schedule added.');
    onChanged();
  };

  const update = async (row: FakeStatsSchedule, value: FakeStatsScheduleInput) => {
    await listingFakeStatsService.updateSchedule(row.id, value);
    setEditingId(null);
    onToast('Schedule updated.');
    onChanged();
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-gray-900">{label} views</h3>
        <span
          className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
            scriptEnabled ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}
        >
          Script {scriptEnabled ? 'ON' : 'OFF'}
        </span>
        <span className="text-xs text-gray-500">
          Pending {pending} · Running {running}
          {issue ? ` · Issue ${issue}` : ''}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto] sm:items-end">
        {ROLE_FIELDS.map(([key, fieldLabel]) => (
          <div key={key} className="space-y-1">
            <p className="text-xs text-gray-500">{fieldLabel}</p>
            <Input
              type="number"
              min={0}
              value={draft[key]}
              disabled={!canUpdate}
              onChange={(e) => onDraftChange({ ...draft, [key]: e.target.value })}
              className="h-9 bg-white"
            />
          </div>
        ))}
        {canUpdate ? (
          <Button className="h-9" onClick={onSaveSettings} disabled={savingSettings}>
            {savingSettings ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Save settings
          </Button>
        ) : null}
      </div>
      {settingsError ? <p className="mt-1.5 text-xs text-red-600">{settingsError}</p> : null}

      <div className="mt-4 overflow-x-auto rounded-lg border border-gray-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/80 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Time range</th>
              <th className="px-4 py-2 font-medium">Added by</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {adding ? (
              <tr className="border-b border-gray-50 bg-primary-light/20">
                <td colSpan={5} className="px-4 py-2.5">
                  <ScheduleForm
                    initial={EMPTY_SCHEDULE}
                    onChange={(v) => setNewRowFilled(hasInput(v))}
                    onSubmit={create}
                    onCancel={closeAdd}
                  />
                </td>
              </tr>
            ) : null}
            {items.map((row) =>
              editingId === row.id ? (
                <tr key={row.id} className="border-b border-gray-50 bg-primary-light/20">
                  <td colSpan={5} className="px-4 py-2.5">
                    <ScheduleForm
                      initial={{ date: row.date, startTime: row.startTime, endTime: row.endTime }}
                      onSubmit={(v) => update(row, v)}
                      onCancel={() => setEditingId(null)}
                    />
                  </td>
                </tr>
              ) : (
                <tr key={row.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-2.5 text-gray-900">{formatScheduleDate(row.date)}</td>
                  <td className="px-4 py-2.5 text-gray-700">{row.timeRange || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-700">{row.addedBy?.name || '—'}</td>
                  <td className="px-4 py-2.5">
                    <ScheduleStatusBadge row={row} />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      {canUpdate && row.canEdit && row.status === 'pending' ? (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          title="Edit"
                          aria-label="Edit schedule"
                          onClick={() => setEditingId(row.id)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                      {canUpdate && row.canCancel ? (
                        <Button size="sm" variant="outline" onClick={() => setCancelRow(row)}>
                          Cancel
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ),
            )}
            {!adding && !items.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                  No upcoming runs. Use + Add to schedule one.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={cancelRow !== null}
        title="Cancel this run?"
        description={
          cancelRow
            ? `${label} · ${formatScheduleDate(cancelRow.date)} · ${cancelRow.timeRange}. It moves to History as Cancelled.`
            : ''
        }
        confirmLabel="Cancel run"
        onConfirm={async () => {
          if (!cancelRow) return;
          await listingFakeStatsService.cancelSchedule(cancelRow.id);
          onToast('Run cancelled.');
          onChanged();
        }}
        onClose={() => setCancelRow(null)}
      />
    </div>
  );
}
