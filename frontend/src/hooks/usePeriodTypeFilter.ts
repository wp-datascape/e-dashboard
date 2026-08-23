import { useState } from 'react'
import type { ParetoPeriodType } from '@/types/paretoThresholds'
import {
  getCurrentPeriodKey,
  getPeriodDateRange,
  formatPeriodLabel,
  formatDateRange,
  shiftDateByYears,
  shiftEndDate,
} from '@/utils/analisisPeriod'
import { clampDateNotFuture } from '@/utils/date'

/** 4 granularitas resmi task029.md §21/§22/§30 — subset dari AnalisisPeriodType
 * (`ParetoPeriodType` sendiri sudah pas, tanpa 'ytd' yang khusus Analisis/task016). */
export type PeriodGranularity = ParetoPeriodType

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * State + resolusi tanggal untuk filter granularitas periode (Monthly/
 * Quarterly/Semester/Annual) — task029.md §21/§22/§30 (instruksi user
 * 2026-08-20: "buat dulu filter globalnya agar reuseable di komponen
 * lain"). Dipusatkan di sini, BUKAN ditulis ulang per halaman — reuse murni
 * fungsi period math dari `utils/analisisPeriod.ts` yang sudah teruji di
 * halaman Analisis (task016), tidak menduplikasi rumusnya.
 *
 * Mirror pola `useScopedCompanyFilter` (hook = state & logic, komponen
 * presentational terpisah = `PeriodTypeFilterFields`) — pola yang sudah
 * dipakai berulang di app ini utk filter shared (lihat
 * `components/filters/ScopeFilterFields.tsx`).
 *
 * CATATAN SCOPE PENTING (task029.md §30.4/§30.5): hook ini BARU state +
 * resolusi tanggal di FRONTEND. Endpoint M1-M10 backend BELUM menerima
 * parameter period_type apapun (`metrics.service.ts` masih hardcode
 * trend/KPI bulanan) — jadi filter ini SIAP dipakai UI-nya, tapi belum
 * mengubah data KPI manapun sampai backend tiap KPI diupdate menerima
 * granularitas ini (rencana: 1 KPI dulu jadi contoh, baru KPI lain).
 */
export function usePeriodTypeFilter(initialType: PeriodGranularity = 'monthly') {
  const [periodType, setPeriodType] = useState<PeriodGranularity>(initialType)
  // "Tanggal" — user pilih tanggal PERSIS (bukan bulan/kuartal), start range
  // selalu awal periode yang mengandung tanggal itu, end selalu tanggal itu
  // sendiri (elapsed range, sama seperti halaman Analisis task016 §26 —
  // periode berjalan yang belum tutup TIDAK menampilkan tanggal masa depan
  // yang datanya belum ada).
  const [endDate, setEndDateState] = useState<string>(todayISODate())

  const todayStr = todayISODate()
  const isViewingInProgress = endDate === todayStr

  const setEndDate = (value: string) => {
    // Tidak boleh pilih tanggal masa depan, ATAU kosong (2026-08-23, bug
    // dilaporkan user: tombol clear bawaan browser bikin value kosong →
    // fetch data error, seharusnya reset ke hari ini) — clampDateNotFuture
    // (utils/date.ts) SATU tempat pusat, dipakai semua date/month picker
    // filter periode di app ini.
    setEndDateState(clampDateNotFuture(value, todayStr))
  }

  const periodKey = getCurrentPeriodKey(periodType, new Date(endDate))
  const periodStart = getPeriodDateRange(periodType, periodKey).start
  const currentRange = { start: periodStart, end: endDate }
  const comparisonRange = {
    start: shiftDateByYears(periodStart, -1),
    end: shiftDateByYears(endDate, -1),
  }

  const periodLabel = formatPeriodLabel(periodType, periodKey)
  const currentRangeText = formatDateRange(currentRange)
  const comparisonRangeText = formatDateRange(comparisonRange)

  const goToPrevious = () => setEndDateState(shiftEndDate(periodType, endDate, -1))
  const goToNext = () => {
    const next = shiftEndDate(periodType, endDate, 1)
    setEndDateState(next > todayStr ? todayStr : next)
  }

  return {
    periodType,
    setPeriodType,
    endDate,
    setEndDate,
    periodKey,
    periodLabel,
    currentRange,
    comparisonRange,
    currentRangeText,
    comparisonRangeText,
    isViewingInProgress,
    goToPrevious,
    goToNext,
  }
}
