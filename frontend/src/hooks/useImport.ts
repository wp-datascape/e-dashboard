// src/hooks/useImport.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { importFile, importAccurate, getImportLogs, getImportErrors, getCompanies } from '@/api/import.api'
import type { ImportFilePayload, ImportAccuratePayload } from '@/types/import'

export const useImportLogs = (params?: { company_id?: number }) =>
  useQuery({
    queryKey: ['import', 'logs', params],
    queryFn: () => getImportLogs(params).then(r => r.data),
  })

export const useImportErrors = (logId: number | null) =>
  useQuery({
    queryKey: ['import', 'errors', logId],
    queryFn: () => getImportErrors(logId!).then(r => r.data),
    enabled: logId !== null,
  })

export const useImportFile = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: ImportFilePayload) => importFile(payload).then(r => r.data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['import', 'logs'] }) },
  })
}

export const useCompanies = () =>
  useQuery({
    queryKey: ['companies'],
    queryFn: () => getCompanies().then(r => r.data.data ?? []),
    staleTime: 10 * 60 * 1000,
  })

export const useImportAccurate = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: ImportAccuratePayload) => importAccurate(payload).then(r => r.data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['import', 'logs'] }) },
  })
}
