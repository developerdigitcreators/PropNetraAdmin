"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/use-auth-store";
import {
  notificationsService,
  notificationApiError,
  DEFAULT_BROADCAST_MEDIA_KINDS,
  DEFAULT_PUSH_LAYOUT_TYPES,
  type BroadcastCity,
  type BroadcastKeyLabel,
  type ConnectChannel,
  type NotificationCampaign,
} from "@/services/notifications.service";
import { PermissionGuard } from "@/components/common/permission-guard";
import { Breadcrumb } from "@/components/common/breadcrumb";
import { SearchableSelect } from "@/components/common/searchable-select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GroupsRail } from "@/modules/notifications/chat/groups-rail";
import { UpdatesThread } from "@/modules/notifications/chat/updates-thread";
import { GroupFeedThread } from "@/modules/notifications/chat/group-feed-thread";
import { MessageComposer } from "@/modules/notifications/chat/message-composer";
import { SendPreviewDialog } from "@/modules/notifications/chat/send-preview-dialog";
import {
  campaignToDraft,
  draftToBroadcastPayload,
  draftToUpdatePayload,
  emptyDraft,
  type BroadcastDraft,
} from "@/modules/notifications/chat/draft";
import { ArrowLeft, Bell, Inbox, Lock, MapPin, Megaphone, Smartphone, Users } from "lucide-react";
import { PopupsPanel } from "@/modules/notifications/popups/popups-panel";
import { PushPanel } from "@/modules/notifications/push/push-panel";
import { useNotificationsRealtime } from "@/modules/notifications/use-notifications-realtime";
import { GeneralInboxPanel } from "@/modules/notifications/chat/general-inbox-panel";

