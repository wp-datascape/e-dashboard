export interface ResendSettings {
  id: number
  sender_email: string | null
  sender_name_default: string | null
  app_base_url: string | null
  is_active: boolean
  has_api_key: boolean
  created_at?: string
  updated_at?: string
}

export interface UpsertResendSettingsPayload {
  api_key?: string
  sender_email?: string
  sender_name_default?: string
  app_base_url?: string
  is_active?: boolean
}

export interface SendTestEmailResult {
  success: boolean
  message: string
}

