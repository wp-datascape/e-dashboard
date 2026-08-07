import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import { useTranslation } from 'react-i18next';

import { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter';
import { ScopeFilterFields } from '@/components/filters/ScopeFilterFields';
import { ExcludeIntercompanyToggle } from '@/components/filters/ExcludeIntercompanyToggle';
import { DatePicker } from '@/components/ui/DatePicker';
import { Card, Button } from '@/components/ui';

// Filter bar "scope + 1 tanggal acuan" — versi `KpiFilterBar` (Card, 2 baris,
// lebar tetap sesuai ux-menu-mapping.md §1) TANPA periodType/YoY, karena
// backend M8-M10 (`GET /metrics/dormant-customer`) belum expose data
// perbandingan periode sama sekali (dicek: `dormant_rate_current`/
// `reactivation_current` cuma nilai titik tunggal, tidak ada pasangan
// current-vs-previous). Ini SENGAJA bukan penyederhanaan desain — v9 §1
// eksplisit: "Backend belum mendukung suatu kontrol = task backend yang
// harus dibuat (§9); ketiadaan sementara = gap terlacak, BUKAN desain yang
// dituju" — gap ini tercatat di task025 §9b (endpoint periodType M8-M10),
// baris Periode di sini akan ditambahkan begitu backend-nya siap, BUKAN
// dipalsukan sekarang (selector yang tidak benar-benar memfilter apa pun
// akan menyesatkan, bukan cuma tidak lengkap).
//
// Dipakai CrossSelling/CustomerMetrics juga (pola sama, filter bar single-row
// lama) — BELUM dimigrasi ke komponen ini (di luar scope task025 §7a),
// follow-up tersendiri kalau mau benar-benar 1 sumber untuk semua pemakai.
export interface DateScopeFilterBarProps {
  scopeFilter: ReturnType<typeof useScopedCompanyFilter>;
  periodEnd: string;
  onPeriodEndChange: (value: string) => void;
  onReset: () => void;
}

export function DateScopeFilterBar({ scopeFilter, periodEnd, onPeriodEndChange, onReset }: DateScopeFilterBarProps) {
  const { t } = useTranslation();
  const { excludeIntercompany, setExcludeIntercompany } = scopeFilter;

  return (
    <Card sx={{ p: 2 }}>
      {/* ── Baris 1 — perusahaan/cabang/divisi/intercompany, lebar tetap
          sesuai spec (240/160/200), sama seperti KpiFilterBar. ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <ScopeFilterFields
          filter={scopeFilter}
          alwaysShowCompanyAndBranch
          companyWidth={240}
          branchWidth={160}
          divisionWidth={200}
        />
        <ExcludeIntercompanyToggle checked={excludeIntercompany} onChange={setExcludeIntercompany} />
        <Button variant="outlined" size="small" sx={{ ml: { sm: 'auto' } }} onClick={onReset}>
          {t('common.reset')}
        </Button>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* ── Baris 2 — Per Tanggal saja (TANPA periodType, lihat catatan
          di atas komponen — gap backend tercatat task025 §9b). ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <DatePicker
          size="small"
          label={t('common.filters.asOfDate')}
          value={periodEnd}
          onChange={(e) => onPeriodEndChange(e.target.value)}
          sx={{ width: { xs: '100%', sm: 170 } }}
        />
      </Box>
    </Card>
  );
}
