// frontend/src/types/transactions.ts

// ─── 4.1 Order Ledger ────────────────────────────────────────────────────────
export interface InvoiceRow {
  id: number
  invoice_number: string
  invoice_date: string
  customer: {
    id: number
    code: string
    name: string
    business_unit: string | null
  }
  company: {
    id: number
    name: string
  }
  total_revenue: number
  total_gp: number
  gp_margin_percent: number
  category_count: number
  import_source: string | null
}

export interface InvoiceParams {
  company_id?: number | 'all'
  branch_id?: number
  // Division sekarang FK integer per company (task012 v2) — division_id, bukan
  // string key lagi.
  business_unit?: number
  exclude_intercompany?: boolean
  date_from?: string
  date_to?: string
  customer_search?: string
  sort_by?: 'invoice_date' | 'total_revenue' | 'total_gp'
    | 'invoice_number' | 'company' | 'customer' | 'business_unit'
    | 'gp_margin_percent' | 'category_count' | 'import_source'
  sort_dir?: 'asc' | 'desc'
  page?: number
  per_page?: number
}

export interface InvoicesSummary {
  total_revenue: number
  total_gp: number
  gp_margin_percent: number
}

// Filter kartu ringkasan (2026-08-29) — SAMA PERSIS InvoiceParams minus
// sort/pagination (aggregate 1 baris, bukan list).
export type InvoicesSummaryParams = Omit<InvoiceParams, 'sort_by' | 'sort_dir' | 'page' | 'per_page'>

export interface InvoiceDetail {
  id: number
  invoice_number: string
  invoice_date: string
  customer: {
    id: number
    code: string
    name: string
  }
  company: {
    id: number
    name: string
  }
  total_revenue: number
  total_gp: number
  items: InvoiceItem[]
}

export interface InvoiceItem {
  id: number
  product_name: string
  category: {
    id: number
    name: string
    is_high_margin: boolean
  }
  revenue: number
  gross_profit: number
}