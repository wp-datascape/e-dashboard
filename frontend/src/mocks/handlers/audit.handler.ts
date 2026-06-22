import { http, HttpResponse } from 'msw'
import type { AuditLogResponse } from '@/types/audit'

const mockAuditLogs: AuditLogResponse = {
  data: [
    {
      id: 1,
      actor: { id: 2, name: 'Admin User' },
      action: 'invoice.import',
      entity: 'import_logs',
      entity_id: '42',
      company_id: 1,
      old_value: null,
      new_value: null,
      meta: { source: 'file', total_invoices: 200, success: 198, errors: 2 },
      ip_address: '192.168.1.1',
      request_id: 'req-001',
      created_at: '2024-02-01T10:00:00Z',
    },
    {
      id: 2,
      actor: { id: 3, name: 'Manager User' },
      action: 'user.create',
      entity: 'users',
      entity_id: '15',
      company_id: 1,
      old_value: null,
      new_value: { id: 15, email: 'newuser@company.com', name: 'New User' },
      meta: null,
      ip_address: '192.168.1.5',
      request_id: 'req-002',
      created_at: '2024-02-01T09:30:00Z',
    },
    {
      id: 3,
      actor: { id: 2, name: 'Admin User' },
      action: 'config.update',
      entity: 'business_configs',
      entity_id: '5',
      company_id: null,
      old_value: { value: '3' },
      new_value: { value: '6' },
      meta: { key: 'dormant_threshold_months' },
      ip_address: '192.168.1.1',
      request_id: 'req-003',
      created_at: '2024-02-01T08:45:00Z',
    },
    {
      id: 4,
      actor: { id: 4, name: 'Finance User' },
      action: 'role.update',
      entity: 'roles',
      entity_id: '3',
      company_id: null,
      old_value: { description: 'Old description' },
      new_value: { description: 'New description' },
      meta: null,
      ip_address: '192.168.1.20',
      request_id: 'req-004',
      created_at: '2024-02-01T08:00:00Z',
    },
    {
      id: 5,
      actor: { id: 2, name: 'Admin User' },
      action: 'user.delete',
      entity: 'users',
      entity_id: '10',
      company_id: 1,
      old_value: { id: 10, email: 'olduser@company.com', name: 'Old User' },
      new_value: null,
      meta: null,
      ip_address: '192.168.1.1',
      request_id: 'req-005',
      created_at: '2024-01-31T17:00:00Z',
    },
  ],
  meta: {
    page: 1,
    per_page: 50,
    total: 5,
  },
}

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'

export const auditHandlers = [
  http.get(`${BASE_URL}/audit-logs`, ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') ?? '1')
    const perPage = parseInt(url.searchParams.get('per_page') ?? '50')
    
    // Return paginated data (untuk demo, return semua tapi dengan meta yang correct)
    const startIdx = (page - 1) * perPage
    const endIdx = startIdx + perPage
    const paginatedData = mockAuditLogs.data.slice(startIdx, endIdx)
    
    return HttpResponse.json<AuditLogResponse>({
      data: paginatedData,
      meta: {
        page,
        per_page: perPage,
        total: mockAuditLogs.meta.total,
      },
    })
  }),
]
