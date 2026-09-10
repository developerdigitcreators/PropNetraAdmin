import axios from 'axios';
import { useAuthStore } from '@/store/use-auth-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

function isAdminLoginRequest(url?: string) {
  return typeof url === 'string' && url.includes('/auth/admin/login');
}

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token && !isAdminLoginRequest(config.url)) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => {
    // Automatically unwrap standard backend responses { success, data, timestamp }
    if (response.data && response.data.success !== undefined && response.data.data !== undefined) {
      response.data = response.data.data;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAdminLoginRequest(originalRequest.url)
    ) {
      originalRequest._retry = true;
      try {
        // Handle token refresh logic here if a refresh token is stored in httpOnly cookies
        // If refresh fails, logout
        // For now, if we get 401, we just log out
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      } catch (err) {
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);
