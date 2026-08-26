// ChipOverflowCell.tsx (2026-08-26, task031.md §9 — refactor tabel "Target
// Upsell", instruksi user: "Setiap chip produk HARUS bisa diklik... jangan
// sembunyikan di balik tombol '+N' tanpa akses mudah") — dipusatkan di sini
// krn dipakai 2 kolom (`categories_bought`/`missing_high_margin_categories`)
// yang butuh pola identik: preview 2 chip + Popover berisi SEMUA chip
// (tetap bisa diklik satu-satu), row height jadi SERAGAM krn preview selalu
// maks 2 chip (bukan wrap tak terbatas spt sebelumnya, §36.12/task031 §8).
import { useState } from 'react';
import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Popover from '@mui/material/Popover';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import MuiTooltip from '@mui/material/Tooltip';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useTranslation } from 'react-i18next';
import { StatusChip } from '@/components/ui';
import type { StatusChipColor } from '@/components/ui/StatusChip/StatusChip';

export interface ChipOverflowItem {
  id: number;
  /** Isi chip — bisa ReactNode (mis. persentase di-bold via `<b>`), lihat
   * `missing_high_margin_categories` di ProductsHighMargin/index.tsx. */
  label: ReactNode;
  /** Teks polos utk MuiTooltip hover — WAJIB diisi kalau `label` bukan
   * string biasa (ReactNode tidak valid sbg title tooltip). */
  tooltipText: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

interface ChipOverflowCellProps {
  items: ChipOverflowItem[];
  color?: StatusChipColor;
  /** Jumlah chip yang tampil di preview sel (default 2) — SISANYA hanya
   * lewat tombol "Tampilkan semua", TIDAK PERNAH hilang/tidak-bisa-diklik. */
  maxVisible?: number;
}

// Chip dgn truncate + tooltip nama lengkap (2026-08-26) — label produk HM
// bisa panjang (mis. "RECEIPT PRINTER THERMAL KASSEN"), maxWidth 160px
// spy chip tidak melebar liar, MuiTooltip gantikan `title` HTML native
// (pola sama tooltip info M1-M10, bukan browser-native yg style-nya beda).
function TruncatedChip({ item, color }: { item: ChipOverflowItem; color?: StatusChipColor }) {
  return (
    <MuiTooltip title={item.tooltipText} placement="top" arrow>
      <StatusChip
        label={item.label}
        color={color}
        onClick={item.onClick}
        sx={{
          maxWidth: 160,
          '& .MuiChip-label': {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          },
        }}
      />
    </MuiTooltip>
  );
}

export function ChipOverflowCell({ items, color, maxVisible = 2 }: ChipOverflowCellProps) {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const visible = items.slice(0, maxVisible);
  const restCount = items.length - visible.length;
  const open = Boolean(anchorEl);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5, py: 0.5 }}>
      {visible.map((item) => (
        <TruncatedChip key={item.id} item={item} color={color} />
      ))}
      {restCount > 0 && (
        <>
          <ButtonBase
            onClick={(e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); }}
            sx={{
              fontSize: 12, fontWeight: 600, color: 'primary.main', px: 0.75, py: 0.25,
              borderRadius: '999px', gap: 0.25,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            {t('productsHighMargin.showAll', { count: items.length })}
            <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />
          </ButtonBase>
          <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={(e) => { (e as React.SyntheticEvent)?.stopPropagation?.(); setAnchorEl(null); }}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            // maxWidth 380 (2026-08-26, diverifikasi visual via Playwright —
            // 340 ternyata cuma pas-pasan utk 1 chip per baris krn padding
            // Popover + gap, bukan grid 2 kolom spt yang dimaksud) — 380
            // cukup lega utk 2 chip @ maxWidth 160 + gap + padding.
            slotProps={{ paper: { sx: { p: 1.5, maxWidth: 380 }, onClick: (e: React.MouseEvent) => e.stopPropagation() } }}
          >
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 1 }}>
              {t('productsHighMargin.showAll', { count: items.length })}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {items.map((item) => (
                <TruncatedChip key={item.id} item={item} color={color} />
              ))}
            </Box>
          </Popover>
        </>
      )}
    </Box>
  );
}
