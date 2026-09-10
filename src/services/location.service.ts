import { axiosClient } from '@/lib/axios-client';
import { deleteWithRemark } from '@/lib/delete-with-remark';
import * as XLSX from 'xlsx';

const LOCATION_IMPORT_HEADERS = ['State', 'City', 'Micro Market', 'Location', 'Property Name'] as const;

const LOCATION_IMPORT_SAMPLE_ROWS: string[][] = [
  ['Haryana', 'Gurugram', 'Golf Course Road', 'Sector 54', 'DLF The Camellias'],
  ['Haryana', 'Gurugram', 'Golf Course Extension', 'Sector 65', 'M3M Latitude'],
  ['Maharashtra', 'Mumbai', 'Bandra West', 'Pali Hill', ''],
];

function buildLocationImportTemplateBlob(): Blob {
  const sheetData = [LOCATION_IMPORT_HEADERS as unknown as string[], ...LOCATION_IMPORT_SAMPLE_ROWS];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  worksheet['!cols'] = [
    { wch: 16 },
    { wch: 14 },
    { wch: 24 },
    { wch: 14 },
    { wch: 22 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Locations');
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const locationService = {
  // =====================
  // STATES
  // =====================
  getStates: async () => {
    const response = await axiosClient.get('/admin/states');
    return response.data;
  },
  createState: async (payload: { name: string; is_active?: boolean }) => {
    const response = await axiosClient.post('/admin/states', payload);
    return response.data;
  },
  updateState: async (id: string, payload: { name?: string; is_active?: boolean }) => {
    const response = await axiosClient.put(`/admin/states/${id}`, payload);
    return response.data;
  },
  deleteState: async (id: string, remark: string) => {
    const response = await deleteWithRemark(`/admin/states/${id}`, remark);
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
  deleteCity: async (id: string, remark: string) => {
    const response = await deleteWithRemark(`/admin/cities/${id}`, remark);
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
  deleteMicroMarket: async (id: string, remark: string) => {
    const response = await deleteWithRemark(`/admin/micro-markets/${id}`, remark);
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
  deleteLocation: async (id: string, remark: string) => {
    const response = await deleteWithRemark(`/admin/locations/${id}`, remark);
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
  getPropertyNames: async (params?: {
    cityId?: string;
    microMarketId?: string;
    categoryId?: string;
    q?: string;
    limit?: number;
    excludeId?: string;
  }) => {
    let url = '/admin/property-names';
    const qs: string[] = [];
    if (params?.cityId) qs.push(`cityId=${encodeURIComponent(params.cityId)}`);
    if (params?.microMarketId) qs.push(`microMarketId=${encodeURIComponent(params.microMarketId)}`);
    if (params?.categoryId) qs.push(`categoryId=${encodeURIComponent(params.categoryId)}`);
    if (params?.q) qs.push(`q=${encodeURIComponent(params.q)}`);
    if (params?.limit) qs.push(`limit=${params.limit}`);
    if (params?.excludeId) qs.push(`excludeId=${encodeURIComponent(params.excludeId)}`);
    if (qs.length) url += '?' + qs.join('&');
    const response = await axiosClient.get(url);
    return response.data;
  },

  suggestPropertyNames: async (params: {
    q: string;
    excludeId?: string;
    limit?: number;
  }): Promise<{
    items: Array<{
      id: string;
      name: string;
      status?: string | null;
      cityName?: string | null;
      exactMatch?: boolean;
    }>;
  }> => {
    const qs: string[] = [`q=${encodeURIComponent(params.q)}`];
    if (params.excludeId) qs.push(`excludeId=${encodeURIComponent(params.excludeId)}`);
    if (params.limit) qs.push(`limit=${params.limit}`);
    const response = await axiosClient.get(`/admin/property-names/suggest?${qs.join('&')}`);
    const body = response.data as
      | { items?: unknown }
      | { data?: { items?: unknown } }
      | unknown;
    const nested =
      body && typeof body === 'object' && 'data' in body
        ? (body as { data?: { items?: unknown } }).data
        : body;
    const items =
      nested && typeof nested === 'object' && Array.isArray((nested as { items?: unknown }).items)
        ? ((nested as { items: unknown[] }).items as Array<{
            id: string;
            name: string;
            status?: string | null;
            cityName?: string | null;
            exactMatch?: boolean;
          }>)
        : [];
    return { items };
  },
  createPropertyName: async (payload: {
    name: string;
    city_id: string;
    micro_market_id: string;
    property_type_id: string;
    image_url: string;
    location_ids?: string[];
  }) => {
    const response = await axiosClient.post('/admin/property-names', payload);
    return response.data;
  },
  updatePropertyName: async (id: string, payload: any) => {
    const response = await axiosClient.put(`/admin/property-names/${id}`, payload);
    return response.data;
  },
  deletePropertyName: async (id: string, remark: string) => {
    const response = await deleteWithRemark(`/admin/property-names/${id}`, remark);
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

  // =====================
  // EXCEL IMPORT
  // =====================
  importExcel: async (file: File): Promise<LocationImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosClient.post('/admin/locations/import-excel', formData, {
      headers: { 'Content-Type': undefined },
    });
    return response.data;
  },

  downloadImportTemplate: (): void => {
    // Generate a real .xlsx in the browser so Excel always opens a valid file
    // (API template responses are often JSON/error blobs saved as .xlsx).
    const blob = buildLocationImportTemplateBlob();
    triggerBlobDownload(blob, 'locations-import-template.xlsx');
  },
};

export type LocationImportResult = {
  totalRows: number;
  processed: number;
  created: {
    states: number;
    cities: number;
    microMarkets: number;
    locations: number;
    propertyNames: number;
  };
  skipped: number;
  errors: { row: number; message: string }[];
};
