import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useTranslation } from 'react-i18next';

// Dipakai di halaman Growth/Retention/Value (task029) — ketiganya
// menggabungkan komponen dari beberapa permission berbeda (cross.selling:view/
// expansion:view/churn.risk:view) di satu halaman yang gate route-nya cuma 1
// permission (growth:view dkk). Kalau user tidak punya permission data utk
// salah satu section, tampilkan notice ini (BUKAN biarkan section itu diam-
// diam 403/kosong tanpa penjelasan) — perbaikan atas temuan sebelumnya
// (routeConstants.tsx, 2026-08-19).
export function NoSectionAccess() {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        p: 3,
        border: '1px dashed',
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        color: 'text.secondary',
      }}
    >
      <LockOutlinedIcon fontSize="small" />
      <Typography variant="body2">{t('dashboard.noSectionAccess')}</Typography>
    </Box>
  );
}
