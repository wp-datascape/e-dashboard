// frontend/src/mocks/handlers/import.handler.ts
import { http, HttpResponse } from 'msw'
import type { ImportLog, ImportResult, ImportErrorRow } from '@/types/import'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import { mockCompanies } from './users.handler'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'

// ─── Seed Data ────────────────────────────────────────────────────────────────

let logs: ImportLog[] = [
  {
    id: 1,
    company: { id: 1, name: 'PT ABC Sejahtera' },
    source: 'file',
    filename: 'faktur-jan-2024.xlsx',
    period_month: '2024-01',
    status: 'partial',
    total_invoices: 200,
    success_invoices: 198,
    error_rows: 2,
    imported_by: { id: 2, name: 'Budi Santoso' },
    created_at: '2024-02-01T10:00:00Z',
  },
  {
    id: 2,
    company: { id: 2, name: 'PT XYZ Mandiri' },
    source: 'accurate',
    filename: null,
    period_month: '2024-01',
    status: 'success',
    total_invoices: 150,
    success_invoices: 150,
    error_rows: 0,
    imported_by: { id: 1, name: 'Super Admin' },
    created_at: '2024-02-02T08:30:00Z',
  },
  {
    id: 3,
    company: { id: 1, name: 'PT ABC Sejahtera' },
    source: 'file',
    filename: 'faktur-feb-2024.csv',
    period_month: '2024-02',
    status: 'success',
    total_invoices: 185,
    success_invoices: 185,
    error_rows: 0,
    imported_by: { id: 2, name: 'Budi Santoso' },
    created_at: '2024-03-03T09:15:00Z',
  },
  {
    id: 4,
    company: { id: 3, name: 'PT DEF Utama' },
    source: 'file',
    filename: 'faktur-jan-2024.xlsx',
    period_month: '2024-01',
    status: 'failed',
    total_invoices: 0,
    success_invoices: 0,
    error_rows: 0,
    imported_by: { id: 2, name: 'Budi Santoso' },
    created_at: '2024-02-05T14:00:00Z',
  },
]

const errorsByLogId: Record<number, ImportErrorRow[]> = {
  1: [
    {
      id: 1,
      row_number: 45,
      raw_data: 'INV-2024-045,15/01/2024,CUST-001,Hardware,5000000',
      error_message: 'invoice_number sudah ada di periode ini',
    },
    {
      id: 2,
      row_number: 112,
      raw_data: 'INV-2024-112,,CUST-007,Consumable,2500000',
      error_message: 'invoice_date tidak boleh kosong',
    },
  ],
}

let nextId = 5

// ─── Helpers ──────────────────────────────────────────────────────────────────

const simulateResult = (total: number): Omit<ImportResult, 'import_log_id'> => {
  const errorCount = Math.random() < 0.25 ? Math.floor(Math.random() * 3) + 1 : 0
  const success = total - errorCount
  return {
    status: errorCount === 0 ? 'success' : errorCount < total ? 'partial' : 'failed',
    total_invoices: total,
    success_invoices: success,
    error_rows: errorCount,
    error_summary: errorCount > 0 ? `${errorCount} baris gagal: duplikasi nomor invoice` : null,
  }
}

// ─── Handlers ────────────────────────────────────────────────────────────────

export const importHandlers = [
  // POST /import/csv
  http.post(`${BASE_URL}/import/csv`, async ({ request }) => {
    const form = await request.formData()
    const file = form.get('file') as File | null
    const companyId = Number(form.get('company_id'))
    const periodMonth = form.get('period_month') as string

    if (!file) {
      return HttpResponse.json(
        { error: 'VALIDATION_ERROR', message: 'File wajib diunggah' },
        { status: 400 },
      )
    }

    const allowed = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]
    if (!allowed.includes(file.type) && !file.name.match(/\.(csv|xlsx|xls)$/i)) {
      return HttpResponse.json(
        { error: 'INVALID_FILE_FORMAT', message: 'Format file harus .csv atau .xlsx' },
        { status: 400 },
      )
    }
    if (file.size > 10 * 1024 * 1024) {
      return HttpResponse.json(
        { error: 'FILE_TOO_LARGE', message: 'Ukuran file maksimal 10 MB' },
        { status: 413 },
      )
    }

    const company = mockCompanies.find(c => c.id === companyId)
    const result = simulateResult(Math.floor(Math.random() * 150) + 50)
    const logId = nextId++

    logs = [
      {
        id: logId,
        company: { id: companyId, name: company?.name ?? `Company ${companyId}` },
        source: 'file',
        filename: file.name,
        period_month: periodMonth,
        status: result.status,
        total_invoices: result.total_invoices,
        success_invoices: result.success_invoices,
        error_rows: result.error_rows,
        imported_by: { id: 1, name: 'Super Admin' },
        created_at: new Date().toISOString(),
      },
      ...logs,
    ]

    return HttpResponse.json<ApiResponse<ImportResult>>({
      message: 'Import selesai',
      data: { import_log_id: logId, ...result },
    })
  }),

  // POST /import/accurate
  http.post(`${BASE_URL}/import/accurate`, async ({ request }) => {
    const body = await request.json() as { company_id: number; period_month: string }
    const company = mockCompanies.find(c => c.id === body.company_id)
    const result = simulateResult(Math.floor(Math.random() * 100) + 30)
    const logId = nextId++

    logs = [
      {
        id: logId,
        company: { id: body.company_id, name: company?.name ?? `Company ${body.company_id}` },
        source: 'accurate',
        filename: null,
        period_month: body.period_month,
        status: result.status,
        total_invoices: result.total_invoices,
        success_invoices: result.success_invoices,
        error_rows: result.error_rows,
        imported_by: { id: 1, name: 'Super Admin' },
        created_at: new Date().toISOString(),
      },
      ...logs,
    ]

    return HttpResponse.json<ApiResponse<ImportResult>>({
      message: 'Import dari Accurate selesai',
      data: { import_log_id: logId, ...result },
    })
  }),

  // GET /import/logs
  http.get(`${BASE_URL}/import/logs`, ({ request }) => {
    const url = new URL(request.url)
    const companyId = url.searchParams.get('company_id')
    const filtered = companyId ? logs.filter(l => l.company.id === Number(companyId)) : logs
    return HttpResponse.json<PaginatedResponse<ImportLog>>({
      message: 'OK',
      data: filtered,
      meta: { page: 1, per_page: 20, total: filtered.length },
    })
  }),

  // GET /import/logs/:id
  http.get(`${BASE_URL}/import/logs/:id`, ({ params }) => {
    const id = Number(params.id)
    const log = logs.find(l => l.id === id)
    if (!log) {
      return HttpResponse.json({ error: 'NOT_FOUND', message: 'Import log not found' }, { status: 404 })
    }
    const errors = errorsByLogId[id] ?? []
    return HttpResponse.json<ApiResponse<{ log: ImportLog; errors: ImportErrorRow[] }>>({
      message: 'OK',
      data: { log, errors },
    })
  }),
]
