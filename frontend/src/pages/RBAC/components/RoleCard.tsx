import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CardContent from '@mui/material/CardContent';
import { Card } from '@/components/ui';
import CardActions from '@mui/material/CardActions';
import DeleteIcon from '@mui/icons-material/Delete';
import LockIcon from '@mui/icons-material/Lock';
import SecurityIcon from '@mui/icons-material/Security';
import { useTranslation } from 'react-i18next';
import { Button, StatusChip } from '@/components/ui';
import type { Role } from '@/types/rbac';

interface RoleCardProps {
  role: Role;
  onPermissions: (role: Role) => void;
  onDelete: (role: Role) => void;
}

export function RoleCard({ role, onPermissions, onDelete }: RoleCardProps) {
  const { t } = useTranslation();

  return (
    <Card sx={{ mb: 1.5 }}>
      <CardContent sx={{ pb: 1 }}>
        {/* Name + system badge */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, flexGrow: 1 }}>
            {role.name}
          </Typography>
          {role.is_system && (
            <StatusChip
              label={t('rbac.systemRole')}
              color="warning"
              icon={<LockIcon />}
            />
          )}
        </Box>

        {/* Description */}
        {role.description && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            {role.description}
          </Typography>
        )}

        {/* Permission count */}
        <StatusChip
          label={`${role.permissions.length} permission`}
          color="primary"
        />
      </CardContent>

      <CardActions sx={{ pt: 0, px: 2, pb: 1.5, gap: 1 }}>
        <Button
          size="small"
          startIcon={<SecurityIcon sx={{ fontSize: 15 }} />}
          onClick={() => onPermissions(role)}
          sx={{ flex: 1 }}
        >
          {t('rbac.assignPermissions')}
        </Button>
        <Tooltip title={role.is_system ? t('rbac.cannotDeleteSystem') : t('common.delete')}>
          <span>
            <IconButton
              size="small"
              color="error"
              disabled={role.is_system}
              onClick={() => onDelete(role)}
            >
              <DeleteIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </span>
        </Tooltip>
      </CardActions>
    </Card>
  );
}
