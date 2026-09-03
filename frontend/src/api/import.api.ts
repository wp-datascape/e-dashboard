// src/api/import.api.ts
import { api as axiosInstance } from './axios'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type {
  ImportLog,
  ImportResult,
  ImportErrorRow,
  ImportFilePayload,
  ImportAccuratePayload,
  FakturImportPreviewResult,
} from '@/types/import'
import type { Company } from '@/types/users'

export const importFile = (payload: ImportFilePayload) => {
  const form = new FormData()
  form.append('file', payload.file)
  form.append('company_id', String(payload.company_id))
  form.append('period_month', payload.period_month)
  return axiosInstance.post<ApiResponse<ImportResult>>('/import/csv', form)
}

// ─── Review Import Faktur (task037/EDASHBOARD-588) ──────────────────────────

export const previewFakturImport = async (file: File, companyId: number): Promise<FakturImportPreviewResult> => {
  const form = new FormData()
  form.append('file', file)
  form.append('company_id', String(companyId))
  // Timeout khusus 200 detik (2026-09-02, laporan user: file KNT 42MB gagal
  // "timeout of 40000ms exceeded" walau backend-nya sendiri masih memproses,
  // tidak ada baris respons sama sekali di log — koneksi keburu diputus
  // browser). Default global 40 detik (axios.ts) sengaja dipilih utk skenario
  // LAIN (AB-Testing network-throttle), bukan utk proses berat spt ini.
  // 200 detik = di bawah idle timeout server (Bun.serve, 255 detik,
  // backend/src/index.ts), preview endpoint sendiri tidak streaming (satu
  // request/response biasa, beda dari commit yang sudah pakai SSE).
  const res = await axiosInstance.post<ApiResponse<FakturImportPreviewResult>>('/import/csv/preview', form, { timeout: 200_000 })
  return res.data.data
}

export const importAccurate = (payload: ImportAccuratePayload) =>
  axiosInstance.post<ApiResponse<ImportResult>>('/import/accurate', payload)

export const getImportLogs = (params?: { company_id?: number; page?: number; per_page?: number }) =>
  axiosInstance.get<PaginatedResponse<ImportLog>>('/import/logs', { params })

export const getImportErrors = (logId: number) =>
  axiosInstance.get<ApiResponse<{ log: ImportLog; errors: ImportErrorRow[] }>>(`/import/logs/${logId}`)

export const getCompanies = () =>
  axiosInstance.get<ApiResponse<Company[]>>('/companies')

export const downloadFakturTemplate = async (): Promise<void> => {
  const res = await axiosInstance.get('/import/template', { responseType: 'blob' })
  const url = URL.createObjectURL(new Blob([res.data as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'template_faktur_penjualan.xlsx'
  a.click()
  URL.revokeObjectURL(url)
}
