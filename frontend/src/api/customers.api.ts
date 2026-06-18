// frontend/src/api/customers.api.ts
import { api } from './axios';
import type { PaginatedResponse } from '@/types/api';
import type { Customer360Row, Customer360Detail, Customer360Params } from '@/types/customers';

export const customersApi = {
  // GET /customers/360 — master table dengan data agregat
  getCustomers360: async (params: Customer360Params): Promise<PaginatedResponse<Customer360Row>> => {
    const response = await api.get<PaginatedResponse<Customer360Row>>('/customers/360', { params });
    return response.data;
  },

  // GET /customers/:id/360 — detail satu customer
  getCustomer360Detail: async (id: number): Promise<Customer360Detail> => {
    const response = await api.get<{ message: string; data: Customer360Detail }>(`/customers/${id}/360`);
    return response.data.data;
  },
};
