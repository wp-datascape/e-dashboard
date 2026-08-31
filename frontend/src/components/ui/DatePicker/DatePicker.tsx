import { type ChangeEvent } from 'react'
import TextField from '@mui/material/TextField'
import type { TextFieldProps } from '@mui/material/TextField'
import { useThemeMode } from '@/theme/theme.context'

export type DatePickerProps = Omit<TextFieldProps, 'type' | 'slotProps'> & {
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void
  /** @default 'date' */
  type?: 'date' | 'month'
  /** Native `max` attribute — batas atas yang BISA dipilih lewat picker
   * kalender bawaan browser (bukan cuma validasi JS setelah dipilih).
   * Format ikut `type`: 'YYYY-MM-DD' utk type="date", 'YYYY-MM' utk
   * type="month". Dipakai a.l. mencegah pilih periode masa depan pada
   * filter tanggal pelaporan (`utils/date.ts` `todayIsoDate`/`currentYearMonth`). */
  max?: string
  /** Native `min` attribute, format sama seperti `max`. */
  min?: string
}

/**
 * Atomic DatePicker component — wrapping MUI TextField with type="date" (atau "month").
 *
 * Handles dark/light mode calendar icon color automatically via useThemeMode - warna
 * icon native date/month picker browser ikut `color-scheme: light dark` di index.css
 * (mengikuti preferensi OS, BUKAN toggle tema di dalam app), jadi tanpa override ini
 * icon bisa jadi putih-di-atas-putih (tidak kelihatan) kalau OS dark tapi app di-set
 * light, atau sebaliknya. SELALU pakai komponen ini utk input date/month, jangan
 * TextField type="date"/"month" mentah.
 * Always shrinks the label so it doesn't overlap the date value.
 *
 * Usage:
 *   <DatePicker
 *     label="Dari Tanggal"
 *     value={dateFrom}
 *     onChange={(e) => setDateFrom(e.target.value)}
 *     size="small"
 *   />
 */
export function DatePicker({ sx, type = 'date', max, min, ...rest }: DatePickerProps) {
  const { isDark } = useThemeMode()

  return (
    <TextField
      type={type}
      slotProps={{ inputLabel: { shrink: true }, htmlInput: { max, min } }}
      sx={[
        {
          '& input::-webkit-calendar-picker-indicator': {
            filter: isDark
              ? 'brightness(0) invert(1)'
              : 'brightness(0) saturate(100%) invert(27%) sepia(98%) saturate(7491%) hue-rotate(224deg) brightness(96%) contrast(108%)',
            cursor: 'pointer',
            opacity: 1,
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]).filter(Boolean),
      ]}
      {...rest}
    />
  )
}