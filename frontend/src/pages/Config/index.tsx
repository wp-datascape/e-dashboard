// frontend/src/pages/Config/index.tsx
import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import InputAdornment from '@mui/material/InputAdornment';
import Tooltip from '@mui/material/Tooltip';
import CheckIcon from '@mui/icons-material/Check';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useTranslation } from 'react-i18next';
import { useConfig, useUpdateConfig } from '@/hooks/usePageSettings';
import type { ConfigItem } from '@/types/page';
import { Card } from '@/components/ui';
import { AppSettingsTab } from './components/AppSettingsTab';
import { IntegrationTab } from './components/IntegrationTab';

// ─── BU labels ───────────────────────────────────────────────────────────────
const BU_LABELS: Record<string, string> = {
  b2b_dc: 'B2B DC',
  b2b_project: 'B2B Project',
  b2c: 'B2C',
  manufacturing: 'Manufacturing',
};

const DORMANT_PREFIX = 'dormant_threshold_months.';

// ─── Tab panel helper ─────────────────────────────────────────────────────────
function TabPanel({ value, index, children }: { value: number; index: number; children: React.ReactNode }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

// ─── Inline editable number cell (per-BU table) ───────────────────────────────
function EditableMonthCell({ item }: { item: ConfigItem }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.value);
  const { mutate, isPending } = useUpdateConfig();

  const handleSave = () => {
    mutate(
      { key: item.key, value: draft },
      { onSuccess: () => setEditing(false), onError: () => setDraft(item.value) }
    );
  };

  const handleCancel = () => {
    setDraft(item.value);
    setEditing(false);
  };

  if (editing) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TextField
          size="small"
          type="number"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus
          sx={{ width: 100 }}
          slotProps={{
            input: { endAdornment: <InputAdornment position="end">bln</InputAdornment> },
          }}
        />
        <IconButton size="small" onClick={handleSave} disabled={isPending} color="primary">
          {isPending ? <CircularProgress size={16} /> : <CheckIcon fontSize="small" />}
        </IconButton>
        <IconButton size="small" onClick={handleCancel}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Chip label={`${item.value} bulan`} size="small" color="primary" variant="outlined" />
      <IconButton size="small" onClick={() => setEditing(true)}>
        <EditIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

// ─── Inline editable config row (general keys) ───────────────────────────────
function ConfigRow({ item }: { item: ConfigItem }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.value);
  const { mutate, isPending } = useUpdateConfig();

  const handleSave = () => {
    mutate(
      { key: item.key, value: draft },
      { onSuccess: () => setEditing(false), onError: () => setDraft(item.value) }
    );
  };

  const handleCancel = () => {
    setDraft(item.value);
    setEditing(false);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5 }}>
      <Box sx={{ flex: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.key}</Typography>
        {item.description && (
          <Typography variant="caption" color="text.secondary">{item.description}</Typography>
        )}
      </Box>
      <Box sx={{ flex: 1 }}>
        {editing ? (
          <TextField
            size="small"
            type="number"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            fullWidth
            slotProps={{
              input: { endAdornment: <InputAdornment position="end">bln</InputAdornment> },
            }}
          />
        ) : (
          <Chip label={`${item.value} bulan`} size="small" variant="outlined" />
        )}
      </Box>
      <Box>
        {editing ? (
          <>
            <IconButton size="small" onClick={handleSave} disabled={isPending} color="primary">
              {isPending ? <CircularProgress size={16} /> : <CheckIcon fontSize="small" />}
            </IconButton>
            <IconButton size="small" onClick={handleCancel}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </>
        ) : (
          <IconButton size="small" onClick={() => setEditing(true)}>
            <EditIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
    </Box>
  );
}

// ─── Tab 1: Business Rules ────────────────────────────────────────────────────
function BusinessRulesTab() {
  const { t } = useTranslation();
  const { data: configs, isLoading, error } = useConfig();

  const allItems: ConfigItem[] = configs ?? [];
  const buDormantItems = allItems.filter((c: ConfigItem) => c.key.startsWith(DORMANT_PREFIX));
  const otherItems = allItems.filter((c: ConfigItem) => !c.key.startsWith(DORMANT_PREFIX));

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{t('error.generic')}</Alert>;

  return (
    <Stack spacing={3}>
      {/* Dormant Threshold per BU */}
      <Card sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {t('config.buThreshold.title')}
          </Typography>
          <Tooltip title={t('config.buThreshold.tooltip')} placement="right" arrow>
            <InfoOutlinedIcon fontSize="small" color="action" sx={{ cursor: 'help' }} />
          </Tooltip>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('config.buThreshold.subtitle')}
        </Typography>

        {buDormantItems.length > 0 ? (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: '35%' }}>{t('config.buThreshold.colBu')}</TableCell>
                <TableCell sx={{ fontWeight: 700, width: '30%' }}>{t('config.buThreshold.colThreshold')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t('config.buThreshold.colNote')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {buDormantItems.map((item: ConfigItem) => {
                const buCode = item.key.replace(DORMANT_PREFIX, '');
                const buLabel = BU_LABELS[buCode] ?? buCode;
                return (
                  <TableRow key={item.key} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{buLabel}</Typography>
                    </TableCell>
                    <TableCell><EditableMonthCell item={item} /></TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">{item.description}</Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <Typography variant="body2" color="text.secondary">{t('config.buThreshold.empty')}</Typography>
        )}
      </Card>

      {/* General Settings (active_window etc.) */}
      {otherItems.length > 0 && (
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>{t('config.generalSection.title')}</Typography>
          <Stack divider={<Divider />}>
            {otherItems.map((item: ConfigItem) => <ConfigRow key={item.key} item={item} />)}
          </Stack>
        </Card>
      )}

      {/* period_month info box */}
      <Card sx={{ p: 3, bgcolor: 'action.hover' }}>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <InfoOutlinedIcon color="info" sx={{ mt: 0.25, flexShrink: 0 }} />
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>{t('config.periodInfo.title')}</Typography>
            <Typography variant="body2" color="text.secondary">{t('config.periodInfo.body')}</Typography>
          </Box>
        </Box>
      </Card>
    </Stack>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ConfigPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>{t('config.title')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{t('config.subtitle')}</Typography>

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab label={t('config.buThreshold.title')} />
        <Tab label={t('config.tabs.integration')} />
        <Tab label={t('config.tabs.appSettings')} />
      </Tabs>

      <TabPanel value={tab} index={0}><BusinessRulesTab /></TabPanel>
      <TabPanel value={tab} index={1}><IntegrationTab /></TabPanel>
      <TabPanel value={tab} index={2}><AppSettingsTab /></TabPanel>
    </Box>
  );
}