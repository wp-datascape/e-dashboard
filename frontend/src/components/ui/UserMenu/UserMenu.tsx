// src/components/ui/UserMenu/UserMenu.tsx
import { useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import ListItemIcon from '@mui/material/ListItemIcon';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/auth.context';
import { useMyScope } from '@/hooks/useMyScope';
import { useLogoutMutation } from '@/hooks/useAuth';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + second).toUpperCase();
}

export function UserMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const scope = useMyScope();
  const logoutMutation = useLogoutMutation();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  if (!user) return null;

  const handleOpen = (e: MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const handleSettings = () => { handleClose(); navigate('/settings/app'); };
  const handleLogout = () => { handleClose(); logoutMutation.mutate(); };

  // Ringkas company/branch/division pertama + "+N lainnya" (Task003 §2.2) - daftar
  // penuh bisa sangat panjang utk user dengan banyak assignment.
  const firstCompany = scope.companies[0];
  const firstBranch = firstCompany?.branches[0];
  const extraCompanies = Math.max(scope.companies.length - 1, 0);
  const extraBranches = Math.max((firstCompany?.branches.length ?? 0) - 1, 0);
  const extraDivisions = Math.max((firstBranch?.divisions.length ?? 0) - 1, 0);

  return (
    <>
      <IconButton onClick={handleOpen} size="small" sx={{ ml: 0.5 }} aria-label={user.name}>
        {/* Border putih translusen - AppBar light mode pakai warna primary penuh
            sbg background (lihat theme/index.ts), tanpa border avatar bisa nge-blend
            hilang ke background-nya sendiri. */}
        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.8rem', fontWeight: 700, border: '2px solid rgba(255,255,255,0.6)' }}>
          {getInitials(user.name)}
        </Avatar>
      </IconButton>

      <Menu anchorEl={anchorEl} open={open} onClose={handleClose} slotProps={{ paper: { sx: { minWidth: 260 } } }}>
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{user.name}</Typography>
          <Typography variant="caption" color="text.secondary">{user.email}</Typography>
        </Box>

        <Divider />

        <Box sx={{ px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {scope.isSuperAdmin ? (
            <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
              {t('common.userMenu.superadminBadge')}
            </Typography>
          ) : firstCompany ? (
            <>
              <Typography variant="caption" color="text.secondary">
                {t('customers.detail.company')}: <strong>{firstCompany.company_name}</strong>
                {extraCompanies > 0 && ` ${t('common.userMenu.moreCount', { count: extraCompanies })}`}
              </Typography>
              {firstBranch && (
                <Typography variant="caption" color="text.secondary">
                  {t('common.branch')}: <strong>{firstBranch.branch_name}</strong>
                  {extraBranches > 0 && ` ${t('common.userMenu.moreCount', { count: extraBranches })}`}
                </Typography>
              )}
              {firstBranch && (
                <Typography variant="caption" color="text.secondary">
                  {t('customers.detail.division')}:{' '}
                  <strong>
                    {firstBranch.isFullDivisionAccess
                      ? t('common.userMenu.allDivisions')
                      : (firstBranch.divisions[0] ?? '—')}
                  </strong>
                  {!firstBranch.isFullDivisionAccess && extraDivisions > 0 && ` ${t('common.userMenu.moreCount', { count: extraDivisions })}`}
                </Typography>
              )}
            </>
          ) : null}
        </Box>

        <Divider />

        <MenuItem onClick={handleSettings}>
          <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
          {t('nav.settings')}
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
          {t('common.logout')}
        </MenuItem>
      </Menu>
    </>
  );
}
