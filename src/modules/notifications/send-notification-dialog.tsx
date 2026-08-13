'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminUsersService } from '@/services/admin-users.service';
import {
  notificationsService,
  notificationApiError,
  NOTIFICATION_TYPES,
} from '@/services/notifications.service';
import { SearchableSelect } from '@/components/common/searchable-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, X } from 'lucide-react';

type SendMode = 'one' | 'bulk';

type AppUserOption = {
  id: string;
  name?: string;
  email?: string;
  contact?: string;
  status?: string;
  kind?: string;
};

function userLabel(user: AppUserOption) {
  return [user.name, user.email, user.contact].filter(Boolean).join(' · ') || user.id;
}

type SendNotificationDialogProps = {
  open: boolean;
  onClose: () => void;
  onSent: (message: string) => void;
};

export function SendNotificationDialog({ open, onClose, onSent }: SendNotificationDialogProps) {
  const [mode, setMode] = useState<SendMode>('one');
  const [users, setUsers] = useState<AppUserOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pickerValue, setPickerValue] = useState('');
  const [sendToAll, setSendToAll] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setMode('one');
    setUserId('');
    setSelectedIds([]);
    setPickerValue('');
    setSendToAll(false);
    setTitle('');
    setBody('');
    setType('general');
    setError('');
    setIsSubmitting(false);

    setUsersLoading(true);
    adminUsersService
      .getUsers({ audience: 'app', bucket: 'master' })
      .then((data) => {
        const rows = (Array.isArray(data) ? data : []) as AppUserOption[];
        setUsers(rows.filter((u) => u?.id && u.kind !== 'signup'));
      })
      .catch(() => {
        setUsers([]);
        setError('Failed to load app users.');
      })
      .finally(() => setUsersLoading(false));
  }, [open]);

  const allOptions = useMemo(
    () => users.map((u) => ({ value: u.id, label: userLabel(u) })),
    [users],
  );

  const bulkOptions = useMemo(
    () => allOptions.filter((o) => !selectedIds.includes(o.value)),
    [allOptions, selectedIds],
  );

  const selectedUsers = useMemo(
    () => users.filter((u) => selectedIds.includes(u.id)),
    [users, selectedIds],
  );

  const recipientCount = mode === 'one' ? (userId ? 1 : 0) : sendToAll ? users.length : selectedIds.length;
  const canSubmit = !!title.trim() && !!body.trim() && recipientCount > 0 && !isSubmitting;

  const addBulkUser = (id: string) => {
    if (!id || selectedIds.includes(id)) return;
    setSelectedIds((prev) => [...prev, id]);
    setPickerValue('');
    setSendToAll(false);
  };

  const removeBulkUser = (id: string) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  };

  const submit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError('');
    try {
      const payload = {
        title: title.trim(),
        body: body.trim(),
        type: type.trim() || 'general',
      };
      if (mode === 'one') {
        await notificationsService.send({ ...payload, userId });
        onSent('Notification sent to 1 user.');
      } else {
        const userIds = sendToAll ? users.map((u) => u.id) : selectedIds;
        await notificationsService.sendBulk({ ...payload, userIds });
        onSent(`Notification sent to ${userIds.length} user${userIds.length === 1 ? '' : 's'}.`);
      }
      onClose();
    } catch (err) {
      setError(notificationApiError(err, 'Failed to send notification.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTypeLabel = NOTIFICATION_TYPES.find((t) => t.value === type)?.label || type;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send notification</DialogTitle>
          <DialogDescription>
            Push is delivered only if the user has registered an FCM token from the app.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === 'one' ? 'default' : 'outline'}
              className={mode === 'one' ? 'bg-primary text-white' : ''}
              onClick={() => {
                setMode('one');
                setError('');
              }}
            >
              One user
            </Button>
            <Button
              type="button"
              variant={mode === 'bulk' ? 'default' : 'outline'}
              className={mode === 'bulk' ? 'bg-primary text-white' : ''}
              onClick={() => {
                setMode('bulk');
                setError('');
              }}
            >
              Multiple users
            </Button>
          </div>

          {mode === 'one' ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">User</label>
              <SearchableSelect
                options={allOptions}
                value={userId}
                onValueChange={setUserId}
                loading={usersLoading}
                placeholder="Select app user"
                searchPlaceholder="Search name, email, phone…"
                emptyText="No app users found."
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium">Users</label>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <Checkbox
                    checked={sendToAll}
                    onCheckedChange={(checked) => {
                      const next = checked === true;
                      setSendToAll(next);
                      if (next) setSelectedIds([]);
                    }}
                    disabled={users.length === 0}
                  />
                  Send to all ({users.length})
                </label>
              </div>
              {!sendToAll && (
                <>
                  <SearchableSelect
                    options={bulkOptions}
                    value={pickerValue}
                    onValueChange={addBulkUser}
                    loading={usersLoading}
                    placeholder="Add app users"
                    searchPlaceholder="Search name, email, phone…"
                    emptyText="No more users to add."
                  />
                  {selectedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                      {selectedUsers.map((u) => (
                        <span
                          key={u.id}
                          className="inline-flex items-center gap-1 rounded-full bg-primary-light text-primary px-2.5 py-1 text-xs font-medium"
                        >
                          {u.name || u.email || u.contact || u.id}
                          <button
                            type="button"
                            onClick={() => removeBulkUser(u.id)}
                            className="rounded-full p-0.5 hover:bg-white/60"
                            aria-label={`Remove ${u.name || u.id}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
              <p className="text-xs text-gray-500">
                {sendToAll
                  ? `Will send to all ${users.length} app users.`
                  : `${selectedIds.length} user${selectedIds.length === 1 ? '' : 's'} selected.`}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <Select value={type} onValueChange={(v) => setType(v ?? 'general')}>
              <SelectTrigger>
                <span>{selectedTypeLabel}</span>
              </SelectTrigger>
              <SelectContent>
                {NOTIFICATION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Hello"
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Test notification"
              rows={4}
              maxLength={500}
              className="w-full min-h-24 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
