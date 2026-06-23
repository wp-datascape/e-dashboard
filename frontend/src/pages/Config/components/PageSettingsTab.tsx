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
import Chip from '@mui/material/Chip'
import { useTheme } from '@mui/material/styles'
import { Card } from '@/components/ui'
import { useTranslation } from 'react-i18next'
import { usePageSettings, useUpdatePageSetting } from '@/hooks/usePageSettings'

// Mapping pageKey → label yang user-friendly
const PAGE_LABELS: Record<string, string> = {
  dashboard: 'Executive Dashboard',
  customers: 'Customer 360',
  'customers-expansion': 'Expansion Targets',
  'dormant-customer': 'Churn Risk',
  'cross-selling': 'Cross Selling',
  products: 'Products',
  'products-high-margin': 'High Margin Push',
  'products-trend': 'Product Trend',
  transactions: 'Orders',
  projects: 'Project Milestone',
  import: 'Import',
  users: 'Users',
  rbac: 'Roles',
  config: 'Config',
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
  import: 'Admin',
  users: 'Admin',
  rbac: 'Admin',
  config: 'Admin',
  'audit-log': 'Admin',
}

export function PageSettingsTab() {
  const { t } = useTranslation()
  const theme = useTheme()
  const mono = theme.typography.caption.fontFamily
  const { data: pageSettings, isLoading, error } = usePageSettings()
  const { mutate, isPending } = useUpdatePageSetting()
  const [busyKey, setBusyKey] = useState<string | null>(null)

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
        <CircularProgress />
      </Box>
    )
  }
  if (error) return <Alert severity="error">{t('error.generic')}</Alert>

  const items = pageSettings ?? []
  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    const group = GROUP_MAP[item.page_key] ?? 'Other'
    if (!acc[group]) acc[group] = []
    acc[group].push(item)
    return acc
  }, {})

  const handleToggle = (pageKey: string, currentReady: boolean) => {
    setBusyKey(pageKey)
    mutate(
      { pageKey, ready: !currentReady },
      { onSettled: () => setBusyKey(null) }
    )
  }

  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        {t('config.pageSettings.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('config.pageSettings.subtitle')}
      </Typography>

      {Object.entries(grouped).map(([group, pages]) => (
        <Box key={group} sx={{ mb: 3 }}>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700, mb: 1, color: 'primary.main', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 1 }}
          >
            {group}
          </Typography>

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
              {pages.map((item) => {
                const label = PAGE_LABELS[item.page_key] ?? item.page_key
                const isBusy = isPending && busyKey === item.page_key
                return (
                  <TableRow key={item.page_key} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{label}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: mono }}>
                        {item.page_key}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={item.ready ? t('common.active') : t('common.inactive')}
                        color={item.ready ? 'success' : 'default'}
                        size="small"
                        variant={item.ready ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell>
                      {isBusy ? (
                        <CircularProgress size={20} />
                      ) : (
                        <Switch
                          checked={item.ready}
                          onChange={() => handleToggle(item.page_key, item.ready)}
                          size="small"
                          color="primary"
                        />
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Box>
      ))}
    </Card>
  )
}