// frontend/src/api/customers.api.ts
import { api } from './axios';
import type { PaginatedResponse } from '@/types/api';
import type { CustomerRow, CustomerDetail, CustomerParams } from '@/types/customers';

export const customersApi = {
  // GET /customers — daftar customer dengan data agregat
  getCustomers: async (params: CustomerParams): Promise<PaginatedResponse<CustomerRow>> => {
    const response = await api.get<PaginatedResponse<CustomerRow>>('/customers', { params });
    return response.data;
  },

  // GET /customers/:id — detail satu customer
  getCustomerDetail: async (id: number, asOfDate?: string): Promise<CustomerDetail> => {
    const response = await api.get<{ message: string; data: CustomerDetail }>(`/customers/${id}`, {
      params: { as_of_date: asOfDate },
    });
    return response.data.data;
  },
};
