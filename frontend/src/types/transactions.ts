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
  business_unit?: string
  exclude_intercompany?: boolean
  date_from?: string
  date_to?: string
  customer_search?: string
  sort_by?: 'invoice_date' | 'total_revenue' | 'total_gp'
  sort_dir?: 'asc' | 'desc'
  page?: number
  per_page?: number
}

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