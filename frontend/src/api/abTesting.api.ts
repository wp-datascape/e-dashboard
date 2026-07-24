import { api } from './axios';
import type { ApiResponse } from '@/types/api';

export type NetworkThrottleMode = 'off' | '3g' | '4g' | 'offline';
export type ConfigurableThrottleMode = '3g' | '4g';

export interface NetworkThrottleSetting {
  key: string;
  value: string;
  description: string | null;
  delays: Record<ConfigurableThrottleMode, number>;
}

export const abTestingApi = {
  getNetworkThrottle: async (): Promise<NetworkThrottleSetting> => {
    const res = await api.get<ApiResponse<NetworkThrottleSetting>>('/ab-testing/network-throttle');
    return res.data.data;
  },

  updateNetworkThrottle: async (mode: NetworkThrottleMode): Promise<NetworkThrottleSetting> => {
    const res = await api.put<ApiResponse<NetworkThrottleSetting>>('/ab-testing/network-throttle', { mode });
    return res.data.data;
  },

  updateNetworkThrottleDelay: async (mode: ConfigurableThrottleMode, delayMs: number): Promise<NetworkThrottleSetting> => {
    const res = await api.put<ApiResponse<NetworkThrottleSetting>>('/ab-testing/network-throttle/delay', { mode, delay_ms: delayMs });
    return res.data.data;
  },
};
