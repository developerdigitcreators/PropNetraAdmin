"use client";

import { useEffect, useState } from "react";
import { PermissionGuard } from "@/components/common/permission-guard";
import { Breadcrumb } from "@/components/common/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  recycleBinApiError,
  recycleBinService,
  type RecycleBinItem,
} from "@/services/recycle-bin.service";
import {
  AlertTriangle,
  Loader2,
  RefreshCw,
  RotateCcw,
  Trash2,
  UserRound,
} from "lucide-react";
import { formatDisplayDateTime } from "@/lib/format-date";

function formatDateTime(value?: string | null) {
  return formatDisplayDateTime(value);
}

async function fetchDeletedItems(): Promise<{
  items: RecycleBinItem[];
  error: string;
}> {
  try {
    return { items: await recycleBinService.list(), error: "" };
  } catch (err) {
    return {
      items: [],
      error: recycleBinApiError(err, "Failed to load deleted items."),
    };
  }
}

export function RecycleBinPanel() {
  const [items, setItems] = useState<RecycleBinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toRestore, setToRestore] = useState<RecycleBinItem | null>(null);
  const [toPurge, setToPurge] = useState<RecycleBinItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let cancelled = false;

    void fetchDeletedItems().then(({ items: next, error: nextError }) => {
      if (cancelled) return;
      setItems(next);
      setError(nextError);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshList = async () => {
    setLoading(true);
    const { items: next, error: nextError } = await fetchDeletedItems();
    setItems(next);
    setError(nextError);
    setLoading(false);
  };

  const handleRestore = async () => {
    if (!toRestore) return;
    setBusy(true);
    setActionError("");
    try {
      await recycleBinService.restore(toRestore.id);
      setToRestore(null);
      await refreshList();
    } catch (err) {
      setActionError(recycleBinApiError(err, "Failed to restore this item."));
    } finally {
      setBusy(false);
    }
  };

  const handlePurge = async () => {
    if (!toPurge) return;
    setBusy(true);
    setActionError("");
    try {
      await recycleBinService.removePermanently(toPurge.id);
      setToPurge(null);
      await refreshList();
    } catch (err) {
      setActionError(
        recycleBinApiError(err, "Failed to permanently delete this item."),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <PermissionGuard
      permission="recycle_bin:read"
      fallback={
        <div className="p-12 text-center text-gray-500">
          You do not have permission to view Deleted Items.
        </div>
      }
    >
      <div className="max-w-7xl space-y-6 pb-16">
        <Breadcrumb items={[{ label: "Deleted Items" }]} />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Deleted Items
            </h1>
            <p className="mt-1 text-gray-500">
              Staff see items they deleted for 1 month.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refreshList()}
            disabled={loading}
          >
            <RefreshCw className="mr-1.5 size-3.5" />
            Refresh
          </Button>
        </div>

        {(error || actionError) && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {actionError || error}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50/80">
                <tr>
                  <th className="px-5 py-3 font-semibold text-gray-700">
                    Module
                  </th>
                  <th className="px-5 py-3 font-semibold text-gray-700">
                    Deleted by
                  </th>
                  <th className="px-5 py-3 font-semibold text-gray-700">
                    Remark
                  </th>
                  <th className="px-5 py-3 font-semibold text-gray-700">
                    Deleted at
                  </th>
                  <th className="px-5 py-3 font-semibold text-gray-700">
                    Hard delete at
                  </th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              {loading ? (
                <tbody>
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                    </td>
                  </tr>
                </tbody>
              ) : items.length === 0 ? (
                <tbody>
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-16 text-center text-gray-500"
                    >
                      <Trash2 className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                      No deleted items in the current window.
                    </td>
                  </tr>
                </tbody>
              ) : (
                <tbody>
                  {items.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-gray-50 last:border-0"
                    >
                      <td className="px-5 py-4">
                        <Badge
                          variant="secondary"
                          className="bg-gray-100 text-gray-700"
                        >
                          {row.displayModule}
                        </Badge>
                        {row.entityLabel ? (
                          <p className="mt-1 max-w-[220px] truncate text-xs text-gray-500">
                            {row.entityLabel}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {row.deletedBy?.profilePhotoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={row.deletedBy.profilePhotoUrl}
                              alt=""
                              className="h-9 w-9 rounded-full object-cover"
                            />
                          ) : (
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                              <UserRound className="h-4 w-4" />
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-medium text-gray-900">
                              {row.deletedBy?.name || "Unknown"}
                            </p>
                            <p className="truncate text-xs text-gray-500">
                              {row.deletedBy?.email || "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[260px] px-5 py-4 text-gray-600">
                        <p className="line-clamp-2">{row.remark || "—"}</p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-gray-500">
                        {formatDateTime(row.revokeUntil)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-gray-500">
                        {formatDateTime(row.hardDeleteAt)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {row.canRestore || row.canPermanentDelete ? (
                          <div className="flex items-center justify-end gap-1">
                            {row.canRestore ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setToRestore(row)}
                                title="Restore"
                              >
                                <RotateCcw className="h-4 w-4 text-primary" />
                              </Button>
                            ) : null}
                            {row.canPermanentDelete ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:bg-red-50 hover:text-red-600"
                                onClick={() => setToPurge(row)}
                                title="Delete permanently"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        </div>
      </div>

      <Dialog
        open={Boolean(toRestore)}
        onOpenChange={(open) => !open && setToRestore(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Restore this item?</DialogTitle>
            <DialogDescription>
              It will return to{" "}
              {toRestore?.displayModule || "its original module"}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setToRestore(null)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleRestore()} disabled={busy}>
              {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Restore
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(toPurge)}
        onOpenChange={(open) => !open && setToPurge(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete permanently?
            </DialogTitle>
            <DialogDescription>
              This {toPurge?.displayModule || "item"} will be removed forever.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setToPurge(null)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handlePurge()}
              disabled={busy}
            >
              {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Delete permanently
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PermissionGuard>
  );
}
