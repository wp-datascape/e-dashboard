import { useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

import { DashboardAppBar } from '@/components/ui/AppBar';
import { Sidebar } from '@/components/ui/Sidebar';
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
      {/* flexGrow:1 TANPA width/transition eksplisit di sini (dulu ada, dihapus) —
          Drawer variant="permanent" ikut normal flex flow (beda dari variant="temporary"
          di mobile yang render via Portal/fixed, TIDAK ikut flex flow, makanya mobile
          tetap butuh width:100% eksplisit). Sebelumnya ada 2 transisi width PARALEL
          (Drawer + Box ini) untuk 1 efek visual yang sama — dobel reflow tiap frame,
          padahal flexGrow:1 SUDAH otomatis mengikuti lebar Drawer saudaranya berapa pun
          nilainya saat itu (termasuk nilai antara selama animasi), tanpa perlu transisi
          sendiri. Menghapus salah satu sumber reflow paralel ini, bukan menghilangkan
          reflow sepenuhnya (width itu sendiri secara CSS memang reflow-triggering,
          transform tidak bisa dipakai di sini karena chart di dalam BENERAN butuh
          ukuran box yang berubah, bukan cuma pergeseran visual). */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          width: isMobile ? '100%' : undefined,
          overflow: 'hidden',
        }}
      >
        {/* Spacer for fixed AppBar — AppBar tinggi bertambah env(safe-area-inset-top)
            di iOS standalone PWA (lihat AppBar.tsx), spacer ini ikut menyesuaikan
            supaya konten tidak ketutup/ada celah di bawah AppBar */}
        <Toolbar sx={{ mb: 'env(safe-area-inset-top)' }} />

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
