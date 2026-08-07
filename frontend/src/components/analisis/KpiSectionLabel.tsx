import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { FormulaHelpIcon } from '@/components/ui';

// Label section kecil (mis. "M9 · Dormant Customer Value") + ikon ⓘ opsional
// yang menampilkan rumus perhitungan sebenarnya di tooltip (task025 §6b) —
// dipusatkan di sini karena dipakai di semua halaman KPI yang exist saat ini
// (DormantRate/DormantValue/ReactivationRate) dan akan dipakai lagi di
// halaman KPI lain yang menyusul, bukan ditulis ulang tiap halaman.
export interface KpiSectionLabelProps {
  label: string;
  formula?: { title: string; formula: string; note?: string };
}

export function KpiSectionLabel({ label, formula }: KpiSectionLabelProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, mb: 0.5 }}>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 700,
          color: 'text.secondary',
          fontSize: '0.72rem',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Typography>
      {formula && <FormulaHelpIcon title={formula.title} formula={formula.formula} note={formula.note} />}
    </Box>
  );
}
