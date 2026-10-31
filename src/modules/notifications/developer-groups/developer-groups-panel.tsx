"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SearchableSelect } from "@/components/common/searchable-select";
import {
  DEVELOPER_GROUP_RETENTION_MAX,
  DEVELOPER_GROUP_RETENTION_MIN,
  developerGroupsService,
  type DeveloperGroupMessage,
  type DeveloperGroupRow,
  type DeveloperGroupSettings,
} from "@/services/developer-groups.service";
import { notificationApiError, type BroadcastCity } from "@/services/notifications.service";
import {
  Building2,
  CheckCheck,
  FileText,
  Film,
  Image as ImageIcon,
  Link2,
  Loader2,
  RefreshCw,
  PlayCircle,
  Trash2,
} from "lucide-react";

type Props = {
  cities: BroadcastCity[];
  citiesLoading: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onToast: (message: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
};

const ALL_CITIES = "__all__";

function formatWhen(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

function AttachmentChip({ a }: { a: DeveloperGroupMessage["attachments"][number] }) {
  const icon =
    a.type === "image" ? (
      <ImageIcon className="size-3.5" />
    ) : a.type === "pdf" ? (
      <FileText className="size-3.5" />
    ) : a.type === "video" ? (
      <Film className="size-3.5" />
    ) : a.type === "youtube" ? (
      <PlayCircle className="size-3.5" />
    ) : (
      <Link2 className="size-3.5" />
    );
  const label =
    a.type === "project"
      ? a.title || "Project"
      : a.type === "link"
        ? a.title || a.name || "Link"
      : a.type === "youtube"
        ? "YouTube"
        : a.name || a.type.toUpperCase();
  const href = a.type === "project" ? undefined : a.url;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-700 hover:bg-gray-50"
    >
      {icon}
      <span className="max-w-[160px] truncate">{label}</span>
    </a>
  );
}

export function DeveloperGroupsPanel({
  cities,
  citiesLoading,
  canUpdate,
  canDelete,
  onToast,
  onDirtyChange,
}: Props) {
  const [settings, setSettings] = useState<DeveloperGroupSettings | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [retentionDraft, setRetentionDraft] = useState(String(DEVELOPER_GROUP_RETENTION_MIN));
  const retentionValue = Number(retentionDraft);
  const retentionValid =
    retentionDraft.trim() !== "" &&
    Number.isInteger(retentionValue) &&
    retentionValue >= DEVELOPER_GROUP_RETENTION_MIN &&
    retentionValue <= DEVELOPER_GROUP_RETENTION_MAX;
  const retentionDirty = settings != null && retentionDraft.trim() !== String(settings.retentionDays);

  useEffect(() => {
    onDirtyChange?.(retentionDirty);
  }, [retentionDirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  const [cityFilter, setCityFilter] = useState<string>(ALL_CITIES);
  const [groups, setGroups] = useState<DeveloperGroupRow[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [active, setActive] = useState<DeveloperGroupRow | null>(null);
  const [messages, setMessages] = useState<DeveloperGroupMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState("");

  const cityOptions = useMemo(
    () => [
      { value: ALL_CITIES, label: "All cities" },
      ...cities.map((c) => ({ value: c.id, label: c.name })),
    ],
    [cities],
  );

  const loadSettings = useCallback(async () => {
    try {
      const s = await developerGroupsService.getSettings();
      setSettings(s);
      setRetentionDraft(String(s.retentionDays));
    } catch (err) {
      setError(notificationApiError(err, "Could not load Launch Update settings."));
    }
  }, []);

  const loadGroups = useCallback(async () => {
    setGroupsLoading(true);
    try {
      const rows = await developerGroupsService.listGroups(
        cityFilter === ALL_CITIES ? undefined : cityFilter,
      );
      setGroups(rows);
      setActive((prev) =>
        prev
          ? rows.find((r) => r.developerId === prev.developerId && r.cityId === prev.cityId) || null
          : null,
      );
    } catch (err) {
      setError(notificationApiError(err, "Could not load developer groups."));
    } finally {
      setGroupsLoading(false);
    }
  }, [cityFilter]);

  const loadMessages = useCallback(async (group: DeveloperGroupRow, cursor?: string | null) => {
    setMessagesLoading(true);
    try {
      const res = await developerGroupsService.listMessages(group.developerId, group.cityId, cursor);
      setMessages((prev) => (cursor ? [...prev, ...res.items] : res.items));
      setNextCursor(res.nextCursor);
    } catch (err) {
      setError(notificationApiError(err, "Could not load messages."));
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    if (active) void loadMessages(active);
    else {
      setMessages([]);
      setNextCursor(null);
    }
  }, [active, loadMessages]);

  const save = async (key: string, patch: Partial<DeveloperGroupSettings>) => {
    setSavingKey(key);
    setError("");
    try {
      const next = await developerGroupsService.updateSettings(patch);
      setSettings(next);
      setRetentionDraft(String(next.retentionDays));
      onToast("Launch Update settings saved.");
    } catch (err) {
      setError(notificationApiError(err, "Could not save settings."));
    } finally {
      setSavingKey(null);
    }
  };

  const removeMessage = async (id: string) => {
    if (!window.confirm("Delete this message for everyone?")) return;
    try {
      await developerGroupsService.deleteMessage(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
      onToast("Message deleted.");
      void loadGroups();
    } catch (err) {
      setError(notificationApiError(err, "Could not delete the message."));
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Launch Update</p>
              <p className="mt-1 text-xs text-gray-500">
                When off, Launch Update and Showcase are hidden in the app (developer page shows only
                the Propnetra logo). Showcase picks stay saved in the database.
              </p>
            </div>
            <Switch
              checked={!!settings?.enabled}
              disabled={!settings || !canUpdate || savingKey === "enabled"}
              onCheckedChange={(checked) => void save("enabled", { enabled: checked })}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Seen by</p>
              <p className="mt-1 text-xs text-gray-500">
                Developers can long-press a message to see which agents viewed it.
              </p>
            </div>
            <Switch
              checked={!!settings?.seenByEnabled}
              disabled={!settings || !canUpdate || savingKey === "seenBy"}
              onCheckedChange={(checked) => void save("seenBy", { seenByEnabled: checked })}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-900">Delete messages after</p>
          <div className="mt-2 flex items-center gap-2">
            <Input
              type="number"
              inputMode="numeric"
              min={DEVELOPER_GROUP_RETENTION_MIN}
              max={DEVELOPER_GROUP_RETENTION_MAX}
              step={1}
              value={retentionDraft}
              disabled={!settings || !canUpdate}
              onChange={(e) => setRetentionDraft(e.target.value)}
              className="w-28"
              aria-invalid={!retentionValid}
            />
            <span className="text-sm text-gray-600">days</span>
          </div>
          <p className={`mt-1 text-xs ${retentionValid ? "text-gray-500" : "text-red-600"}`}>
            Enter a value between {DEVELOPER_GROUP_RETENTION_MIN} and{" "}
            {DEVELOPER_GROUP_RETENTION_MAX} days.
          </p>
          <div className="mt-3 flex justify-end">
            <Button
              size="sm"
              disabled={
                !settings ||
                !canUpdate ||
                !retentionValid ||
                savingKey === "retention" ||
                retentionValue === settings.retentionDays
              }
              onClick={() => void save("retention", { retentionDays: retentionValue })}
            >
              {savingKey === "retention" ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-26rem)] min-h-[420px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex w-80 shrink-0 flex-col border-r border-gray-100">
          <div className="flex items-center gap-2 border-b border-gray-100 p-3">
            <div className="flex-1">
              <SearchableSelect
                options={cityOptions}
                value={cityFilter}
                onValueChange={(v) => setCityFilter(v || ALL_CITIES)}
                loading={citiesLoading}
                placeholder="All cities"
                searchPlaceholder="Search city…"
                emptyText="No cities found."
              />
            </div>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => void loadGroups()}
              aria-label="Refresh groups"
            >
              <RefreshCw className="size-3.5" />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {groupsLoading && !groups.length ? (
              <p className="p-4 text-sm text-gray-500">Loading groups…</p>
            ) : !groups.length ? (
              <p className="p-4 text-sm text-gray-500">No developer groups yet.</p>
            ) : (
              groups.map((g) => {
                const selected = active?.developerId === g.developerId && active?.cityId === g.cityId;
                return (
                  <button
                    key={`${g.developerId}:${g.cityId}`}
                    type="button"
                    onClick={() => setActive(g)}
                    className={`flex w-full items-center gap-3 border-b border-gray-50 px-4 py-3 text-left hover:bg-gray-50 ${
                      selected ? "bg-primary-light" : ""
                    }`}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                      <Building2 className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-gray-900">
                        {g.groupName || g.developerName}
                      </span>
                      <span className="block truncate text-[11px] text-gray-500">
                        {g.groupName && g.groupName !== g.developerName ? `${g.developerName} · ` : ""}
                        {g.cityName || "City"} · {g.messageCount} message{g.messageCount === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] text-gray-400">{formatWhen(g.lastAt)}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          {!active ? (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-gray-500">
              Pick a developer group to read and moderate its messages.
            </div>
          ) : (
            <>
              <div className="shrink-0 border-b border-gray-100 px-4 py-3">
                <p className="text-sm font-semibold text-gray-900">{active.groupName || active.developerName}</p>
                <p className="text-[11px] text-gray-500">
                  {active.developerName} · {active.cityName || "City"} · read only
                </p>
              </div>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#efeae2] p-4">
                {messages.map((m) => (
                  <div key={m.id} className="ml-auto max-w-[75%] rounded-xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 shadow-sm">
                    {m.hidden ? (
                      <p className="mb-1 text-[10px] font-semibold uppercase text-amber-700">Hidden (past retention)</p>
                    ) : null}
                    {m.richText ? (
                      // Server-sanitized whitelist HTML (b/i/u/s/a/ul/li/br/span colour).
                      <div
                        className="text-sm text-gray-900 [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5"
                        dangerouslySetInnerHTML={{ __html: m.richText }}
                      />
                    ) : m.text ? (
                      <p className="whitespace-pre-wrap text-sm text-gray-900">{m.text}</p>
                    ) : null}
                    {m.attachments?.length ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.attachments.map((a, i) => (
                          <AttachmentChip key={`${m.id}-${i}`} a={a} />
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-1 flex items-center justify-end gap-2 text-[10px] text-gray-500">
                      <span className="inline-flex items-center gap-0.5">
                        <CheckCheck className="size-3" />
                        {m.seenCount || 0} seen
                      </span>
                      <span>{formatWhen(m.createdAt)}</span>
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={() => void removeMessage(m.id)}
                          className="text-red-500 hover:text-red-700"
                          aria-label="Delete message"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
                {messagesLoading ? (
                  <p className="text-center text-xs text-gray-500">Loading…</p>
                ) : nextCursor ? (
                  <div className="flex justify-center">
                    <Button variant="outline" size="sm" onClick={() => void loadMessages(active, nextCursor)}>
                      Load older
                    </Button>
                  </div>
                ) : !messages.length ? (
                  <p className="text-center text-xs text-gray-500">No messages.</p>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
