import { AppError, ErrorCode } from '@/errors'
import { env } from '@/config/env'
import { comparePassword } from '@/utils/hash'
import { generateToken, generateRefreshToken, verifyRefreshToken } from '@/utils/jwt'
import { generateCsrfToken } from '@/utils/csrf'
import { sendTelegramAlert } from '@/utils/telegram'
import { logLoginEvent } from '@/utils/loginLog'
import {
  findActiveUserByEmail,
  findActiveUserById,
  getUserCompanyIds,
  getUserPrimaryRole,
  getUserPermissions,
  updateLastLogin,
  getMyScopeTree,
  recordFailedLogin,
  resetLoginAttempts,
  updateUserPreferences,
} from './auth.repository'
import type { LoginDto, UpdatePreferencesDto } from './auth.schema'
import type { UserPreferences } from '@/db/schema'

// Default preferensi kalau user belum pernah set apa pun (Task003) - fallback ini
// biar user existing tidak tiba-tiba berubah tampilannya begitu fitur ini deploy;
// frontend tetap boleh fallback lagi ke system preference/browser locale sendiri
// kalau field-nya undefined (default di sini cuma utk color_palette yang memang
// butuh nilai pasti, tidak ada "system preference" utk itu).
const DEFAULT_PREFERENCES: UserPreferences = {
  color_palette: 'blue',
  dismissed_banners: [],
}

function formatLockRemaining(lockedUntil: Date): string {
  const minutes = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000)
  return minutes <= 1 ? '1 menit' : `${minutes} menit`
}

export async function loginService(dto: LoginDto, ipAddress?: string, userAgent?: string) {
  const user = await findActiveUserByEmail(dto.email)

  // Gunakan pesan error generik untuk mencegah user enumeration
  if (!user) {
    await logLoginEvent({ userId: null, email: dto.email, event: 'login_failed', reason: 'invalid_credentials', ipAddress, userAgent })
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Email atau password salah', 401)
  }
  if (!user.is_active) {
    await logLoginEvent({ userId: user.id, email: dto.email, event: 'login_failed', reason: 'account_inactive', ipAddress, userAgent })
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Email atau password salah', 401)
  }

  // Account lockout (Task002 Task C) — cek SEBELUM verifikasi password. locked_until
  // di masa depan berarti masih terkunci; kalau sudah lewat, biarkan lanjut normal
  // (bukan auto-reset di sini — reset beneran terjadi saat login sukses berikutnya).
  if (user.locked_until && user.locked_until.getTime() > Date.now()) {
    await logLoginEvent({ userId: user.id, email: dto.email, event: 'login_failed', reason: 'account_locked', ipAddress, userAgent })
    throw new AppError(
      ErrorCode.ACCOUNT_LOCKED,
      `Akun terkunci karena terlalu banyak percobaan gagal. Coba lagi dalam ${formatLockRemaining(user.locked_until)}, atau hubungi admin.`,
      403,
    )
  }

  const isMatch = await comparePassword(dto.password, user.password)
  if (!isMatch) {
    const { justLocked } = await recordFailedLogin(user.id, env.ACCOUNT_LOCKOUT_THRESHOLD, env.ACCOUNT_LOCKOUT_DURATION_MINUTES)
    if (justLocked) {
      // Task002 Task E — sinyal serangan (brute force live), BUKAN lewat logAudit()
      // (belum ada ctx.var.user, request ini belum berhasil autentikasi)
      void sendTelegramAlert(
        `*Akun terkunci*\nEmail: \`${user.email}\`\nSetelah ${env.ACCOUNT_LOCKOUT_THRESHOLD}x percobaan login gagal berturut-turut.\nIP: \`${ipAddress ?? 'unknown'}\`\nDurasi lock: ${env.ACCOUNT_LOCKOUT_DURATION_MINUTES} menit.`,
      )
      await logLoginEvent({ userId: user.id, email: dto.email, event: 'account_locked', reason: 'too_many_attempts', ipAddress, userAgent })
      throw new AppError(
        ErrorCode.ACCOUNT_LOCKED,
        `Akun terkunci karena ${env.ACCOUNT_LOCKOUT_THRESHOLD}x percobaan gagal berturut-turut. Coba lagi dalam ${env.ACCOUNT_LOCKOUT_DURATION_MINUTES} menit, atau hubungi admin.`,
        403,
      )
    }
    await logLoginEvent({ userId: user.id, email: dto.email, event: 'login_failed', reason: 'invalid_credentials', ipAddress, userAgent })
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Email atau password salah', 401)
  }

  const [companyIds, primaryRole, permissionNames] = await Promise.all([
    getUserCompanyIds(user.id),
    getUserPrimaryRole(user.id),
    getUserPermissions(user.id),
  ])

  await Promise.all([updateLastLogin(user.id), resetLoginAttempts(user.id)])
  await logLoginEvent({ userId: user.id, email: user.email, event: 'login_success', ipAddress, userAgent })

  const isSuperAdmin = primaryRole === 'superadmin'

  const accessToken = generateToken({
    userId: user.id,
    email: user.email,
    companyIds,
    isSuperAdmin,
    tokenVersion: user.token_version,
  })

  const refreshToken = generateRefreshToken(user.id, user.token_version)
  const csrfToken = generateCsrfToken()

  return {
    accessToken,
    refreshToken,
    csrfToken,
    user: {
      id: String(user.id),
      name: user.name,
      email: user.email,
      role: primaryRole ?? 'user',
    },
    permissions: permissionNames,
  }
}

