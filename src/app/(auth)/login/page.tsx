'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import {
  authApiErrorMessage,
  authService,
} from '@/services/auth.service';
import { useAuthStore } from '@/store/use-auth-store';
import {
  LoginSchema,
  LoginFormData,
  VerifyOtpSchema,
  VerifyOtpFormData,
} from '@/validators/auth.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RoleSelectionModal } from '@/components/common/role-selection-modal';
import { cn } from '@/lib/utils';
import { ArrowLeft, Loader2 } from 'lucide-react';

type SelectableRole = { id: string; name: string };
type LoginStep = 'credentials' | 'otp';

const RESEND_COOLDOWN_SEC = 30;
const DEFAULT_OTP_TTL_SEC = 300;

function normalizeRoles(user: any, extraRoles?: unknown): SelectableRole[] {
  const raw = Array.isArray(user?.roles)
    ? user.roles
    : Array.isArray(extraRoles)
      ? extraRoles
      : [];

  if (raw.length === 0) {
    if (user?.role) {
      return [{ id: String(user.role), name: String(user.role) }];
    }
    return [];
  }

  return raw
    .map((role: any, index: number) => {
      if (typeof role === 'string') {
        return { id: role, name: role };
      }
      if (role && typeof role === 'object' && role.name) {
        return {
          id: String(role.id ?? role.name ?? index),
          name: String(role.name),
        };
      }
      return null;
    })
    .filter(Boolean) as SelectableRole[];
}

function unwrapAuthPayload(res: any) {
  if (
    res &&
    typeof res === 'object' &&
    res.data &&
    typeof res.data === 'object' &&
    (res.data.user != null ||
      res.data.token != null ||
      res.data.accessToken != null ||
      res.data.requiresOtp != null)
  ) {
    return res.data;
  }
  return res;
}

function readAccessToken(payload: any) {
  if (typeof payload?.token === 'string') return payload.token;
  if (typeof payload?.accessToken === 'string') return payload.accessToken;
  return '';
}

