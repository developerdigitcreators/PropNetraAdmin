"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  canUpdateUserAnalyticsConfig,
  userAnalyticsUpdatePermissionHint,
} from "@/modules/app-users/app-users-access";
import { useAuthStore } from "@/store/use-auth-store";
import {
  userAnalyticsApiError,
  userAnalyticsService,
  validateMyListingAnalyticsPayload,
  type MyListingAnalyticsConfig,
  type MyListingAnalyticsMetric,
} from "@/services/user-analytics.service";
import { Loader2 } from "lucide-react";

type MyListingAnalyticsConfigPanelProps = {
  userId: string;
  refreshKey?: number;
};

function metricLabel(
  config: MyListingAnalyticsConfig,
  metric: MyListingAnalyticsMetric,
): string {
  return config.metricLabels[metric] || metric;
}

function viewersPopupMetricId(config: MyListingAnalyticsConfig): string {
  return config.ownerKind === "developer" ? "views" : "viewers";
}

export function MyListingAnalyticsConfigPanel({
  userId,
  refreshKey = 0,
}: MyListingAnalyticsConfigPanelProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canUpdate = canUpdateUserAnalyticsConfig(hasPermission);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState(false);

  const [server, setServer] = useState<MyListingAnalyticsConfig | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [metrics, setMetrics] = useState<MyListingAnalyticsMetric[]>([]);

  const applyServer = useCallback((config: MyListingAnalyticsConfig) => {
    setServer(config);
    setEnabled(config.enabled);
    setMetrics(config.metrics.length ? [...config.metrics] : []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    setSaveOk(false);
    userAnalyticsService
      .fetchMyListingAnalytics(userId)
      .then((config) => {
        if (!cancelled) applyServer(config);
      })
      .catch((err) => {
        if (!cancelled) {
          setServer(null);
          setLoadError(
            userAnalyticsApiError(err, "Failed to load My Listings analytics config."),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, refreshKey, applyServer]);

  const maxMetrics = server?.maxMetrics ?? 4;

  const viewersPopupHint = useMemo(() => {
    if (!server) return false;
    const popupMetric = viewersPopupMetricId(server);
    return (
      server.displayMetrics.includes(popupMetric) && !server.viewersPopupEnabled
    );
  }, [server]);

  const shownInAppLabels = useMemo(() => {
    if (!server || !enabled || !metrics.length) return [];
    return metrics.map((m) => metricLabel(server, m));
  }, [server, enabled, metrics]);

  const dirty = useMemo(() => {
    if (!server) return false;
    if (enabled !== server.enabled) return true;
    if (metrics.length !== server.metrics.length) return true;
    return metrics.some((m, i) => m !== server.metrics[i]);
  }, [enabled, metrics, server]);

  const toggleMetric = (metric: MyListingAnalyticsMetric, checked: boolean) => {
    setSaveOk(false);
    setMetrics((prev) => {
      if (checked) {
        if (prev.includes(metric)) return prev;
        if (prev.length >= maxMetrics) return prev;
        return [...prev, metric];
      }
      return prev.filter((m) => m !== metric);
    });
  };

  const resetToDefaults = () => {
    if (!server) return;
    setSaveOk(false);
    setEnabled(server.defaults.enabled);
    setMetrics([...server.defaults.metrics]);
  };

  const save = async () => {
    const payload = { enabled, metrics };
    const validation = validateMyListingAnalyticsPayload(payload, {
      availableMetrics: server?.availableMetrics,
      maxMetrics: server?.maxMetrics,
    });
    if (validation) {
      setSaveError(validation);
      return;
    }
    setSaveBusy(true);
    setSaveError("");
    setSaveOk(false);
    try {
      const next = await userAnalyticsService.updateMyListingAnalytics(
        userId,
        payload,
      );
      applyServer(next);
      setSaveOk(true);
    } catch (err) {
      setSaveError(
        userAnalyticsApiError(err, "Failed to save My Listings analytics config."),
      );
    } finally {
      setSaveBusy(false);
    }
  };

  const availableMetrics = server?.availableMetrics ?? [];

  return (
    <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h5 className="text-sm font-semibold text-gray-900">
            App — My Listings analytics
          </h5>
          <p className="mt-1 max-w-2xl text-xs text-gray-500">
            Controls the app only. Metrics table below is for admin support.
            {server?.ownerKind ? (
              <span className="ml-1 capitalize">({server.ownerKind} user)</span>
            ) : null}
          </p>
        </div>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : null}
      </div>

      {loadError ? (
        <p className="mt-3 text-sm text-red-600">{loadError}</p>
      ) : null}

      {!loading && !loadError && server ? (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Switch
              id="my-listing-analytics-enabled"
              checked={enabled}
              disabled={!canUpdate}
              onCheckedChange={(checked) => {
                setSaveOk(false);
                setEnabled(!!checked);
              }}
            />
            <label
              htmlFor="my-listing-analytics-enabled"
              className="text-sm font-medium text-gray-800 cursor-pointer"
            >
              Show on app My Listings
            </label>
          </div>

          <fieldset
            className="space-y-2"
            disabled={!canUpdate || !enabled}
          >
            <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Metrics (order = app display order, max {maxMetrics})
            </legend>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {availableMetrics.map((metric) => {
                const checked = metrics.includes(metric);
                const atMax = metrics.length >= maxMetrics && !checked;
                return (
                  <label
                    key={metric}
                    className={`flex items-center gap-2 text-sm text-gray-800 ${
                      atMax ? "opacity-60" : ""
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={!enabled || !canUpdate || atMax}
                      onCheckedChange={(value) =>
                        toggleMetric(metric, value === true)
                      }
                    />
                    {metricLabel(server, metric)}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {viewersPopupHint ? (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              {server.ownerKind === "developer"
                ? "Views count shows in app; viewers popup needs Feature Controls → Listing viewers ON and Views selected."
                : "Viewers count shows in app; popup needs Feature Controls → Listing viewers ON."}
            </p>
          ) : shownInAppLabels.length > 0 ? (
            <p className="text-xs text-gray-500">
              Shown in app: {shownInAppLabels.join(", ")}
            </p>
          ) : enabled ? (
            <p className="text-xs text-gray-500">
              Select up to {maxMetrics} metrics to show on My Listings.
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              disabled={!canUpdate || !dirty || saveBusy}
              onClick={() => void save()}
            >
              {saveBusy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save app config
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!canUpdate || saveBusy}
              onClick={resetToDefaults}
            >
              Reset to defaults
            </Button>
            {!canUpdate ? (
              <span className="text-xs text-gray-500">
                Requires <code>{userAnalyticsUpdatePermissionHint()}</code>
              </span>
            ) : null}
            {saveOk ? (
              <span className="text-xs font-medium text-green-700">Saved.</span>
            ) : null}
          </div>
          {saveError ? (
            <p className="text-sm text-red-600">{saveError}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
