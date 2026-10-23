'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/common/password-input';
import { cn } from '@/lib/utils';
import {
  apiErrorInfo,
  forgotPasswordService,
  type ApiErrorInfo,
} from '@/services/password-reset.service';

type Step = 'identify' | 'otp' | 'password';
type FieldKey = 'identifier' | 'otp' | 'newPassword' | 'confirmPassword';

const RESEND_COOLDOWN_SEC = 30;
const MIN_PASSWORD = 6;

const STEP_TITLE: Record<Step, string> = {
  identify: 'Forgot password',
  otp: 'Verify OTP',
  password: 'Set a new password',
};

type ForgotPasswordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReset: () => void;
};

export function ForgotPasswordDialog({ open, onOpenChange, onReset }: ForgotPasswordDialogProps) {
  const [step, setStep] = useState<Step>('identify');
  const [identifier, setIdentifier] = useState('');
  const [emailMasked, setEmailMasked] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [resendAt, setResendAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (step !== 'otp') return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [step]);

  const resendSecondsLeft = resendAt ? Math.max(0, Math.ceil((resendAt - now) / 1000)) : 0;

  const clearMessages = () => {
    setError('');
    setInfo('');
    setFieldErrors({});
  };

  const startCooldown = () => {
    const t = Date.now();
    setNow(t);
    setResendAt(t + RESEND_COOLDOWN_SEC * 1000);
  };

  const handleApiError = (err: unknown, fallback: string) => {
    const info: ApiErrorInfo = apiErrorInfo(err, fallback);
    if (info.code === 'OTP_EXPIRED' || info.code === 'SESSION_EXPIRED') {
      setStep('identify');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setResendAt(null);
      setFieldErrors({});
      setError(info.message);
      return;
    }
    const field = info.field as FieldKey | undefined;
    if (field && ['identifier', 'otp', 'newPassword', 'confirmPassword'].includes(field)) {
      setFieldErrors({ [field]: info.message });
      return;
    }
    if (info.code === 'OTP_INVALID') {
      setFieldErrors({ otp: info.message });
      return;
    }
    setError(info.message);
  };

  const onSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    clearMessages();
    const value = identifier.trim();
    if (!value) {
      setFieldErrors({ identifier: 'Enter your email or mobile number.' });
      return;
    }
    setBusy(true);
    try {
      const res = await forgotPasswordService.sendOtp(value);
      setIdentifier(value);
      setEmailMasked(res?.emailMasked || '');
      setOtp('');
      startCooldown();
      setStep('otp');
    } catch (err) {
      handleApiError(err, 'Could not send OTP. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const onResend = async () => {
    if (resendSecondsLeft > 0 || resending) return;
    clearMessages();
    setResending(true);
    try {
      const res = await forgotPasswordService.resendOtp(identifier);
      if (res?.emailMasked) setEmailMasked(res.emailMasked);
      setOtp('');
      startCooldown();
      setInfo('A new OTP has been sent.');
    } catch (err) {
      handleApiError(err, 'Could not resend OTP. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const onVerify = async (e: FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (otp.length !== 6) {
      setFieldErrors({ otp: 'Enter the 6-digit OTP.' });
      return;
    }
    setBusy(true);
    try {
      await forgotPasswordService.verifyOtp(identifier, otp);
      setStep('password');
    } catch (err) {
      handleApiError(err, 'Invalid OTP. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const onSubmitReset = async (e: FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (newPassword.length < MIN_PASSWORD) {
      setFieldErrors({ newPassword: `Password must be at least ${MIN_PASSWORD} characters.` });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }
    setBusy(true);
    try {
      await forgotPasswordService.reset({ identifier, otp, newPassword, confirmPassword });
      onOpenChange(false);
      onReset();
    } catch (err) {
      handleApiError(err, 'Could not reset password. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const fieldError = (key: FieldKey) =>
    fieldErrors[key] ? <p className="text-xs text-red-500">{fieldErrors[key]}</p> : null;

  const inputClass = (key: FieldKey) =>
    cn(
      'h-11 bg-gray-50 border-gray-200',
      fieldErrors[key] && 'border-red-500 focus-visible:ring-red-500',
    );

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{STEP_TITLE[step]}</DialogTitle>
          <DialogDescription>
            {step === 'identify'
              ? 'We will send an OTP to the super admin email.'
              : step === 'otp'
                ? `OTP sent to ${emailMasked || 'your email'}`
                : 'Choose a new password for your account.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'identify' && (
          <form onSubmit={onSendOtp} className="space-y-4 pt-2" noValidate>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email or mobile number</label>
              <Input
                autoFocus
                autoComplete="username"
                placeholder="admin@propnetra.com or 9876543210"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className={inputClass('identifier')}
              />
              {fieldError('identifier')}
              <p className="text-xs text-gray-500">
                Only super admin can reset password here. Team members, please contact your
                super admin.
              </p>
            </div>
            {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
            <Button type="submit" className="h-11 w-full" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send OTP
            </Button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={onVerify} className="space-y-4 pt-2" noValidate>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">6-digit OTP</label>
              <Input
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className={cn(inputClass('otp'), 'text-center text-lg', otp && 'tracking-[0.4em]')}
              />
              {fieldError('otp')}
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-gray-500">OTP sent to {emailMasked || 'your email'}</span>
                <button
                  type="button"
                  onClick={() => void onResend()}
                  disabled={resendSecondsLeft > 0 || resending}
                  className="font-medium text-primary disabled:cursor-not-allowed disabled:text-gray-400"
                >
                  {resending
                    ? 'Sending...'
                    : resendSecondsLeft > 0
                      ? `Resend OTP in ${resendSecondsLeft}s`
                      : 'Resend OTP'}
                </button>
              </div>
              {info && !error && <p className="text-xs text-emerald-600">{info}</p>}
            </div>
            {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
            <Button type="submit" className="h-11 w-full" disabled={busy || otp.length !== 6}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify OTP
            </Button>
            <button
              type="button"
              onClick={() => {
                clearMessages();
                setStep('identify');
              }}
              className="mx-auto flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Change email or mobile
            </button>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={onSubmitReset} className="space-y-4 pt-2" noValidate>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">New password</label>
              <PasswordInput
                autoFocus
                autoComplete="new-password"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass('newPassword')}
              />
              {fieldError('newPassword')}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Confirm password</label>
              <PasswordInput
                autoComplete="new-password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass('confirmPassword')}
              />
              {fieldError('confirmPassword')}
            </div>
            {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
            <Button
              type="submit"
              className="h-11 w-full"
              disabled={busy || !newPassword || !confirmPassword}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reset password
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
