import MuiPaper, { type PaperProps } from '@mui/material/Paper'

export type CardProps = PaperProps

export function Card({ children, sx, elevation = 0, square = true, ...props }: CardProps) {
  return (
    <MuiPaper
      elevation={elevation}
      square={square}
      sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', ...sx }}
      {...props}
    >
      {children}
    </MuiPaper>
  )
}
