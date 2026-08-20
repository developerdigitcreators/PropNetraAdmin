import { axiosClient } from "@/lib/axios-client";
import { deleteWithRemark } from "@/lib/delete-with-remark";

export const rbacService = {
  getRoles: async (audience?: "admin_panel" | "app") => {
    const params = audience ? { audience } : {};
    const response = await axiosClient.get("/admin/rbac/roles", { params });
    return response.data;
  },

  getPermissionScopes: async () => {
    const response = await axiosClient.get("/admin/rbac/permissions/scopes");
    const raw = response.data;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === "object" && Array.isArray(raw.data)) return raw.data;
    return [];
  },

  createRole: async (data: any) => {
    const response = await axiosClient.post("/admin/rbac/roles", data);
    return response.data;
  },

  updateRole: async (id: string, data: any) => {
    const response = await axiosClient.put(`/admin/rbac/roles/${id}`, data);
    return response.data;
  },

  deleteRole: async (id: string, remark: string) => {
    const response = await deleteWithRemark(`/admin/rbac/roles/${id}`, remark);
    return response.data;
  },

  getUserRoles: async (userId: string) => {
    const response = await axiosClient.get(`/admin/rbac/users/${userId}/roles`);
    return response.data;
  },

  assignRole: async (userId: string, roleId: string) => {
    const response = await axiosClient.post(
      `/admin/rbac/users/${userId}/roles/${roleId}`,
    );
    return response.data;
  },

  revokeRole: async (userId: string, roleId: string) => {
    const response = await axiosClient.delete(
      `/admin/rbac/users/${userId}/roles/${roleId}`,
    );
    return response.data;
  },
};