export default function NotificationsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canWrite =
    hasPermission("notifications", "create") ||
    hasPermission("notifications", "send");
  const canUpdate = hasPermission("notifications", "update");
  const canDelete = hasPermission("notifications", "delete");

  const [cities, setCities] = useState<BroadcastCity[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [cityId, setCityId] = useState("");

  const [channels, setChannels] = useState<ConnectChannel[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [activeChannelId, setActiveChannelId] = useState("");

  const [pages, setPages] = useState<BroadcastKeyLabel[]>([]);
  const [layoutTypes, setLayoutTypes] = useState<BroadcastKeyLabel[]>(
    DEFAULT_PUSH_LAYOUT_TYPES,
  );
  const [mediaKinds, setMediaKinds] = useState<BroadcastKeyLabel[]>(
    DEFAULT_BROADCAST_MEDIA_KINDS,
  );
  const [broadcastChannelId, setBroadcastChannelId] = useState("");

  const [draft, setDraft] = useState<BroadcastDraft>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [showThreadOnMobile, setShowThreadOnMobile] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState("");
  const [loadError, setLoadError] = useState("");
  const [activeTab, setActiveTab] = useState("groups");
  const [watchUserId, setWatchUserId] = useState("");
  const onWatchUser = useCallback((userId: string) => setWatchUserId(userId), []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      notificationsService
        .getBroadcastCities()
        .catch(() => [] as BroadcastCity[]),
      notificationsService.getChannels(),
    ])
      .then(([nextCities, nextChannels]) => {
        if (cancelled) return;
        setCities(nextCities);
        setCityId((current) => current || nextCities[0]?.id || "");
        setChannels(nextChannels);
        setActiveChannelId(
          (current) =>
            current ||
            nextChannels.find((c) => c.allowAdminBroadcast)?.id ||
            nextChannels[0]?.id ||
            "",
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(notificationApiError(err, "Failed to load groups."));
      })
      .finally(() => {
        if (cancelled) return;
        setCitiesLoading(false);
        setChannelsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    notificationsService
      .getBroadcastOptions()
      .then((options) => {
        if (cancelled) return;
        setPages(options.pages);
        setLayoutTypes(options.layoutTypes);
        const kinds = options.mediaKinds.filter(
          (k) => !["text", "none", "plain"].includes(k.key.toLowerCase()),
        );
        setMediaKinds(kinds.length ? kinds : DEFAULT_BROADCAST_MEDIA_KINDS);
        if (options.channels[0]) setBroadcastChannelId(options.channels[0].id);
      })
      .catch(() => {
        if (!cancelled) setPages([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [prevCityId, setPrevCityId] = useState(cityId);
  if (cityId !== prevCityId) {
    setPrevCityId(cityId);
    if (cityId && draft.cityIds.length === 0) {
      setDraft({ ...draft, cityIds: [cityId] });
    }
  }

  const activeChannel = useMemo(
    () => channels.find((c) => c.id === activeChannelId) || null,
    [channels, activeChannelId],
  );
  const cityName = useMemo(
    () => cities.find((c) => c.id === cityId)?.name || "",
    [cities, cityId],
  );
  const cityOptions = useMemo(
    () => cities.map((c) => ({ value: c.id, label: c.name })),
    [cities],
  );

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 4000);
  };

  const resetComposer = () => {
    setDraft(emptyDraft(cityId ? [cityId] : []));
    setEditingId(null);
  };

  const startEdit = (campaign: NotificationCampaign) => {
    setDraft(campaignToDraft(campaign));
    setEditingId(campaign.id);
    setShowThreadOnMobile(true);
  };

  const startResend = (campaign: NotificationCampaign) => {
    setDraft(campaignToDraft(campaign));
    setEditingId(null);
    setSubmitError("");
    setPreviewOpen(true);
  };

  const confirmSubmit = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      if (editingId) {
        await notificationsService.updateCampaign(
          editingId,
          draftToUpdatePayload(draft),
        );
        showToast("Broadcast updated. The in-app card now shows your changes.");
      } else {
        const channelId = broadcastChannelId || activeChannelId;
        await notificationsService.broadcast(
          draftToBroadcastPayload(draft, channelId),
        );
        showToast(
          "Broadcast queued. It appears in the thread once delivery finishes.",
        );
      }
      setPreviewOpen(false);
      resetComposer();
      setRefreshKey((k) => k + 1);
      // Delivery is queued, so nudge the thread again once the worker catches up.
      window.setTimeout(() => setRefreshKey((k) => k + 1), 3000);
    } catch (err) {
      setSubmitError(
        notificationApiError(
          err,
          editingId
            ? "Failed to save changes."
            : "Failed to send this broadcast.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isUpdatesChannel = !!activeChannel?.allowAdminBroadcast;

  const { groupsTick, popupsTick, inboxTick, feedEvent, inboxEvent } =
    useNotificationsRealtime({
      cityId,
      channelId: activeChannelId,
      watchUserId: activeTab === "general" ? watchUserId : "",
    });

  return (
    <PermissionGuard
      permission="notifications:read"
      fallback={
        <div className="p-12 text-center text-gray-500">
          You do not have permission to view Notifications.
        </div>
      }
    >
      <div className="space-y-4">
        <Breadcrumb items={[{ label: "Notifications" }]} />

        {toast && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {toast}
          </div>
        )}
        {loadError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-auto border bg-white p-1 shadow-sm">
            <TabsTrigger
              value="groups"
              className="gap-1.5 rounded-md px-5 data-[state=active]:bg-primary-light data-[state=active]:text-primary"
            >
              <Users className="w-4 h-4" />
              Groups
            </TabsTrigger>
            <TabsTrigger
              value="popups"
              className="gap-1.5 rounded-md px-5 data-[state=active]:bg-primary-light data-[state=active]:text-primary"
            >
              <Smartphone className="w-4 h-4" />
              In-App Popup
            </TabsTrigger>
            <TabsTrigger
              value="push"
              className="gap-1.5 rounded-md px-5 data-[state=active]:bg-primary-light data-[state=active]:text-primary"
            >
              <Bell className="w-4 h-4" />
              Push Notification
            </TabsTrigger>
            <TabsTrigger
              value="general"
              className="gap-1.5 rounded-md px-5 data-[state=active]:bg-primary-light data-[state=active]:text-primary"
            >
              <Inbox className="w-4 h-4" />
              General
            </TabsTrigger>
          </TabsList>

          <TabsContent value="groups" className="mt-4">
        <div className="flex h-[calc(100vh-19rem)] min-h-[520px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <GroupsRail
            channels={channels}
            loading={channelsLoading}
            activeChannelId={activeChannelId}
            onSelect={(id) => {
              setActiveChannelId(id);
              setEditingId(null);
              setShowThreadOnMobile(true);
            }}
            className={
              showThreadOnMobile
                ? "hidden w-full shrink-0 lg:flex lg:w-80"
                : "flex w-full shrink-0 lg:w-80"
            }
          />

          <div
            className={
              showThreadOnMobile
                ? "flex min-w-0 flex-1 flex-col"
                : "hidden min-w-0 flex-1 flex-col lg:flex"
            }
          >
            {!activeChannel ? (
              <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-gray-500">
                {channelsLoading
                  ? "Loading groups…"
                  : "Pick a group to see its messages."}
              </div>
            ) : (
              <>
                <div className="flex shrink-0 justify-between items-center gap-3 border-b border-gray-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setShowThreadOnMobile(false)}
                      aria-label="Back to groups"
                      className="lg:hidden"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <span
                      className={
                        isUpdatesChannel
                          ? "flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-white"
                          : "flex size-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500"
                      }
                    >
                      {isUpdatesChannel ? (
                        <Megaphone className="w-4 h-4" />
                      ) : (
                        <Users className="w-4 h-4" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {activeChannel.name}
                      </p>
                      <p className="flex items-center gap-1 text-[11px] text-gray-500">
                        {isUpdatesChannel ? (
                          `${cityName || "No city selected"} · full history`
                        ) : (
                          <>
                            <Lock className="w-3 h-3" />{" "}
                            {cityName || "No city selected"} · read only
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white py-1 pl-3 pr-1">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <div className="w-40">
                      <SearchableSelect
                        options={cityOptions}
                        value={cityId}
                        onValueChange={(v) => v && setCityId(v)}
                        loading={citiesLoading}
                        placeholder="Select city"
                        searchPlaceholder="Search city…"
                        emptyText="No cities found."
                        className="[&>button]:border-none"
                      />
                    </div>
                  </div>
                </div>

                {isUpdatesChannel ? (
                  <>
                    <UpdatesThread
                      channelName={activeChannel.name}
                      pages={pages}
                      canWrite={canWrite}
                      canDelete={canDelete}
                      refreshKey={refreshKey + groupsTick}
                      onResend={startResend}
                      onEdit={startEdit}
                      onDeleted={showToast}
                    />
                    {canWrite ? (
                      <MessageComposer
                        draft={draft}
                        onChange={setDraft}
                        cities={cities}
                        citiesLoading={citiesLoading}
                        pages={pages}
                        mediaKinds={mediaKinds}
                        layoutTypes={layoutTypes}
                        mode={editingId ? "edit" : "create"}
                        submitting={submitting}
                        onSubmit={() => {
                          setSubmitError("");
                          setPreviewOpen(true);
                        }}
                        onCancelEdit={resetComposer}
                      />
                    ) : (
                      <p className="shrink-0 border-t border-gray-100 px-4 py-4 text-center text-xs text-gray-500">
                        You have read-only access to Notifications.
                      </p>
                    )}
                  </>
                ) : cityId ? (
                  <GroupFeedThread
                    channel={activeChannel}
                    cityId={cityId}
                    cityName={cityName}
                    feedEvent={feedEvent}
                  />
                ) : (
                  <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-gray-500">
                    Pick a city above to read this group.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
          </TabsContent>

          <TabsContent value="popups" className="mt-4">
            <PopupsPanel
              cities={cities}
              citiesLoading={citiesLoading}
              canWrite={canWrite}
              canUpdate={canUpdate}
              canDelete={canDelete}
              popupsTick={popupsTick}
              onToast={showToast}
            />
          </TabsContent>

          <TabsContent value="push" className="mt-4">
            <PushPanel
              pages={pages}
              canWrite={canWrite}
              onToast={showToast}
            />
          </TabsContent>

          <TabsContent value="general" className="mt-4">
            <GeneralInboxPanel
              inboxTick={inboxTick}
              inboxEvent={inboxEvent}
              onWatchUser={onWatchUser}
            />
          </TabsContent>
        </Tabs>
      </div>

      <SendPreviewDialog
        open={previewOpen}
        draft={draft}
        cities={cities}
        pages={pages}
        mode={editingId ? "edit" : "create"}
        submitting={submitting}
        error={submitError}
        onClose={() => setPreviewOpen(false)}
        onConfirm={confirmSubmit}
      />
    </PermissionGuard>
  );
}
