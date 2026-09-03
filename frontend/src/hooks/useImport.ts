// src/hooks/useImport.ts
import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { importFile, importAccurate, getImportLogs, getImportErrors, getCompanies } from '@/api/import.api'
import { getCsrfToken } from '@/api/axios'
import { getApiErrorMessage } from '@/utils/apiError'
import type { ImportFilePayload, ImportAccuratePayload, ImportResult, FakturImportCommitPayload } from '@/types/import'

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
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['import', 'logs'] })
      void qc.invalidateQueries({ queryKey: ['customers'] })
    },
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
  const { t } = useTranslation()
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
        const data = await response.json() as { error?: string; message?: string }
        throw data
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
              error?: string
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
              void qc.invalidateQueries({ queryKey: ['customers'] })
            } else if (msg.event === 'error') {
              setErrorMessage(getApiErrorMessage(msg, t))
              setPhase('error')
            }
          } catch {
            // abaikan JSON malformed
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setErrorMessage(getApiErrorMessage(err, t))
      setPhase('error')
    }
  }, [qc, reset, t])

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

// ─── Review Import Faktur (task037/EDASHBOARD-588) ──────────────────────────
// Commit setelah review — SSE progress live, pola SAMA persis dengan
// useImportFileProgress di atas (fetch+ReadableStream manual, BUKAN
// EventSource, krn butuh header CSRF/cookie), cuma body JSON (daftar invoice
// + pilihan per baris) menggantikan FormData file mentah.
export function useImportCommitProgress() {
  const qc = useQueryClient()
  const { t } = useTranslation()
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

  const mutate = useCallback(async (payload: FakturImportCommitPayload) => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    reset()
    setPhase('uploading')

    const baseURL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/api/v1'
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const csrf = getCsrfToken()
    if (csrf) headers['X-CSRF-Token'] = csrf

    try {
      const response = await fetch(`${baseURL}/import/csv/commit`, {
        method: 'POST',
        body: JSON.stringify(payload),
        credentials: 'include',
        headers,
        signal: abortRef.current.signal,
      })

      if (!response.ok || !response.body) {
        const data = await response.json() as { error?: string; message?: string }
        throw data
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
              error?: string
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
              void qc.invalidateQueries({ queryKey: ['customers'] })
            } else if (msg.event === 'error') {
              setErrorMessage(getApiErrorMessage(msg, t))
              setPhase('error')
            }
          } catch {
            // abaikan JSON malformed
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setErrorMessage(getApiErrorMessage(err, t))
      setPhase('error')
    }
  }, [qc, reset, t])

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
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['import', 'logs'] })
      void qc.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}
