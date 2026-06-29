// src/api/import.api.ts
import { api as axiosInstance } from './axios'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type { ImportLog, ImportResult, ImportErrorRow, ImportFilePayload, ImportAccuratePayload } from '@/types/import'
import type { Company } from '@/types/users'

export const importFile = (payload: ImportFilePayload) => {
  const form = new FormData()
  form.append('file', payload.file)
  form.append('company_id', String(payload.company_id))
  form.append('period_month', payload.period_month)
  return axiosInstance.post<ApiResponse<ImportResult>>('/import/csv', form)
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
