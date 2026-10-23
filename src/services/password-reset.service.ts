import { axiosClient } from "@/lib/axios-client";

export type PasswordOtpSent = {
  otpSent: boolean;
  channel: "email";
  emailMasked: string;
  expiresIn: number;
  message?: string;
};

export type AdminPasswordOtpSent = PasswordOtpSent & {
  target?: { id: string; name: string };
};

export type PasswordResetTarget = {
  id: string;
  name: string;
  email: string;
  contact: string;
  roleName: string;
  isSuperAdmin: boolean;
  isSelf: boolean;
};

export type ApiErrorInfo = {
  status?: number;
  code?: string;
  message: string;
  field?: string;
};

/** Reads `{ error: { code, message, field } }` (falls back to `{ message }`). */
export function apiErrorInfo(err: unknown, fallback: string): ApiErrorInfo {
  const response = (err as { response?: { status?: number; data?: unknown } })?.response;
  const data = response?.data as
    | { message?: unknown; error?: { code?: unknown; message?: unknown; field?: unknown } | string }
    | undefined;
  const nested = data && typeof data.error === "object" ? data.error : undefined;
  const message =
    (typeof nested?.message === "string" && nested.message.trim()) ||
    (typeof data?.message === "string" && data.message.trim()) ||
    (typeof data?.error === "string" && data.error.trim()) ||
    fallback;
  return {
    status: response?.status,
    code: typeof nested?.code === "string" ? nested.code : undefined,
    field: typeof nested?.field === "string" && nested.field ? nested.field : undefined,
    message,
  };
}

function str(v: unknown) {
  return v == null ? "" : String(v);
}

function asTargets(raw: unknown): PasswordResetTarget[] {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { items?: unknown })?.items)
      ? (raw as { items: unknown[] }).items
      : [];
  return list
    .map((row) => {
      const r = (row || {}) as Record<string, unknown>;
      const id = str(r.id);
      if (!id) return null;
      const isSuperAdmin = r.isSuperAdmin === true;
      const isSelf = r.isSelf === true;
      return {
        id,
        name: str(r.name),
        email: str(r.email),
        contact: str(r.contact),
        roleName: str(r.roleName),
        isSuperAdmin,
        isSelf,
      } satisfies PasswordResetTarget;
    })
    .filter((row): row is PasswordResetTarget => row !== null);
}

const FORGOT = "/auth/admin/forgot-password";

export const forgotPasswordService = {
  sendOtp: async (identifier: string): Promise<PasswordOtpSent> => {
    const res = await axiosClient.post(`${FORGOT}/send-otp`, { identifier });
    return res.data;
  },
  resendOtp: async (identifier: string): Promise<PasswordOtpSent> => {
    const res = await axiosClient.post(`${FORGOT}/resend-otp`, { identifier });
    return res.data;
  },
  verifyOtp: async (identifier: string, otp: string): Promise<{ verified: boolean }> => {
    const res = await axiosClient.post(`${FORGOT}/verify-otp`, { identifier, otp });
    return res.data;
  },
  reset: async (body: {
    identifier: string;
    otp: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<{ success: boolean }> => {
    const res = await axiosClient.post(`${FORGOT}/reset`, body);
    return res.data;
  },
};

export const adminPasswordService = {
  listTargets: async (): Promise<PasswordResetTarget[]> => {
    const res = await axiosClient.get("/admin/password/targets");
    return asTargets(res.data);
  },
  /** The OTP always goes to the super admin email, whichever user is targeted. */
  sendOtp: async (targetUserId: string): Promise<AdminPasswordOtpSent> => {
    const res = await axiosClient.post("/admin/password/send-otp", { targetUserId });
    return res.data;
  },
  reset: async (body: {
    targetUserId: string;
    otp: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<{ success: boolean; message?: string }> => {
    const res = await axiosClient.post("/admin/password/reset", body);
    return res.data;
  },
};
