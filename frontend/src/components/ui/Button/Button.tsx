// src/components/atoms/Button/Button.tsx
import React from 'react';
import MuiButton, { ButtonProps as MuiButtonProps } from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

interface ButtonProps extends MuiButtonProps {
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  isLoading = false, 
  disabled, 
  ...props 
}) => {
  return (
    <MuiButton 
      disabled={disabled || isLoading} 
      variant="contained"
      disableElevation 
      {...props}
      sx={{
        position: 'relative',
        textTransform: 'none', // Standar modern: gunakan sentence case
        ...props.sx,
      }}
    >
      {isLoading && (
        <CircularProgress
          size={20}
          color="inherit"
          sx={{ position: 'absolute', mr: 1 }}
        />
      )}
      <span style={{ opacity: isLoading ? 0 : 1 }}>
        {children}
      </span>
    </MuiButton>
  );
};