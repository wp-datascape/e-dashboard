// src/components/atoms/Button/Button.tsx
import React from 'react';
import MuiButton, { type ButtonProps as MuiButtonProps } from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

interface ButtonProps extends MuiButtonProps {
  isLoading?: boolean;
  /**
   * Pada breakpoint xs: sembunyikan label, tampilkan hanya startIcon (seperti IconButton).
   * Pada sm ke atas: tampil penuh dengan label.
   */
  mobileIconOnly?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  isLoading = false,
  disabled,
  mobileIconOnly = false,
  ...props
}) => {
  const mobileIconSx = mobileIconOnly
    ? {
        minWidth: { xs: 0, sm: 'auto' },
        px: { xs: 1, sm: 2 },
        '& .MuiButton-startIcon': {
          mr: { xs: 0, sm: 1 },
          ml: { xs: 0, sm: '-4px' },
        },
        '& .btn-label': {
          display: { xs: 'none', sm: 'inline' },
        },
      }
    : {};

  return (
    <MuiButton
      disabled={disabled || isLoading}
      variant="contained"
      disableElevation
      {...props}
      sx={{
        position: 'relative',
        textTransform: 'none',
        ...mobileIconSx,
        ...props.sx,
      }}
    >
      {isLoading && (
        <CircularProgress
          size={20}
          color="inherit"
          sx={{ position: 'absolute' }}
        />
      )}
      <span style={{ opacity: isLoading ? 0 : 1 }}>
        {mobileIconOnly ? <span className="btn-label">{children}</span> : children}
      </span>
    </MuiButton>
  );
};
