/**
 * StatusChip — Atomic oval chip, selalu outline, ukuran & bentuk seragam.
 *
 * Varian:
 *  - 'default'  : abu-abu, untuk label informasi netral
 *  - 'primary'  : biru, untuk count / highlight
 *  - 'success'  : hijau, untuk status positif / trend up
 *  - 'error'    : merah, untuk status negatif / trend down
 *  - 'warning'  : amber, untuk status perlu perhatian
 *  - 'info'     : cyan, untuk informasi tambahan
 *
 * Shape: selalu oval (borderRadius: 999px)
 * Variant: selalu outlined (sesuai design system)
 */

import MuiChip from '@mui/material/Chip';
import type { ChipProps as MuiChipProps } from '@mui/material/Chip';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';

export type StatusChipColor = 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info';
export type StatusChipSize  = 'small' | 'medium';

export interface StatusChipProps {
  /** Label teks chip */
  label: ReactNode;
  /** Warna chip — default: 'default' */
  color?: StatusChipColor;
  /** Ukuran — default: 'small' */
  size?: StatusChipSize;
  /** Icon di kiri label */
  icon?: MuiChipProps['icon'];
  /** sx override jika diperlukan di konteks khusus */
  sx?: SxProps<Theme>;
  /** onClick handler opsional */
  onClick?: () => void;
}

export const StatusChip = ({
  label,
  color = 'default',
  size = 'small',
  icon,
  sx,
  onClick,
}: StatusChipProps) => {
  return (
    <MuiChip
      label={label}
      color={color}
      size={size}
      variant="outlined"
      icon={icon}
      onClick={onClick}
      sx={{
        // ── Shape: oval ──
        borderRadius: '999px',
        // ── Size tokens ──
        height: size === 'small' ? 22 : 28,
        fontSize: size === 'small' ? '0.68rem' : '0.78rem',
        fontWeight: 600,
        letterSpacing: '0.01em',
        // ── Icon sizing ──
        '& .MuiChip-icon': {
          fontSize: size === 'small' ? '11px !important' : '14px !important',
          ml: '4px',
        },
        // ── Label padding ──
        '& .MuiChip-label': {
          px: size === 'small' ? 1 : 1.25,
        },
        // ── Cursor ──
        cursor: onClick ? 'pointer' : 'default',
        // ── User overrides ──
        ...sx,
      }}
    />
  );
};
