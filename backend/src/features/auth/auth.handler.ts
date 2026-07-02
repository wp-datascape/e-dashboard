import type { Context } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { success } from '@/utils/response'
import { validateBody } from '@/utils/validator'
import { env } from '@/config/env'
import { AppError, ErrorCode } from '@/errors'
import { loginSchema } from './auth.schema'
import { loginService, refreshService, getMeService } from './auth.service'

const SECURE = env.NODE_ENV === 'production'

// Production = deploy cross-site (backend Render, frontend Vercel, beda domain)
// → cookie WAJIB SameSite=None (Lax tidak pernah terkirim di request fetch/axios
// cross-site) — dan SameSite=None mewajibkan Secure=true, yang di production
// sudah otomatis true lewat SECURE di atas.
// Dev = sama-sama localhost (beda port saja) → masih dianggap same-site, Lax cukup.
const SAME_SITE = SECURE ? ('None' as const) : ('Lax' as const)

const HTTPONLY_OPTS = {
  httpOnly: true,
  sameSite: SAME_SITE,
  path: '/',
  secure: SECURE,
}

// CSRF cookie — sengaja TIDAK httpOnly agar JS bisa baca saat page refresh
const CSRF_COOKIE_OPTS = {
  httpOnly: false,
  sameSite: SAME_SITE,
  path: '/',
  secure: SECURE,
}

export async function handleLogin(c: Context) {
  const body = await validateBody(c, loginSchema)
  const result = await loginService(body)

  setCookie(c, 'access_token', result.accessToken, { ...HTTPONLY_OPTS, maxAge: 60 * 15 })
  setCookie(c, 'refresh_token', result.refreshToken, { ...HTTPONLY_OPTS, maxAge: 60 * 60 * 24 * 7 })
  setCookie(c, 'csrf_token', result.csrfToken, { ...CSRF_COOKIE_OPTS, maxAge: 60 * 60 * 24 * 7 })

  return success(
    c,
    {
      csrf_token: result.csrfToken,
      data: {
        token: result.accessToken,
        user: result.user,
        permissions: result.permissions,
      },
    },
    'Login berhasil',
  )
}

export async function handleRefresh(c: Context) {
  const refreshToken = getCookie(c, 'refresh_token')
  if (!refreshToken) throw new AppError(ErrorCode.UNAUTHORIZED, 'Refresh token tidak ditemukan', 401)

  const result = await refreshService(refreshToken)

  setCookie(c, 'access_token', result.accessToken, { ...HTTPONLY_OPTS, maxAge: 60 * 15 })
  setCookie(c, 'csrf_token', result.csrfToken, { ...CSRF_COOKIE_OPTS, maxAge: 60 * 60 * 24 * 7 })

  return success(c, { csrf_token: result.csrfToken }, 'Token diperbarui')
}

export async function handleLogout(c: Context) {
  deleteCookie(c, 'access_token', { path: '/' })
  deleteCookie(c, 'refresh_token', { path: '/' })
  deleteCookie(c, 'csrf_token', { path: '/' })
  return success(c, null, 'Logout berhasil')
}

export async function handleMe(c: Context) {
  const result = await getMeService(c.var.user.userId)
  return success(c, result)
}
