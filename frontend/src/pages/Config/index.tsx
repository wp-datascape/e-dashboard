// frontend/src/pages/Config/index.tsx
import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { useTranslation } from 'react-i18next';
import { BusinessRulesTab } from './components/BusinessRulesTab';
import { AppSettingsTab } from './components/AppSettingsTab';
import { IntegrationTab } from './components/IntegrationTab';
import { PageSettingsTab } from './components/PageSettingsTab';

function TabPanel({ value, index, children }: { value: number; index: number; children: React.ReactNode }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

export default function ConfigPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>{t('config.title')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{t('config.subtitle')}</Typography>

      <Tabs
        value={tab}
        onChange={(_e, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{ borderBottom: 1, borderColor: 'divider', '& .MuiTabs-flexContainer': { flexWrap: { xs: 'nowrap', sm: 'nowrap' } } }}
      >
        <Tab label={t('config.buThreshold.title')} />
        <Tab label={t('config.tabs.integration')} />
        <Tab label={t('config.tabs.appSettings')} />
        <Tab label={t('config.tabs.pageSettings')} />
      </Tabs>

      <TabPanel value={tab} index={0}><BusinessRulesTab /></TabPanel>
      <TabPanel value={tab} index={1}><IntegrationTab /></TabPanel>
      <TabPanel value={tab} index={2}><AppSettingsTab /></TabPanel>
      <TabPanel value={tab} index={3}><PageSettingsTab /></TabPanel>
    </Box>
  );
}