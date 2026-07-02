/**
 * ProgressBar — Atomic segmented progress bar untuk indikator import.
 *
 * Struktur bar (kiri → kanan):
 *   [ success (hijau) ][ error (merah) ][ sisa (abu) ]
 *
 * Variasi status:
 *   loading  → shimmer indeterminate (sebelum ada data)
 *   idle     → bar kosong (abu)
 *   success  → penuh hijau
 *   partial  → hijau + merah
 *   failed   → penuh merah
 */

import { useState, useEffect, useRef } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import type { SxProps, Theme } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'

export type ProgressBarStatus = 'success' | 'partial' | 'failed' | 'loading' | 'idle'
export type ProgressBarSize   = 'sm' | 'md' | 'lg'

export interface ProgressBarProps {
  success?:   number
  error?:     number
  total?:     number
  status?:    ProgressBarStatus
  size?:      ProgressBarSize
  showLabel?: boolean
  animated?:  boolean
  sx?:        SxProps<Theme>
}

const HEIGHT: Record<ProgressBarSize, number> = { sm: 4, md: 8, lg: 12 }

const shimmer = {
  '@keyframes shimmer': {
    '0%':   { backgroundPosition: '-400px 0' },
    '100%': { backgroundPosition: '400px 0' },
  },
  animation: 'shimmer 1.4s infinite linear',
  background: 'linear-gradient(90deg, #e0e0e0 25%, #f5f5f5 50%, #e0e0e0 75%)',
  backgroundSize: '800px 100%',
}

export function ProgressBar({
  success   = 0,
  error     = 0,
  total     = 0,
  status    = 'idle',
  size      = 'md',
  showLabel = true,
  animated  = true,
  sx,
}: ProgressBarProps) {
  const { t } = useTranslation()
  const h = HEIGHT[size]

  const safeTotal  = total > 0 ? total : 1
  const targetSuccessPct = Math.min((success / safeTotal) * 100, 100)
  const targetErrorPct   = Math.min((error   / safeTotal) * 100, 100 - targetSuccessPct)

  const [successPct, setSuccessPct] = useState(0)
  const [errorPct,   setErrorPct]   = useState(0)
  const isMounted = useRef(false)

  useEffect(() => {
    if (!animated) {
      setSuccessPct(targetSuccessPct)
      setErrorPct(targetErrorPct)
      return
    }

    if (!isMounted.current) {
      // Mount pertama: tunda satu frame agar browser render 0% dulu,
      // lalu CSS transition berjalan dari 0 → target.
      isMounted.current = true
      const id = requestAnimationFrame(() => {
        setSuccessPct(targetSuccessPct)
        setErrorPct(targetErrorPct)
      })
      return () => cancelAnimationFrame(id)
    }

    // Update berikutnya (streaming): langsung set — CSS transition tetap smooth.
    setSuccessPct(targetSuccessPct)
    setErrorPct(targetErrorPct)
  }, [targetSuccessPct, targetErrorPct, animated])

  const isLoading = status === 'loading'

  return (
    <Box sx={sx}>
      {/* ── Track ── */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: h,
          bgcolor: 'grey.200',
          borderRadius: h,
          overflow: 'hidden',
        }}
      >
        {isLoading ? (
          /* Indeterminate shimmer */
          <Box sx={{ position: 'absolute', inset: 0, borderRadius: h, ...shimmer }} />
        ) : (
          <>
            {/* Success segment */}
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${successPct}%`,
                bgcolor: 'success.main',
                borderRadius: h,
                transition: 'width 0.6s ease',
              }}
            />
            {/* Error segment — mulai tepat setelah success */}
            <Box
              sx={{
                position: 'absolute',
                left: `${successPct}%`,
                top: 0,
                height: '100%',
                width: `${errorPct}%`,
                bgcolor: 'error.main',
                borderRadius: h,
                transition: 'width 0.6s ease, left 0.6s ease',
              }}
            />
          </>
        )}
      </Box>

      {/* ── Label ── */}
      {showLabel && !isLoading && total > 0 && (
        <Stack direction="row" sx={{ mt: 0.75, justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.secondary">
            {t('common.progressTotal', { count: total.toLocaleString() })}
          </Typography>
          <Stack direction="row" spacing={1.5}>
            <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
              {t('common.progressSuccess', { count: success.toLocaleString() })}
            </Typography>
            {error > 0 && (
              <Typography variant="caption" color="error.main" sx={{ fontWeight: 600 }}>
                {t('common.progressError', { count: error.toLocaleString() })}
              </Typography>
            )}
          </Stack>
        </Stack>
      )}
    </Box>
  )
}
