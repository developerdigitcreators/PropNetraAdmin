'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/common/password-input';
import { SearchableSelect } from '@/components/common/searchable-select';
import { useFloatingToast } from '@/components/common/floating-toast';
import { humanizeRoleName } from '@/lib/role-label';
import { cn } from '@/lib/utils';
import {
  adminPasswordService,
  apiErrorInfo,
  type PasswordResetTarget,
} from '@/services/password-reset.service';

const DEFAULT_RESEND_SEC = 30;
const MIN_PASSWORD = 6;

type FieldKey = 'targetUserId' | 'otp' | 'newPassword' | 'confirmPassword';

function targetLabel(t: PasswordResetTarget) {
  const role = humanizeRoleName(t.roleName);
  if (t.isSelf) return `Me (${role || t.name || t.email})`;
  return role ? `${t.name || 'Unnamed'} (${role})` : t.name || t.email || 'Unnamed';
}

function formatCountdown(sec: number) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** OTP no longer usable for the selected user: wrong target, expired, or session gone. */
function isStaleOtpError(code: string | undefined, message: string) {
  const c = (code || '').toUpperCase();
  return (
    c === 'OTP_EXPIRED' ||
    c === 'SESSION_EXPIRED' ||
    c.includes('MISMATCH') ||
    c.includes('DIFFERENT') ||
    /different user|expired/i.test(message)
  );
}

