"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/store/use-auth-store";
import { PermissionGuard } from "@/components/common/permission-guard";
import { Breadcrumb } from "@/components/common/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  subscribeNowApiError,
  subscribeNowService,
  type SubscribeNowAttempt,
  type SubscribeNowPlanTab,
} from "@/services/subscribe-now.service";
import { Loader2, MessageSquarePlus, RefreshCw } from "lucide-react";

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function badgeLabel(value?: string | null) {
  if (!value) return "—";
  return value.replace(/_/g, " ");
}

export default function SubscribeNowTrackingPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canUpdate = hasPermission("subscribe_now_tracking", "update");

  const [plans, setPlans] = useState<SubscribeNowPlanTab[]>([]);
  const [activePlan, setActivePlan] = useState("");
  const [items, setItems] = useState<SubscribeNowAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [remarkFor, setRemarkFor] = useState<SubscribeNowAttempt | null>(null);
  const [remarkText, setRemarkText] = useState("");
  const [remarkBusy, setRemarkBusy] = useState(false);
  const [remarkError, setRemarkError] = useState("");

  const loadPlans = useCallback(async () => {
    const next = await subscribeNowService.listPlans();
    setPlans(next);
    setActivePlan((current) => current || next[0]?.code || "");
  }, []);

  const loadList = useCallback(async (targetPlan: string) => {
    if (!targetPlan) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await subscribeNowService.list({
        targetPlan,
        page: 1,
        limit: 100,
      });
      setItems(result.items);
    } catch (err) {
      setError(subscribeNowApiError(err, "Failed to load attempts."));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadPlans().catch((err) => {
      if (!cancelled) {
        setError(subscribeNowApiError(err, "Failed to load plans."));
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loadPlans]);

  useEffect(() => {
    if (!activePlan) return;
    void loadList(activePlan);
  }, [activePlan, loadList]);

  const submitRemark = async () => {
    if (!remarkFor || !remarkText.trim() || remarkBusy) return;
    setRemarkBusy(true);
    setRemarkError("");
    try {
      const updated = await subscribeNowService.addRemark(
        remarkFor.id,
        remarkText.trim(),
      );
      setItems((prev) =>
        prev.map((row) => (row.id === updated.id ? updated : row)),
      );
      setRemarkFor(null);
      setRemarkText("");
    } catch (err) {
      setRemarkError(subscribeNowApiError(err, "Failed to add remark."));
    } finally {
      setRemarkBusy(false);
    }
  };

  return (
    <PermissionGuard permission="subscribe_now_tracking:read">
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Breadcrumb
              items={[
                { label: "Dashboard", href: "/" },
                { label: "Subscribe now tracking" },
              ]}
            />
            <h1 className="mt-2 text-2xl font-semibold text-gray-900">
              Subscribe now tracking
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Users who tapped Pay but have not completed payment. Rows disappear
              when the matching plan is paid.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => activePlan && loadList(activePlan)}
            disabled={loading || !activePlan}
          >
            <RefreshCw className="mr-1.5 size-3.5" />
            Refresh
          </Button>
        </div>

        {!plans.length && !loading ? (
          <p className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            No paid plans found in the catalog.
          </p>
        ) : (
          <Tabs value={activePlan} onValueChange={setActivePlan}>
            <TabsList className="flex h-auto flex-wrap gap-1 bg-gray-100 p-1">
              {plans.map((plan) => (
                <TabsTrigger
                  key={plan.code}
                  value={plan.code}
                  className="data-[state=active]:bg-primary-light data-[state=active]:text-primary"
                >
                  {plan.displayName}
                </TabsTrigger>
              ))}
            </TabsList>

            {plans.map((plan) => (
              <TabsContent key={plan.code} value={plan.code} className="mt-4">
                {loading ? (
                  <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
                    <Loader2 className="size-4 animate-spin" />
                    Loading…
                  </div>
                ) : error ? (
                  <p className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                  </p>
                ) : !items.length ? (
                  <p className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                    No open Pay attempts for {plan.displayName}.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                        <tr>
                          <th className="px-4 py-3 font-medium">User</th>
                          <th className="px-4 py-3 font-medium">Current</th>
                          <th className="px-4 py-3 font-medium">Target</th>
                          <th className="px-4 py-3 font-medium">Attempted</th>
                          <th className="px-4 py-3 font-medium">Remarks</th>
                          <th className="px-4 py-3 font-medium" />
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((row) => (
                          <tr
                            key={row.id}
                            className="border-b border-gray-50 last:border-0"
                          >
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900">
                                {row.user?.name || "Unknown"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {row.user?.contact || row.user?.email || row.userId}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              <p>{badgeLabel(row.user?.badge)}</p>
                              <p className="text-xs text-gray-500">
                                from {row.fromPlan || "—"}
                              </p>
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {row.targetPlan}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {formatDateTime(row.updatedAt || row.createdAt)}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {row.remarksCount
                                ? row.remarks[row.remarks.length - 1]?.text
                                : "—"}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {canUpdate ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setRemarkFor(row);
                                    setRemarkText("");
                                    setRemarkError("");
                                  }}
                                >
                                  <MessageSquarePlus className="mr-1.5 size-3.5" />
                                  Add remark
                                </Button>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>

      <Dialog
        open={!!remarkFor}
        onOpenChange={(open) => {
          if (!open) setRemarkFor(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add remark</DialogTitle>
            <DialogDescription>
              Note for {remarkFor?.user?.name || "this user"} ·{" "}
              {remarkFor?.targetPlan}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={remarkText}
            onChange={(e) => setRemarkText(e.target.value)}
            placeholder="Called user / waiting on payment…"
            maxLength={2000}
          />
          {remarkError ? (
            <p className="text-xs text-red-600">{remarkError}</p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRemarkFor(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submitRemark}
              disabled={remarkBusy || !remarkText.trim()}
              className="bg-primary text-white hover:bg-primary/90"
            >
              {remarkBusy ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Save remark
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PermissionGuard>
  );
}
