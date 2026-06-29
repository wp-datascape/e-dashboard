import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { useNavigate } from 'react-router-dom'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'

export default function Forbidden() {
  const navigate = useNavigate()

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: 2,
        textAlign: 'center',
        p: 3,
      }}
    >
      <LockOutlinedIcon sx={{ fontSize: 64, color: 'warning.main' }} />

      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        403 — Akses Ditolak
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
        Anda tidak memiliki izin untuk mengakses halaman ini. Hubungi administrator jika ini adalah kesalahan.
      </Typography>

      <Button variant="contained" onClick={() => navigate('/dashboard')}>
        Kembali ke Dashboard
      </Button>
    </Box>
  )
}
