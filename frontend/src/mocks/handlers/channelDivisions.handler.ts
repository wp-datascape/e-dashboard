import { http, HttpResponse } from 'msw'
import type { ApiResponse } from '@/types/api'
import type { ChannelDivisionRow } from '@/types/channelDivisions'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'

// Division sekarang FK integer per company (task012 v2) — mock division_id 1-7
// mirror 7 default seed (distribution/project/e_commerce/intercompany/freelancer/
// support/other), semua company_id=1 (mock tunggal, tidak ada rule global lagi).
const DIVISION_ID_BY_KEY: Record<string, number> = {
  distribution: 1, project: 2, e_commerce: 3, intercompany: 4, freelancer: 5, support: 6, other: 7,
}
const COMPANY_ID = 1

let nextId = 22
const mockData: ChannelDivisionRow[] = [
  { id: 1,  channel_name: 'DC WEST',               division: 'Distribution',  division_id: DIVISION_ID_BY_KEY.distribution!, company_id: COMPANY_ID, company_name: null, created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z' },
  { id: 2,  channel_name: 'DC EAST',               division: 'Distribution',  division_id: DIVISION_ID_BY_KEY.distribution!, company_id: COMPANY_ID, company_name: null, created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z' },
  { id: 3,  channel_name: 'DC WEST HEAD',          division: 'Distribution',  division_id: DIVISION_ID_BY_KEY.distribution!, company_id: COMPANY_ID, company_name: null, created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z' },
  { id: 4,  channel_name: 'DC EAST HEAD',          division: 'Distribution',  division_id: DIVISION_ID_BY_KEY.distribution!, company_id: COMPANY_ID, company_name: null, created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z' },
  { id: 5,  channel_name: 'DC EAST CARD',          division: 'Distribution',  division_id: DIVISION_ID_BY_KEY.distribution!, company_id: COMPANY_ID, company_name: null, created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z' },
  { id: 6,  channel_name: 'SDR B2B WEST',          division: 'Project',       division_id: DIVISION_ID_BY_KEY.project!, company_id: COMPANY_ID, company_name: null, created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z' },
  { id: 7,  channel_name: 'B2B EAST',              division: 'Project',       division_id: DIVISION_ID_BY_KEY.project!, company_id: COMPANY_ID, company_name: null, created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z' },
  { id: 8,  channel_name: 'KAE WEST',              division: 'Project',       division_id: DIVISION_ID_BY_KEY.project!, company_id: COMPANY_ID, company_name: null, created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z' },
  { id: 9,  channel_name: 'NAS B2B EAST',          division: 'Project',       division_id: DIVISION_ID_BY_KEY.project!, company_id: COMPANY_ID, company_name: null, created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z' },
  { id: 10, channel_name: 'NAS B2B WEST',          division: 'Project',       division_id: DIVISION_ID_BY_KEY.project!, company_id: COMPANY_ID, company_name: null, created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z' },
  { id: 11, channel_name: 'B2B EAST CARD',         division: 'Project',       division_id: DIVISION_ID_BY_KEY.project!, company_id: COMPANY_ID, company_name: null, created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z' },
  { id: 12, channel_name: 'SDR WEST CARD',         division: 'Project',       division_id: DIVISION_ID_BY_KEY.project!, company_id: COMPANY_ID, company_name: null, created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z' },
  { id: 13, channel_name: 'KASSEN OFFICIAL STORE', division: 'E-Commerce',    division_id: DIVISION_ID_BY_KEY.e_commerce!, company_id: COMPANY_ID, company_name: null, created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z' },
  { id: 14, channel_name: 'TOKOPEDIA',             division: 'E-Commerce',    division_id: DIVISION_ID_BY_KEY.e_commerce!, company_id: COMPANY_ID, company_name: null, created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z' },
  { id: 15, channel_name: 'TIKTOKSHOP',            division: 'E-Commerce',    division_id: DIVISION_ID_BY_KEY.e_commerce!, company_id: COMPANY_ID, company_name: null, created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z' },
  { id: 16, channel_name: 'LAZADA',                division: 'E-Commerce',    division_id: DIVISION_ID_BY_KEY.e_commerce!, company_id: COMPANY_ID, company_name: null, created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z' },
  { id: 17, channel_name: 'KODE NIAGA TAMA',       division: 'Intercompany',  division_id: DIVISION_ID_BY_KEY.intercompany!, company_id: COMPANY_ID, company_name: null, created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z' },
  { id: 18, channel_name: 'CODESHOP',              division: 'Intercompany',  division_id: DIVISION_ID_BY_KEY.intercompany!, company_id: COMPANY_ID, company_name: null, created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z' },
  { id: 19, channel_name: 'SBY UDIN',              division: 'Freelancer',    division_id: DIVISION_ID_BY_KEY.freelancer!, company_id: COMPANY_ID, company_name: null, created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z' },
  { id: 20, channel_name: 'SALES SUPPORT',         division: 'Support',       division_id: DIVISION_ID_BY_KEY.support!, company_id: COMPANY_ID, company_name: null, created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z' },
  { id: 21, channel_name: 'SALES SUPPORT JKT',     division: 'Support',       division_id: DIVISION_ID_BY_KEY.support!, company_id: COMPANY_ID, company_name: null, created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z' },
]

export const channelDivisionsHandlers = [
  http.get(`${BASE_URL}/settings/channel-divisions`, ({ request }) => {
    const url = new URL(request.url)
    const division = url.searchParams.get('division')
    const search = url.searchParams.get('search')

    let result = [...mockData]
    if (division) result = result.filter((r) => r.division_id === Number(division))
    if (search) result = result.filter((r) => r.channel_name.includes(search.toUpperCase()))

    return HttpResponse.json<ApiResponse<ChannelDivisionRow[]>>({ message: 'Success', data: result })
  }),

  http.post(`${BASE_URL}/settings/channel-divisions`, async ({ request }) => {
    const body = await request.json() as Partial<ChannelDivisionRow>
    const row: ChannelDivisionRow = {
      id: nextId++,
      channel_name: (body.channel_name ?? '').toUpperCase(),
      division: '',
      division_id: body.division_id!,
      company_id: body.company_id ?? COMPANY_ID,
      company_name: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    mockData.push(row)
    return HttpResponse.json<ApiResponse<ChannelDivisionRow>>({ message: 'Created', data: row }, { status: 201 })
  }),

  http.patch(`${BASE_URL}/settings/channel-divisions/:id`, async ({ params, request }) => {
    const id = Number(params.id)
    const idx = mockData.findIndex((r) => r.id === id)
    if (idx === -1) return HttpResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    const body = await request.json() as Partial<ChannelDivisionRow>
    mockData[idx] = { ...mockData[idx]!, ...body, updated_at: new Date().toISOString() }
    return HttpResponse.json<ApiResponse<ChannelDivisionRow>>({ message: 'Success', data: mockData[idx]! })
  }),

  http.delete(`${BASE_URL}/settings/channel-divisions/:id`, ({ params }) => {
    const id = Number(params.id)
    const idx = mockData.findIndex((r) => r.id === id)
    if (idx === -1) return HttpResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    mockData.splice(idx, 1)
    return HttpResponse.json({ message: 'Success', data: { id } })
  }),
]
