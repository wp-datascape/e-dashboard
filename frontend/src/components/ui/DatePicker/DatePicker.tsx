import { type ChangeEvent } from 'react'
import dayjs from 'dayjs'
import 'dayjs/locale/id'
import 'dayjs/locale/en'
import { useTranslation } from 'react-i18next'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers/DatePicker'
import type { SxProps, Theme } from '@mui/material/styles'

export interface DatePickerProps {
  label?: string
  /** Format 'YYYY-MM-DD', string kosong '' utk kosong/belum dipilih. */
  value?: string
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void
  size?: 'small' | 'medium'
  sx?: SxProps<Theme>
  disabled?: boolean
  helperText?: string
  fullWidth?: boolean
}

/**
 * Atomic DatePicker component — custom-rendered lewat `@mui/x-date-pickers`
 * (bukan native `<input type="date">` browser lagi).
 *
 * Diganti dari native date input (2026-08-09, koreksi user "format penulisan
 * tanggal gunakan dd-mm-yyyy") — format tampilan `<input type="date">` TIDAK
 * BISA dikontrol dev sama sekali, murni ikut locale OS/browser (kadang
 * mm/dd/yyyy, kadang yyyy-mm-dd, tidak konsisten lintas user) - satu-satunya
 * cara memaksa format tampilan tertentu adalah render UI sendiri, pola PERSIS
 * `MonthYearPicker.tsx` yang sudah lebih dulu migrasi krn alasan sama
 * (kontrol native sulit diakses/tidak konsisten). `@mui/x-date-pickers` sudah
 * jadi dependency lama (dipakai `MonthYearPicker`), tinggal dipakai lagi di
 * sini.
 *
 * API publik SENGAJA tetap sama persis (`value: string 'YYYY-MM-DD'`,
 * `onChange: (e: ChangeEvent<HTMLInputElement>) => void`, akses lewat
 * `e.target.value`) — drop-in replacement, SEMUA 11 halaman pemanggil yang
 * sudah ada (KpiFilterBar, Customers, Products, Transactions, dst) TIDAK
 * perlu diubah sama sekali, cuma implementasi internal komponen ini yang
 * berubah. `onChange` men-sintesis event minimal `{ target: { value } }`
 * (satu-satunya properti yang pernah diakses caller manapun, diverifikasi).
 *
 * Prop `type='month'` versi lama DIHAPUS (bukan disembunyikan) — sudah 0
 * pemakai (semua sudah pindah ke `MonthYearPicker` sejak task023), menjaga
 * komponen ini tetap single-purpose (tanggal harian saja).
 *
 * Locale nama bulan/hari ikut `i18n.language` (pola sama `MonthYearPicker`)
 * supaya "Kamis, 09 Agustus 2026" dst konsisten dgn bahasa aktif app, bukan
 * hardcode salah satu.
 */
export function DatePicker({ label, value, onChange, size = 'small', sx, disabled, helperText, fullWidth }: DatePickerProps) {
  const { i18n } = useTranslation()
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={i18n.language}>
      <MuiDatePicker
        label={label}
        format="DD-MM-YYYY"
        value={value ? dayjs(value) : null}
        disabled={disabled}
        onChange={(newValue) => {
          const iso = newValue?.isValid() ? newValue.format('YYYY-MM-DD') : ''
          onChange?.({ target: { value: iso } } as ChangeEvent<HTMLInputElement>)
        }}
        slotProps={{
          textField: { size, helperText, sx, fullWidth },
        }}
      />
    </LocalizationProvider>
  )
}
