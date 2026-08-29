// ReportSummaryLine.tsx (2026-08-26, task029.md §36.16 — instruksi user:
// "aku perlu summary seperti ini di setiap laporan", nunjuk baris ringkasan
// tab Reaktivasi Report/Retention "Total Pelanggan: X · Pelanggan Aktif: Y
// · ..."). Pola itu SEBELUMNYA cuma inline di 1 tab — dipusatkan di sini
// (Centralize UI, no duplication) supaya dipakai SEMUA tab Laporan
// (Revenue/GP/HM/Cross Selling/Expansion/ROR/Dormant), bukan copy-paste 7x.
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export interface ReportSummaryItem {
  label: string;
  value: string;
}

export function ReportSummaryLine({ items }: { items: ReportSummaryItem[] }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 1.5 }}>
      {items.map(({ label, value }) => (
        <Box key={label} sx={{ display: 'flex', gap: 0.5 }}>
          <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
          <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>:</Typography>
          <Typography component="span" variant="caption" sx={{ color: 'text.primary', fontWeight: 600 }}>{value}</Typography>
        </Box>
      ))}
    </Box>
  );
}
