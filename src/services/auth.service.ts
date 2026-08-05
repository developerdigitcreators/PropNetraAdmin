import { axiosClient } from "@/lib/axios-client";
import { LoginFormData } from "@/validators/auth.schema";

export const authService = {
  login: async (data: LoginFormData) => {
    const response = await axiosClient.post("/auth/admin/login", data);
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
