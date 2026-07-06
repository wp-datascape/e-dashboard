/**
 * features/products/accurate-products.service.ts
 *
 * Fetch product data dari Accurate Online API menggunakan credentials
 * yang sudah disimpan di tabel accurate_credentials (encrypted).
 *
 * Flow:
 *   1. Ambil credentials dari DB per branch_id → decrypt
 *   2. POST /api/api-token.do → HMAC-SHA256 auth → dapat host
 *   3. GET {host}/accurate/api/item-category/list.do → semua kategori
 *   4. GET {host}/accurate/api/item/list.do → list item/products
 *   5. Map category name ke setiap item berdasarkan itemCategoryId
 *
 * Accurate API auth: HMAC-SHA256(X-Api-Timestamp, signature_secret) → Base64
 *
 * DILARANG: API key tidak boleh di-log atau dikirim ke frontend
 */

import { eq, and } from 'drizzle-orm'
import { db } from '@/config/db'
import { accurate_credentials, company_branches, companies } from '@/db/schema'
import { decrypt } from '@/utils/crypto'
import { AppError, ErrorCode } from '@/errors'
import { logger } from '@/utils/logger'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AccurateCategory {
  id: number
  name: string
  isService: boolean
}

export interface AccurateItem {
  id: number
  no: string
  name: string
  unitPrice: number
  itemCategoryId: number | null
  itemCategoryName: string | null
  itemType: string
  unit1Name: string
  upcNo: string | null
  notes: string | null
  minimumQuantity: number
  usePpn: boolean
  controlQuantity: boolean
  manageSN: boolean
}

export interface AccurateItemListResponse {
  d: {
    data: AccurateItem[]
    total: number
    page: number
    pageSize: number
  }
}

// ─── HMAC-SHA256 Helper ─────────────────────────────────────────────────────

async function hmacSha256Base64(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  const bytes = new Uint8Array(signature)
  let binary = ''
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  return btoa(binary)
}

