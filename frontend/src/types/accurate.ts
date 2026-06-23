export interface CompanyBranch {
  id: number
  company_id: number
  name: string
  code: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface AccurateCredential {
  id: number
  branch_id: number
  auth_method: 'api_token' | 'oauth'
  api_token?: string
  app_key?: string
  signature_secret?: string
  subdomain: string
  company_db_id?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface AccurateCredentialsPayload {
  branch_id: number
  api_token: string
  signature_secret: string
  subdomain: string
  company_db_id?: string
}

export interface AccurateTestResult {
  success: boolean
  host?: string
  alias?: string
  db_id?: number
  user_name?: string
  message?: string
}