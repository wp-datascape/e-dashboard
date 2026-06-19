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
  return axiosInstance.post<ApiResponse<ImportResult>>('/import/file', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const importAccurate = (payload: ImportAccuratePayload) =>
  axiosInstance.post<ApiResponse<ImportResult>>('/import/accurate', payload)

export const getImportLogs = (params?: { company_id?: number; page?: number; per_page?: number }) =>
  axiosInstance.get<PaginatedResponse<ImportLog>>('/import/logs', { params })

export const getImportErrors = (logId: number) =>
  axiosInstance.get<ApiResponse<ImportErrorRow[]>>(`/import/logs/${logId}/errors`)

export const getCompanies = () =>
  axiosInstance.get<ApiResponse<Company[]>>('/companies')
