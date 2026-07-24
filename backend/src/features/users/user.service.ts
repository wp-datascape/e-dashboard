import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { AppError, ErrorCode } from '@/errors'
import { isDuplicateError } from '@/utils/response'
import { hashPassword } from '@/utils/hash'
import { logger } from '@/utils/logger'
import { logAudit } from '@/utils/audit'
import { logLoginEvent } from '@/utils/loginLog'
import { sendTelegramAlert } from '@/utils/telegram'
import type { Context } from 'hono'
import type { PaginationQuery } from '@/utils/validator'
import {
  findAllUsers,
  findUserById,
  findUserByEmail,
  createUser,
  updateUser,
  softDeleteUser,
  unlockUserAccount,
  incrementTokenVersion,
  replaceUserRoles,
  replaceUserCompanies,
  replaceUserAssignments,
} from './user.repository'
import { findRoleByName } from '@/features/roles/roles.repository'
import { findCompanyByCode } from '@/features/companies/companies.repository'
import type { CreateUserDto, UpdateUserDto } from './user.schema'

// Task002 Task E — role berwenang tinggi, dipakai deteksi aksi sensitif utk alert Telegram
const HIGH_PRIVILEGE_ROLES = new Set(['superadmin', 'admin'])
function hasHighPrivilegeRole(roles: Array<{ name: string }> | undefined): boolean {
  return roles?.some((r) => HIGH_PRIVILEGE_ROLES.has(r.name)) ?? false
}

export async function getUsers(query: PaginationQuery, viewerIsSuperAdmin: boolean) {
  return findAllUsers(query, !viewerIsSuperAdmin)
}

export async function getUserById(id: number, viewerIsSuperAdmin: boolean) {
  const user = await findUserById(id, !viewerIsSuperAdmin)
  if (!user) throw new AppError(ErrorCode.NOT_FOUND, 'User not found', 404)
  return user
}

export async function createUserService(dto: CreateUserDto, ctx: Context) {
  try {
    const existing = await findUserByEmail(dto.email)
    if (existing) throw new AppError(ErrorCode.DUPLICATE_ENTRY, 'Email already in use', 409)

    const { role_ids, company_assignments, ...userData } = dto
    const hashed = await hashPassword(userData.password)
    const user = await createUser({ ...userData, password: hashed })

    // Role & company assignment sengaja di-assign di sini (bukan cuma insert users) —
    // sebelumnya field ini dikirim frontend tapi tidak ada di schema,
    // jadi di-strip diam-diam oleh Zod dan user baru selalu tanpa role/company.
    if (role_ids && role_ids.length > 0) {
      await replaceUserRoles(user!.id, role_ids)
    }
    if (company_assignments && company_assignments.length > 0) {
      await replaceUserAssignments(user!.id, company_assignments)
    }

    const created = await findUserById(user!.id, !ctx.var.user.isSuperAdmin)

    logger.info('[user] User created', { id: user!.id, email: dto.email })

    await logAudit(ctx, {
      action: 'user.create',
      entity: 'users',
      entityId: user!.id,
      companyId: company_assignments?.[0]?.company_id ?? null,
      newValue: {
        id: user!.id,
        email: user!.email,
        name: user!.name,
        roles: (created?.roles as Array<{ id: number; name: string }> | undefined)?.map(r => ({ id: r.id, name: r.name })),
        companies: (created?.companies as Array<{ id: number; code: string }> | undefined)?.map(c => ({ id: c.id, code: c.code })),
      },
    })

    // Task002 Task E — privilege escalation: user baru langsung dibuat dengan role berwenang tinggi
    if (hasHighPrivilegeRole(created?.roles as Array<{ name: string }> | undefined)) {
      const roleNames = (created?.roles as Array<{ name: string }>).map((r) => r.name).join(', ')
      void sendTelegramAlert(
        `*User baru dengan role berwenang tinggi*\nEmail: \`${user!.email}\`\nRole: \`${roleNames}\`\nDibuat oleh: \`${ctx.var.user.email}\``,
      )
    }

    return created
  } catch (err) {
    if (isDuplicateError(err)) throw new AppError(ErrorCode.DUPLICATE_ENTRY, 'Email already in use', 409)
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to create user', 500)
  }
}

