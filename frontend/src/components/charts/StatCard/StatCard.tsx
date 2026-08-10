import { useId, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, StatusChip } from '@/components/ui';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  ReferenceLine,
} from 'recharts';

export interface StatCardDataPoint {
  month: string;
  value: number;
  tier1?: number;
  tier2?: number;
  tier3?: number;
}

export interface StatCardProps {
  title: string;
  subtitle?: string;
  value: string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  data: StatCardDataPoint[];
  color?: string;
  link?: string;
  /** True kalau trend 'up' untuk metrik ini justru hal BURUK (mis. Dormant Rate/Value)
   * — badge warna dibalik (naik = merah), panah arah tetap sesuai trend asli. Lihat
   * `utils/metricPolarity.ts`. Default false (kenaikan = baik, kasus mayoritas). */
  inversePolarity?: boolean;
  /** Jenis mini-chart — dipetakan backend per sifat metrik (lihat
   * dashboard.service.ts), BUKAN dipilih bebas di sini. Default 'area' (perilaku
   * lama, dipertahankan utk pemakaian StatCard di luar Dashboard Overview kalau ada).
   * task026 §9 lanjutan (2026-08-09), samakan dgn referensi executive-kpi-dashboard. */
  chartType?: 'bar' | 'area' | 'line' | 'stacked-bar';
  /** Label periode aktif (mis. "Juni 2026") — kalau diisi (bareng `comparisonLabel`),
   * render blok "Periode: ... / YoY (...): ..." di bawah chart, PERSIS pola referensi
   * executive-kpi-dashboard/OverviewView.tsx (`PeriodYoYCardBlock`) yang sebelumnya
   * kelewat (task026 §9 lanjutan, koreksi user 2026-08-09: "tidak ada kemiripan sama
   * sekali" — cuma jenis chart yang dibenerin, blok Periode/YoY ini belum ada sama
   * sekali padahal itu elemen paling menonjol di tiap kartu referensi). */
  periodLabel?: string;
  /** Label periode pembanding YoY (mis. "Juni 2025"). */
  comparisonLabel?: string;
  /** Nilai YoY (tahun lalu) SUDAH diformat sesuai `format` card (mis. "Rp 6,8jt", "65.0%"). */
  comparisonValue?: string;
  /** Teks pill kategori di pojok kanan atas (mis. "Multi-Product", "Target 80%") —
   * MENGGANTIKAN lingkaran status ✓/⚠/= + badge % lama (koreksi user 2026-08-09,
   * "SAMAKAN RUBAH MENJADI SAMA DENGAN REFRENSI": referensi executive-kpi-dashboard
   * pakai pill kategori statis, bukan lingkaran status). % perubahan TIDAK hilang —
   * sudah dipindah ke baris "YoY" di bawah chart (lihat `periodLabel` dst di atas). */
  badgeLabel?: string;
  /** Warna pill kategori — token StatusChip biasa (BUKAN hex baru), 'default' utk
   * label murni deskriptif (Multi-Product, Penetration, dst — tidak menyiratkan
   * status baik/buruk), 'success'/'warning'/'error' HANYA utk badge yang genuinely
   * berbasis threshold (mis. repeat_order_rate on-target/di bawah target). */
  badgeColor?: 'default' | 'success' | 'warning' | 'error';
  /** Ikon kecil di depan judul — pola referensi executive-kpi-dashboard
   * (`<Grid/> KPI 1 • Cross Selling`, dst), belum ada sebelumnya (koreksi
   * user 2026-08-09: "desain belum sama", layout kartu kurang elemen ini).
   * Diwarnai sama dgn `color` (aksen kartu) lewat `sx={{ fontSize, color }}`
   * di pemanggil, komponen ini cuma menaruh posisinya. */
  icon?: ReactNode;
  /** Garis threshold putus-putus di chart (cuma dirender utk `chartType='line'`)
   * — pola sama dgn `LineAlertWidget` di halaman KPI (DormantRate/
   * ReactivationRate), belum ada di sini sebelumnya (koreksi user 2026-08-10:
   * "halaman KPI reactivation ada line threshold nya" — mini chart Dashboard
   * kelihatan beda krn elemen ini kelewat, bukan datanya). Warna SELALU
   * `error.main` (bahaya/ambang batas), sama spt LineAlertWidget, tanpa label
   * teks (ruang 64px terlalu sempit). */
  threshold?: number;
}

/**
 * Kartu overview Dashboard — redesain layout vertikal (2026-08-09, sesuai
 * mockup user): lingkaran status di kanan atas (hijau=baik/merah=perlu
 * perhatian/kuning=netral, warna sama dgn badge %), angka besar di bawah
 * judul, chart area penuh lebar di bawah, tautan "Lihat breakdown" di
 * paling bawah kalau `link` ada. Menggantikan layout horizontal lama
 * (teks kiri, sparkline kecil kanan).
 */
