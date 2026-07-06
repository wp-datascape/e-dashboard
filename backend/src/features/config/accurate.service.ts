import type { Context } from 'hono'
import { logger } from '@/utils/logger'
import { logAudit } from '@/utils/audit'
import { encrypt, decrypt } from '@/utils/crypto'
import axios from 'axios'
import { findCredentialsByBranchId, upsertCredentials } from './accurate.repository'
import type { SaveCredentialsDto } from './accurate.schema'
import type { AccurateCredential } from '@/db/schema'

export async function getCredentials(branchId: number): Promise<AccurateCredential | null> {
  const credential = await findCredentialsByBranchId(branchId)
  if (credential) {
    // Decrypt sensitive fields before returning to service layer
    credential.api_token = credential.api_token ? await decrypt(credential.api_token) : null
    credential.signature_secret = credential.signature_secret ? await decrypt(credential.signature_secret) : null
  }
  return credential
}

export async function saveCredentials(
  branchId: number,
  dto: SaveCredentialsDto,
  ctx: Context,
): Promise<AccurateCredential> {
  const data: Record<string, unknown> = {
    branch_id: branchId,
    auth_method: dto.auth_method ?? 'api_token',
    subdomain: dto.subdomain,
    company_db_id: dto.company_db_id ?? null,
    is_active: true,
  }

  // Hanya simpan field yang sesuai auth method
  if (dto.auth_method === 'api_token' || !dto.auth_method) {
    data.api_token = dto.api_token ?? null
    data.client_id = null
    data.client_secret = null
    data.callback_url = null
  } else {
    data.api_token = null
    data.client_id = dto.client_id ?? null
    data.client_secret = dto.client_secret ?? null
    data.callback_url = dto.callback_url ?? null
  }

  // Encrypt sensitive fields before saving to DB
  if (dto.api_token) data.api_token = await encrypt(dto.api_token)
  if (dto.signature_secret) data.signature_secret = await encrypt(dto.signature_secret)

  const credential = await upsertCredentials(branchId, data as any)

  logger.info('[accurate] Credentials saved', { branchId, auth_method: dto.auth_method })

  await logAudit(ctx, {
    action: 'config.create',
    entity: 'accurate_credentials',
    entityId: credential.id,
    companyId: null,
    newValue: { branch_id: branchId, auth_method: dto.auth_method },
  })

  return credential
}

export async function testConnection(
  subdomain: string,
  apiToken: string,
  signatureSecret: string,
) {
  const url = `https://account.accurate.id/api/api-token.do`
  const timestamp = new Date().toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).replace(/(\d{2})\/(\d{2})\/(\d{4}),/, '$1/$2/$3')

  // HMAC-SHA256 signature: sign(timestamp, signatureSecret)
  // Per Accurate API spec, data to sign is ONLY the timestamp (not apiToken + timestamp)
  const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey('raw', encoder.encode(signatureSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(timestamp))
    const arr = new Uint8Array(signature)
    const signatureBase64 = btoa(String.fromCharCode(...arr))

  try {
    const response = await axios.post(
      url,
      new URLSearchParams({ _action: 'api-token' }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Api-Timestamp': timestamp,
          'X-Api-Signature': signatureBase64,
          Authorization: `Bearer ${apiToken}`,
        },
        timeout: 15000,
      },
    )

    const data = response.data
    if (!data.s) {
      return { success: false, message: Array.isArray(data.d) ? data.d.join(', ') : 'API returned error' }
    }

    const db = data.d?.database || {}
    const user = data.d?.user || {}

    return {
      success: true,
      host: db.host || '',
      alias: db.alias || '',
      db_id: db.id || 0,
      user_name: user.fullName || user.nickName || '',
      message: 'Connection successful!',
    }
  } catch (err) {
    logger.error('[accurate] Test connection failed', { subdomain, error: String(err) })
    return { success: false, message: err instanceof Error ? err.message : 'Connection failed' }
  }
}