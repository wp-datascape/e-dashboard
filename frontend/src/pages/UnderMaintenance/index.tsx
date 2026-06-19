import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { keyframes } from '@mui/system'
import SettingsIcon from '@mui/icons-material/Settings'
import { useTranslation } from 'react-i18next'

// ─── Animations ───────────────────────────────────────────────────────────────
const rotateCW = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`

const rotateCCW = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(-360deg); }
`

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
`

// ─── Component ────────────────────────────────────────────────────────────────
export default function UnderMaintenance() {
  const { t } = useTranslation()
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flexGrow: 1,
        gap: 3,
        textAlign: 'center',
        p: 3,
        py: 8,
      }}
    >
      {/* Animated Gears */}
      <Box sx={{ position: 'relative', width: 120, height: 120 }}>
        {/* Large gear — center (wrapper positions, inner rotates) */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            mt: '-32px', // half of 64px icon
            ml: '-32px',
          }}
        >
          <Box
            sx={{
              animation: `${rotateCW} 3s linear infinite`,
              color: 'warning.main',
              display: 'flex',
              transformOrigin: 'center',
            }}
          >
            <SettingsIcon sx={{ fontSize: 64 }} />
          </Box>
        </Box>

        {/* Small gear — top right */}
        <Box
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
          }}
        >
          <Box
            sx={{
              animation: `${rotateCCW} 2s linear infinite`,
              color: 'text.disabled',
              display: 'flex',
              transformOrigin: 'center',
            }}
          >
            <SettingsIcon sx={{ fontSize: 28 }} />
          </Box>
        </Box>

        {/* Small gear — bottom left */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 4,
            left: 4,
          }}
        >
          <Box
            sx={{
              animation: `${rotateCCW} 2.5s linear infinite`,
              color: 'primary.main',
              display: 'flex',
              opacity: 0.7,
              transformOrigin: 'center',
            }}
          >
            <SettingsIcon sx={{ fontSize: 22 }} />
          </Box>
        </Box>
      </Box>

      {/* Pulsing title */}
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          animation: `${pulse} 2.5s ease-in-out infinite`,
        }}
      >
        {t('maintenance.title')}
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
        {t('maintenance.subtitle')}
      </Typography>
    </Box>
  )
}
