import { useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

import { DashboardAppBar } from '@/components/ui/AppBar';
import { Sidebar, SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from '@/components/ui/Sidebar';
import { Footer } from '@/components/ui/Footer';

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  const drawerWidth = sidebarOpen ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED_WIDTH;

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>
      {/* ── App Bar ───────────────────────────────────── */}
      <DashboardAppBar onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />

      {/* ── Sidebar ───────────────────────────────────── */}
      <Sidebar
        open={sidebarOpen}
        onClose={closeSidebar}
        variant={isMobile ? 'temporary' : 'permanent'}
      />

      {/* ── Right side: content + footer ──────────────── */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          width: isMobile ? '100%' : `calc(100% - ${drawerWidth}px)`,
          transition: (t) =>
            t.transitions.create('width', {
              easing: t.transitions.easing.sharp,
              duration: sidebarOpen
                ? t.transitions.duration.enteringScreen
                : t.transitions.duration.leavingScreen,
            }),
          overflow: 'hidden',
        }}
      >
        {/* Spacer for fixed AppBar */}
        <Toolbar />

        {/* ── Page content (scrollable) ───────────────── */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            p: { xs: 2, sm: 3 },
            bgcolor: 'background.default',
          }}
        >
          {children}
        </Box>

        {/* ── Footer (pinned to bottom) ───────────────── */}
        <Footer />
      </Box>
    </Box>
  );
};
