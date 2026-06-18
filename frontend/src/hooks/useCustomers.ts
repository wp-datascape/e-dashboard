// frontend/src/hooks/useCustomers.ts
import { useQuery } from '@tanstack/react-query';
import { customersApi } from '@/api/customers.api';
import type { Customer360Params } from '@/types/customers';

export function useCustomers360(params: Customer360Params) {
  return useQuery({
    queryKey: ['customers360', params],
    queryFn: () => customersApi.getCustomers360(params),
    enabled: !!params.company_id,
  });
}

export function useCustomer360Detail(id: number | null) {
  return useQuery({
    queryKey: ['customer360Detail', id],
    queryFn: () => customersApi.getCustomer360Detail(id!),
    enabled: !!id,
  });
}
