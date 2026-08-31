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

  // Export Excel (2026-08-31) — filter SAMA PERSIS getCustomers minus
  // page/per_page/sort_by/sort_dir, SATU request ke backend
  // (`/customers/export`), pola sama persis transactionsApi.exportInvoices.
  // `fields` opsional (2026-08-31, dialog pilih kolom) — array key, digabung
  // jadi 1 query param comma-separated, kosong/undefined = export semua
  // kolom (default backend).
  exportCustomers: async (
    params: Omit<CustomerParams, 'page' | 'per_page' | 'sort_by' | 'sort_dir'>,
    fields?: string[]
  ): Promise<void> => {
    const res = await api.get('/customers/export', {
      params: { ...params, fields: fields?.length ? fields.join(',') : undefined },
      responseType: 'blob',
    });
    const contentDisposition = String(res.headers['content-disposition'] ?? '');
    const match = /filename="([^"]+)"/.exec(contentDisposition);
    const filename = match?.[1] ?? 'customer.xlsx';
    const url = URL.createObjectURL(new Blob([res.data as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};
