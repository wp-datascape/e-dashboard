import { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import SearchIcon from '@mui/icons-material/Search';
import SecurityIcon from '@mui/icons-material/Security';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Dialog, StatusChip } from '@/components/ui';
import type { Role, Permission } from '@/types/rbac';

const ACTION_COLUMNS = [
  { key: 'menu',   label: 'Menu' },
  { key: 'view',   label: 'View' },
  { key: 'input',  label: 'Input' },
  { key: 'update', label: 'Update' },
  { key: 'delete', label: 'Delete' },
];

interface SetPermissionDialogProps {
  open: boolean;
  onClose: () => void;
  role: Role | null;
  permissionsGrouped: Record<string, Permission[]> | null;
  onTogglePermission: (group: string, action: string, currentIds: Set<number>) => void;
  isMobile: boolean;
}

export function SetPermissionDialog({
  open,
  onClose,
  role,
  permissionsGrouped,
  onTogglePermission,
  isMobile,
}: SetPermissionDialogProps) {
  const [permSearch, setPermSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [activePermIds, setActivePermIds] = useState<Set<number>>(() => 
    new Set((role?.permissions ?? []).map((p: any) => (typeof p === 'object' ? p.id : p)))
  );

  const findPerm = useCallback(
    (group: string, action: string) => {
      if (!permissionsGrouped) return undefined;
      const groupPerms = permissionsGrouped[group] ?? [];
      // Match both formats: feature.action and feature:action
      return groupPerms.find((p) => p.name.endsWith(`.${action}`) || p.name.endsWith(`:${action}`));
    },
    [permissionsGrouped]
  );

  const hasPermission = (group: string, action: string): boolean => {
    const perm = findPerm(group, action);
    if (!perm) return false;
    return activePermIds.has(perm.id);
  };

  const groupHasAction = (group: string, action: string): boolean => {
    if (!permissionsGrouped) return false;
    const groupPerms = permissionsGrouped[group] ?? [];
    // Match both formats: feature.action and feature:action
    return groupPerms.some((p) => p.name.endsWith(`.${action}`) || p.name.endsWith(`:${action}`));
  };

  const getGroupActiveCount = (group: string): number =>
    ACTION_COLUMNS.filter((col) => groupHasAction(group, col.key) && hasPermission(group, col.key)).length;

  const getGroupTotalCount = (group: string): number =>
    ACTION_COLUMNS.filter((col) => groupHasAction(group, col.key)).length;

  const handleToggle = (group: string, action: string) => {
    const perm = findPerm(group, action);
    if (!perm) return;
    
    const newIds = new Set(activePermIds);
    if (newIds.has(perm.id)) newIds.delete(perm.id);
    else newIds.add(perm.id);
    
    setActivePermIds(newIds);
    onTogglePermission(group, action, newIds);
  };

  const toggleGroupExpand = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const filteredGroups = Object.keys(permissionsGrouped ?? {}).filter(
    (g) => !permSearch || g.toLowerCase().includes(permSearch.toLowerCase())
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      title={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1, py: 0.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <SecurityIcon sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}>
              Set Permission
            </Typography>
            {role && (
              <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1 }}>
                Role:&nbsp;
                <Box component="span" sx={{ fontWeight: 700, color: 'primary.main' }}>{role.name}</Box>
              </Typography>
            )}
          </Box>
          <StatusChip label={`${activePermIds.size} aktif`} color="primary" />
        </Box>
      }
      maxWidth="sm"
      contentSx={{ p: 0 }}
      actions={[{ label: 'Selesai', onClick: onClose }]}
    >
      {/* Search bar */}
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <TextField
          size="small"
          placeholder="Filter kategori..."
          fullWidth
          value={permSearch}
          onChange={(e) => setPermSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      {/* Accordion List */}
      <Box sx={{ overflowY: 'auto', maxHeight: isMobile ? 'calc(100vh - 220px)' : '60vh' }}>
        <List disablePadding>
          {filteredGroups.map((group, idx) => {
            const isOpen = expandedGroups.has(group);
            const activeCount = getGroupActiveCount(group);
            const totalCount = getGroupTotalCount(group);
            const isFullyActive = activeCount === totalCount && totalCount > 0;

            return (
              <Box key={group}>
                {idx > 0 && <Divider />}

                <ListItemButton
                  onClick={() => toggleGroupExpand(group)}
                  sx={{
                    px: 2.5, py: 1.25, gap: 1.5,
                    bgcolor: isOpen ? 'primary.main' : 'transparent',
                    '&:hover': { bgcolor: isOpen ? 'primary.dark' : 'action.hover' },
                    transition: 'background-color 0.15s',
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ fontWeight: 600, color: isOpen ? '#fff' : 'text.primary' }}>
                        {group}
                      </Typography>
                    }
                  />
                  <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                    {activeCount > 0 && (
                      <StatusChip
                        label={`${activeCount}/${totalCount}`}
                        color={isFullyActive ? 'success' : 'warning'}
                        sx={isOpen ? { bgcolor: 'rgba(255,255,255,0.25)', color: '#fff', borderColor: 'transparent' } : undefined}
                      />
                    )}
                  </Box>
                  <ExpandMoreIcon
                    sx={{
                      fontSize: 20,
                      color: isOpen ? '#fff' : 'text.secondary',
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                      flexShrink: 0,
                    }}
                  />
                </ListItemButton>

                <Collapse in={isOpen} unmountOnExit>
                  <Box sx={{ bgcolor: 'action.hover', px: 2.5, py: 1, display: 'flex', flexDirection: 'column', gap: 0.25, borderLeft: '3px solid', borderColor: 'primary.main' }}>
                    {ACTION_COLUMNS.map((col) => {
                      const exists = groupHasAction(group, col.key);
                      const checked = hasPermission(group, col.key);
                      return (
                        <Box
                          key={col.key}
                          sx={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            py: 0.75, px: 1, borderRadius: 1,
                            opacity: exists ? 1 : 0.38,
                            bgcolor: checked && exists ? 'primary.main' + '14' : 'transparent',
                            transition: 'background-color 0.15s',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: checked && exists ? 'primary.main' : 'divider', transition: 'background-color 0.15s', flexShrink: 0 }} />
                            <Typography variant="body2" sx={{ fontWeight: checked && exists ? 600 : 400, color: checked && exists ? 'primary.main' : 'text.primary' }}>
                              {col.label}
                            </Typography>
                            {!exists && (
                              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>
                                (tidak tersedia)
                              </Typography>
                            )}
                          </Box>
                          <Switch checked={checked} onChange={() => exists && handleToggle(group, col.key)} disabled={!exists} size="small" color="primary" />
                        </Box>
                      );
                    })}
                  </Box>
                  <Divider />
                </Collapse>
              </Box>
            );
          })}
        </List>

        {filteredGroups.length === 0 && (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" color="text.disabled">Tidak ada kategori yang cocok</Typography>
          </Box>
        )}
      </Box>
    </Dialog>
  );
}
