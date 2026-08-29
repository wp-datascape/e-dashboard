// frontend/src/api/transactions.api.ts
import { api } from './axios'
import type { PaginatedResponse, ApiResponse } from '@/types/api'
import type { InvoiceRow, InvoiceParams, InvoicesSummary, InvoicesSummaryParams, InvoiceDetail } from '@/types/transactions'

export const transactionsApi = {
  getInvoices: async (params: InvoiceParams): Promise<PaginatedResponse<InvoiceRow>> => {
    const res = await api.get<PaginatedResponse<InvoiceRow>>('/invoices', { params })
    return res.data
  },

  // Kartu ringkasan Revenue/Laba Kotor/Margin (2026-08-29) — filter sama
  // persis getInvoices, tanpa sort/pagination.
  getInvoicesSummary: async (params: InvoicesSummaryParams): Promise<InvoicesSummary> => {
    const res = await api.get<ApiResponse<InvoicesSummary>>('/invoices/summary', { params })
    return res.data.data
  },

  getInvoiceDetail: async (id: number): Promise<InvoiceDetail> => {
    const res = await api.get<ApiResponse<InvoiceDetail>>(`/invoices/${id}`)
    return res.data.data
  },
}