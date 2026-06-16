import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { LogoutButton } from '@/components/ui/LogoutButton'; // Sesuaikan path import

export default function Dashboard() {
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Dashboard</Typography>
        
        {/* Tombol Logout */}
        <LogoutButton />
      </Box>

      <Typography variant="body2" color="text.secondary">
        Placeholder - Dashboard akan diimplementasikan
      </Typography>
    </Box>
  );
}