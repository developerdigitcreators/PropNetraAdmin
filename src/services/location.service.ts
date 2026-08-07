import { axiosClient } from '@/lib/axios-client';

export const locationService = {
  // =====================
  // STATES
  // =====================
  getStates: async () => {
    const response = await axiosClient.get('/admin/states');
    return response.data;
  },

  // =====================
  // CITIES
  // =====================
  getCities: async () => {
    const response = await axiosClient.get('/admin/cities');
    return response.data;
  },
  createCity: async (payload: { name: string; is_active?: boolean }) => {
    const response = await axiosClient.post('/admin/cities', payload);
    return response.data;
  },
  updateCity: async (id: string, payload: { name?: string; is_active?: boolean }) => {
    const response = await axiosClient.put(`/admin/cities/${id}`, payload);
    return response.data;
  },
  deleteCity: async (id: string) => {
    const response = await axiosClient.delete(`/admin/cities/${id}`);
    return response.data;
  },

  // =====================
  // MICRO MARKETS
  // =====================
  getMicroMarkets: async (cityId?: string) => {
    const url = cityId ? `/admin/micro-markets?cityId=${cityId}` : '/admin/micro-markets';
    const response = await axiosClient.get(url);
    return response.data;
  },
  createMicroMarket: async (payload: { name: string; city_id: string; is_active?: boolean }) => {
    const response = await axiosClient.post('/admin/micro-markets', payload);
    return response.data;
  },
  updateMicroMarket: async (id: string, payload: any) => {
    const response = await axiosClient.put(`/admin/micro-markets/${id}`, payload);
    return response.data;
  },
  deleteMicroMarket: async (id: string) => {
    const response = await axiosClient.delete(`/admin/micro-markets/${id}`);
    return response.data;
  },
  getPendingMicroMarkets: async () => {
    const response = await axiosClient.get('/admin/micro-markets/pending');
    return response.data;
  },
  approveMicroMarket: async (id: string) => {
    const response = await axiosClient.post(`/admin/micro-markets/${id}/approve`);
    return response.data;
  },
  rejectMicroMarket: async (id: string) => {
    const response = await axiosClient.delete(`/admin/micro-markets/${id}/reject`);
    return response.data;
  },

  // =====================
  // LOCATIONS
  // =====================
  getLocations: async (microMarketId?: string, cityId?: string) => {
    let url = '/admin/locations';
    const params: string[] = [];
    if (microMarketId) params.push(`microMarketId=${microMarketId}`);
    if (cityId) params.push(`cityId=${cityId}`);
    if (params.length) url += '?' + params.join('&');
    const response = await axiosClient.get(url);
    return response.data;
  },
  createLocation: async (payload: { name: string; city_id: string; micro_market_id: string; is_active?: boolean }) => {
    const response = await axiosClient.post('/admin/locations', payload);
    return response.data;
  },
  updateLocation: async (id: string, payload: any) => {
    const response = await axiosClient.put(`/admin/locations/${id}`, payload);
    return response.data;
  },
  deleteLocation: async (id: string) => {
    const response = await axiosClient.delete(`/admin/locations/${id}`);
    return response.data;
  },
  getPendingLocations: async () => {
    const response = await axiosClient.get('/admin/locations/pending');
    return response.data;
  },
  approveLocation: async (id: string) => {
    const response = await axiosClient.post(`/admin/locations/${id}/approve`);
    return response.data;
  },
  rejectLocation: async (id: string) => {
    const response = await axiosClient.delete(`/admin/locations/${id}/reject`);
    return response.data;
  },

  // =====================
  // PROPERTY NAMES
  // =====================
  getPropertyNames: async (params?: { cityId?: string; microMarketId?: string; categoryId?: string }) => {
    let url = '/admin/property-names';
    const qs: string[] = [];
    if (params?.cityId) qs.push(`cityId=${params.cityId}`);
    if (params?.microMarketId) qs.push(`microMarketId=${params.microMarketId}`);
    if (params?.categoryId) qs.push(`categoryId=${params.categoryId}`);
    if (qs.length) url += '?' + qs.join('&');
    const response = await axiosClient.get(url);
    return response.data;
  },
  createPropertyName: async (payload: { name: string; category_id: string; city_id: string; micro_market_id: string; location_ids?: string[] }) => {
    const response = await axiosClient.post('/admin/property-names', payload);
    return response.data;
  },
  updatePropertyName: async (id: string, payload: any) => {
    const response = await axiosClient.put(`/admin/property-names/${id}`, payload);
    return response.data;
  },
  deletePropertyName: async (id: string) => {
    const response = await axiosClient.delete(`/admin/property-names/${id}`);
    return response.data;
  },
  getPendingPropertyNames: async () => {
    const response = await axiosClient.get('/admin/property-names/pending');
    return response.data;
  },
  approvePropertyName: async (id: string) => {
    const response = await axiosClient.post(`/admin/property-names/${id}/approve`);
    return response.data;
  },
  rejectPropertyName: async (id: string) => {
    const response = await axiosClient.delete(`/admin/property-names/${id}/reject`);
    return response.data;
  },
  getPropertyNameDetails: async (id: string) => {
    const response = await axiosClient.get(`/property-names/${id}/details`);
    return response.data;
  },
};