export function AdminPasswordResetPanel({ initialUserId }: { initialUserId?: string }) {
  const toast = useFloatingToast();
  const [targets, setTargets] = useState<PasswordResetTarget[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedId, setSelectedId] = useState('');

  const [otpSentFor, setOtpSentFor] = useState<string | null>(null);
  const [emailMasked, setEmailMasked] = useState('');
  const [sentMessage, setSentMessage] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sending, setSending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [selfNote, setSelfNote] = useState(false);
  const [resendAt, setResendAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const loadTargets = useCallback(async () => {
    setLoadingTargets(true);
    setLoadError('');
    try {
      const list = await adminPasswordService.listTargets();
      const sorted = [...list].sort((a, b) => Number(b.isSelf) - Number(a.isSelf));
      setTargets(sorted);
      setSelectedId((prev) => {
        if (initialUserId && sorted.some((t) => t.id === initialUserId)) return initialUserId;
        if (prev && sorted.some((t) => t.id === prev)) return prev;
        return sorted.find((t) => t.isSelf)?.id || sorted[0]?.id || '';
      });
    } catch (err) {
      setLoadError(apiErrorInfo(err, 'Could not load admin panel users.').message);
    } finally {
      setLoadingTargets(false);
    }
  }, [initialUserId]);

  useEffect(() => {
    void loadTargets();
  }, [loadTargets]);

  useEffect(() => {
    if (!resendAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [resendAt]);

  const options = useMemo(
    () => targets.map((t) => ({ value: t.id, label: targetLabel(t) })),
    [targets],
  );
  const selected = targets.find((t) => t.id === selectedId) || null;
  const otpActive = !!otpSentFor && otpSentFor === selectedId;
  const resendSecondsLeft = resendAt ? Math.max(0, Math.ceil((resendAt - now) / 1000)) : 0;
  const passwordsMismatch = !!confirmPassword && newPassword !== confirmPassword;
  const passwordsValid =
    newPassword.length >= MIN_PASSWORD && confirmPassword.length > 0 && !passwordsMismatch;
  const canReset =
    !!selected && !resetting && otpActive && otp.length === 6 && passwordsValid;

  const clearOtp = () => {
    setOtpSentFor(null);
    setEmailMasked('');
    setSentMessage('');
    setOtp('');
    setResendAt(null);
  };

  const showError = (err: unknown, fallback: string) => {
    const info = apiErrorInfo(err, fallback);
    if (isStaleOtpError(info.code, info.message)) {
      clearOtp();
      setFieldErrors({ otp: info.message });
      return;
    }
    const field = info.field as FieldKey | undefined;
    if (field && ['targetUserId', 'otp', 'newPassword', 'confirmPassword'].includes(field)) {
      setFieldErrors({ [field]: info.message });
      return;
    }
    if (info.code === 'OTP_INVALID' || /invalid otp/i.test(info.message)) {
      setFieldErrors({ otp: info.message });
      return;
    }
    toast.show(info.message, 'error');
  };

  const onSelect = (id: string) => {
    if (id === selectedId) return;
    setSelectedId(id);
    clearOtp();
    setNewPassword('');
    setConfirmPassword('');
    setFieldErrors({});
    setSelfNote(false);
  };

  const onSendOtp = async () => {
    if (!selected || sending) return;
    setFieldErrors({});
    setSelfNote(false);
    setSending(true);
    try {
      const res = await adminPasswordService.sendOtp(selected.id);
      const masked = res?.emailMasked || '';
      setOtpSentFor(selected.id);
      setEmailMasked(masked);
      setSentMessage(res?.message || (masked ? `OTP sent to ${masked}` : 'OTP sent'));
      setOtp('');
      const t = Date.now();
      const wait = Number(res?.expiresIn) > 0 ? Number(res.expiresIn) : DEFAULT_RESEND_SEC;
      setNow(t);
      setResendAt(t + wait * 1000);
    } catch (err) {
      showError(err, 'Could not send OTP. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected || !canReset) return;
    setFieldErrors({});
    setResetting(true);
    try {
      const res = await adminPasswordService.reset({
        targetUserId: selected.id,
        otp,
        newPassword,
        confirmPassword,
      });
      toast.show(res?.message || 'Password reset successfully.');
      setSelfNote(selected.isSelf);
      clearOtp();
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showError(err, 'Could not reset password. Please try again.');
    } finally {
      setResetting(false);
    }
  };

  const fieldError = (key: FieldKey) =>
    fieldErrors[key] ? <p className="text-xs text-red-500">{fieldErrors[key]}</p> : null;

  const newPasswordHint =
    fieldErrors.newPassword ||
    (newPassword && newPassword.length < MIN_PASSWORD
      ? `Password must be at least ${MIN_PASSWORD} characters.`
      : '');
  const confirmHint =
    fieldErrors.confirmPassword || (passwordsMismatch ? 'Passwords do not match' : '');

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900">
          <KeyRound className="h-6 w-6 text-primary" />
          Reset password
        </h1>
        <p className="mt-1 text-gray-500">
          Reset the password for yourself or any admin panel user. Every reset needs an OTP sent
          to the super admin email.
        </p>
      </div>

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="max-w-xl space-y-5 rounded-2xl border border-gray-200 bg-white p-6"
        noValidate
      >
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">User</label>
          <SearchableSelect
            options={options}
            value={selectedId}
            onValueChange={onSelect}
            loading={loadingTargets}
            disabled={loadingTargets || !options.length}
            placeholder={loadingTargets ? 'Loading users…' : 'Select user'}
            searchPlaceholder="Search by name or role"
            emptyText="No admin panel users found."
          />
          {fieldError('targetUserId')}
          {loadError && (
            <p className="text-xs text-red-500">
              {loadError}{' '}
              <button
                type="button"
                className="font-medium underline"
                onClick={() => void loadTargets()}
              >
                Retry
              </button>
            </p>
          )}
        </div>

        {selected && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">OTP</label>
            <div className="flex items-start gap-2">
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="Enter 6-digit OTP"
                value={otp}
                disabled={!otpActive}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                  if (fieldErrors.otp) setFieldErrors((prev) => ({ ...prev, otp: undefined }));
                }}
                className={cn(
                  'flex-1 text-center text-lg',
                  otp && 'tracking-[0.4em]',
                  fieldErrors.otp && 'border-red-500 focus-visible:ring-red-500',
                )}
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                onClick={() => void onSendOtp()}
                disabled={sending || (otpActive && resendSecondsLeft > 0)}
              >
                {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {otpActive
                  ? resendSecondsLeft > 0
                    ? `Resend in ${formatCountdown(resendSecondsLeft)}`
                    : 'Resend OTP'
                  : 'Send OTP'}
              </Button>
            </div>
            {fieldError('otp')}
            <p className="text-xs text-gray-500">
              {otpActive
                ? sentMessage || `OTP sent to ${emailMasked || 'the super admin email'}`
                : 'OTP will be sent to the super admin email'}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">New password</label>
          <PasswordInput
            autoComplete="new-password"
            placeholder="At least 6 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={newPasswordHint ? 'border-red-500 focus-visible:ring-red-500' : ''}
          />
          {newPasswordHint && <p className="text-xs text-red-500">{newPasswordHint}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Confirm password</label>
          <PasswordInput
            autoComplete="new-password"
            placeholder="Re-enter new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={confirmHint ? 'border-red-500 focus-visible:ring-red-500' : ''}
          />
          {confirmHint && <p className="text-xs text-red-500">{confirmHint}</p>}
        </div>

        {selfNote && (
          <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
            Use the new password next time you log in.
          </p>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={!canReset}>
            {resetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reset password
          </Button>
        </div>
      </form>
      {toast.node}
    </div>
  );
}
