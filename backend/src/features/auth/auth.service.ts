import { AppError, ErrorCode } from '@/errors'
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
} from './auth.repository'
import type { LoginDto } from './auth.schema'

export async function loginService(dto: LoginDto) {
  const user = await findActiveUserByEmail(dto.email)

  // Gunakan pesan error generik untuk mencegah user enumeration
  if (!user || !user.is_active) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Email atau password salah', 401)
  }

  const isMatch = await comparePassword(dto.password, user.password)
  if (!isMatch) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Email atau password salah', 401)
  }

  const [companyIds, primaryRole, permissionNames] = await Promise.all([
    getUserCompanyIds(user.id),
    getUserPrimaryRole(user.id),
    getUserPermissions(user.id),
  ])

  await updateLastLogin(user.id)

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

export async function getMeService(userId: number) {
  const user = await findActiveUserById(userId)
  if (!user || !user.is_active) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Sesi tidak valid', 401)
  }

  const [primaryRole, permissionNames] = await Promise.all([
    getUserPrimaryRole(userId),
    getUserPermissions(userId),
  ])

  return {
    user: {
      id: String(user.id),
      name: user.name,
      email: user.email,
      role: primaryRole ?? 'user',
    },
    permissions: permissionNames,
  }
}
