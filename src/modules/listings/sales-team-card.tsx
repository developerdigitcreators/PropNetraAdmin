"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/common/multi-select";
import type { ShowToast } from "@/components/common/floating-toast";
import {
  listingCreateApiError,
  listingsService,
  type StaffAssignee,
} from "@/services/listings.service";

export const SALES_TEAM_SECTION_ID = "sales-team";

function staffLabel(s: StaffAssignee) {
  return [s.name || s.email || s.id, s.contact].filter(Boolean).join(" — ");
}

/** Super-admin only: choose which admin-panel users can be connected to internal posts. */
export function SalesTeamCard({
  onSaved,
  onToast,
}: {
  onSaved: (members: StaffAssignee[]) => void;
  onToast: ShowToast;
}) {
  const [options, setOptions] = useState<StaffAssignee[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      listingsService.getStaffAssignees({ excludeSuperAdmin: true }),
      listingsService.getSalesTeam(),
    ])
      .then(([staff, members]) => {
        if (cancelled) return;
        setOptions(staff);
        const ids = members.map((m) => m.id);
        setSavedIds(ids);
        setSelected(ids);
      })
      .catch((err) => {
        if (!cancelled)
          onToast(listingCreateApiError(err, "Failed to load sales team."), "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [onToast]);

  const dirty = useMemo(() => {
    if (selected.length !== savedIds.length) return true;
    const saved = new Set(savedIds);
    return selected.some((id) => !saved.has(id));
  }, [selected, savedIds]);

  const save = async () => {
    setSaving(true);
    try {
      const members = await listingsService.updateSalesTeam(selected);
      const ids = members.map((m) => m.id);
      setSavedIds(ids);
      setSelected(ids);
      onSaved(members);
      onToast(
        members.length
          ? `Sales team saved (${members.length} member${members.length === 1 ? "" : "s"}).`
          : "Sales team cleared.",
      );
    } catch (err) {
      onToast(listingCreateApiError(err, "Failed to save sales team."), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      id={SALES_TEAM_SECTION_ID}
      className="scroll-mt-24 space-y-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <Users className="mt-0.5 size-5 text-primary" />
        <div>
          <h2 className="text-base font-semibold text-gray-900">Sales team</h2>
          <p className="text-xs text-gray-500">
            Only these admin-panel users can be picked as &quot;Connect admin
            panel user&quot; on internal posts. Super admins are not listed.
          </p>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="size-4 animate-spin" /> Loading sales team…
        </div>
      ) : (
        <>
          <MultiSelect
            options={options.map((s) => ({ value: s.id, label: staffLabel(s) }))}
            values={selected}
            onChange={setSelected}
            placeholder="Select sales team members"
            searchable
            searchPlaceholder="Search by name or contact"
            emptyText="No admin-panel users with a contact number."
            disabled={saving}
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-gray-500">
              {selected.length} selected
            </p>
            <div className="flex gap-2">
              {dirty ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => setSelected(savedIds)}
                >
                  Discard
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                disabled={!dirty || saving}
                onClick={() => void save()}
              >
                {saving ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
                Save sales team
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
