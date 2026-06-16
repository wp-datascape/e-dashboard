// src/api/page.api.ts
import { PageSetting } from '@/types/page';
import { ApiResponse } from '@/types/api';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const pageApi = {
  getPageSettings: async (): Promise<ApiResponse<PageSetting[]>> => {
    // Gunakan BASE_URL yang identik dengan matcher MSW
    const response = await fetch(`${BASE_URL}/page-settings`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        status: response.status,
        message: errorData.message || 'Gagal memuat konfigurasi halaman.',
        error: errorData.error || 'SERVER_ERROR',
      };
    }

    return response.json();
  },
};