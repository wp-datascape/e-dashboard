// src/hooks/useImport.ts
import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { importFile, importAccurate, getImportLogs, getImportErrors, getCompanies } from '@/api/import.api'
import { getCsrfToken } from '@/api/axios'
import type { ImportFilePayload, ImportAccuratePayload, ImportResult } from '@/types/import'

export const useImportLogs = (params?: { company_id?: number }) =>
  useQuery({
    queryKey: ['import', 'logs', params],
    queryFn: () => getImportLogs(params).then(r => r.data),
  })

export const useImportErrors = (logId: number | null) =>
  useQuery({
    queryKey: ['import', 'errors', logId],
    queryFn: () => getImportErrors(logId!).then(r => r.data.data?.errors ?? []),
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

export type ImportPhase = 'idle' | 'uploading' | 'processing' | 'done' | 'error'

export interface StreamProgress {
  processed: number
  total: number
  success: number
  errors: number
}

export function useImportFileProgress() {
  const qc = useQueryClient()
  const [phase, setPhase]             = useState<ImportPhase>('idle')
  const [progress, setProgress]       = useState<StreamProgress>({ processed: 0, total: 0, success: 0, errors: 0 })
  const [result, setResult]           = useState<ImportResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    setPhase('idle')
    setProgress({ processed: 0, total: 0, success: 0, errors: 0 })
    setResult(null)
    setErrorMessage(null)
  }, [])

  const mutate = useCallback(async (payload: ImportFilePayload) => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    reset()
    setPhase('uploading')

    const form = new FormData()
    form.append('file', payload.file)
    form.append('company_id', String(payload.company_id))
    form.append('period_month', payload.period_month)

    const baseURL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/api/v1'
    const headers: Record<string, string> = {}
    const csrf = getCsrfToken()
    if (csrf) headers['X-CSRF-Token'] = csrf

    try {
      const response = await fetch(`${baseURL}/import/csv/stream`, {
        method: 'POST',
        body: form,
        credentials: 'include',
        headers,
        signal: abortRef.current.signal,
      })

      if (!response.ok || !response.body) {
        const data = await response.json() as { message?: string }
        throw new Error(data.message ?? 'Import gagal')
      }

      setPhase('processing')

      const reader  = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer    = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue

          try {
            const msg = JSON.parse(raw) as {
              event: string
              processed?: number
              total?: number
              success?: number
              errors?: number
              result?: ImportResult
              message?: string
            }

            if (msg.event === 'progress') {
              setProgress({
                processed: msg.processed ?? 0,
                total:     msg.total     ?? 0,
                success:   msg.success   ?? 0,
                errors:    msg.errors    ?? 0,
              })
            } else if (msg.event === 'done' && msg.result) {
              setResult(msg.result)
              setProgress(p => ({ ...p, processed: p.total }))
              setPhase('done')
              void qc.invalidateQueries({ queryKey: ['import', 'logs'] })
            } else if (msg.event === 'error') {
              setErrorMessage(msg.message ?? 'Import gagal')
              setPhase('error')
            }
          } catch {
            // abaikan JSON malformed
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setErrorMessage(err instanceof Error ? err.message : 'Import gagal')
      setPhase('error')
    }
  }, [qc, reset])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    reset()
  }, [reset])

  return {
    phase,
    progress,
    result,
    errorMessage,
    mutate,
    reset,
    cancel,
    isPending: phase === 'uploading' || phase === 'processing',
  }
}

export const useImportAccurate = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: ImportAccuratePayload) => importAccurate(payload).then(r => r.data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['import', 'logs'] }) },
  })
}