function formatCountdown(totalSeconds: number) {
  const clamped = Math.max(0, totalSeconds);
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function LoginPage() {
  const router = useRouter();
  const setAuthData = useAuthStore((state) => state.setAuthData);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [rolesToSelect, setRolesToSelect] = useState<SelectableRole[] | null>(null);
  const [step, setStep] = useState<LoginStep>('credentials');
  const [pendingEmail, setPendingEmail] = useState('');
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [resending, setResending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
  });

  const {
    register: registerOtp,
    handleSubmit: handleOtpSubmit,
    setValue: setOtpValue,
    reset: resetOtp,
    watch: watchOtp,
    formState: { errors: otpErrors, isSubmitting: isVerifying },
  } = useForm<VerifyOtpFormData>({
    resolver: zodResolver(VerifyOtpSchema),
    defaultValues: { otp: '' },
  });
  const otpValue = watchOtp('otp');

  useEffect(() => {
    if (step !== 'otp') return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [step]);

  const otpSecondsLeft = otpExpiresAt
    ? Math.max(0, Math.ceil((otpExpiresAt - now) / 1000))
    : 0;
  const resendSecondsLeft = resendAvailableAt
    ? Math.max(0, Math.ceil((resendAvailableAt - now) / 1000))
    : 0;
  const otpExpired = step === 'otp' && otpExpiresAt != null && otpSecondsLeft <= 0;

  const beginOtpStep = (email: string, payload: any) => {
    const ttl = Number(payload?.expiresIn);
    const expiresIn =
      Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_OTP_TTL_SEC;
    const startedAt = Date.now();
    setPendingEmail(email);
    setOtpExpiresAt(startedAt + expiresIn * 1000);
    setResendAvailableAt(startedAt + RESEND_COOLDOWN_SEC * 1000);
    setNow(startedAt);
    setError('');
    resetOtp({ otp: '' });
    setStep('otp');
  };

  const completeSession = (payload: any) => {
    const user = payload?.user;
    const accessToken = readAccessToken(payload);
    const perms = Array.isArray(payload?.permissions)
      ? payload.permissions
      : user?.permissions || [];
    const roles = normalizeRoles(user, payload?.roles);

    if (!accessToken) {
      setError('Login failed: no access token received. Please try again.');
      return false;
    }

    setAuthData(user, accessToken, perms, roles.length <= 1, {
      expiresIn: payload?.expiresIn,
      tokenExpiresAt: payload?.tokenExpiresAt,
    });

    if (roles.length > 1) {
      setRolesToSelect(roles);
      return true;
    }

    const primaryRole = roles[0]?.name || user?.role || 'User';
    useAuthStore.getState().setActiveRole(primaryRole);
    router.push('/');
    return true;
  };

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError('');
      setInfo('');
      setRolesToSelect(null);

      const res = await authService.login(data);
      const payload = unwrapAuthPayload(res);
      const email =
        typeof payload?.email === 'string' && payload.email.trim()
          ? payload.email
          : data.email;

      if (payload?.requiresOtp === true) {
        beginOtpStep(email, payload);
        return;
      }

      if (!readAccessToken(payload)) {
        setError('Login failed: no access token received. Please try again.');
        return;
      }

      completeSession(payload);
    } catch (err: unknown) {
      setError(authApiErrorMessage(err, 'Invalid credentials. Please try again.'));
    }
  };

  const onVerifyOtp = async (data: VerifyOtpFormData) => {
    try {
      setError('');
      const res = await authService.verifyOtp({
        email: pendingEmail,
        otp: data.otp,
      });
      const payload = unwrapAuthPayload(res);
      completeSession(payload);
    } catch (err: unknown) {
      setError(authApiErrorMessage(err, 'Invalid or expired OTP. Please try again.'));
    }
  };

  const onResendOtp = async () => {
    if (resendSecondsLeft > 0 || resending) return;
    try {
      setResending(true);
      setError('');
      const res = await authService.resendOtp(pendingEmail);
      const payload = unwrapAuthPayload(res);
      beginOtpStep(pendingEmail, payload);
      setInfo('New code sent');
    } catch (err: unknown) {
      setError(
        authApiErrorMessage(err, 'Could not resend OTP. Please try again.'),
      );
    } finally {
      setResending(false);
    }
  };

  const backToCredentials = () => {
    setStep('credentials');
    setError('');
    setInfo('');
    setOtpExpiresAt(null);
    setResendAvailableAt(null);
    resetOtp({ otp: '' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFEED]">
      <div className="w-full max-w-md p-8 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">PropNetra</h1>
          {step === 'otp' ? (
            <p className="text-gray-500 text-sm leading-relaxed">
              Enter the code sent to
              <br />
              <span className="font-medium text-gray-800">{pendingEmail}</span>
            </p>
          ) : (
            <p className="text-gray-500 text-sm">Welcome back! Please enter your details.</p>
          )}
        </div>

        {step === 'credentials' ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <Input
                type="email"
                autoComplete="email"
                placeholder="admin@propnetra.com"
                {...register('email')}
                className={`h-12 bg-gray-50 border-gray-200 focus-visible:ring-primary ${errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <Input
                type="password"
                autoComplete="current-password"
                placeholder="••••••"
                {...register('password')}
                className={`h-12 bg-gray-50 border-gray-200 focus-visible:ring-primary ${errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 rounded-lg">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold transition-all hover:opacity-90 bg-primary text-primary-foreground shadow-lg shadow-primary/30"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit(onVerifyOtp)} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Verification code</label>
              <Input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={8}
                placeholder="Enter OTP"
                {...registerOtp('otp', {
                  onChange: (event) => {
                    const digits = event.target.value.replace(/\D/g, '').slice(0, 8);
                    setOtpValue('otp', digits, {
                      shouldValidate: digits.length >= 4,
                    });
                  },
                })}
                className={cn(
                  'h-12 bg-gray-50 border-gray-200 text-center text-lg focus-visible:ring-primary',
                  otpValue && 'tracking-[0.4em]',
                  otpErrors.otp && 'border-red-500 focus-visible:ring-red-500',
                )}
              />
              {otpErrors.otp && (
                <p className="text-red-500 text-xs">{otpErrors.otp.message}</p>
              )}
              <div className="flex items-center justify-between gap-3 pt-0.5 text-xs">
                <p className={otpExpired ? 'text-red-500' : 'text-gray-500'}>
                  {otpExpired
                    ? 'Code expired'
                    : `Expires in ${formatCountdown(otpSecondsLeft)}`}
                </p>
                <button
                  type="button"
                  onClick={onResendOtp}
                  disabled={resendSecondsLeft > 0 || resending}
                  className="font-medium text-primary disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {resending
                    ? 'Sending...'
                    : resendSecondsLeft > 0
                      ? `Resend in ${resendSecondsLeft}s`
                      : 'Resend code'}
                </button>
              </div>
              {info && !error && (
                <p className="text-xs text-emerald-600">{info}</p>
              )}
            </div>

            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 rounded-lg">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold transition-all hover:opacity-90 bg-primary text-primary-foreground shadow-lg shadow-primary/30"
              disabled={isVerifying || otpExpired}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify and sign in'
              )}
            </Button>

            <button
              type="button"
              onClick={backToCredentials}
              className="mx-auto flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Use a different email
            </button>
          </form>
        )}
      </div>

      {rolesToSelect && (
        <RoleSelectionModal
          roles={rolesToSelect}
          onComplete={() => {
            setRolesToSelect(null);
            router.push('/');
          }}
        />
      )}
    </div>
  );
}
