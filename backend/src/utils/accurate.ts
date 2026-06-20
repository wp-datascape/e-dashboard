/**
 * utils/accurate.ts
 *
 * Accurate Online API client — fetch invoice data dari Accurate.
 * API key diambil dari app_configs table (per company, is_secret=true).
 *
 * WAJIB: Selalu gunakan timeout + error handling (circuit breaker pattern).
 * DILARANG: API key Accurate tidak boleh dikirim ke frontend atau di-log.
 * DILARANG: Panggil langsung dari Handler atau Repository — hanya dari Service.
 *
 * Usage:
 *   import { fetchInvoices } from '@/utils/accurate'
 *
 *   const result = await fetchInvoices(companyId, {
 *     period_month: '2024-03',
 *     page: 1,
 *     per_page: 100,
 *   })
 */

import axios, { type AxiosInstance } from 'axios'
import { logger } from '@/utils/logger'
import { AppError, ErrorCode } from '@/utils/error'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AccurateInvoiceParams {
  period_month: string   // YYYY-MM
  page?: number
  per_page?: number
}

export interface AccurateInvoice {
  invoice_number: string
  invoice_date: string
  customer_code: string
  customer_name: string
  product_category: string
  revenue: number
  gross_profit: number
}

export interface AccurateFetchResult {
  invoices: AccurateInvoice[]
  total: number
  page: number
  per_page: number
}

export interface AccurateCredentials {
  apiKey: string
  apiUrl: string
}

// ─── HTTP Client Factory ──────────────────────────────────────────────────────

const TIMEOUT_MS = 15_000 // 15 detik timeout untuk external API

function createAccurateClient(credentials: AccurateCredentials): AxiosInstance {
  return axios.create({
    baseURL: credentials.apiUrl,
    timeout: TIMEOUT_MS,
    headers: {
      Authorization: `Bearer ${credentials.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  })
}

// ─── Main Function ────────────────────────────────────────────────────────────

/**
 * Fetch invoice data dari Accurate Online untuk satu company dan period.
 *
 * @param credentials  - API key dan URL dari app_configs (is_secret=true, jangan log)
 * @param params       - Period dan pagination params
 */
export async function fetchInvoices(
  credentials: AccurateCredentials,
  params: AccurateInvoiceParams,
): Promise<AccurateFetchResult> {
  const client = createAccurateClient(credentials)
  const { period_month, page = 1, per_page = 100 } = params

  // Parse period_month → start_date dan end_date
  const [year, month] = period_month.split('-').map(Number)
  const startDate = `01/${String(month).padStart(2, '0')}/${year}`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${lastDay}/${String(month).padStart(2, '0')}/${year}`

  try {
    logger.info('[accurate] Fetching invoices', {
      period_month,
      page,
      per_page,
      // DILARANG: jangan log apiKey atau apiUrl yang mengandung secret
    })

    const response = await client.get<AccurateFetchResult>('/api/invoices', {
      params: {
        start_date: startDate,
        end_date: endDate,
        page,
        per_page,
      },
    })

    logger.info('[accurate] Fetch successful', {
      period_month,
      total: response.data.total,
      fetched: response.data.invoices.length,
    })

    return response.data
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status
      const isTimeout = err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT'

      logger.error('[accurate] API request failed', {
        period_month,
        status,
        code: err.code,
        message: err.message,
        // DILARANG: jangan log err.config (mengandung Authorization header)
      })

      if (isTimeout) {
        throw new AppError(
          ErrorCode.ACCURATE_API_ERROR,
          'Accurate API request timed out. Please try again later.',
          502,
        )
      }

      if (status === 401 || status === 403) {
        throw new AppError(
          ErrorCode.ACCURATE_API_ERROR,
          'Accurate API authentication failed. Check API key configuration.',
          502,
        )
      }

      throw new AppError(
        ErrorCode.ACCURATE_API_ERROR,
        `Accurate API error: ${err.response?.data?.message ?? err.message}`,
        502,
      )
    }

    // Non-axios error
    logger.error('[accurate] Unexpected error', {
      period_month,
      error: err instanceof Error ? err.message : String(err),
    })

    throw new AppError(
      ErrorCode.ACCURATE_API_ERROR,
      'Unexpected error when connecting to Accurate API.',
      502,
    )
  }
}