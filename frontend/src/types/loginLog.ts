export interface LoginLogUser {
  id: number
  name: string
}

export type LoginLogEvent =
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'password_changed'
  | 'role_changed'
  | 'account_locked'

export interface LoginLog {
  id: number
  user: LoginLogUser | null
  email: string
  event: LoginLogEvent | string
  reason: string
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface LoginLogResponse {
  data: LoginLog[]
  meta: {
    page: number
    per_page: number
    total: number
  }
}

export interface LoginLogFilters {
  user_id?: number
  event?: string
  date_from?: string
  date_to?: string
  page?: number
  per_page?: number
}