export async function logoutService(userId: number, ipAddress?: string, userAgent?: string) {
  await logLoginEvent({ userId, event: 'logout', ipAddress, userAgent })
}

export async function refreshService(refreshToken: string) {
  // verifyRefreshToken throws AppError(UNAUTHORIZED) jika expired / invalid / bukan refresh type
  const payload = verifyRefreshToken(refreshToken)

  const user = await findActiveUserById(payload.userId)
  if (!user || !user.is_active) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Sesi tidak valid', 401)
  }

  // Invalidasi sesi (Task002 Task D) — refresh token yang diterbitkan SEBELUM password
  // direset punya tokenVersion lama; begitu password direset (token_version di-increment),
  // refresh token itu otomatis ditolak di sini, tidak bisa dipakai mint access token baru.
  if (payload.tokenVersion !== user.token_version) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Sesi tidak valid, silakan login ulang', 401)
  }

  const [companyIds, primaryRole] = await Promise.all([
    getUserCompanyIds(payload.userId),
    getUserPrimaryRole(payload.userId),
  ])

  const accessToken = generateToken({
    userId: user.id,
    email: user.email,
    companyIds,
    isSuperAdmin: primaryRole === 'superadmin',
    tokenVersion: user.token_version,
  })

  const csrfToken = generateCsrfToken()

  return { accessToken, csrfToken }
}

export async function getMeService(userId: number, isSuperAdmin: boolean) {
  const user = await findActiveUserById(userId)
  if (!user || !user.is_active) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Sesi tidak valid', 401)
  }

  const [primaryRole, permissionNames, scopeCompanies] = await Promise.all([
    getUserPrimaryRole(userId),
    getUserPermissions(userId),
    isSuperAdmin ? Promise.resolve([]) : getMyScopeTree(userId),
  ])

  return {
    user: {
      id: String(user.id),
      name: user.name,
      email: user.email,
      role: primaryRole ?? 'user',
    },
    permissions: permissionNames,
    // Pohon Company->Branch->Division milik user sendiri, dipakai frontend utk
    // populate dropdown filter Dashboard/Workbench sesuai level akses. Superadmin
    // bypass total - companies:[] menandakan "unrestricted", frontend fallback ke
    // daftar company/branch/division penuh (useCompanies/useBranchesByCompany/enum).
    scope: {
      isSuperAdmin,
      companies: scopeCompanies,
    },
    // Task003 — merge default supaya field yang belum pernah di-set (user existing,
    // sebelum fitur ini ada) tetap punya nilai pasti, bukan undefined.
    preferences: { ...DEFAULT_PREFERENCES, ...(user.preferences ?? {}) },
  }
}

export async function updateMyPreferencesService(userId: number, dto: UpdatePreferencesDto) {
  const preferences = await updateUserPreferences(userId, dto)
  if (!preferences) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Sesi tidak valid', 401)
  }
  return { ...DEFAULT_PREFERENCES, ...preferences }
}
