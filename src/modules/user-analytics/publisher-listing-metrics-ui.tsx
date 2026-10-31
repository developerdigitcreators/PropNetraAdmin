"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MaskedContact } from "@/components/contact/masked-contact";
import { PaginationBar } from "@/components/common/pagination-bar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDisplayDateTime } from "@/lib/format-date";
import { planLabelFromCode, resolvePlanChip } from "@/lib/plan-labels";
import {
  userAnalyticsApiError,
  userAnalyticsService,
  type PublisherEventRow,
  type PublisherListingRow,
  type PublisherMetricKey,
  type PublisherTrack,
  type AgentListingCategoryGroup,
} from "@/services/user-analytics.service";
import { Loader2, MessageSquare, Phone } from "lucide-react";

const CONTACT_FUNNEL_METRICS: PublisherMetricKey[] = [
  "views",
  "reveal",
  "call",
  "wa",
];

export type ListingMetricsSet = "full" | "contact_funnel";

export type ListingEventsApi = "publisher" | "agent";

const METRIC_DEFS: Array<{
  key: PublisherMetricKey;
  label: string;
  hideForDbf?: boolean;
}> = [
  { key: "views", label: "Views" },
  { key: "share", label: "Share" },
  { key: "brochure", label: "Brochure", hideForDbf: true },
  { key: "save", label: "Save" },
  { key: "reveal", label: "Reveal" },
  { key: "call", label: "Call" },
  { key: "wa", label: "WA" },
];

function fmtDateTime(value?: string | null) {
  if (!value) return "—";
  return formatDisplayDateTime(value);
}

function dash(value?: string | null) {
  const v = String(value || "").trim();
  return v || "—";
}

function ChannelLogos({ channels }: { channels: string[] }) {
  if (!channels.length) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      {channels.includes("call") ? (
        <span
          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-50 text-sky-700"
          title="Call"
        >
          <Phone className="h-3 w-3" />
        </span>
      ) : null}
      {channels.includes("whatsapp") ? (
        <span
          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"
          title="WhatsApp"
        >
          <MessageSquare className="h-3 w-3" />
        </span>
      ) : null}
    </span>
  );
}

function PlanBadge({ planCode }: { planCode?: string | null }) {
  const chip = resolvePlanChip(null, planCode);
  if (!chip && !planCode) return null;
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
        chip?.className || "bg-slate-100 text-slate-700"
      }`}
    >
      {chip?.label ||
        planLabelFromCode(planCode) ||
        String(planCode).replace(/_/g, " ")}
    </span>
  );
}

function eventColumnFlags(rows: PublisherEventRow[]) {
  const has = (pick: (r: PublisherEventRow) => string | undefined | null) =>
    rows.some((r) => String(pick(r) || "").trim());
  const hasChannels = rows.some((r) => r.channels?.length);
  return {
    plan: has((r) => r.actorPlanCodeAtEvent),
    project: has((r) => r.project),
    bhk: has((r) => r.bhk),
    city: has((r) => r.city),
    location: has((r) => r.location),
    team: has((r) => r.teamMemberName),
    source: has((r) => r.source),
    status: has((r) => r.listingStatus),
    channels: hasChannels,
  };
}

function PublisherEventsTable({ rows }: { rows: PublisherEventRow[] }) {
  const cols = useMemo(() => eventColumnFlags(rows), [rows]);

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-100">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b bg-gray-50/80 text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3 font-semibold">Name</th>
            {cols.plan ? (
              <th className="px-4 py-3 font-semibold">Plan</th>
            ) : null}
            <th className="px-4 py-3 font-semibold">Contact</th>
            {cols.project ? (
              <th className="px-4 py-3 font-semibold">Project</th>
            ) : null}
            {cols.bhk ? <th className="px-4 py-3 font-semibold">BHK</th> : null}
            {cols.team ? (
              <th className="px-4 py-3 font-semibold">Team member</th>
            ) : null}
            {cols.source ? (
              <th className="px-4 py-3 font-semibold">Source</th>
            ) : null}
            {cols.status ? (
              <th className="px-4 py-3 font-semibold">Status</th>
            ) : null}
            {cols.city ? <th className="px-4 py-3 font-semibold">City</th> : null}
            {cols.location ? (
              <th className="px-4 py-3 font-semibold">Location</th>
            ) : null}
            <th className="px-4 py-3 font-semibold">Date & time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((row) => (
            <tr key={row.id} className="align-top">
              <td className="px-4 py-3 font-medium text-gray-900">
                {dash(row.name)}
              </td>
              {cols.plan ? (
                <td className="px-4 py-3">
                  {row.actorPlanCodeAtEvent ? (
                    <PlanBadge planCode={row.actorPlanCodeAtEvent} />
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              ) : null}
              <td className="px-4 py-3 text-gray-600">
                <span className="inline-flex items-center gap-1.5">
                  {cols.channels ? (
                    <ChannelLogos channels={row.channels} />
                  ) : null}
                  <MaskedContact
                    value={row.contact}
                    revealKey={`publisher-events:${row.id}`}
                  />
                </span>
              </td>
              {cols.project ? (
                <td className="px-4 py-3 text-gray-900">{dash(row.project)}</td>
              ) : null}
              {cols.bhk ? (
                <td className="px-4 py-3 text-gray-600">{dash(row.bhk)}</td>
              ) : null}
              {cols.team ? (
                <td className="px-4 py-3 text-gray-600">
                  {dash(row.teamMemberName)}
                </td>
              ) : null}
              {cols.source ? (
                <td className="px-4 py-3 text-gray-600">{dash(row.source)}</td>
              ) : null}
              {cols.status ? (
                <td className="px-4 py-3 capitalize text-gray-600">
                  {dash(row.listingStatus)}
                </td>
              ) : null}
              {cols.city ? (
                <td className="px-4 py-3 text-gray-600">{dash(row.city)}</td>
              ) : null}
              {cols.location ? (
                <td className="px-4 py-3 text-gray-600">{dash(row.location)}</td>
              ) : null}
              <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                {fmtDateTime(row.occurredAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PublisherListingMetricChips({
  row,
  track,
  onMetric,
  metricSet = "full",
}: {
  row: PublisherListingRow;
  track: PublisherTrack;
  onMetric: (metric: PublisherMetricKey) => void;
  metricSet?: ListingMetricsSet;
}) {
  let defs = METRIC_DEFS.filter((m) => !(m.hideForDbf && track === "dbf"));
  if (metricSet === "contact_funnel") {
    defs = defs.filter((m) => CONTACT_FUNNEL_METRICS.includes(m.key));
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {defs.map((def, idx) => {
        const count =
          def.key === "brochure"
            ? row.counts.brochure ?? 0
            : row.counts[def.key as keyof typeof row.counts] ?? 0;
        return (
          <span key={def.key} className="inline-flex items-center gap-0.5">
            {idx > 0 ? (
              <span className="text-gray-300" aria-hidden>
                ·
              </span>
            ) : null}
            <button
              type="button"
              disabled={!count}
              onClick={(e) => {
                e.stopPropagation();
                if (count) onMetric(def.key);
              }}
              className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${
                count
                  ? "text-primary hover:bg-primary/10"
                  : "cursor-default text-gray-400"
              }`}
            >
              {def.label}{" "}
              <span className="tabular-nums text-gray-700">{count}</span>
            </button>
          </span>
        );
      })}
    </div>
  );
}

