import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import type { ReactNode } from 'react'

interface ClickableChartProps {
  link: string
  children: ReactNode
}

// Dipulihkan (2026-08-29, task029.md §49) — sempat dihapus di §46 sbg "kode
// mati" (Overview waktu itu tidak clickable sama sekali), sekarang dipakai
// lagi: user minta tiap card chart bisa diklik ke halaman detailnya
// ("Growth Cross Selling ke halaman Growth/Cross Selling").
export function ClickableChart({ link, children }: ClickableChartProps) {
  const navigate = useNavigate()
  return (
    <Box
      onClick={() => navigate(link)}
      sx={{ cursor: 'pointer', height: '100%', '&:hover': { opacity: 0.92 }, transition: 'opacity 0.15s' }}
    >
      {children}
    </Box>
  )
}
