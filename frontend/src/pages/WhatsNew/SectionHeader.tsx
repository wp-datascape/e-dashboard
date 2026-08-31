import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'

interface SectionHeaderProps {
  icon: ReactNode
  label: string
}

// Icon SELALU disertai teks label (bukan satu-satunya indikator informasi -
// task033 §10 accessibility), dipakai konsisten di tiap section halaman ini.
export default function SectionHeader({ icon, label }: SectionHeaderProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
      <Box sx={{ display: 'flex', color: 'primary.main' }}>{icon}</Box>
      <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
        {label}
      </Typography>
    </Box>
  )
}
