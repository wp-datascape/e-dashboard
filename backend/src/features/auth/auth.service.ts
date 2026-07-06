import { AppError, ErrorCode } from '@/errors'
import { env } from '@/config/env'
import { comparePassword } from '@/utils/hash'
import { generateToken, generateRefreshToken, verifyRefreshToken } from '@/utils/jwt'
import { generateCsrfToken } from '@/utils/csrf'
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
} from './auth.repository'
import type { LoginDto } from './auth.schema'

function formatLockRemaining(lockedUntil: Date): string {
  const minutes = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000)
  return minutes <= 1 ? '1 menit' : `${minutes} menit`
}

export async function loginService(dto: LoginDto) {
  const user = await findActiveUserByEmail(dto.email)

  // Gunakan pesan error generik untuk mencegah user enumeration
  if (!user || !user.is_active) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Email atau password salah', 401)
  }

  // Account lockout (Task002 Task C) — cek SEBELUM verifikasi password. locked_until
  // di masa depan berarti masih terkunci; kalau sudah lewat, biarkan lanjut normal
  // (bukan auto-reset di sini — reset beneran terjadi saat login sukses berikutnya).
  if (user.locked_until && user.locked_until.getTime() > Date.now()) {
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
      throw new AppError(
        ErrorCode.ACCOUNT_LOCKED,
        `Akun terkunci karena ${env.ACCOUNT_LOCKOUT_THRESHOLD}x percobaan gagal berturut-turut. Coba lagi dalam ${env.ACCOUNT_LOCKOUT_DURATION_MINUTES} menit, atau hubungi admin.`,
        403,
      )
    }
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Email atau password salah', 401)
  }

  const [companyIds, primaryRole, permissionNames] = await Promise.all([
    getUserCompanyIds(user.id),
    getUserPrimaryRole(user.id),
    getUserPermissions(user.id),
  ])

  await Promise.all([updateLastLogin(user.id), resetLoginAttempts(user.id)])

  const isSuperAdmin = primaryRole === 'superadmin'

  const accessToken = generateToken({
    userId: user.id,
    email: user.email,
    companyIds,
    isSuperAdmin,
  })

  const refreshToken = generateRefreshToken(user.id)
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

export async function refreshService(refreshToken: string) {
  // verifyRefreshToken throws AppError(UNAUTHORIZED) jika expired / invalid / bukan refresh type
  const payload = verifyRefreshToken(refreshToken)

  const user = await findActiveUserById(payload.userId)
  if (!user || !user.is_active) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Sesi tidak valid', 401)
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
  }
}
