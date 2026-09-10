import { axiosClient } from "@/lib/axios-client";
import { LoginFormData } from "@/validators/auth.schema";

export type AdminOtpChallenge = {
  requiresOtp: true;
  email: string;
  channel?: string;
  expiresIn?: number;
  message?: string;
};

export const authService = {
  login: async (data: LoginFormData) => {
    const response = await axiosClient.post("/auth/admin/login", {
      email: data.email,
      password: data.password,
    });
    return response.data;
  },

  verifyOtp: async (data: { email: string; otp: string }) => {
    const response = await axiosClient.post("/auth/admin/login/verify-otp", data);
    return response.data;
  },

  resendOtp: async (email: string) => {
    const response = await axiosClient.post("/auth/admin/login/resend-otp", {
      email,
    });
    return response.data;
  },

  refreshToken: async (refreshToken: string) => {
    const response = await axiosClient.post("/auth/refresh", { refreshToken });
    return response.data;
  },

  // Mocking the get permissions since it might be part of login response or a separate endpoint
  // Based on architecture pdf: "/admin/permissions"
  getPermissions: async (roleId: string) => {
    const response = await axiosClient.get(
      `/admin/permissions?roleId=${roleId}`,
    );
    return response.data;
  },
};

export function authApiErrorMessage(err: unknown, fallback: string) {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (data && typeof data === "object") {
    const record = data as { message?: unknown; error?: unknown };
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message;
    }
    if (typeof record.error === "string" && record.error.trim()) {
      return record.error;
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
