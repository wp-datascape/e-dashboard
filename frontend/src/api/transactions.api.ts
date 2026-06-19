// frontend/src/api/transactions.api.ts
import { api } from './axios'
import type { PaginatedResponse, ApiResponse } from '@/types/api'
import type { InvoiceRow, InvoiceParams, InvoiceDetail } from '@/types/transactions'

export const transactionsApi = {
  getInvoices: async (params: InvoiceParams): Promise<PaginatedResponse<InvoiceRow>> => {
    const res = await api.get<PaginatedResponse<InvoiceRow>>('/invoices', { params })
    return res.data
  },

  getInvoiceDetail: async (id: number): Promise<InvoiceDetail> => {
    const res = await api.get<ApiResponse<InvoiceDetail>>(`/invoices/${id}`)
    return res.data.data
  },
}