export async function updateUserService(id: number, dto: UpdateUserDto, ctx: Context) {
  // Ambil state sebelum update untuk oldValue
  const before = await getUserById(id, ctx.var.user.isSuperAdmin)

  // Extract relation fields before updating user data
  const { role_ids, company_assignments, ...userData } = dto

  // Hash password baru kalau admin reset password user ini
  const passwordReset = userData.password !== undefined
  if (userData.password !== undefined) {
    userData.password = await hashPassword(userData.password)
  }

  // Update user basic fields
  await updateUser(id, userData)

  // Invalidasi sesi (Task002 Task D) — password direset -> semua token lama (access &
  // refresh, di device manapun) otomatis invalid di request berikutnya
  if (passwordReset) {
    await incrementTokenVersion(id)
  }

  // Sync roles if provided
  if (role_ids !== undefined) {
    await replaceUserRoles(id, role_ids)
  }

  // Sync company/branch/division assignment if provided
  if (company_assignments !== undefined) {
    await replaceUserAssignments(id, company_assignments)
  }

  // Re-fetch dengan relasi (state setelah update)
  const after = await findUserById(id, !ctx.var.user.isSuperAdmin)

  // Ambil companyId dari company pertama user (default context)
  const companyId = (before.companies as Array<{ id: number }> | undefined)?.[0]?.id ?? null

  logger.info('[user] User updated', { id })

  await logAudit(ctx, {
    action: 'user.update',
    entity: 'users',
    entityId: id,
    companyId,
    oldValue: {
      id: before.id,
      name: before.name,
      email: before.email,
      isActive: before.is_active,
      roles: (before.roles as Array<{ id: number; name: string }> | undefined)?.map(r => ({ id: r.id, name: r.name })),
      companies: (before.companies as Array<{ id: number; code: string }> | undefined)?.map(c => ({ id: c.id, code: c.code })),
    },
    newValue: {
      id: after!.id,
      name: after!.name,
      email: after!.email,
      isActive: after!.is_active,
      roles: (after!.roles as Array<{ id: number; name: string }> | undefined)?.map(r => ({ id: r.id, name: r.name })),
      companies: (after!.companies as Array<{ id: number; code: string }> | undefined)?.map(c => ({ id: c.id, code: c.code })),
      // Jangan pernah log password (hash atau plaintext) — cuma catat bahwa reset terjadi
      ...(passwordReset ? { passwordReset: true } : {}),
    },
  })

  // Login log — password_changed/role_changed dicatat terpisah dari audit_logs
  // karena ini riwayat keamanan akun, bukan diff data biasa (lihat login-log feature).
  const actorIp = ctx.var.ipAddress ?? null
  const actorUserAgent = ctx.req.header('user-agent') ?? null
  if (passwordReset) {
    await logLoginEvent({
      userId: id,
      email: after?.email ?? before.email,
      event: 'password_changed',
      reason: 'admin_reset',
      ipAddress: actorIp,
      userAgent: actorUserAgent,
    })
  }
  if (role_ids !== undefined) {
    const roleNamesAfter = (after?.roles as Array<{ name: string }> | undefined)?.map((r) => r.name).join(', ') ?? null
    await logLoginEvent({
      userId: id,
      email: after?.email ?? before.email,
      event: 'role_changed',
      reason: roleNamesAfter,
      ipAddress: actorIp,
      userAgent: actorUserAgent,
    })
  }

  // Task002 Task E — privilege escalation: role berwenang tinggi BARU didapat (belum
  // punya sebelumnya) - bukan cuma "masih punya", supaya tidak spam tiap update lain
  // ke user yang MEMANG SUDAH admin/superadmin dari awal.
  const hadHighPrivilegeBefore = hasHighPrivilegeRole(before.roles as Array<{ name: string }> | undefined)
  const hasHighPrivilegeAfter = hasHighPrivilegeRole(after?.roles as Array<{ name: string }> | undefined)
  if (role_ids !== undefined && !hadHighPrivilegeBefore && hasHighPrivilegeAfter) {
    const roleNames = (after?.roles as Array<{ name: string }>).map((r) => r.name).join(', ')
    void sendTelegramAlert(
      `*Privilege escalation*\nUser: \`${before.email}\`\nRole baru: \`${roleNames}\`\nDiubah oleh: \`${ctx.var.user.email}\``,
    )
  }

  // Task002 Task E — reset password ke akun admin/superadmin (bukan ke user biasa,
  // supaya tidak spam kalau admin reset password banyak user biasa sekaligus)
  if (passwordReset && hadHighPrivilegeBefore) {
    void sendTelegramAlert(
      `*Reset password akun berwenang tinggi*\nUser: \`${before.email}\`\nDireset oleh: \`${ctx.var.user.email}\``,
    )
  }

  return after
}

