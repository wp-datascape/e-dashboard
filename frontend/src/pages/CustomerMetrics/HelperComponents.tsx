import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { Card } from '@/components/ui';

// `icon` (2026-08-21, pola sama CrossSelling/HelperComponents.tsx — bagian
// dari "M1 jadi standar layout semua KPI") — ganti prefix teks "M7 ·" dkk
// jadi ikon kecil di depan label, bukan diulang tiap judul.
export function SectionLabel({ label, icon: Icon }: { label: string; icon?: React.ElementType }) {
  // `mb: 0.5` di Box INDUK, bukan di Typography anak (2026-08-25, koreksi
  // user: "icon belum sejajar" — screenshot M3 vs M1). Sebelumnya mb ada di
  // Typography saja, jadi box-margin Typography lebih tinggi dari Icon
  // (yang tidak py margin), bikin `alignItems:'center'` pada Box flex ini
  // memusatkan keduanya secara TIDAK simetris (icon kelihatan turun/naik
  // relatif teks). Pola yang benar SUDAH ada duluan di
  // `CrossSelling/HelperComponents.tsx` (dipakai M1/M2) — disamakan ke sana.
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
      {Icon && <Icon sx={{ fontSize: 14, color: 'text.secondary' }} />}
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
    </Box>
  );
}

/** Kartu ringkas 1 angka (label kecil + value besar) — pola sama
 * CrossSelling/HelperComponents.tsx, dipakai grid Overview tab. */
export function SummaryCard({ label, value, subValue }: { label: string; value: string; subValue?: string }) {
  return (
    <Card sx={{ p: 1.5, textAlign: 'center' }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        {value}
      </Typography>
      {/* subValue (2026-08-22, user: "Aku butuh data jumlah nya selain dari
          persentase") — jumlah customer mentah di bawah angka persentase,
          opsional supaya caller lain (M1/M2, cuma py 1 angka) tidak berubah. */}
      {subValue != null && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {subValue}
        </Typography>
      )}
    </Card>
  );
}

export function Row({
  label,
  value,
  highlight,
  icon,
}: {
  label: string
  value: string
  highlight?: boolean
  icon?: string
}) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
      <Typography variant="caption" color={highlight ? 'warning.main' : 'text.secondary'}>
        {icon}{label}
      </Typography>
      <Typography variant="caption" sx={{ fontWeight: 600, color: highlight ? 'warning.main' : 'text.primary' }}>
        {value}
      </Typography>
    </Box>
  );
}
