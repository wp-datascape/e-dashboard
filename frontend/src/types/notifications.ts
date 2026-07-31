export interface NotificationRow {
  id: number
  user_id: number
  type: string
  title: string
  body: string
  entity_ref: Record<string, unknown> | null
  is_read: boolean
  created_at: string
}

export interface ListNotificationsParams {
  unread_only?: boolean
  page: number
  per_page: number
}
