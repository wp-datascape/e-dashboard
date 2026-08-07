import dayjs from 'dayjs'
import 'dayjs/locale/id'
import 'dayjs/locale/en'
import { useTranslation } from 'react-i18next'
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
  /** Format 'YYYY-MM' — batasi bulan terakhir yang bisa dipilih (mis. bulan berjalan). */
  maxDate?: string
  disabled?: boolean
  helperText?: string
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
 *
 * Lebar default (task023 §5) — SEBELUMNYA 5 halaman pemanggil (Customers, Products,
 * ProductsHighMargin, Transactions, Dashboard) masing-masing tempel `width` piksel
 * tetap sendiri (150/160), tanpa ada yang sadar `format="MMMM YYYY"` render nama
 * bulan penuh ("September 2026" / "Agustus 2026") yang lebih lebar dari itu — hasil
 * nyata: teks kepotong di belakang icon kalender (dilaporkan user, screenshot
 * "August 202" kepotong). Dipusatkan di sini (bukan diulang per halaman lagi,
 * lihat [[feedback_centralize_ui_no_duplication]]) supaya lebar aman berlaku ke
 * semua pemanggil sekaligus, current DAN masa depan. Caller masih boleh override
 * lewat prop `sx` (di-merge SETELAH default, jadi menang) kalau ada kebutuhan khusus.
 *
 * Locale nama bulan (task023 §4/§5) — SEBELUMNYA `dayjs` dipakai polos tanpa locale,
 * jadi `format="MMMM YYYY"` SELALU render nama bulan Inggris ("August 2026") walau
 * seluruh app sudah diset Bahasa Indonesia — dilaporkan user langsung ("aku pakai
 * bahasa indonesia kenapa filter datepicker august"). `adapterLocale` di
 * `LocalizationProvider` diikat ke `i18n.language` ('id'/'en', lihat
 * `SUPPORTED_LANGUAGES` di `i18n/index.ts`) supaya ikut bahasa aktif user, bukan
 * hardcode salah satu.
 */
export function MonthYearPicker({ label, value, onChange, size = 'small', sx, maxDate, disabled, helperText }: MonthYearPickerProps) {
  const { i18n } = useTranslation()
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={i18n.language}>
      <MuiDatePicker
        label={label}
        views={['year', 'month']}
        openTo="month"
        format="MMMM YYYY"
        value={value ? dayjs(`${value}-01`) : null}
        maxDate={maxDate ? dayjs(`${maxDate}-01`) : undefined}
        disabled={disabled}
        onChange={(newValue) => {
          if (newValue?.isValid()) onChange(newValue.format('YYYY-MM'))
        }}
        slotProps={{
          textField: {
            size,
            helperText,
            sx: [
              { width: { xs: '100%', sm: 'auto' }, minWidth: { xs: '100%', sm: 190 } },
              ...(Array.isArray(sx) ? sx : [sx]).filter(Boolean),
            ],
          },
        }}
      />
    </LocalizationProvider>
  )
}
