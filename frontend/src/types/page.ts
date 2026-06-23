// src/types/page.ts

export interface PageSetting {
  page_key: string;
  ready: boolean;
}

export interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}

export interface ConfigItem {
  key: string;
  value: string;
  description?: string;
}

export type ConfigListResponse = ApiResponse<ConfigItem[]>;
export type ConfigUpdateResponse = ApiResponse<ConfigItem>;