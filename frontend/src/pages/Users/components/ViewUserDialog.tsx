import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import { useTranslation } from 'react-i18next';

import { Dialog } from '@/components/ui/Dialog';
import { StatusChip } from '@/components/ui/StatusChip';
import type { StatusChipColor } from '@/components/ui/StatusChip';
import type { User } from '@/types/users';
import { formatDateDDMMYYYY } from '@/utils/date';

interface ViewUserDialogProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
}

const getRoleColor = (roleName: string): StatusChipColor => {
  const map: Record<string, StatusChipColor> = {
    superadmin: 'error',
    admin: 'warning',
    manager: 'primary',
    sales: 'info',
    executive: 'success',
  };
  return map[roleName] ?? 'default';
};

const fmtDate = formatDateDDMMYYYY;

export function ViewUserDialog({ open, onClose, user }: ViewUserDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('users.view_user')}
      maxWidth="sm"
      actions={[{ label: t('common.close'), onClick: onClose, variant: 'text' }]}
    >
      {user && (
        <Stack spacing={2} sx={{ pt: 1 }}>
          {/* Name */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 130, fontWeight: 600 }}>
              {t('users.name')}
            </Typography>
            <Typography variant="body2">{user.name}</Typography>
          </Box>

          {/* Email */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 130, fontWeight: 600 }}>
              {t('users.email')}
            </Typography>
            <Typography variant="body2">{user.email}</Typography>
          </Box>

          {/* Role */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 130, fontWeight: 600 }}>
              {t('users.role')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {user.roles.map(r => (
                <StatusChip key={r.id} label={r.name} color={getRoleColor(r.name)} />
              ))}
            </Box>
          </Box>

          {/* Company -> Branch -> Division assignment tree */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 130, fontWeight: 600, pt: 0.25 }}>
              {t('users.companies')}
            </Typography>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {user.company_assignments.length === 0 ? (
                <Typography variant="body2" color="text.disabled">—</Typography>
              ) : (
                user.company_assignments.map((a) => (
                  <Box key={a.company_id} sx={{ pl: 1.5, borderLeft: '2px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{a.company_name}</Typography>
                    {a.branches.length === 0 ? (
                      <Typography variant="caption" color="warning.main">
                        {t('users.warningNoBranch', { company: a.company_name })}
                      </Typography>
                    ) : (
                      a.branches.map((b) => (
                        <Box key={b.branch_id} sx={{ pl: 1.5, mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">{b.branch_name}</Typography>
                          {b.divisions.length === 0 ? (
                            <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
                              {t('users.warningNoDivision', { branch: b.branch_name })}
                            </Typography>
                          ) : (
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.25 }}>
                              {b.divisions.map((d) => (
                                <StatusChip key={d} label={t(`users.divisions.${d}`)} color="default" size="small" />
                              ))}
                            </Box>
                          )}
                        </Box>
                      ))
                    )}
                  </Box>
                ))
              )}
            </Box>
          </Box>

          {/* Status */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 130, fontWeight: 600 }}>
              {t('common.status')}
            </Typography>
            <StatusChip
              label={user.is_active ? t('common.active') : t('common.inactive')}
              color={user.is_active ? 'success' : 'default'}
            />
          </Box>

          {/* Last Login */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 130, fontWeight: 600 }}>
              {t('users.lastLogin')}
            </Typography>
            <Typography variant="body2">
              {user.last_login_at
                ? new Date(user.last_login_at).toLocaleString('id-ID')
                : t('users.no_last_login')}
            </Typography>
          </Box>

          {/* Created */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 130, fontWeight: 600 }}>
              {t('users.created_at')}
            </Typography>
            <Typography variant="body2">{fmtDate(user.created_at, '-')}</Typography>
          </Box>

          {/* Permissions */}
          <Divider />
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 1 }}>
              {t('users.permissionsCount', { count: user.permissions.length })}
            </Typography>
            {user.permissions.length === 0 ? (
              <Typography variant="body2" color="text.disabled">—</Typography>
            ) : (
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {user.permissions.map(p => (
                  <StatusChip key={p} label={p} color="default" size="small" />
                ))}
              </Box>
            )}
          </Box>
        </Stack>
      )}
    </Dialog>
  );
}
