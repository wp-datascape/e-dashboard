// src/api/page.api.ts
import { api } from './axios';
import { PageSetting, ConfigItem } from '@/types/page';
import { ApiResponse } from '@/types/api';

export const pageApi = {
  getPageSettings: async (): Promise<ApiResponse<PageSetting[]>> => {
    const response = await api.get<ApiResponse<PageSetting[]>>('/page-settings');
    return response.data;
  },

  updatePageSetting: async (pageKey: string, ready: boolean): Promise<ApiResponse<PageSetting>> => {
    const response = await api.put<ApiResponse<PageSetting>>(
      `/page-settings/${encodeURIComponent(pageKey)}`,
      { ready }
    );
    return response.data;
  },

  getConfig: async (): Promise<ApiResponse<ConfigItem[]>> => {
    const response = await api.get<ApiResponse<ConfigItem[]>>('/config');
    return response.data;
  },

  updateConfig: async (key: string, value: string): Promise<ApiResponse<ConfigItem>> => {
    const response = await api.put<ApiResponse<ConfigItem>>(
      `/config/${encodeURIComponent(key)}`,
      { value }
    );
    return response.data;
  },
};
