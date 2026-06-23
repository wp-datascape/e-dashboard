// frontend/src/mocks/handlers/products.handler.ts
import { http, HttpResponse } from 'msw'
import type { PaginatedResponse, ApiResponse } from '@/types/api'
import type {
  CategoryPerformanceRow,
  HighMarginCategoryRow,
  UpsellTargetRow,
  ProductTrendData,
} from '@/types/products'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'

// ─── Mock: Category Performance (3.1) ────────────────────────────────────────
const mockCategories: CategoryPerformanceRow[] = [
  {
    id: 1,
    category_id: 1,
    category_name: 'Scanner',
    is_high_margin: true,
    is_service: false,
    total_revenue: 1_250_000_000,
    total_gp: 500_000_000,
    gp_margin_percent: 40.0,
    invoice_count: 87,
    customer_count: 28,
    last_sold_month: '2024-01',
  },
  {
    id: 2,
    category_id: 2,
    category_name: 'Printer',
    is_high_margin: true,
    is_service: false,
    total_revenue: 980_000_000,
    total_gp: 313_600_000,
    gp_margin_percent: 32.0,
    invoice_count: 124,
    customer_count: 42,
    last_sold_month: '2024-01',
  },
  {
    id: 3,
    category_id: 3,
    category_name: 'Ribbon',
    is_high_margin: false,
    is_service: false,
    total_revenue: 620_000_000,
    total_gp: 111_600_000,
    gp_margin_percent: 18.0,
    invoice_count: 210,
    customer_count: 55,
    last_sold_month: '2024-01',
  },
  {
    id: 4,
    category_id: 4,
    category_name: 'Toner',
    is_high_margin: false,
    is_service: false,
    total_revenue: 450_000_000,
    total_gp: 67_500_000,
    gp_margin_percent: 15.0,
    invoice_count: 98,
    customer_count: 38,
    last_sold_month: '2024-01',
  },
  {
    id: 5,
    category_id: 5,
    category_name: 'Label',
    is_high_margin: false,
    is_service: false,
    total_revenue: 320_000_000,
    total_gp: 48_000_000,
    gp_margin_percent: 15.0,
    invoice_count: 76,
    customer_count: 29,
    last_sold_month: '2024-01',
  },
  {
    id: 6,
    category_id: 6,
    category_name: 'POS Terminal',
    is_high_margin: true,
    is_service: false,
    total_revenue: 420_000_000,
    total_gp: 168_000_000,
    gp_margin_percent: 40.0,
    invoice_count: 32,
    customer_count: 15,
    last_sold_month: '2023-12',
  },
  {
    id: 7,
    category_id: 7,
    category_name: 'Barcode Reader',
    is_high_margin: false,
    is_service: false,
    total_revenue: 185_000_000,
    total_gp: 33_300_000,
    gp_margin_percent: 18.0,
    invoice_count: 44,
    customer_count: 22,
    last_sold_month: '2024-01',
  },
]

// ─── Mock: High Margin Category Detail (3.2) ─────────────────────────────────
const mockHighMarginDetail: HighMarginCategoryRow[] = [
  {
    id: 1,
    category_id: 1,
    category_name: 'Scanner',
    is_high_margin: true,
    customer_count: 28,
    total_active_customers: 95,
    penetration_rate: 29.5,
    total_revenue: 420_000_000,
    total_gp: 168_000_000,
    gp_margin_percent: 40.0,
  },
  {
    id: 2,
    category_id: 2,
    category_name: 'Printer',
    is_high_margin: true,
    customer_count: 42,
    total_active_customers: 95,
    penetration_rate: 44.2,
    total_revenue: 980_000_000,
    total_gp: 313_600_000,
    gp_margin_percent: 32.0,
  },
  {
    id: 6,
    category_id: 6,
    category_name: 'POS Terminal',
    is_high_margin: true,
    customer_count: 15,
    total_active_customers: 95,
    penetration_rate: 15.8,
    total_revenue: 420_000_000,
    total_gp: 168_000_000,
    gp_margin_percent: 40.0,
  },
]

