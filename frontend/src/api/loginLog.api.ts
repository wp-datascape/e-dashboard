import { api } from './axios'
import type { LoginLogResponse, LoginLogFilters } from '@/types/loginLog'

export const loginLogApi = {
  getLoginLogs: async (filters: LoginLogFilters): Promise<LoginLogResponse> => {
    const response = await api.get<LoginLogResponse>('/login-logs', { params: filters })
    return response.data
  },
}
