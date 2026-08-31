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

  // Export Excel (2026-08-30) — filter SAMA PERSIS getInvoicesSummary, SATU
  // request ke backend (`/invoices/export`, query langsung ke DB tanpa
  // batas paginasi, lihat transactions.repository.ts findInvoicesForExport)
  // — BUKAN build dari data yang sudah ada di frontend (cuma 1 halaman
  // tabel), pola sama persis `downloadFakturTemplate` (import.api.ts).
  // `fields` opsional (2026-08-30, dialog pilih kolom) — array key,
  // digabung jadi 1 query param comma-separated, kosong/undefined = export
  // semua kolom (default backend, lihat transactions.schema.ts).
  exportInvoices: async (params: InvoicesSummaryParams, fields?: string[]): Promise<void> => {
    const res = await api.get('/invoices/export', {
      params: { ...params, fields: fields?.length ? fields.join(',') : undefined },
      responseType: 'blob',
    })
    const contentDisposition = String(res.headers['content-disposition'] ?? '')
    const match = /filename="([^"]+)"/.exec(contentDisposition)
    const filename = match?.[1] ?? 'transaksi.xlsx'
    const url = URL.createObjectURL(new Blob([res.data as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  },
}