// ─── Mock: Upsell Targets (3.2) ───────────────────────────────────────────────
const mockUpsellTargets: UpsellTargetRow[] = [
  {
    id: 1,
    customer_code: 'CUST-003',
    customer_name: 'PT Solusi Digital',
    business_unit: 'b2c',
    last_invoice_date: '2023-09-12',
    avg_monthly_revenue: 3_200_000,
    categories_bought: ['Ribbon', 'Label'],
    missing_high_margin_categories: ['Scanner', 'Printer', 'POS Terminal'],
  },
  {
    id: 2,
    customer_code: 'CUST-006',
    customer_name: 'CV Mitra Usaha',
    business_unit: null,
    last_invoice_date: '2024-01-10',
    avg_monthly_revenue: 6_000_000,
    categories_bought: ['Toner', 'Ribbon'],
    missing_high_margin_categories: ['Scanner', 'Printer', 'POS Terminal'],
  },
  {
    id: 3,
    customer_code: 'CUST-007',
    customer_name: 'PT Karya Utama',
    business_unit: 'b2b_dc',
    last_invoice_date: '2024-01-08',
    avg_monthly_revenue: 12_000_000,
    categories_bought: ['Ribbon', 'Toner', 'Barcode Reader'],
    missing_high_margin_categories: ['Scanner', 'POS Terminal'],
  },
  {
    id: 4,
    customer_code: 'CUST-012',
    customer_name: 'CV Jaya Makmur',
    business_unit: 'b2b_dc',
    last_invoice_date: '2024-01-05',
    avg_monthly_revenue: 9_500_000,
    categories_bought: ['Label', 'Barcode Reader'],
    missing_high_margin_categories: ['Printer', 'Scanner', 'POS Terminal'],
  },
  {
    id: 5,
    customer_code: 'CUST-015',
    customer_name: 'PT Berkah Sejati',
    business_unit: 'b2b_project',
    last_invoice_date: '2023-12-20',
    avg_monthly_revenue: 25_000_000,
    categories_bought: ['Ribbon'],
    missing_high_margin_categories: ['Scanner', 'Printer', 'POS Terminal'],
  },
]

// ─── Mock: Product Trend / M2 avg-category ────────────────────────────────────
const mockProductTrend: ProductTrendData = {
  company_id: 'all',
  period_month: '2024-01',
  current_avg: 2.4,
  prev_avg: 2.1,
  change_pct: 14.3,
  trend: [
    { month: '2023-02', avg_category: 2.0 },
    { month: '2023-03', avg_category: 2.1 },
    { month: '2023-04', avg_category: 2.0 },
    { month: '2023-05', avg_category: 2.2 },
    { month: '2023-06', avg_category: 2.1 },
    { month: '2023-07', avg_category: 2.3 },
    { month: '2023-08', avg_category: 2.2 },
    { month: '2023-09', avg_category: 2.3 },
    { month: '2023-10', avg_category: 2.4 },
    { month: '2023-11', avg_category: 2.3 },
    { month: '2023-12', avg_category: 2.1 },
    { month: '2024-01', avg_category: 2.4 },
  ],
}

export const productsHandlers = [
  // GET /metrics/category-performance — 3.1
  http.get(`${BASE_URL}/metrics/category-performance`, ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') ?? '1')
    const perPage = parseInt(url.searchParams.get('per_page') ?? '50')
    const sortBy = url.searchParams.get('sort_by') as keyof CategoryPerformanceRow | null
    const sortDir = url.searchParams.get('sort_dir') ?? 'desc'

    const rows = [...mockCategories]

    if (sortBy && sortBy in rows[0]) {
      rows.sort((a, b) => {
        const av = a[sortBy] as number
        const bv = b[sortBy] as number
        return sortDir === 'asc' ? av - bv : bv - av
      })
    }

    const total = rows.length
    const start = (page - 1) * perPage
    const data = rows.slice(start, start + perPage)

    return HttpResponse.json<PaginatedResponse<CategoryPerformanceRow>>({
      message: 'Success',
      data,
      meta: { page, per_page: perPage, total },
    })
  }),

  // GET /metrics/high-margin-penetration/detail — 3.2
  http.get(`${BASE_URL}/metrics/high-margin-penetration/detail`, ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') ?? '1')
    const perPage = parseInt(url.searchParams.get('per_page') ?? '50')

    const total = mockHighMarginDetail.length
    const start = (page - 1) * perPage
    const data = mockHighMarginDetail.slice(start, start + perPage)

    return HttpResponse.json<PaginatedResponse<HighMarginCategoryRow>>({
      message: 'Success',
      data,
      meta: { page, per_page: perPage, total },
    })
  }),

  // GET /metrics/high-margin-penetration/customers — 3.2 upsell targets
  http.get(`${BASE_URL}/metrics/high-margin-penetration/customers`, ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') ?? '1')
    const perPage = parseInt(url.searchParams.get('per_page') ?? '50')
    const buFilter = url.searchParams.get('business_unit')

    let rows = [...mockUpsellTargets]
    if (buFilter) {
      rows = rows.filter((r) => r.business_unit === buFilter)
    }

    const total = rows.length
    const start = (page - 1) * perPage
    const data = rows.slice(start, start + perPage)

    return HttpResponse.json<PaginatedResponse<UpsellTargetRow>>({
      message: 'Success',
      data,
      meta: { page, per_page: perPage, total },
    })
  }),

  // GET /metrics/avg-category — 3.3 (product trend / M2)
  http.get(`${BASE_URL}/metrics/avg-category`, () => {
    return HttpResponse.json<ApiResponse<ProductTrendData>>({
      message: 'Success',
      data: mockProductTrend,
    })
  }),
]