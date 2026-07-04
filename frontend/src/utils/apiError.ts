// src/utils/apiError.ts
import type { TFunction } from 'i18next'

interface ApiErrorLike {
  error?: string
  message?: string
}

/**
 * Backend selalu kirim { error: ERROR_CODE, message }. `message` datang dari
 * backend dalam bahasa Indonesia dan tidak diterjemahkan — jangan pernah
 * ditampilkan langsung ke user. Selalu resolve lewat error code + i18n key
 * `error.codes.<CODE>` supaya konsisten dengan bahasa aplikasi yang aktif.
 */
export function getApiErrorMessage(err: unknown, t: TFunction): string {
  const apiErr = err as ApiErrorLike | null | undefined
  const code = apiErr?.error
  if (!code) return t('error.generic')
  return t(`error.codes.${code}`, { defaultValue: t('error.generic') })
}
