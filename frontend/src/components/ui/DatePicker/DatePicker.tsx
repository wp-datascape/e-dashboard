import { type ChangeEvent } from 'react'
import TextField from '@mui/material/TextField'
import type { TextFieldProps } from '@mui/material/TextField'
import { useThemeMode } from '@/theme/theme.context'

export type DatePickerProps = Omit<TextFieldProps, 'type' | 'slotProps'> & {
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void
}

/**
 * Atomic DatePicker component — wrapping MUI TextField with type="date".
 *
 * Handles dark/light mode calendar icon color automatically via useThemeMode.
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
export function DatePicker({ sx, ...rest }: DatePickerProps) {
  const { isDark } = useThemeMode()

  return (
    <TextField
      type="date"
      slotProps={{ inputLabel: { shrink: true } }}
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