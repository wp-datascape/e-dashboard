import dayjs from 'dayjs'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers/DatePicker'
import type { SxProps, Theme } from '@mui/material/styles'

export interface MonthYearPickerProps {
  label?: string
  /** Format 'YYYY-MM' */
  value: string
  onChange: (value: string) => void
  size?: 'small' | 'medium'
  sx?: SxProps<Theme>
}

/**
 * Picker Bulan+Tahun — custom-rendered (bukan native `<input type="month">` browser).
 *
 * Diganti dari native month input (2026-07-24) karena kontrol tahunnya sulit diakses:
 * popup native Chromium cuma render label tahun tanpa panah navigasi yang jelas
 * terlihat/di-klik, dan perilakunya beda-beda antar browser/OS - user report "tahun
 * tidak bisa diganti". Komponen ini render UI sendiri lewat @mui/x-date-pickers (sudah
 * jadi dependency tapi belum pernah dipakai) jadi konsisten di semua browser DAN ikut
 * tema dark/light app secara otomatis (native input butuh workaround CSS filter icon
 * terpisah - lihat DatePicker.tsx - karena itu native OS render, bukan React).
 *
 * API-nya sengaja tetap string 'YYYY-MM' polos (bukan dayjs object) supaya drop-in
 * replacement utk semua pemanggil yang sebelumnya pakai `<DatePicker type="month">`.
 */
export function MonthYearPicker({ label, value, onChange, size = 'small', sx }: MonthYearPickerProps) {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <MuiDatePicker
        label={label}
        views={['year', 'month']}
        openTo="month"
        format="MMMM YYYY"
        value={value ? dayjs(`${value}-01`) : null}
        onChange={(newValue) => {
          if (newValue?.isValid()) onChange(newValue.format('YYYY-MM'))
        }}
        slotProps={{ textField: { size, sx } }}
      />
    </LocalizationProvider>
  )
}
