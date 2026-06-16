import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
        flexShrink: 0,
      }}
    >
      <Box
        sx={{
          px: 3,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Typography variant="caption" color="text.disabled">
          © {year} Executive Dashboard. All rights reserved.
        </Typography>
        <Typography variant="caption" color="text.disabled">
          v1.0.0
        </Typography>
      </Box>
    </Box>
  );
};