export function PublisherListingEventsDialog({
  userId,
  open,
  onOpenChange,
  listingId,
  metric,
  title,
  eventsApi = "publisher",
  categoryGroup,
}: {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  metric: PublisherMetricKey;
  title: string;
  eventsApi?: ListingEventsApi;
  categoryGroup?: AgentListingCategoryGroup;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [rows, setRows] = useState<PublisherEventRow[]>([]);

  useEffect(() => {
    if (open) setPage(1);
  }, [open, listingId, metric]);

  const loadEvents = useCallback(async () => {
    if (!listingId) return;
    setLoading(true);
    setError("");
    try {
      const res =
        eventsApi === "agent"
          ? await userAnalyticsService.fetchAgentListingEvents(
              userId,
              listingId,
              { metric, page, limit, categoryGroup },
            )
          : await userAnalyticsService.fetchPublisherListingEvents(
              userId,
              listingId,
              { metric, page, limit },
            );
      setRows(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      setRows([]);
      setError(userAnalyticsApiError(err, "Failed to load events."));
    } finally {
      setLoading(false);
    }
  }, [userId, listingId, metric, page, limit, eventsApi, categoryGroup]);

  useEffect(() => {
    if (!open) return;
    void loadEvents();
  }, [open, loadEvents]);

  const metricLabel =
    METRIC_DEFS.find((m) => m.key === metric)?.label || metric;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex h-[min(88vh,860px)] w-[min(56rem,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none"
      >
        <DialogHeader className="shrink-0 space-y-1 border-b border-gray-100 px-6 py-4 pr-12">
          <DialogTitle className="text-lg">
            {metricLabel} · {title || "Listing"}
          </DialogTitle>
          <DialogDescription>
            {loading
              ? "Loading events…"
              : total
                ? `${total} event${total === 1 ? "" : "s"} for this metric`
                : "Event log for this listing metric"}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : rows.length ? (
            <PublisherEventsTable rows={rows} />
          ) : (
            <p className="py-16 text-center text-sm text-gray-500">
              No events for this metric.
            </p>
          )}
        </div>

        <div className="shrink-0 border-t border-gray-100 px-6 py-3">
          <PaginationBar
            currentPage={page}
            totalItems={total}
            pageSize={limit}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setLimit(size);
              setPage(1);
            }}
          />
        </div>

        <DialogFooter className="-mx-0 -mb-0 shrink-0 border-t border-gray-100 px-6 py-4 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function publisherRowFromCounts(
  listingId: string,
  title: string,
  city: string,
  status: string,
  counts: PublisherListingRow["counts"],
): PublisherListingRow {
  return {
    listingId,
    title,
    city,
    status,
    counts,
  };
}
