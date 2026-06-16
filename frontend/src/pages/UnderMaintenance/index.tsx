import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { useNavigate } from 'react-router-dom'
import BuildCircleOutlinedIcon from '@mui/icons-material/BuildCircleOutlined'

export default function UnderMaintenance() {
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
      <BuildCircleOutlinedIcon sx={{ fontSize: 64, color: 'warning.main' }} />

      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Halaman Sedang Dalam Pengembangan
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
        Fitur ini belum tersedia. Kami sedang mengerjakannya dan akan segera hadir.
      </Typography>

      <Button variant="contained" onClick={() => navigate('/dashboard')}>
        Kembali ke Dashboard
      </Button>
    </Box>
  )
}
