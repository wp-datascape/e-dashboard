import type { Context } from 'hono'
import { AppError, ErrorCode } from '@/errors'
import { isDuplicateError } from '@/utils/response'
import { logger } from '@/utils/logger'
import { logAudit } from '@/utils/audit'
import { getCompanyById } from '@/features/companies/companies.service'
import { findBranchById } from '@/features/companies/branch.repository'
import {
  findDivisions,
  findDivisionById,
  createDivision,
  updateDivision,
  deactivateDivision,
  findActiveDivisionCodesForScope,
} from './divisions.repository'
import type { CreateDivisionDto, UpdateDivisionDto, ListDivisionsQuery } from './divisions.schema'

export async function listDivisionsService(query: ListDivisionsQuery) {
  if (query.company_id) await getCompanyById(query.company_id)
  return findDivisions({ companyId: query.company_id, branchId: query.branch_id, isActive: query.is_active })
}

export async function getDivisionByIdService(id: number) {
  const row = await findDivisionById(id)
  if (!row) throw new AppError(ErrorCode.NOT_FOUND, `Divisi dengan id ${id} tidak ditemukan`, 404)
  return row
}

async function assertBranchBelongsToCompany(companyId: number, branchId: number) {
  const branch = await findBranchById(branchId)
  if (!branch || branch.company_id !== companyId) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'branch_id tidak valid untuk company ini', 400)
  }
}

export async function createDivisionService(dto: CreateDivisionDto, ctx: Context) {
  try {
    await getCompanyById(dto.company_id)
    if (dto.branch_id) await assertBranchBelongsToCompany(dto.company_id, dto.branch_id)

    const row = await createDivision({
      company_id: dto.company_id,
      branch_id: dto.branch_id ?? null,
      name: dto.name,
      code: dto.code,
      dormant_bucket: dto.dormant_bucket ?? 'b2b_dc',
      is_active: dto.is_active ?? true,
    })

    logger.info('[divisions] Division created', { id: row.id, company_id: dto.company_id, code: dto.code })
    await logAudit(ctx, {
      action: 'division.create',
      entity: 'divisions',
      entityId: row.id,
      companyId: dto.company_id,
      newValue: { name: row.name, code: row.code, branch_id: row.branch_id, dormant_bucket: row.dormant_bucket },
    })
    return row
  } catch (err) {
    if (isDuplicateError(err)) throw new AppError(ErrorCode.DUPLICATE_ENTRY, `Divisi "${dto.code}" sudah ada untuk company/branch ini`, 409)
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal membuat divisi', 500)
  }
}

export async function updateDivisionService(id: number, dto: UpdateDivisionDto, ctx: Context) {
  try {
    const existing = await getDivisionByIdService(id)
    if (dto.branch_id) await assertBranchBelongsToCompany(existing.company_id, dto.branch_id)

    const updated = await updateDivision(id, dto)
    logger.info('[divisions] Division updated', { id })
    await logAudit(ctx, {
      action: 'division.update',
      entity: 'divisions',
      entityId: id,
      companyId: existing.company_id,
      oldValue: { name: existing.name, code: existing.code, branch_id: existing.branch_id, dormant_bucket: existing.dormant_bucket, is_active: existing.is_active },
      newValue: { name: updated?.name, code: updated?.code, branch_id: updated?.branch_id, dormant_bucket: updated?.dormant_bucket, is_active: updated?.is_active },
    })
    return updated
  } catch (err) {
    if (isDuplicateError(err)) throw new AppError(ErrorCode.DUPLICATE_ENTRY, 'Divisi sudah ada untuk company/branch ini', 409)
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengupdate divisi', 500)
  }
}

export async function deleteDivisionService(id: number, ctx: Context) {
  const existing = await getDivisionByIdService(id)
  const updated = await deactivateDivision(id)
  logger.info('[divisions] Division deactivated (soft delete)', { id })
  await logAudit(ctx, {
    action: 'division.delete',
    entity: 'divisions',
    entityId: id,
    companyId: existing.company_id,
    oldValue: { is_active: existing.is_active },
    newValue: { is_active: false },
  })
  return updated
}

/**
 * Validasi 1 kode divisi terhadap katalog aktif untuk (company, branch) —
 * pengganti z.enum() hardcode. Dipakai RBAC user assignment — grant akses ke
 * user HARUS ke divisi yang sudah nyata ada (tidak masuk akal auto-create
 * divisi baru cuma karena assign user), beda dari channel mapping (lihat
 * ensureDivisionCode di bawah).
 */
export async function validateDivisionCode(companyId: number, branchId: number | null, code: string): Promise<void> {
  const codes = await findActiveDivisionCodesForScope(companyId, branchId)
  if (!codes.includes(code)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, `Divisi "${code}" tidak valid untuk company/branch ini`, 400)
  }
}

function defaultNameFromCode(code: string): string {
  return code
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/**
 * Pastikan 1 kode divisi terdaftar di katalog untuk (company, branch) — kalau
 * belum ada, OTOMATIS dibuatkan (nama default dari kode, dormant_bucket
 * default 'b2b_dc', bisa diedit belakangan lewat halaman Divisions).
 *
 * Dipakai channel-divisions (create/update/import) — SSOT-nya adalah keputusan
 * admin yang tertulis di file/form mapping channel_name→division itu sendiri
 * (task005 §6, revisi 2026-07-09, atas masukan user: tidak perlu seed/import
 * terpisah buat "daftarkan dulu kode divisinya", cukup 1 mekanisme mapping ini).
 */
export async function ensureDivisionCode(companyId: number, branchId: number | null, code: string): Promise<void> {
  const codes = await findActiveDivisionCodesForScope(companyId, branchId)
  if (codes.includes(code)) return

  try {
    const row = await createDivision({
      company_id: companyId,
      branch_id: branchId,
      name: defaultNameFromCode(code),
      code,
      dormant_bucket: 'b2b_dc',
      is_active: true,
    })
    logger.info('[divisions] Division auto-created dari channel mapping', { id: row.id, company_id: companyId, branch_id: branchId, code })
  } catch (err) {
    // Race condition (2 mapping ke-import bersamaan pakai kode baru yang sama) —
    // kode sudah ada sekarang, itu yang kita mau, aman diabaikan.
    if (!isDuplicateError(err)) throw err
  }
}
