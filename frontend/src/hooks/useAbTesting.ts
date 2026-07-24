import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { abTestingApi } from '@/api/abTesting.api';
import type { NetworkThrottleMode, ConfigurableThrottleMode } from '@/api/abTesting.api';

export function useNetworkThrottle() {
  return useQuery({
    queryKey: ['ab-testing', 'network-throttle'],
    queryFn: () => abTestingApi.getNetworkThrottle(),
  });
}

export function useUpdateNetworkThrottle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mode: NetworkThrottleMode) => abTestingApi.updateNetworkThrottle(mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-testing', 'network-throttle'] });
    },
  });
}

export function useUpdateNetworkThrottleDelay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ mode, delayMs }: { mode: ConfigurableThrottleMode; delayMs: number }) =>
      abTestingApi.updateNetworkThrottleDelay(mode, delayMs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ab-testing', 'network-throttle'] });
    },
  });
}
