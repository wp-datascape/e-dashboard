import { http, HttpResponse, delay } from 'msw'

export const accurateHandlers = [
  // ─── GET credentials by branch ────────────────────────────────────────────
  http.get('*/api/v1/config/accurate/credentials/:branchId', async ({ params }) => {
    await delay(200)
    const branchId = Number(params.branchId)

    // Return data yang sudah disimpan (mock)
    return HttpResponse.json({
      success: true,
      data: {
        id: branchId,
        branch_id: branchId,
        auth_method: 'api_token',
        subdomain: 'odin',
        company_db_id: '2704558',
        is_active: true,
        // api_token & signature_secret always masked in response
        api_token: '***',
        signature_secret: '***',
      },
    })
  }),

  // ─── PUT save credentials ─────────────────────────────────────────────────
  http.put('*/api/v1/config/accurate/credentials/:branchId', async ({ request, params }) => {
    await delay(500)
    const body = await request.json() as Record<string, unknown>
    const branchId = Number(params.branchId)

    return HttpResponse.json({
      success: true,
      data: {
        id: branchId,
        branch_id: branchId,
        auth_method: 'api_token',
        subdomain: body.subdomain || '',
        company_db_id: body.company_db_id || '',
        is_active: true,
        api_token: '***',
        signature_secret: '***',
      },
    })
  }),

  // ─── POST test connection ─────────────────────────────────────────────────
  http.post('*/api/v1/config/accurate/test-connection', async ({ request }) => {
    await delay(2000) // Simulate network latency

    const body = await request.json() as Record<string, string>
    const apiToken = body.api_token || ''
    const subdomain = body.subdomain || ''

    // Validate token format (basic check)
    if (!apiToken.startsWith('aat.')) {
      return HttpResponse.json({
        success: false,
        data: { success: false, message: 'Invalid token format. Token should start with "aat."' },
      })
    }

    if (!subdomain) {
      return HttpResponse.json({
        success: false,
        data: { success: false, message: 'Subdomain is required' },
      })
    }

    // Mock success response mimicking real Accurate API
    return HttpResponse.json({
      success: true,
      data: {
        success: true,
        host: `https://${subdomain}.accurate.id`,
        alias: 'Sandbox',
        db_id: 2704558,
        user_name: 'Semanggi',
        message: 'Connection successful!',
      },
    })
  }),
]