export async function deleteUserService(id: number, ctx: Context) {
  const user = await getUserById(id, ctx.var.user.isSuperAdmin)

  if (user.roles?.some(r => (r as Record<string, unknown>).is_system)) {
    throw new AppError(ErrorCode.FORBIDDEN, 'Cannot delete a user with a system role', 403)
  }

  const companyId = (user.companies as Array<{ id: number }> | undefined)?.[0]?.id ?? null

  await softDeleteUser(id)
  logger.info('[user] User soft-deleted', { id })

  await logAudit(ctx, {
    action: 'user.delete',
    entity: 'users',
    entityId: id,
    companyId,
    oldValue: { id: user.id, email: user.email, name: user.name },
  })

  // Task002 Task E — hapus akun berwenang tinggi (superadmin sebenarnya sudah diblokir
  // di atas via is_system, tapi role 'admin' TIDAK is_system - jalur ini masih tercapai)
  if (hasHighPrivilegeRole(user.roles as Array<{ name: string }> | undefined)) {
    void sendTelegramAlert(
      `*User berwenang tinggi dihapus*\nEmail: \`${user.email}\`\nDihapus oleh: \`${ctx.var.user.email}\``,
    )
  }
}

/**
 * Unlock manual oleh admin (Task002 Task C4) — reset failed_login_count/locked_until
 * SEBELUM auto-unlock (ENV ACCOUNT_LOCKOUT_DURATION_MINUTES) habis. Aksi sensitif
 * (bisa dipakai buka akses akun yang sengaja dikunci karena dicurigai brute force),
 * jadi tetap tercatat di audit log seperti mutasi user lain.
 */
export async function unlockUserService(id: number, ctx: Context) {
  const user = await getUserById(id, ctx.var.user.isSuperAdmin)

  await unlockUserAccount(id)
  logger.info('[user] User account unlocked', { id })

  await logAudit(ctx, {
    action: 'user.unlock',
    entity: 'users',
    entityId: id,
    companyId: (user.companies as Array<{ id: number }> | undefined)?.[0]?.id ?? null,
    oldValue: { id: user.id, email: user.email },
  })

  // Task002 Task E — unlock manual selalu di-alert (aksi jarang & sengaja, jejak siapa
  // membuka kunci akun yang terkunci karena dicurigai brute force)
  void sendTelegramAlert(
    `*Akun di-unlock manual*\nEmail: \`${user.email}\`\nDibuka oleh: \`${ctx.var.user.email}\``,
  )

  return getUserById(id, ctx.var.user.isSuperAdmin)
}

// ─── Bulk import (template upload) ─────────────────────────────────────────────

export interface ImportUsersResult {
  added: number
  skipped: number
  errors: Array<{ row: number; message: string }>
}

