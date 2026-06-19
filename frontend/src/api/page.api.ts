// src/api/page.api.ts
import { PageSetting, ConfigItem } from '@/types/page';
import { ApiResponse } from '@/types/api';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw { status: response.status, message: err.message || 'Request failed' };
  }
  return response.json();
}

export const pageApi = {
  getPageSettings: async (): Promise<ApiResponse<PageSetting[]>> => {
    return apiFetch<PageSetting[]>(`${BASE_URL}/page-settings`);
  },

  getConfig: async (): Promise<ApiResponse<ConfigItem[]>> => {
    return apiFetch<ConfigItem[]>(`${BASE_URL}/config`);
  },

  updateConfig: async (key: string, value: string): Promise<ApiResponse<ConfigItem>> => {
    return apiFetch<ConfigItem>(`${BASE_URL}/config/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
  },
};