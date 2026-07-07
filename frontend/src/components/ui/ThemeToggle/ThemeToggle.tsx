// src/components/ui/ThemeToggle/ThemeToggle.tsx
import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '@/theme/theme.context';

interface ThemeToggleProps {
  sx?: SxProps<Theme>;
}

const KNOB_SIZE = 24;
const TRACK_PADDING = 4;
const SLIDE_DISTANCE = 32; // jarak knob geser kiri<->kanan

/**
 * Pill toggle dark/light dengan knob bulat yang geser + icon saling silang posisi
 * (moon aktif di kiri saat dark, sun aktif di kanan saat light — icon "hantu" yang
 * meredup geser ke posisi sebaliknya). Warna sengaja hardcode zinc/gray (bukan ikut
 * palette tema) — ini look monokrom yang disengaja, independen dari accent color user.
 */
export function ThemeToggle({ sx }: ThemeToggleProps) {
  const { t } = useTranslation();
  const { toggleTheme, isDark } = useThemeMode();

  return (
    <Box
      onClick={toggleTheme}
      role="button"
      tabIndex={0}
      aria-label={isDark ? t('common.lightMode') : t('common.darkMode')}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTheme(); }
      }}
      sx={{
        position: 'relative',
        width: 64,
        height: 32,
        p: `${TRACK_PADDING}px`,
        borderRadius: 999,
        cursor: 'pointer',
        transition: 'background-color 0.3s, border-color 0.3s',
        bgcolor: isDark ? '#09090b' : '#ffffff',
        border: '1px solid',
        borderColor: isDark ? '#27272a' : '#e4e4e7',
        ...sx,
      }}
    >
      {/* Knob aktif (terisi) — moon saat dark (posisi kiri), sun saat light (geser ke kanan) */}
      <Box
        sx={{
          position: 'absolute',
          top: TRACK_PADDING,
          left: TRACK_PADDING,
          width: KNOB_SIZE,
          height: KNOB_SIZE,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.3s, background-color 0.3s',
          transform: isDark ? 'translateX(0)' : `translateX(${SLIDE_DISTANCE}px)`,
          bgcolor: isDark ? '#27272a' : '#e5e7eb',
        }}
      >
        {isDark
          ? <DarkModeIcon sx={{ fontSize: 16, color: '#ffffff' }} />
          : <LightModeIcon sx={{ fontSize: 16, color: '#374151' }} />}
      </Box>

      {/* Icon "hantu" (dim, transparan) — sun saat dark (kanan), moon saat light (geser ke kiri) */}
      <Box
        sx={{
          position: 'absolute',
          top: TRACK_PADDING,
          left: TRACK_PADDING,
          width: KNOB_SIZE,
          height: KNOB_SIZE,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.3s',
          transform: isDark ? `translateX(${SLIDE_DISTANCE}px)` : 'translateX(0)',
        }}
      >
        {isDark
          ? <LightModeIcon sx={{ fontSize: 16, color: '#6b7280' }} />
          : <DarkModeIcon sx={{ fontSize: 16, color: '#000000' }} />}
      </Box>
    </Box>
  );
}
