import { useState, useCallback, useMemo } from 'react';
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
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Dialog, StatusChip } from '@/components/ui';
import { formatEnumLabel } from '@/utils/format';
import type { Role, Permission } from '@/types/rbac';

// Urutan tampilan action yang dikenal — action di luar daftar ini (kalau ada
// suffix permission baru di masa depan) tetap muncul lewat fallback label,
// cuma urutannya di akhir.
const KNOWN_ACTION_ORDER = ['menu', 'view', 'create', 'update', 'delete', 'export', 'import', 'reset', 'test'];
const ACTION_LABEL_KEYS: Record<string, string> = {
  menu: 'actionMenu',
  view: 'actionView',
  create: 'actionCreate',
  update: 'actionUpdate',
  delete: 'actionDelete',
  export: 'actionExport',
  import: 'actionImport',
  reset: 'actionReset',
  test: 'actionTest',
};

/**
 * Kolom action dihitung dari suffix permission yang BENAR-BENAR ada di data
 * (permissionsGrouped), bukan daftar hardcode — supaya kalau skema permission
 * berubah (suffix baru ditambah/lama dihapus), dialog ini otomatis ikut,
 * tidak diam-diam menyembunyikan permission seperti kasus 'input' vs 'create'
 * sebelumnya (permission :create ada di data tapi dialog cuma cek :input).
 */
function getActionColumns(t: TFunction, permissionsGrouped: Record<string, Permission[]> | null) {
  const found = new Set<string>();
  for (const perms of Object.values(permissionsGrouped ?? {})) {
    for (const p of perms) {
      const action = p.name.split(/[.:]/).pop();
      if (action) found.add(action);
    }
  }

  const ordered = [...found].sort((a, b) => {
    const ia = KNOWN_ACTION_ORDER.indexOf(a);
    const ib = KNOWN_ACTION_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  return ordered.map((key) => ({
    key,
    label: ACTION_LABEL_KEYS[key] ? t(`rbac.setPermissionDialog.${ACTION_LABEL_KEYS[key]}`) : formatEnumLabel(key),
  }));
}

interface SetPermissionDialogProps {
  open: boolean;
  onClose: () => void;
  role: Role | null;
  permissionsGrouped: Record<string, Permission[]> | null;
  onTogglePermission: (group: string, action: string, currentIds: Set<number>) => void;
  /** true kalau user cuma punya access.permission:view (bukan :update) — dialog kebuka tapi semua toggle dikunci. */
  readOnly?: boolean;
  isMobile: boolean;
}

export function SetPermissionDialog({
  open,
  onClose,
  role,
  permissionsGrouped,
  onTogglePermission,
  readOnly = false,
  isMobile,
}: SetPermissionDialogProps) {
  const { t } = useTranslation();
  const actionColumns = useMemo(() => getActionColumns(t, permissionsGrouped), [t, permissionsGrouped]);
  const [permSearch, setPermSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [activePermIds, setActivePermIds] = useState<Set<number>>(() => 
    new Set((role?.permissions ?? []).map((p) =>
      typeof p === 'object' && p !== null ? (p as Permission).id : Number(p)
    ))
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
    actionColumns.filter((col) => groupHasAction(group, col.key) && hasPermission(group, col.key)).length;

  const getGroupTotalCount = (group: string): number =>
    actionColumns.filter((col) => groupHasAction(group, col.key)).length;

  const handleToggle = (group: string, action: string) => {
    if (readOnly) return;
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
            <SecurityIcon sx={{ color: 'common.white', fontSize: 22 }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}>
              {t('rbac.setPermissionDialog.title')}
            </Typography>
            {role && (
              <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1 }}>
                {t('rbac.setPermissionDialog.rolePrefix')}&nbsp;
                <Box component="span" sx={{ fontWeight: 700, color: 'primary.main' }}>{role.name}</Box>
              </Typography>
            )}
          </Box>
          {readOnly && (
            <StatusChip label={t('rbac.setPermissionDialog.readOnly')} color="warning" />
          )}
          <StatusChip label={t('rbac.setPermissionDialog.activeCount', { count: activePermIds.size })} color="primary" />
        </Box>
      }
      maxWidth="sm"
      contentSx={{ p: 0 }}
      actions={[{ label: t('rbac.setPermissionDialog.done'), onClick: onClose }]}
    >
      {/* Search bar */}
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <TextField
          size="small"
          placeholder={t('rbac.setPermissionDialog.searchPlaceholder')}
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
                      <Typography variant="body2" sx={{ fontWeight: 600, color: isOpen ? 'common.white' : 'text.primary' }}>
                        {group}
                      </Typography>
                    }
                  />
                  <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                    {activeCount > 0 && (
                      <StatusChip
                        label={`${activeCount}/${totalCount}`}
                        color={isFullyActive ? 'success' : 'warning'}
                        sx={isOpen ? { bgcolor: 'rgba(255,255,255,0.25)', color: 'common.white', borderColor: 'transparent' } : undefined}
                      />
                    )}
                  </Box>
                  <ExpandMoreIcon
                    sx={{
                      fontSize: 20,
                      color: isOpen ? 'common.white' : 'text.secondary',
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                      flexShrink: 0,
                    }}
                  />
                </ListItemButton>

                <Collapse in={isOpen} unmountOnExit>
                  <Box sx={{ bgcolor: 'action.hover', px: 2.5, py: 1, display: 'flex', flexDirection: 'column', gap: 0.25, borderLeft: '3px solid', borderColor: 'primary.main' }}>
                    {actionColumns.map((col) => {
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
                                {t('rbac.setPermissionDialog.notAvailable')}
                              </Typography>
                            )}
                          </Box>
                          <Switch checked={checked} onChange={() => exists && handleToggle(group, col.key)} disabled={!exists || readOnly} size="small" color="primary" />
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
            <Typography variant="body2" color="text.disabled">{t('rbac.setPermissionDialog.noMatch')}</Typography>
          </Box>
        )}
      </Box>
    </Dialog>
  );
}
