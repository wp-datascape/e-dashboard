import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { useNavigate } from 'react-router-dom'
import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined'

export default function NotFound() {
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
      <SearchOffOutlinedIcon sx={{ fontSize: 64, color: 'error.main' }} />

      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        404 - Halaman Tidak Ditemukan
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
        Halaman yang Anda cari tidak ada atau telah dipindahkan.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button variant="outlined" onClick={() => navigate(-1)}>
          Kembali
        </Button>
        <Button variant="contained" onClick={() => navigate('/dashboard')}>
          Ke Dashboard
        </Button>
      </Box>
    </Box>
  )
}
