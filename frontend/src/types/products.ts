// frontend/src/types/products.ts

// ─── 3.1 Category Performance ────────────────────────────────────────────────
export interface CategoryPerformanceRow {
  id: number
  category_id: number
  category_name: string
  is_high_margin: boolean
  is_service: boolean
  total_revenue: number
  total_gp: number
  gp_margin_percent: number
  invoice_count: number
  customer_count: number
  last_sold_month: string | null
}

export interface CategoryPerformanceParams {
  company_id?: number | 'all'
  branch_id?: number
  division?: string
  period_month?: string
  active_window?: number
  search?: string
  high_margin_only?: boolean
  exclude_intercompany?: boolean
  page?: number
  per_page?: number
  sort_by?: 'total_revenue' | 'total_gp' | 'gp_margin_percent' | 'customer_count'
  sort_dir?: 'asc' | 'desc'
}

// ─── 3.1b Category Products (drawer detail) ──────────────────────────────────
export interface CategoryProductRow {
  id: number
  product_id: number
  product_name: string
  total_revenue: number
  total_gp: number
  gp_margin_percent: number
  invoice_count: number
  customer_count: number
}

export interface CategoryProductsParams {
  company_id?: number | 'all'
  category_id: number
  period_month?: string
  active_window?: number
  exclude_intercompany?: boolean
  page?: number
  per_page?: number
}

// ─── 3.2 High Margin Push List ────────────────────────────────────────────────
export interface HighMarginCategoryRow {
  id: number
  category_id: number
  category_name: string
  is_high_margin: boolean
  customer_count: number
  total_active_customers: number
  penetration_rate: number
  total_revenue: number
  total_gp: number
  gp_margin_percent: number
}

export interface HighMarginDetailParams {
  company_id?: number | 'all'
  branch_id?: number
  division?: string
  exclude_intercompany?: boolean
  period_month?: string
  active_window?: number
  page?: number
  per_page?: number
}

export interface CategoryRef {
  id: number
  name: string
}

export interface UpsellTargetRow {
  id: number
  customer_code: string
  customer_name: string
  business_unit: string | null
  last_invoice_date: string
  avg_monthly_revenue: number
  categories_bought: CategoryRef[]
  missing_high_margin_categories: CategoryRef[]
}

// ─── Customer Products (purchase history drawer) ──────────────────────────────
export interface CustomerProductRow {
  id: number
  product_id: number
  product_name: string
  category_id: number
  category_name: string
  total_revenue: number
  total_gp: number
  gp_margin_percent: number
  invoice_count: number
}

export interface CustomerProductsParams {
  company_id?: number | 'all'
  customer_id: number
  category_id?: number
  item_type?: string
  period_month?: string
  active_window?: number
  exclude_intercompany?: boolean
  page?: number
  per_page?: number
}

export interface UpsellTargetParams {
  company_id?: number | 'all'
  branch_id?: number
  period_month?: string
  active_window?: number
  business_unit?: string
  exclude_intercompany?: boolean
  page?: number
  per_page?: number
}

// ─── 3.3 Product Trend (reuse M2 avg-category) ───────────────────────────────
export interface AvgCategoryTrendPoint {
  month: string
  avg_category: number
}

export interface ProductTrendData {
  company_id: number | 'all'
  period_month: string
  trend: AvgCategoryTrendPoint[]
  current_avg: number
  prev_avg: number | null
  change_pct: number | null
}

export interface ProductTrendParams {
  company_id?: number | 'all'
  branch_id?: number
  division?: string
  period_month?: string
  active_window?: number
  exclude_intercompany?: boolean
}