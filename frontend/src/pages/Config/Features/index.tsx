import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Switch from '@mui/material/Switch'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import { useTheme } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import { usePageSettings, useUpdatePageSetting } from '@/hooks/usePageSettings'
import { Card, StatusChip } from '@/components/ui'
import { CardResponsive, type CardResponsiveColumn } from '@/components/tables/CardResponsive'
import { useCan } from '@/hooks/useCan'

// page_key -> i18n key (reuse label yang sama dengan Sidebar, SSOT di locale nav.*)
const PAGE_LABEL_KEYS: Record<string, string> = {
  dashboard: 'nav.dashboard',
  customers: 'nav.customers',
  'customers-expansion': 'nav.expansionTargets',
  'dormant-rate': 'nav.dormantRate',
  'dormant-value': 'nav.dormantValue',
  'reactivation-rate': 'nav.reactivationRate',
  'cross-selling': 'nav.crossSellMatrix',
  products: 'nav.productLedger',
  'products-high-margin': 'nav.highMarginPush',
  'products-trend': 'nav.productTrend',
  transactions: 'nav.transactionLedger',
  projects: 'nav.projectMilestone',
  'settings-app': 'nav.settingsApp',
  companies: 'nav.companies',
  'settings-high-margin': 'nav.settingsHighMargin',
  'settings-threshold': 'nav.settingsThreshold',
  'settings-classification': 'nav.settingsClassification',
  import: 'nav.import',
  'config-integration': 'nav.configIntegration',
  'config-features': 'nav.configFeatures',
  users: 'nav.users',
  rbac: 'nav.rbac',
  'ab-testing': 'nav.abTesting',
  'audit-log': 'nav.auditLog',
}

const GROUP_KEY_MAP: Record<string, string> = {
  dashboard: 'nav.groups.executiveDashboard',
  customers: 'nav.groups.customerWorkbench',
  'customers-expansion': 'nav.groups.customerWorkbench',
  'dormant-rate': 'nav.groups.customerWorkbench',
  'dormant-value': 'nav.groups.customerWorkbench',
  'reactivation-rate': 'nav.groups.customerWorkbench',
  'cross-selling': 'nav.groups.customerWorkbench',
  products: 'nav.groups.productPortfolio',
  'products-high-margin': 'nav.groups.productPortfolio',
  'products-trend': 'nav.groups.productPortfolio',
  transactions: 'nav.groups.transactionRevenue',
  projects: 'nav.groups.transactionRevenue',
  'settings-app': 'nav.groups.settings',
  companies: 'nav.groups.settings',
  'settings-high-margin': 'nav.groups.settings',
  'settings-threshold': 'nav.groups.settings',
  'settings-classification': 'nav.groups.config',
  import: 'nav.groups.config',
  'config-integration': 'nav.groups.config',
  'config-features': 'nav.groups.config',
  // Users/Role/AB Testing di sidebar sungguhan (menu.tsx) cuma ada di grup Access
  // Control - sebelumnya di sini malah masuk grup Konfigurasi, jadi kelihatan
  // kayak ada di 2 menu berbeda (laporan user 2026-07-29).
  users: 'nav.groups.accessControl',
  rbac: 'nav.groups.accessControl',
  'ab-testing': 'nav.groups.accessControl',
  'audit-log': 'nav.groups.admin',
}

const GROUP_KEY_ORDER = [
  'nav.groups.executiveDashboard',
  'nav.groups.customerWorkbench',
  'nav.groups.productPortfolio',
  'nav.groups.transactionRevenue',
  'nav.groups.settings',
  'nav.groups.config',
  'nav.groups.accessControl',
  'nav.groups.admin',
]

