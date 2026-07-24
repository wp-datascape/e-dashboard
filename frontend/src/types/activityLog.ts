export interface ActivityLogUser {
  id: number
  name: string
}

export interface ActivityLog {
  id: number
  user: ActivityLogUser | null
  method: string
  path: string
  module: string | null
  status_code: number | null
  duration_ms: number | null
  ip_address: string | null
  user_agent: string | null
  request_id: string | null
  created_at: string
}

export interface ActivityLogResponse {
  data: ActivityLog[]
  meta: {
    page: number
    per_page: number
    total: number
  }
}

export interface ActivityLogFilters {
  user_id?: number
  module?: string
  method?: string
  date_from?: string
  date_to?: string
  page?: number
  per_page?: number
}
