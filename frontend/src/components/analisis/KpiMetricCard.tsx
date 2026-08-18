import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { Card, StatusChip } from '@/components/ui';
import type { StatusChipColor } from '@/components/ui/StatusChip';

export interface KpiMetricCardProps {
  label: string;
  badgeLabel?: string;
  badgeColor?: StatusChipColor;
  /** Warna aksen label — token tema (mis. `theme.custom.data[0]`,
   * `theme.custom.rank[0]`), BUKAN hex baru. */
  accentColor: string;
  /** Nilai besar SUDAH diformat (mis. "Rp 542,0 Jt", "61.1%", "18"). */
  value: string;
  /** Caption di bawah value — opsional (mis. "34.2% dari total"). */
  caption?: string;
  /** % perubahan YoY — kalau diisi, render badge ▲/▼ + delta + "Tahun lalu: X".
   * `null`/`undefined` = blok growth disembunyikan (kartu tanpa pembanding). */
  growthPct?: number | null;
  /** Delta absolut SUDAH diformat, TANPA tanda +/- (ditambahkan otomatis). */
  deltaValueText?: string;
  /** Nilai tahun lalu SUDAH diformat, dipakai caption "Tahun lalu: {{value}}". */
  comparisonValueText?: string;
  /** Metrik yang naik = buruk (mis. Dormant Rate) — balik warna badge growth. */
  inversePolarity?: boolean;
}

/**
 * Kartu metrik — dipusatkan dari template 3-kartu-tier
 * `CustomerGrossProfit/index.tsx` (task026 §8k dst) supaya 9 halaman KPI
 * lain yang di-standarkan ke pola sama (2026-08-10, instruksi user "standar
 * yang sama dari layout dan filtering") tidak copy-paste JSX kartu yang
 * sama berkali-kali (lihat [[feedback_centralize_ui_no_duplication]]).
 * Beda dari 3 kartu tier asli KPI4 (khusus data berjenjang): komponen ini
 * generik, dipakai utk kartu metrik APA PUN (tier, kategori lepas, atau
 * kartu tunggal tanpa saudara). Aksen border kiri 3px dihapus (critique
 * 2026-08-18) — bukan lagi "bordered-left", cuma label yang diberi warna.
 */
export function KpiMetricCard({
  label, badgeLabel, badgeColor = 'default', accentColor, value, caption,
  growthPct, deltaValueText, comparisonValueText, inversePolarity = false,
}: KpiMetricCardProps) {
  const { t } = useTranslation();
  const hasGrowth = growthPct !== undefined && growthPct !== null;
  const isUp = hasGrowth && growthPct >= 0;
  const isGood = inversePolarity ? !isUp : isUp;

  return (
    <Card sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
        {/* accentColor dipakai cuma di label (sinyal tipis) — border kiri
            tebal dihapus (critique 2026-08-18, task028 P0): pola ini terdeteksi
            sebagai "side-tab", tell paling dikenali dari AI-slop UI, dan di
            kartu 9 halaman KPI berbarengan jadi terlalu banyak hue aktif
            sekaligus. */}
        <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: accentColor }}>
          {label}
        </Typography>
        {badgeLabel && <StatusChip label={badgeLabel} color={badgeColor} />}
      </Box>
      <Typography variant="h5" sx={{ fontWeight: 800 }}>{value}</Typography>
      {caption && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
          {caption}
        </Typography>
      )}
      {hasGrowth && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.25, mt: caption ? 0 : 0.75 }}>
          <StatusChip
            label={`${isUp ? '▲' : '▼'} ${Math.abs(growthPct).toFixed(1)}% ${t('common.filters.vsSamePeriodLastYear')}`}
            color={isGood ? 'success' : 'error'}
          />
          {deltaValueText && (
            <Typography variant="caption" sx={{ fontWeight: 700, color: isGood ? 'success.main' : 'error.main' }}>
              {isUp ? '+' : '-'}{deltaValueText}
            </Typography>
          )}
          {comparisonValueText && (
            <Typography variant="caption" color="text.secondary">
              {t('common.periodBanner.comparisonValueCaption', { value: comparisonValueText })}
            </Typography>
          )}
        </Box>
      )}
    </Card>
  );
}
