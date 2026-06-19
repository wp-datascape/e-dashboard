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
  period_month?: string
  active_window?: number
  page?: number
  per_page?: number
  sort_by?: 'total_revenue' | 'total_gp' | 'gp_margin_percent' | 'customer_count'
  sort_dir?: 'asc' | 'desc'
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
  period_month?: string
  active_window?: number
  page?: number
  per_page?: number
}

export interface UpsellTargetRow {
  id: number
  customer_code: string
  customer_name: string
  business_unit: string | null
  last_invoice_date: string
  avg_monthly_revenue: number
  categories_bought: string[]
  missing_high_margin_categories: string[]
}

export interface UpsellTargetParams {
  company_id?: number | 'all'
  period_month?: string
  active_window?: number
  business_unit?: string
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
  period_month?: string
  active_window?: number
}