export const StatCard = ({
  title,
  subtitle,
  value,
  change,
  trend,
  data,
  color: colorProp,
  link,
  inversePolarity = false,
  chartType = 'area',
  periodLabel,
  comparisonLabel,
  comparisonValue,
  badgeLabel,
  badgeColor = 'default',
  icon,
  threshold,
}: StatCardProps) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { t } = useTranslation();
  // ID gradient area chart — SEBELUMNYA dari `title` mentah (spasi/tanda
  // baca), `url(#statcard-fill-Rata-rata Kategori Produk)` gagal di-resolve
  // browser (spasi memutus token url()), fallback jadi fill HITAM (bug
  // ditemukan user via screenshot 2026-08-09). `useId()` selalu aman
  // dipakai sbg id SVG (tanpa spasi) & unik per instance kartu.
  const gradientId = useId();
  const isPositive = trend === 'up';
  const isNeutral = trend === 'stable';
  const color = colorProp ?? theme.palette.primary.main;

  // Polaritas-aware (naik belum tentu baik, lihat metricPolarity.ts) — dipakai
  // utk warna chip YoY di bawah chart (lihat blok Periode/YoY).
  const isGood = isNeutral ? null : inversePolarity ? !isPositive : isPositive;

  return (
    <Card
      onClick={() => link && navigate(link)}
      sx={{
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        cursor: link ? 'pointer' : 'default',
        transition: 'background-color 0.15s',
        '&:hover': link ? { bgcolor: 'action.hover' } : {},
      }}
    >
      {/* ── Baris atas: judul kiri, pill kategori kanan — pola referensi
          executive-kpi-dashboard (2026-08-09, koreksi user "SAMAKAN RUBAH
          MENJADI SAMA DENGAN REFRENSI"). Lingkaran status ✓/⚠/= + badge %
          lama DIHAPUS (bukan disembunyikan) — angka % tetap ada, sekarang
          di baris "YoY" bawah chart, bukan hilang. ── */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, minWidth: 0 }}>
          {icon && (
            <Box sx={{ display: 'flex', color, flexShrink: 0, '& > svg': { fontSize: 16 } }}>
              {icon}
            </Box>
          )}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              fontWeight: 700,
              fontSize: '0.68rem',
              lineHeight: 1.3,
              minWidth: 0,
            }}
          >
            {title}
          </Typography>
        </Box>

        {badgeLabel && <StatusChip label={badgeLabel} color={badgeColor} />}
      </Box>

      {/* ── Angka besar ── */}
      <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
        {value}
      </Typography>

      {/* ── Subtitle/caption opsional (mis. "Target 15-20%") ── */}
      {subtitle && (
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3, fontSize: '0.7rem' }}>
          {subtitle}
        </Typography>
      )}

      {/* ── Chart area penuh lebar — jenis chart dipetakan backend per
          sifat metrik (task026 §9 lanjutan, 2026-08-09, samakan dgn
          referensi executive-kpi-dashboard/OverviewView.tsx: bar utk
          ratio/magnitude, area utk rata-rata mengalir, line utk tren
          persentase halus, stacked-bar khusus avg_gross_profit 3-tier). ── */}
      {data.length > 0 && (
        <Box sx={{ width: '100%', height: 64 }}>
          {/* debounce beda per-widget — lihat catatan lama: sebar redraw SVG
              antar frame supaya tidak numpuk jadi 1 long-task saat sidebar toggle. */}
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            {chartType === 'bar' ? (
              <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} isAnimationActive={true} />
              </BarChart>
            ) : chartType === 'line' ? (
              <LineChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                {threshold !== undefined && (
                  <ReferenceLine y={threshold} stroke={theme.palette.error.main} strokeDasharray="4 3" strokeWidth={1.5} />
                )}
                <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} isAnimationActive={true} />
              </LineChart>
            ) : chartType === 'stacked-bar' ? (
              // 3 tier (Atas/Tengah/Bawah) — `theme.custom.rank`, TOKEN YANG
              // SAMA dgn tier chart di CustomerGrossProfit/index.tsx (data
              // berjenjang, bukan kategorikal lepas — lihat task026 §8t).
              <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <Bar dataKey="tier1" stackId="gp" fill={theme.custom.rank[0]} radius={[2, 2, 0, 0]} isAnimationActive={true} />
                <Bar dataKey="tier2" stackId="gp" fill={theme.custom.rank[1]} isAnimationActive={true} />
                <Bar dataKey="tier3" stackId="gp" fill={theme.custom.rank[2]} isAnimationActive={true} />
              </BarChart>
            ) : (
              <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`statcard-fill${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={2}
                  fill={`url("#statcard-fill${gradientId}")`}
                  isAnimationActive={true}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </Box>
      )}

      {/* ── Blok Periode & YoY — task026 §9 lanjutan (2026-08-09), pola
          persis referensi executive-kpi-dashboard (`PeriodYoYCardBlock`):
          baris "Periode: [bulan]" + baris "YoY ([bulan lalu]): [nilai]
          [chip %]". Ini elemen yang kelewat di iterasi sebelumnya — cuma
          jenis chart yang disamakan, blok ini belum ada sama sekali. ── */}
      {periodLabel && comparisonLabel && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, pt: 1, borderTop: '1px solid', borderTopColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.4, fontSize: '0.68rem' }}>
              <CalendarMonthOutlinedIcon sx={{ fontSize: 12 }} /> {t('dashboard.periodLabel')}:
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.68rem' }}>{periodLabel}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
              YoY ({comparisonLabel}):
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {comparisonValue && (
                <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.68rem' }}>{comparisonValue}</Typography>
              )}
              {!isNeutral && (
                <StatusChip
                  label={`${change >= 0 ? '+' : ''}${change.toFixed(1)}%`}
                  color={isGood ? 'success' : 'error'}
                />
              )}
            </Box>
          </Box>
        </Box>
      )}

      {/* ── Tautan breakdown ── */}
      {link && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 'auto', pt: subtitle || data.length > 0 ? 0 : 'auto' }}>
          <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600, fontSize: '0.72rem' }}>
            {t('dashboard.viewBreakdown')}
          </Typography>
          <ArrowForwardIcon sx={{ fontSize: 12, color: 'primary.main' }} />
        </Box>
      )}
    </Card>
  );
};