function getAccurateTimestamp(): string {
  const now = new Date()
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yyyy = now.getFullYear()
  const hh = String(now.getHours()).padStart(2, '0')
  const nn = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${nn}:${ss}`
}

async function buildAuthHeaders(
  apiToken: string,
  signatureSecret: string,
): Promise<{ headers: Record<string, string>; timestamp: string }> {
  const timestamp = getAccurateTimestamp()
  const signature = await hmacSha256Base64(timestamp, signatureSecret)
  return {
    timestamp,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'X-Api-Timestamp': timestamp,
      'X-Api-Signature': signature,
    },
  }
}

// ─── Authenticate & Get Host ─────────────────────────────────────────────────

interface AuthResult {
  host: string
  alias: string
  dbId: number
  userName: string
}

async function authenticateWithAccurate(
  apiToken: string,
  signatureSecret: string,
): Promise<AuthResult> {
  const { headers, timestamp } = await buildAuthHeaders(apiToken, signatureSecret)

  const response = await fetch('https://account.accurate.id/api/api-token.do', {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ _action: 'api-token' }).toString(),
  })

  if (!response.ok) {
    const text = await response.text()
    logger.error('[accurate-products] Auth failed', {
      status: response.status,
      body: text.substring(0, 200),
    })
    throw new AppError(
      ErrorCode.ACCURATE_API_ERROR,
      'Accurate API authentication failed. Check credentials.',
      502,
    )
  }

  const json = await response.json()
  if (!json.s) {
    throw new AppError(
      ErrorCode.ACCURATE_API_ERROR,
      'Accurate API returned error during authentication',
      502,
    )
  }

  const database = json.d?.database || {}
  if (!database.host) {
    throw new AppError(
      ErrorCode.ACCURATE_API_ERROR,
      'Accurate API token does not have access to any database',
      502,
    )
  }

  return {
    host: database.host,
    alias: database.alias || '',
    dbId: database.id || 0,
    userName: json.d?.user  ?.fullName || json.d?.user?.email || '',
  }
}

// ─── Fetch Categories from Accurate ─────────────────────────────────────────

export interface FetchCategoriesResult {
  categories: AccurateCategory[]
  branch_id: number
  branch_name: string
  company_name: string
}

async function fetchCategoriesFromAccurateApi(
  host: string,
  apiToken: string,
  signatureSecret: string,
): Promise<AccurateCategory[]> {
  const { headers } = await buildAuthHeaders(apiToken, signatureSecret)

  // Fetch all categories
  const url = `${host}/accurate/api/item-category/list.do?sp.page=1&sp.pageSize=100&fields=id,name,isService`

  const response = await fetch(url, { headers })

  if (!response.ok) {
    logger.warn('[accurate-products] Failed to fetch categories', {
      status: response.status,
    })
    return []
  }

  const json = await response.json()
  const categories: AccurateCategory[] =
    json.d?.data || (Array.isArray(json.d) ? json.d : [])

  logger.info('[accurate-products] Categories fetched', {
    count: categories.length,
  })

  return categories
}

// ─── Fetch Items from Accurate ──────────────────────────────────────────────

async function fetchItemsFromAccurate(
  host: string,
  apiToken: string,
  signatureSecret: string,
  params: { page: number; perPage: number; keywords?: string },
): Promise<{ data: AccurateItem[]; total: number }> {
  const { headers } = await buildAuthHeaders(apiToken, signatureSecret)

  // Build URL with SortPaging params + fields
  const spParams = new URLSearchParams({
    'sp.page': String(params.page),
    'sp.pageSize': String(params.perPage),
    'sp.sort': 'name|asc',
    fields:
      'id,no,name,unitPrice,itemCategoryId,itemType,unit1Name,upcNo,notes,minimumQuantity,usePpn,controlQuantity,manageSN',
  })

  // Optional keyword filter
  if (params.keywords) {
    spParams.set('keywords', params.keywords)
  }

  const url = `${host}/accurate/api/item/list.do?${spParams.toString()}`

  const response = await fetch(url, { headers })

  if (!response.ok) {
    const text = await response.text()
    logger.error('[accurate-products] Fetch items failed', {
      status: response.status,
      body: text.substring(0, 200),
    })
    throw new AppError(
      ErrorCode.ACCURATE_API_ERROR,
      `Accurate API error: ${response.status}`,
      502,
    )
  }

  const json = await response.json()
  const items: AccurateItem[] = json.d?.data || (Array.isArray(json.d) ? json.d : [])
  const total = json.d?.total || items.length

  return { data: items, total }
}

// ─── Main Service Function ──────────────────────────────────────────────────

export interface FetchProductsResult {
  items: AccurateItem[]
  total: number
  page: number
  per_page: number
  branch_id: number
  branch_name: string
  company_name: string
}

/**
 * Get credentials dari DB + authenticate ke Accurate API.
 * Helper yang digunakan oleh semua fungsi fetch dari Accurate.
 */
async function getCredentialsAndAuth(
  branchId: number,
): Promise<{
  apiToken: string
  signatureSecret: string
  auth: AuthResult
  branch_name: string
  company_name: string
}> {
  const [credential] = await db
    .select({
      id: accurate_credentials.id,
      branch_id: accurate_credentials.branch_id,
      api_token_enc: accurate_credentials.api_token,
      signature_secret_enc: accurate_credentials.signature_secret,
      subdomain: accurate_credentials.subdomain,
      is_active: accurate_credentials.is_active,
      branch_name: company_branches.name,
      company_name: companies.name,
    })
    .from(accurate_credentials)
    .innerJoin(
      company_branches,
      eq(accurate_credentials.branch_id, company_branches.id),
    )
    .innerJoin(
      companies,
      eq(company_branches.company_id, companies.id),
    )
    .where(
      and(
        eq(accurate_credentials.branch_id, branchId),
        eq(accurate_credentials.is_active, true),
        eq(company_branches.is_active, true),
      ),
    )
    .limit(1)

  if (!credential) {
    throw new AppError(
      ErrorCode.NOT_FOUND,
      'Active Accurate credentials not found for this branch',
      404,
    )
  }

  if (!credential.api_token_enc || !credential.signature_secret_enc) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      'API Token or Signature Secret not configured for this branch',
      400,
    )
  }

  const apiToken = await decrypt(credential.api_token_enc)
  const signatureSecret = await decrypt(credential.signature_secret_enc)

  logger.info('[accurate-products] Authenticating with Accurate API', {
    branch_id: branchId,
    subdomain: credential.subdomain,
  })

  const auth = await authenticateWithAccurate(apiToken, signatureSecret)

  logger.info('[accurate-products] Authenticated successfully', {
    host: auth.host,
    db_id: auth.dbId,
    user: auth.userName,
  })

  return {
    apiToken,
    signatureSecret,
    auth,
    branch_name: credential.branch_name,
    company_name: credential.company_name,
  }
}

/**
 * Fetch categories dari Accurate Online untuk branch tertentu.
 * Endpoint terpisah — tidak merge dengan data product.
 */
export async function fetchCategoriesFromAccurate(
  branchId: number,
): Promise<FetchCategoriesResult> {
  const { apiToken, signatureSecret, auth, branch_name, company_name } =
    await getCredentialsAndAuth(branchId)

  const categories = await fetchCategoriesFromAccurateApi(
    auth.host,
    apiToken,
    signatureSecret,
  )

  return {
    categories,
    branch_id: branchId,
    branch_name,
    company_name,
  }
}

/**
 * Fetch products dari Accurate Online untuk branch tertentu.
 *
 * 1. Ambil credentials dari DB (decrypt sensitive fields)
 * 2. Authenticate ke Accurate API → dapat host
 * 3. Fetch semua item categories (mapping id → name)
 * 4. Fetch item list dari Accurate
 * 5. Map category name ke setiap item
 */
export async function fetchProductsFromAccurate(
  branchId: number,
  query: { page: number; per_page: number; keywords?: string },
): Promise<FetchProductsResult> {
  // ─── Step 1: Get credentials from DB ────────────────────────────────────
  const [credential] = await db
    .select({
      id: accurate_credentials.id,
      branch_id: accurate_credentials.branch_id,
      auth_method: accurate_credentials.auth_method,
      api_token_enc: accurate_credentials.api_token,
      signature_secret_enc: accurate_credentials.signature_secret,
      subdomain: accurate_credentials.subdomain,
      company_db_id: accurate_credentials.company_db_id,
      is_active: accurate_credentials.is_active,
      branch_name: company_branches.name,
      company_name: companies.name,
    })
    .from(accurate_credentials)
    .innerJoin(
      company_branches,
      eq(accurate_credentials.branch_id, company_branches.id),
    )
    .innerJoin(
      companies,
      eq(company_branches.company_id, companies.id),
    )
    .where(
      and(
        eq(accurate_credentials.branch_id, branchId),
        eq(accurate_credentials.is_active, true),
        eq(company_branches.is_active, true),
      ),
    )
    .limit(1)

  if (!credential) {
    throw new AppError(
      ErrorCode.NOT_FOUND,
      'Active Accurate credentials not found for this branch',
      404,
    )
  }

  if (!credential.api_token_enc || !credential.signature_secret_enc) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      'API Token or Signature Secret not configured for this branch',
      400,
    )
  }

  // Decrypt sensitive fields
  const apiToken = await decrypt(credential.api_token_enc)
  const signatureSecret = await decrypt(credential.signature_secret_enc)

  // ─── Step 2: Authenticate to get host ────────────────────────────────────
  logger.info('[accurate-products] Authenticating with Accurate API', {
    branch_id: branchId,
    subdomain: credential.subdomain,
  })

  const auth = await authenticateWithAccurate(apiToken, signatureSecret)

  logger.info('[accurate-products] Authenticated successfully', {
    host: auth.host,
    db_id: auth.dbId,
    user: auth.userName,
  })

  // ─── Step 3: Fetch categories (for mapping id → name) ───────────────────
  const categoriesList = await fetchCategoriesFromAccurateApi(auth.host, apiToken, signatureSecret)
  const categoryMap = new Map<number, string>()
  for (const cat of categoriesList) {
    categoryMap.set(cat.id, cat.name)
  }

  // ─── Step 4: Fetch items ────────────────────────────────────────────────
  logger.info('[accurate-products] Fetching items', {
    host: auth.host,
    page: query.page,
    per_page: query.per_page,
    keywords: query.keywords || undefined,
  })

  const result = await fetchItemsFromAccurate(auth.host, apiToken, signatureSecret, {
    page: query.page,
    perPage: query.per_page,
    keywords: query.keywords,
  })

  // ─── Step 5: Map category name ke setiap item ────────────────────────────
  const itemsWithCategory = result.data.map((item) => ({
    ...item,
    itemCategoryName: item.itemCategoryId
      ? categoryMap.get(item.itemCategoryId) ?? null
      : null,
  }))

  logger.info('[accurate-products] Fetch successful', {
    total: result.total,
    fetched: itemsWithCategory.length,
    categories_fetched: categoryMap.size,
  })

  return {
    items: itemsWithCategory,
    total: result.total,
    page: query.page,
    per_page: query.per_page,
    branch_id: branchId,
    branch_name: credential.branch_name,
    company_name: credential.company_name,
  }
}