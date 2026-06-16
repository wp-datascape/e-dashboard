// src/components/atoms/Card/Card.tsx
import MuiCard, { CardProps as MuiCardProps } from '@mui/material/Card';
import CardContent, { CardContentProps } from '@mui/material/CardContent';

interface CardProps extends MuiCardProps {
  contentProps?: CardContentProps;
  children: React.ReactNode;
}

export const Card = ({ children, contentProps, sx, ...props }: CardProps) => {
  return (
    <MuiCard 
      elevation={2} // Standar elevasi untuk kedalaman visual yang halus
      sx={{ 
        borderRadius: 2, 
        overflow: 'hidden', 
        ...sx 
      }} 
      {...props}
    >
      <CardContent {...contentProps}>
        {children}
      </CardContent>
    </MuiCard>
  );
};