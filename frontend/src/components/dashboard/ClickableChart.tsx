import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import type { ReactNode } from 'react'

interface ClickableChartProps {
  link: string
  children: ReactNode
}

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