const ITEM_ORDER: Record<string, number> = {
  // Executive Dashboard
  dashboard: 0,
  // Customer Workbench
  customers: 0,
  'customers-expansion': 1,
  'dormant-rate': 2,
  'dormant-value': 3,
  'reactivation-rate': 4,
  'cross-selling': 5,
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
  // Access Control
  users: 0,
  rbac: 1,
  'ab-testing': 2,
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
        <Typography variant="pageTitle" sx={{ mb: 0.5 }}>{t('nav.configFeatures')}</Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress /></Box>
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="pageTitle" sx={{ mb: 0.5 }}>{t('nav.configFeatures')}</Typography>
        <Alert severity="error">{t('error.generic')}</Alert>
      </Box>
    )
  }

  const items = (pageSettings ?? []).filter((item) => item.page_key in GROUP_KEY_MAP)
  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    const groupKey = GROUP_KEY_MAP[item.page_key]!
    if (!acc[groupKey]) acc[groupKey] = []
    acc[groupKey].push(item)
    return acc
  }, {})
  const orderedGroups = GROUP_KEY_ORDER.filter((g) => g in grouped).map((g) => [g, grouped[g]] as const)

  type Row = (typeof items)[number] & { id: string; label: string }

  // Kolom untuk CardResponsive (Table biasa desktop + Stack<Card> mobile, tanpa
  // DataGrid/pagination) — dipakai sejak halaman ini dibuat, sengaja TIDAK ikut
  // migrasi ke ResponsiveListView (DataGrid berlebihan untuk list kecil per
  // grup begini, bikin tiap grup jadi kotak sempit dengan scroll sendiri).
  const columns: CardResponsiveColumn<Row>[] = [
    { key: 'label', header: t('config.pageSettings.colPage'), width: '40%', render: (row) => <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.label}</Typography> },
    { key: 'page_key', header: t('config.pageSettings.colKey'), width: '25%', render: (row) => <Typography variant="caption" color="text.secondary" sx={{ fontFamily: mono }}>{row.page_key}</Typography> },
    { key: 'ready', header: t('config.pageSettings.colStatus'), width: '20%', render: (row) => <StatusChip label={row.ready ? t('common.active') : t('common.inactive')} color={row.ready ? 'success' : 'default'} /> },
    {
      key: '_actions', header: t('config.pageSettings.colToggle'), width: '15%',
      render: (row) => {
        const isBusy = isPending && busyKey === row.page_key
        return isBusy
          ? <CircularProgress size={20} />
          : <Switch checked={row.ready} onChange={() => handleToggle(row.page_key, row.ready)} size="small" color="primary" disabled={!can('config.features:update')} />
      },
    },
  ]

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="pageTitle" sx={{ mb: 0.5 }}>{t('nav.configFeatures')}</Typography>
      <Typography variant="pageSubtitle" sx={{ mb: 3 }}>{t('config.features.subtitle')}</Typography>

      <Card sx={{ p: 3 }}>
        {orderedGroups.map(([groupKey, pages]) => {
          const sortedPages = [...pages].sort((a, b) => (ITEM_ORDER[a.page_key] ?? 99) - (ITEM_ORDER[b.page_key] ?? 99))
          const rows = sortedPages.map((item) => {
            const labelKey = PAGE_LABEL_KEYS[item.page_key]
            return { ...item, id: item.page_key, label: labelKey ? t(labelKey) : item.page_key }
          })
          return (
            <Box key={groupKey} sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'primary.main', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 1 }}>
                {t(groupKey)}
              </Typography>

              <CardResponsive
                rows={rows}
                columns={columns}
                getRowId={(row) => row.id}
                renderMobileTitle={(row) => <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.label}</Typography>}
                renderMobileDetails={(row) => (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>{t('config.pageSettings.colKey')}</Typography>
                      <Typography variant="body2" sx={{ fontFamily: mono }}>{row.page_key}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <StatusChip label={row.ready ? t('common.active') : t('common.inactive')} color={row.ready ? 'success' : 'default'} />
                      {isPending && busyKey === row.page_key
                        ? <CircularProgress size={20} />
                        : <Switch checked={row.ready} onChange={() => handleToggle(row.page_key, row.ready)} size="small" color="primary" disabled={!can('config.features:update')} />}
                    </Box>
                  </Box>
                )}
              />
            </Box>
          )
        })}
      </Card>
    </Box>
  )
}
