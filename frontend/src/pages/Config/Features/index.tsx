import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Switch from '@mui/material/Switch'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import { useTheme } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import { usePageSettings, useUpdatePageSetting } from '@/hooks/usePageSettings'
import { Card, StatusChip } from '@/components/ui'
import { useCan } from '@/hooks/useCan'

const PAGE_LABELS: Record<string, string> = {
  dashboard: 'Executive Dashboard',
  customers: 'Customer 360',
  'customers-expansion': 'Expansion Targets',
  'dormant-customer': 'Churn Risk',
  'cross-selling': 'Cross Selling',
  products: 'Products',
  'products-high-margin': 'Product (High Margin)',
  'products-trend': 'Product Trend',
  transactions: 'Orders',
  projects: 'Project Milestone',
  'settings-app': 'App Settings',
  companies: 'Companies',
  'settings-high-margin': 'Product',
  'settings-threshold': 'Threshold',
  'settings-classification': 'Classification',
  import: 'Import',
  'config-integration': 'Integration',
  'config-features': 'Fitur',
  users: 'Users',
  rbac: 'Roles',
  'audit-log': 'Audit Log',
}

const GROUP_MAP: Record<string, string> = {
  dashboard: 'Executive Dashboard',
  customers: 'Customer Workbench',
  'customers-expansion': 'Customer Workbench',
  'dormant-customer': 'Customer Workbench',
  'cross-selling': 'Customer Workbench',
  products: 'Product & Portfolio',
  'products-high-margin': 'Product & Portfolio',
  'products-trend': 'Product & Portfolio',
  transactions: 'Transaction & Revenue',
  projects: 'Transaction & Revenue',
  'settings-app': 'Settings',
  companies: 'Settings',
  'settings-high-margin': 'Settings',
  'settings-threshold': 'Settings',
  'settings-classification': 'Config',
  import: 'Config',
  'config-integration': 'Config',
  'config-features': 'Config',
  users: 'Config',
  rbac: 'Config',
  'audit-log': 'Admin',
}

const GROUP_ORDER = [
  'Executive Dashboard',
  'Customer Workbench',
  'Product & Portfolio',
  'Transaction & Revenue',
  'Settings',
  'Config',
  'Admin',
]

const ITEM_ORDER: Record<string, number> = {
  // Executive Dashboard
  dashboard: 0,
  // Customer Workbench
  customers: 0,
  'customers-expansion': 1,
  'dormant-customer': 2,
  'cross-selling': 3,
  // Product & Portfolio
  products: 0,
  'products-high-margin': 1,
  'products-trend': 2,
  // Transaction & Revenue
  transactions: 0,
  projects: 1,
  // Settings
  'settings-app': 0,
  companies: 1,
  'settings-high-margin': 2,
  'settings-threshold': 3,
  // Config
  'settings-classification': 0,
  import: 1,
  'config-integration': 2,
  'config-features': 3,
  users: 4,
  rbac: 5,
  // Admin
  'audit-log': 0,
}

export default function FeaturesPage() {
  const { t } = useTranslation()
  const theme = useTheme()
  const mono = theme.typography.caption.fontFamily
  const can = useCan()
  const { data: pageSettings, isLoading, error } = usePageSettings()
  const { mutate, isPending } = useUpdatePageSetting()
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const handleToggle = (pageKey: string, currentReady: boolean) => {
    setBusyKey(pageKey)
    mutate({ pageKey, ready: !currentReady }, { onSettled: () => setBusyKey(null) })
  }

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>{t('nav.configFeatures')}</Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress /></Box>
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>{t('nav.configFeatures')}</Typography>
        <Alert severity="error">{t('error.generic')}</Alert>
      </Box>
    )
  }

  const items = (pageSettings ?? []).filter((item) => item.page_key in GROUP_MAP)
  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    const group = GROUP_MAP[item.page_key]!
    if (!acc[group]) acc[group] = []
    acc[group].push(item)
    return acc
  }, {})
  const orderedGroups = GROUP_ORDER.filter((g) => g in grouped).map((g) => [g, grouped[g]] as const)

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>{t('nav.configFeatures')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{t('config.features.subtitle')}</Typography>

      <Card sx={{ p: 3 }}>
        {orderedGroups.map(([group, pages]) => {
          const sortedPages = [...pages].sort((a, b) => (ITEM_ORDER[a.page_key] ?? 99) - (ITEM_ORDER[b.page_key] ?? 99))
          return (
          <Box key={group} sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'primary.main', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 1 }}>
              {group}
            </Typography>

            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, width: '40%' }}>{t('config.pageSettings.colPage')}</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: '25%' }}>{t('config.pageSettings.colKey')}</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: '20%' }}>{t('config.pageSettings.colStatus')}</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: '15%' }}>{t('config.pageSettings.colToggle')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedPages.map((item) => {
                    const label = PAGE_LABELS[item.page_key] ?? item.page_key
                    const isBusy = isPending && busyKey === item.page_key
                    return (
                      <TableRow key={item.page_key} hover>
                        <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{label}</Typography></TableCell>
                        <TableCell><Typography variant="caption" color="text.secondary" sx={{ fontFamily: mono }}>{item.page_key}</Typography></TableCell>
                        <TableCell>
                          <StatusChip label={item.ready ? t('common.active') : t('common.inactive')} color={item.ready ? 'success' : 'default'} />
                        </TableCell>
                        <TableCell>
                          {isBusy ? <CircularProgress size={20} /> : <Switch checked={item.ready} onChange={() => handleToggle(item.page_key, item.ready)} size="small" color="primary" disabled={!can('config.features:update')} />}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Box>

            <Stack spacing={1.5} sx={{ display: { xs: 'flex', sm: 'none' } }}>
              {sortedPages.map((item) => {
                const label = PAGE_LABELS[item.page_key] ?? item.page_key
                const isBusy = isPending && busyKey === item.page_key
                return (
                  <Card key={item.page_key} sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{label}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <StatusChip label={item.ready ? t('common.active') : t('common.inactive')} color={item.ready ? 'success' : 'default'} />
                        {isBusy ? <CircularProgress size={20} /> : <Switch checked={item.ready} onChange={() => handleToggle(item.page_key, item.ready)} size="small" color="primary" disabled={!can('config.features:update')} />}
                      </Box>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: mono }}>{item.page_key}</Typography>
                  </Card>
                )
              })}
            </Stack>
          </Box>
          )
        })}
      </Card>
    </Box>
  )
}
