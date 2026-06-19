// frontend/src/mocks/handlers/transactions.handler.ts
import { http, HttpResponse } from 'msw'
import type { PaginatedResponse, ApiResponse } from '@/types/api'
import type { InvoiceRow, InvoiceDetail } from '@/types/transactions'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'

const mockInvoices: InvoiceRow[] = [
  {
    id: 1001, invoice_number: 'INV-2024-001', invoice_date: '2024-01-20',
    customer: { id: 1, code: 'CUST-001', name: 'PT Maju Bersama', business_unit: 'b2b_dc' },
    company: { id: 1, name: 'PT ABC Sejahtera' },
    total_revenue: 18_000_000, total_gp: 5_400_000, gp_margin_percent: 30.0,
    category_count: 2, import_source: 'file',
  },
  {
    id: 1002, invoice_number: 'INV-2024-002', invoice_date: '2024-01-18',
    customer: { id: 4, code: 'CUST-004', name: 'PT Industri Mandiri', business_unit: 'manufacturing' },
    company: { id: 2, name: 'PT XYZ Mandiri' },
    total_revenue: 22_000_000, total_gp: 6_600_000, gp_margin_percent: 30.0,
    category_count: 3, import_source: 'accurate',
  },
  {
    id: 1003, invoice_number: 'INV-2024-003', invoice_date: '2024-01-15',
    customer: { id: 2, code: 'CUST-002', name: 'CV Teknologi Nusantara', business_unit: 'b2b_dc' },
    company: { id: 1, name: 'PT ABC Sejahtera' },
    total_revenue: 8_000_000, total_gp: 2_400_000, gp_margin_percent: 30.0,
    category_count: 1, import_source: 'file',
  },
  {
    id: 1004, invoice_number: 'INV-2024-004', invoice_date: '2024-01-12',
    customer: { id: 5, code: 'CUST-005', name: 'PT Proyek Infrastruktur', business_unit: 'b2b_project' },
    company: { id: 1, name: 'PT ABC Sejahtera' },
    total_revenue: 45_000_000, total_gp: 13_500_000, gp_margin_percent: 30.0,
    category_count: 2, import_source: 'accurate',
  },
  {
    id: 1005, invoice_number: 'INV-2024-005', invoice_date: '2024-01-10',
    customer: { id: 6, code: 'CUST-006', name: 'CV Mitra Usaha', business_unit: null },
    company: { id: 1, name: 'PT ABC Sejahtera' },
    total_revenue: 6_000_000, total_gp: 1_800_000, gp_margin_percent: 30.0,
    category_count: 1, import_source: 'file',
  },
  {
    id: 1006, invoice_number: 'INV-2024-006', invoice_date: '2024-01-08',
    customer: { id: 1, code: 'CUST-001', name: 'PT Maju Bersama', business_unit: 'b2b_dc' },
    company: { id: 1, name: 'PT ABC Sejahtera' },
    total_revenue: 12_000_000, total_gp: 3_600_000, gp_margin_percent: 30.0,
    category_count: 1, import_source: 'file',
  },
  {
    id: 1007, invoice_number: 'INV-2024-007', invoice_date: '2024-01-05',
    customer: { id: 4, code: 'CUST-004', name: 'PT Industri Mandiri', business_unit: 'manufacturing' },
    company: { id: 2, name: 'PT XYZ Mandiri' },
    total_revenue: 25_000_000, total_gp: 7_500_000, gp_margin_percent: 30.0,
    category_count: 4, import_source: 'accurate',
  },
  {
    id: 1008, invoice_number: 'INV-2024-008', invoice_date: '2024-01-03',
    customer: { id: 3, code: 'CUST-003', name: 'PT Solusi Digital', business_unit: 'b2c' },
    company: { id: 1, name: 'PT ABC Sejahtera' },
    total_revenue: 3_200_000, total_gp: 960_000, gp_margin_percent: 30.0,
    category_count: 1, import_source: 'file',
  },
]

const mockInvoiceDetail: InvoiceDetail = {
  id: 1001,
  invoice_number: 'INV-2024-001',
  invoice_date: '2024-01-20',
  customer: { id: 1, code: 'CUST-001', name: 'PT Maju Bersama' },
  company: { id: 1, name: 'PT ABC Sejahtera' },
  total_revenue: 18_000_000,
  total_gp: 5_400_000,
  items: [
    { id: 2001, product_name: 'Zebra ZT411', category: { id: 3, name: 'Printer', is_high_margin: true }, revenue: 12_000_000, gross_profit: 4_200_000 },
    { id: 2002, product_name: 'Label 100x50', category: { id: 5, name: 'Label', is_high_margin: false }, revenue: 6_000_000, gross_profit: 1_200_000 },
  ],
}

export const transactionsHandlers = [
  // GET /invoices
  http.get(`${BASE_URL}/invoices`, ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') ?? '1')
    const perPage = parseInt(url.searchParams.get('per_page') ?? '50')
    const buFilter = url.searchParams.get('business_unit')
    const customerSearch = url.searchParams.get('customer_search')?.toLowerCase()
    const dateFrom = url.searchParams.get('date_from')
    const dateTo = url.searchParams.get('date_to')
    const sortBy = url.searchParams.get('sort_by') ?? 'invoice_date'
    const sortDir = url.searchParams.get('sort_dir') ?? 'desc'

    let rows = [...mockInvoices]

    if (buFilter) rows = rows.filter((r) => r.customer.business_unit === buFilter)
    if (customerSearch) {
      rows = rows.filter(
        (r) =>
          r.customer.name.toLowerCase().includes(customerSearch) ||
          r.customer.code.toLowerCase().includes(customerSearch)
      )
    }
    if (dateFrom) rows = rows.filter((r) => r.invoice_date >= dateFrom)
    if (dateTo) rows = rows.filter((r) => r.invoice_date <= dateTo)

    rows.sort((a, b) => {
      const av = a[sortBy as keyof InvoiceRow] as string | number
      const bv = b[sortBy as keyof InvoiceRow] as string | number
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : av < bv ? 1 : -1
    })

    const total = rows.length
    const start = (page - 1) * perPage
    const data = rows.slice(start, start + perPage)

    return HttpResponse.json<PaginatedResponse<InvoiceRow>>({
      message: 'Success', data,
      meta: { page, per_page: perPage, total },
    })
  }),

  // GET /invoices/:id
  http.get(`${BASE_URL}/invoices/:id`, ({ params }) => {
    const id = parseInt(params.id as string)
    const found = mockInvoices.find((i) => i.id === id)
    if (!found) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Invoice tidak ditemukan' }, { status: 404 })
    }
    return HttpResponse.json<ApiResponse<InvoiceDetail>>({
      message: 'Success',
      data: mockInvoiceDetail,
    })
  }),
]