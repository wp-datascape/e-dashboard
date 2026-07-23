// frontend/src/hooks/useCustomers.ts
import { useQuery } from '@tanstack/react-query';
import { customersApi } from '@/api/customers.api';
import type { CustomerParams } from '@/types/customers';

export function useCustomers(params: CustomerParams) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: () => customersApi.getCustomers(params),
    enabled: !!params.company_id,
  });
}

export function useCustomerDetail(id: number | null, asOfDate?: string) {
  return useQuery({
    queryKey: ['customerDetail', id, asOfDate],
    queryFn: () => customersApi.getCustomerDetail(id!, asOfDate),
    enabled: !!id,
  });
}

// ─── Backward-compat aliases ───────────────────────────────────────────────────
/** @deprecated gunakan useCustomers */
export const useCustomers360 = useCustomers;
/** @deprecated gunakan useCustomerDetail */
export const useCustomer360Detail = useCustomerDetail;
