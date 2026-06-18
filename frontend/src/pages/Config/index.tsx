import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Card from '@mui/material/Card'
import { useTranslation } from 'react-i18next'

// Components
import { IntegrationTab } from './components/IntegrationTab'
import { AppSettingsTab } from './components/AppSettingsTab'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`config-tabpanel-${index}`}
      aria-labelledby={`config-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  )
}

export default function Config() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState(0)

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {t('config.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('config.subtitle')}
      </Typography>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="config tabs">
            <Tab label={t('config.tabs.integration')} id="config-tab-0" />
            <Tab label={t('config.tabs.appSettings')} id="config-tab-1" />
          </Tabs>
        </Box>

        {/* ── Tab 0: Integration — Accurate Credentials ── */}
        <TabPanel value={activeTab} index={0}>
          <IntegrationTab />
        </TabPanel>

        {/* ── Tab 1: App Settings — Theme & Language ── */}
        <TabPanel value={activeTab} index={1}>
          <AppSettingsTab />
        </TabPanel>
      </Card>
    </Box>
  )
}
