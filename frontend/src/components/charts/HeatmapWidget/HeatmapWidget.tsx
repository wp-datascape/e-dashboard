import { Card } from '@/components/ui';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { ChartTooltipCard } from '@/components/charts/ChartTooltipCard';
import { formatIDR } from '@/utils/format';

export interface HeatmapRow {
  customer: string;
  /** ID numerik customer — opsional, dipakai untuk drill-down klik sel */
  customerId?: number;
  values: Record<string, number>;
  /** Revenue per kolom (sama key dengan values) — opsional, dipakai untuk tooltip sel */
  revenues?: Record<string, number>;
  /** Total revenue customer ini across semua kolom — opsional, ditampilkan sebagai kolom tambahan */
  totalRevenue?: number;
}

export interface HeatmapWidgetProps {
  // Opsional (2026-08-21, koreksi user: "tampilan terlalu sesak dengan
  // text text tersebut" — title widget dulu WAJIB, sering dobel dgn
  // SectionLabel di luar widget, mis. "Matriks Cross Selling Pelanggan
  // (periode)" dobel persis dgn SectionLabel "Heatmap Cross Selling
  // Pelanggan" + helper text periode di atasnya).
  title?: string;
  subtitle?: string;
  /** Konten arbitrer di ATAS matrix, DI DALAM Card widget ini (2026-08-22,
   * instruksi user: "pindahkan ini sebagai judul card seperti diatas" —
   * pola SAMA PERSIS `ComboChartWidget.tsx`'s `headerContent`, dipakai M1
   * krn header lama — SectionLabel+helper text+chip — perlu StatusChip
   * di sampingnya, TIDAK bisa direpresentasikan `title`/`subtitle` string
   * biasa). Kalau diisi, MENGGANTIKAN render title/subtitle bawaan. */
  headerContent?: React.ReactNode;
  xLabels: string[];
  data: HeatmapRow[];
  /** Klik sel yang sudah ada transaksi (bought) — untuk drill-down detail produk */
  onCellClick?: (row: HeatmapRow, label: string) => void;
  /** Ikon kecil di depan title (2026-08-21, permintaan user: "terapkan di
   * semua matrix" — ganti prefix teks jadi ikon, BUKAN emoji). Opsional. */
  icon?: React.ElementType;
}

// ─── Matrix Heatmap (dipakai mobile MAUPUN desktop) ────────────────────────────
// Sebelumnya mobile pakai layout terpisah (card per-customer + chip produk),
// desktop pakai matrix. Koreksi user (2026-08-24, "heatmap kalau
// mempertahankan bentuknya untuk mode mobile bisa?" lalu "perkecil ukuran
// kotaknya, jadi tidak ada scroll horisontal") — SATU layout matrix dipakai
// di semua breakpoint, ROW_LABEL_WIDTH/COL_MIN_WIDTH diperkecil khusus
// mobile supaya kolom kategori yang wajar (4-6) muat tanpa scroll horizontal
// di layar ~360-390px. `overflowX:'auto'` TETAP dipertahankan sbg fallback
// aman (bukan dihapus) — kalau company py kategori sangat banyak (dinamis,
// tidak ada batas atas), tetap bisa discroll, bukan layout pecah.
const COL_MIN_WIDTH_DESKTOP = 80;
const COL_MIN_WIDTH_MOBILE = 42;
const ROW_LABEL_WIDTH_DESKTOP = 160;
const ROW_LABEL_WIDTH_MOBILE = 76;

