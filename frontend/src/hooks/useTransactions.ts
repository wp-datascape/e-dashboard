// frontend/src/hooks/useTransactions.ts
import { useQuery } from '@tanstack/react-query'
import { transactionsApi } from '@/api/transactions.api'
import type { InvoiceParams } from '@/types/transactions'

export const TRANSACTIONS_KEYS = {
  invoices: (params: InvoiceParams) => ['transactions', 'invoices', params] as const,
  invoiceDetail: (id: number | null) => ['transactions', 'invoice-detail', id] as const,
}

export function useInvoices(params: InvoiceParams) {
  return useQuery({
    queryKey: TRANSACTIONS_KEYS.invoices(params),
    queryFn: () => transactionsApi.getInvoices(params),
  })
}

export function useInvoiceDetail(id: number | null) {
  return useQuery({
    queryKey: TRANSACTIONS_KEYS.invoiceDetail(id),
    queryFn: () => transactionsApi.getInvoiceDetail(id!),
    enabled: id !== null,
  })
}