// src/types/page.ts

export interface PageSetting {
  pageKey: string;
  ready: boolean;
}

export interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}