import { api } from './axios'
import type { ActivityLogResponse, ActivityLogFilters } from '@/types/activityLog'

export const activityLogApi = {
  getActivityLogs: async (filters: ActivityLogFilters): Promise<ActivityLogResponse> => {
    const response = await api.get<ActivityLogResponse>('/activity-logs', { params: filters })
    return response.data
  },

  // Self-report navigasi user — dipanggil dari usePageViewTracking tiap route berubah.
  trackPageView: async (path: string, module?: string): Promise<void> => {
    await api.post('/activity-logs/page-view', { path, module })
  },
}
