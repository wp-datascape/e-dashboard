import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

import { DashboardAppBar } from '@/components/ui/AppBar';
import { Sidebar } from '@/components/ui/Sidebar';
import { Footer } from '@/components/ui/Footer';
import { MobileBottomNav, MOBILE_BOTTOM_NAV_HEIGHT } from '@/components/ui/MobileNav';
import { usePageViewTracking } from '@/hooks/usePageViewTracking';

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  usePageViewTracking();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  // Reset scroll ke atas tiap ganti halaman (bug dilaporkan user: navigasi
  // dari card Overview ke halaman lain mendarat di tengah/bawah, bukan di
  // atas). window.scrollTo TIDAK CUKUP di sini — window/body sendiri tidak
  // pernah scroll (outer shell height:100dvh + overflow:hidden), scroll
  // SEBENARNYA terjadi di elemen <main> di bawah (overflow:auto), jadi
  // reset-nya harus langsung ke elemen itu lewat ref.
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    // 100dvh (dynamic viewport height), BUKAN 100vh — di browser mobile, 100vh
    // dihitung dari viewport TERBESAR (address bar disembunyikan), padahal
    // defaultnya address bar kelihatan. Begitu address bar collapse/expand
    // saat scroll, layout height:100vh ikut reflow mengejar nilai yang
    // berubah-ubah — kelihatan seperti "zoom out/in"/layar bergeser. dvh
    // selalu ikut viewport AKTUAL saat itu, tidak reflow saat address bar
    // berubah. Shell utama ini paling kritis karena membungkus semua halaman.
    <Box sx={{ display: 'flex', height: '100dvh', overflow: 'hidden', bgcolor: 'background.default' }}>
      {/* ── App Bar ───────────────────────────────────── */}
      {/* showMenuButton=false di mobile — tidak ada lagi Sidebar drawer utk
          ditoggle di sana (diganti MobileBottomNav, task034), tombol hamburger
          jadi tanpa fungsi kalau tetap ditampilkan. */}
      <DashboardAppBar onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} showMenuButton={!isMobile} />

      {/* ── Sidebar (desktop) / Bottom Navigation (mobile) ────────────── */}
      {/* task034: mobile TIDAK lagi pakai Sidebar sbg Drawer temporary — diganti
          MobileBottomNav (5 tombol + bottom sheet drill-down), desktop (permanent)
          sama sekali tidak berubah. */}
      {isMobile ? <MobileBottomNav /> : <Sidebar open={sidebarOpen} onClose={closeSidebar} variant="permanent" />}

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
          // MobileBottomNav fixed di bawah viewport (task034) - kolom ini
          // dipersempit sejumlah tinggi bar-nya di mobile supaya main+Footer
          // tidak ketutup, bukan cuma padding di main saja (Footer sendiri
          // sibling setelah main, di luar area scroll-nya).
          pb: isMobile ? `calc(${MOBILE_BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom))` : 0,
        }}
      >
        {/* Spacer for fixed AppBar — AppBar tinggi bertambah env(safe-area-inset-top)
            di iOS standalone PWA (lihat AppBar.tsx), spacer ini ikut menyesuaikan
            supaya konten tidak ketutup/ada celah di bawah AppBar */}
        <Toolbar sx={{ mb: 'env(safe-area-inset-top)' }} />

        {/* ── Page content (scrollable) ───────────────── */}
        {/* contain:'layout' — batasi SCOPE reflow saat sidebar toggle. Tanpa ini,
            browser recalc layout turun sampai ke setiap card/grid/chart di dalam main
            setiap frame animasi width sidebar. Dengan containment, main jadi formatting
            context independen — browser cuma perlu tahu UKURAN LUAR main berubah,
            tidak perlu re-layout detail SEMUA descendant sedalam-dalamnya tiap frame.
            Aman dipakai di sini karena main sudah dapat ukuran dari flexGrow:1 (bukan
            shrink-to-fit konten), syarat utama contain:layout. */}
        <Box
          component="main"
          ref={mainRef}
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            p: { xs: 2, sm: 3 },
            bgcolor: 'background.default',
            contain: 'layout',
            display: isMobile ? 'flex' : undefined,
            flexDirection: isMobile ? 'column' : undefined,
            // Scrollbar disembunyikan total (2026-08-30, laporan user: masih
            // muncul setelah restyle tipis) — INI elemen yang scroll-nya
            // SUNGGUHAN untuk seluruh isi halaman (bukan DataGrid mana pun),
            // muncul di SETIAP halaman yang kontennya lebih tinggi dari
            // viewport. Scroll TETAP berfungsi penuh (wheel/touch/keyboard,
            // reset-scroll pindah halaman di mainRef atas juga tidak
            // terpengaruh) — cuma affordance drag-bar visualnya yang hilang.
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {/* flexGrow:1 di mobile — dorong Footer (di bawah, dalam Box yang
              sama) supaya tetap jatuh di ujung viewport pada halaman yang
              kontennya pendek, TAPI tetap ikut discroll (bukan pinned) begitu
              konten lebih panjang dari layar — instruksi user: "footer jangan
              sticky, tampil di bawah halaman, terlihat saat scroll sampai
              batas terbawah saja". Footer TIDAK dipindah ke sini di desktop —
              tetap di luar main (pinned), pola lama tidak diubah. */}
          <Box sx={{ flexGrow: isMobile ? 1 : undefined }}>{children}</Box>
          {isMobile && <Footer />}
        </Box>

        {/* Footer desktop — tetap pinned di luar area scroll main, tidak berubah */}
        {!isMobile && <Footer />}
      </Box>
    </Box>
  );
};