export async function importUsersService(
  fileBuffer: Buffer,
  isXlsx: boolean,
  defaultPassword: string,
  ctx: Context,
): Promise<ImportUsersResult> {
  let parsed: Record<string, string>[]
  if (isXlsx) {
    const wb = XLSX.read(fileBuffer, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    // Scan baris pertama yang mengandung "email" sebagai header
    const rawRows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' }) as string[][]
    const headerIdx = rawRows.findIndex((r) => r.map(String).some((c) => c.trim().toLowerCase() === 'email'))
    if (headerIdx === -1) throw new AppError(ErrorCode.INVALID_FILE_FORMAT, 'Header "email" tidak ditemukan di file', 400)
    const headers = rawRows[headerIdx].map((h) => String(h).trim())
    parsed = rawRows.slice(headerIdx + 1)
      .filter((r) => r.some((c) => String(c).trim() !== ''))
      .map((r) => Object.fromEntries(headers.map((h, i) => [h, String(r[i] ?? '').trim()])))
  } else {
    const { data } = Papa.parse<Record<string, string>>(fileBuffer.toString('utf-8'), {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      transform: (v) => v.trim(),
    })
    parsed = data
  }

  const hashedDefaultPassword = await hashPassword(defaultPassword)

  let added = 0
  let skipped = 0
  const errors: Array<{ row: number; message: string }> = []

  for (let i = 0; i < parsed.length; i++) {
    const row = parsed[i]
    const rowNum = i + 2

    const name = row.name?.trim()
    const email = row.email?.trim().toLowerCase()
    const roleName = row.role?.trim()
    const companyCodesRaw = row.company_code?.trim()

    if (!name) {
      errors.push({ row: rowNum, message: 'name wajib diisi' })
      continue
    }
    if (!email) {
      errors.push({ row: rowNum, message: 'email wajib diisi' })
      continue
    }

    const existing = await findUserByEmail(email)
    if (existing) {
      skipped++
      continue
    }

    let roleId: number | null = null
    if (roleName) {
      const role = await findRoleByName(roleName)
      if (!role) {
        errors.push({ row: rowNum, message: `role "${roleName}" tidak ditemukan` })
        continue
      }
      roleId = role.id
    }

    const companyIds: number[] = []
    if (companyCodesRaw) {
      const codes = companyCodesRaw.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean)
      let invalidCode: string | null = null
      for (const code of codes) {
        const company = await findCompanyByCode(code)
        if (!company) { invalidCode = code; break }
        companyIds.push(company.id)
      }
      if (invalidCode) {
        errors.push({ row: rowNum, message: `company_code "${invalidCode}" tidak ditemukan` })
        continue
      }
    }

    const user = await createUser({ name, email, password: hashedDefaultPassword })
    if (roleId) await replaceUserRoles(user!.id, [roleId])
    if (companyIds.length > 0) await replaceUserCompanies(user!.id, companyIds)
    added++
  }

  if (added > 0) {
    await logAudit(ctx, {
      action: 'user.import',
      entity: 'users',
      entityId: 0,
      companyId: null,
      // Jangan pernah log password default — cuma catat ringkasan hasil import
      newValue: { added, skipped, errors: errors.length },
    })
  }

  return { added, skipped, errors }
}

export function getUsersTemplate(): ArrayBuffer {
  const title = ['Template Import User Baru', '']
  const descriptions = [
    'Nama lengkap karyawan',
    'Email login (wajib unik)',
    'Nama role yang sudah ada di sistem (opsional, kosongkan jika belum tahu — bisa di-assign belakangan lewat Edit User)',
    'Kode perusahaan (opsional), bisa lebih dari satu dipisah koma, mis. "PT01,PT02"',
  ]
  const headers = ['name', 'email', 'role', 'company_code']
  const examples = [
    ['Budi Santoso', 'budi.santoso@company.com', 'user', 'PT01'],
    ['Sari Wulandari', 'sari.wulandari@company.com', 'admin', 'PT01,PT02'],
  ]

  const ws = XLSX.utils.aoa_to_sheet([title, descriptions, headers, ...examples])
  ws['!cols'] = [{ wch: 24 }, { wch: 32 }, { wch: 48 }, { wch: 40 }]
  ws['!rows'] = [{ hpt: 20 }, { hpt: 56 }, { hpt: 20 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Users')
  const buf: Buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}