function HeatmapMatrixView({
  xLabels,
  data,
  onCellClick,
}: {
  xLabels: string[];
  data: HeatmapRow[];
  onCellClick?: (row: HeatmapRow, label: string) => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const colMinWidth = isMobile ? COL_MIN_WIDTH_MOBILE : COL_MIN_WIDTH_DESKTOP;
  const rowLabelWidth = isMobile ? ROW_LABEL_WIDTH_MOBILE : ROW_LABEL_WIDTH_DESKTOP;
  const hasRevenue = data.some((r) => r.totalRevenue !== undefined);
  const innerMinWidth = rowLabelWidth + (xLabels.length + (hasRevenue ? 1 : 0)) * colMinWidth;

  return (
    <Box sx={{ overflowX: 'auto' }}>
      {/* Header row */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.75, minWidth: innerMinWidth }}>
        <Box sx={{ width: rowLabelWidth, flexShrink: 0 }} />
        {xLabels.map((label) => (
          <Box key={label} sx={{ flex: 1, textAlign: 'center', px: 0.5, minWidth: colMinWidth }}>
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, fontSize: '0.68rem', color: 'text.secondary' }}
            >
              {label}
            </Typography>
          </Box>
        ))}
        {hasRevenue && (
          <Box sx={{ flex: 1, textAlign: 'center', px: 0.5, minWidth: colMinWidth }}>
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, fontSize: '0.68rem', color: 'text.secondary' }}
            >
              {t('common.heatmap.colTotalRevenue')}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Data rows */}
      {data.map((row) => (
        <Box
          key={row.customer}
          sx={{ display: 'flex', alignItems: 'center', mb: 0.5, minWidth: innerMinWidth }}
        >
          {/* Sticky row label */}
          <Box
            sx={{
              width: rowLabelWidth,
              flexShrink: 0,
              pr: 1,
              position: 'sticky',
              left: 0,
              bgcolor: 'background.paper',
              zIndex: 1,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.7rem',
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {row.customer}
            </Typography>
          </Box>

          {/* Cells */}
          {xLabels.map((label) => {
            const val = row.values[label] ?? 0;
            const bought = val > 0;
            const revenue = row.revenues?.[label] ?? 0;
            return (
              <Tooltip
                key={label}
                // Layout disamakan ChartTooltipCard (2026-08-24, koreksi
                // user: "kenapa layout tidak sama dengan tooltip lainnya"
                // — sebelumnya string polos, sekarang atomic component
                // sama persis M1/M2/M7 chart. Hint klik cuma ditambahkan
                // utk sel yang BENAR-BENAR bisa diklik (bought &&
                // onCellClick) — sel kosong tidak ada aksi apa pun.
                title={
                  <ChartTooltipCard
                    title={t('common.heatmap.cellTooltipTitle', { customer: row.customer, label })}
                    rows={
                      bought
                        ? [
                            { label: t('common.heatmap.rowTransactionCount'), value: String(val) },
                            { label: t('common.heatmap.colTotalRevenue'), value: formatIDR(revenue) },
                          ]
                        : [{ label: t('common.heatmap.rowStatus'), value: t('common.heatmap.statusNo') }]
                    }
                    hint={bought && onCellClick ? t('common.heatmap.cellClickHint') : undefined}
                    minWidth={200}
                  />
                }
                // arrow DIHAPUS (2026-08-24) — tooltip chart M1/M2/M7
                // (recharts, ChartTooltipCard sbg content) juga box polos
                // tanpa panah, disamakan biar layoutnya IDENTIK persis.
                slotProps={{ tooltip: { sx: { bgcolor: 'transparent', p: 0, maxWidth: 'none', boxShadow: 'none' } } }}
                placement="top"
              >
                <Box sx={{ flex: 1, px: 0.5, minWidth: colMinWidth }}>
                  <Box
                    onClick={bought && onCellClick ? () => onCellClick(row, label) : undefined}
                    sx={{
                      bgcolor: bought ? 'success.main' : 'action.hover',
                      color: bought ? 'common.white' : 'text.disabled',
                      height: 30,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      borderRadius: 0.5,
                      cursor: bought && onCellClick ? 'pointer' : 'default',
                      transition: 'opacity 0.15s',
                      '&:hover': { opacity: 0.8 },
                    }}
                  >
                    {bought ? val : '—'}
                  </Box>
                </Box>
              </Tooltip>
            );
          })}

          {/* Total revenue column */}
          {hasRevenue && (
            <Box sx={{ flex: 1, px: 0.5, minWidth: colMinWidth, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'success.main' }}>
                {formatIDR(row.totalRevenue ?? 0)}
              </Typography>
            </Box>
          )}
        </Box>
      ))}

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 2, mt: 1.5, minWidth: innerMinWidth, pl: `${rowLabelWidth}px` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 14, height: 14, bgcolor: 'success.main', borderRadius: 0.5 }} />
          <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
            {t('common.heatmap.legendBought')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 14, height: 14, bgcolor: 'action.hover', borderRadius: 0.5 }} />
          <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
            {t('common.heatmap.legendNotBought')}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const HeatmapWidget = ({ title, subtitle, headerContent, xLabels, data, onCellClick, icon: Icon }: HeatmapWidgetProps) => {
  return (
    <Card sx={{ p: 2 }}>
      {/* Header — title/subtitle keduanya opsional (2026-08-21, koreksi user:
          tampilan sesak, dobel dgn SectionLabel+helper text di luar widget). */}
      {headerContent ? (
        <Box sx={{ mb: 2 }}>{headerContent}</Box>
      ) : (title || subtitle) && (
        <Box sx={{ mb: 2 }}>
          {title && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {Icon && <Icon sx={{ fontSize: 16, color: 'text.primary' }} />}
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {title}
              </Typography>
            </Box>
          )}
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      )}

      {/* Satu layout matrix di semua breakpoint (2026-08-24, lihat komentar
          HeatmapMatrixView) — mobileSubtitle override & MobileCustomerListView
          DIHAPUS, tidak relevan lagi krn tidak ada lagi layout kartu terpisah. */}
      <HeatmapMatrixView xLabels={xLabels} data={data} onCellClick={onCellClick} />
    </Card>
  );
};