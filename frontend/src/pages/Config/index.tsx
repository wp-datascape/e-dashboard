import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import FormLabel from '@mui/material/FormLabel'
import { useTranslation } from 'react-i18next'
import { useTheme as useMuiTheme } from '@mui/material/styles'
import { useThemeMode } from '@/theme/ThemeContext'

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
  const { t, i18n } = useTranslation()
  const muiTheme = useMuiTheme()
  const { mode, toggleTheme } = useThemeMode()
  const [activeTab, setActiveTab] = useState(0)
  
  // Integration form state
  const [authMethod, setAuthMethod] = useState<'api-token' | 'oauth'>('oauth')
  // API Token method
  const [appKey, setAppKey] = useState('')
  const [signatureSecret, setSignatureSecret] = useState('')
  // OAuth method
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [callbackUrl, setCallbackUrl] = useState('https://your-domain.com/api/v1/accurate/callback')
  // Common
  const [companyDb, setCompanyDb] = useState('')
  
  // App config state
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language)
  const [isDarkMode, setIsDarkMode] = useState(mode === 'dark')

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }

  const handleSaveIntegration = () => {
    // TODO: Implement API call to save Accurate credentials
    if (authMethod === 'api-token') {
      console.log('Saving API Token credentials:', {
        method: 'api-token',
        appKey,
        signatureSecret,
        companyDb,
      })
    } else {
      console.log('Saving OAuth credentials:', {
        method: 'oauth',
        clientId,
        clientSecret,
        callbackUrl,
        companyDb,
      })
    }
    alert(`Kredensial Accurate (${authMethod === 'oauth' ? 'OAuth' : 'API Token'}) berhasil disimpan (Mock)`)
  }

  const handleResetIntegration = () => {
    setAppKey('')
    setSignatureSecret('')
    setClientId('')
    setClientSecret('')
    setCallbackUrl('https://your-domain.com/api/v1/accurate/callback')
    setCompanyDb('')
  }

  const handleSaveAppConfig = () => {
    // Save language
    i18n.changeLanguage(selectedLanguage)
    
    // Save theme
    if ((isDarkMode && mode === 'light') || (!isDarkMode && mode === 'dark')) {
      toggleTheme()
    }
    
    alert('Konfigurasi aplikasi berhasil disimpan')
  }

  const handleThemeToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsDarkMode(event.target.checked)
  }

  const isIntegrationValid = authMethod === 'oauth' 
    ? (clientId && clientSecret && callbackUrl && companyDb)
    : (appKey && signatureSecret && companyDb)

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {t('config.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Kelola integrasi dan pengaturan aplikasi
      </Typography>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="config tabs">
            <Tab label="Integration" id="config-tab-0" />
            <Tab label="App Settings" id="config-tab-1" />
          </Tabs>
        </Box>

        {/* Tab 1: Integration - Accurate Credentials */}
        <TabPanel value={activeTab} index={0}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Accurate Online Integration
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Pilih metode autentikasi dan masukkan kredensial API Accurate Online
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              <strong>OAuth (Recommended):</strong> Lebih aman, user authorization flow standar.<br />
              <strong>API Token:</strong> Lebih simple, langsung gunakan App Key & Signature Secret.
            </Alert>

            <Stack spacing={3}>
              {/* Auth Method Selector */}
              <FormControl component="fieldset">
                <FormLabel component="legend">Metode Autentikasi</FormLabel>
                <RadioGroup
                  row
                  value={authMethod}
                  onChange={(e) => setAuthMethod(e.target.value as 'api-token' | 'oauth')}
                >
                  <FormControlLabel value="oauth" control={<Radio />} label="OAuth 2.0 (Recommended)" />
                  <FormControlLabel value="api-token" control={<Radio />} label="API Token" />
                </RadioGroup>
              </FormControl>

              <Divider />

              {/* OAuth Method */}
              {authMethod === 'oauth' && (
                <>
                  <Typography variant="subtitle2" color="primary">
                    OAuth 2.0 Credentials
                  </Typography>
                  
                  <TextField
                    fullWidth
                    label="Client ID"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="c5b8369d-a63f-4443-9500-895117e04f08"
                    helperText="Client ID dari Area Developer Accurate Online"
                  />

                  <TextField
                    fullWidth
                    label="Client Secret"
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="1a4257ad235c73702af2c194e484e6d2"
                    helperText="Client Secret dari Area Developer Accurate Online"
                  />

                  <TextField
                    fullWidth
                    label="Callback URL"
                    value={callbackUrl}
                    onChange={(e) => setCallbackUrl(e.target.value)}
                    placeholder="https://your-domain.com/api/v1/accurate/callback"
                    helperText="URL callback yang akan menerima authorization code"
                  />
                </>
              )}

              {/* API Token Method */}
              {authMethod === 'api-token' && (
                <>
                  <Typography variant="subtitle2" color="primary">
                    API Token Credentials
                  </Typography>
                  
                  <TextField
                    fullWidth
                    label="App Key"
                    value={appKey}
                    onChange={(e) => setAppKey(e.target.value)}
                    placeholder="5eaa6dda-376a-4dc9-97ba-f5f387bb519f"
                    helperText="App Key dari Area Developer Accurate Online (menu API Token)"
                  />

                  <TextField
                    fullWidth
                    label="Signature Secret"
                    type="password"
                    value={signatureSecret}
                    onChange={(e) => setSignatureSecret(e.target.value)}
                    placeholder="F400EJif1S95iaHjDvfh4pHKemqAe2kpNDruXASDm0JctNVbr4o6VGMgSqph7V0M"
                    helperText="Signature Secret untuk membuat signature pada request API"
                  />
                </>
              )}

              <Divider />

              {/* Common Fields */}
              <Typography variant="subtitle2" color="text.secondary">
                Database Information
              </Typography>

              <TextField
                fullWidth
                label="Company Database ID"
                value={companyDb}
                onChange={(e) => setCompanyDb(e.target.value)}
                placeholder="12345"
                helperText="ID database perusahaan di Accurate Online"
              />

              <Alert severity="warning" sx={{ mt: 2 }}>
                Kredensial akan disimpan <strong>terenkripsi</strong> di database backend. Setiap company dapat memiliki kredensial berbeda.
              </Alert>

              <Divider />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button 
                  variant="contained" 
                  onClick={handleSaveIntegration}
                  disabled={!isIntegrationValid}
                >
                  Simpan Kredensial
                </Button>
                <Button variant="outlined" onClick={handleResetIntegration}>
                  Reset
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </TabPanel>

        {/* Tab 2: App Settings - Theme, Language, etc */}
        <TabPanel value={activeTab} index={1}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Application Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Atur preferensi tampilan dan bahasa aplikasi
            </Typography>

            <Stack spacing={3}>
              {/* Language Selection */}
              <FormControl fullWidth>
                <InputLabel id="language-label">Bahasa / Language</InputLabel>
                <Select
                  labelId="language-label"
                  value={selectedLanguage}
                  label="Bahasa / Language"
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                >
                  <MenuItem value="id">🇮🇩 Bahasa Indonesia</MenuItem>
                  <MenuItem value="en">🇬🇧 English</MenuItem>
                </Select>
              </FormControl>

              {/* Dark Mode Toggle */}
              <Box>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={isDarkMode} 
                      onChange={handleThemeToggle}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1">
                        {isDarkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {isDarkMode 
                          ? 'Gunakan tema gelap untuk mengurangi ketegangan mata'
                          : 'Gunakan tema terang untuk visibilitas lebih baik'
                        }
                      </Typography>
                    </Box>
                  }
                />
              </Box>

              <Divider />

              {/* Theme Color Preview */}
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Theme Preview
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                  <Box
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: 1,
                      bgcolor: muiTheme.palette.primary.main,
                      border: '2px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography variant="caption" sx={{ color: 'primary.contrastText' }}>
                      Primary
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: 1,
                      bgcolor: muiTheme.palette.secondary.main,
                      border: '2px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography variant="caption" sx={{ color: 'secondary.contrastText' }}>
                      Secondary
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: 1,
                      bgcolor: muiTheme.palette.success.main,
                      border: '2px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography variant="caption" sx={{ color: 'success.contrastText' }}>
                      Success
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: 1,
                      bgcolor: muiTheme.palette.error.main,
                      border: '2px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography variant="caption" sx={{ color: 'error.contrastText' }}>
                      Error
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Divider />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button 
                  variant="contained" 
                  onClick={handleSaveAppConfig}
                >
                  Terapkan Pengaturan
                </Button>
                <Button variant="outlined" onClick={() => {
                  setSelectedLanguage(i18n.language)
                  setIsDarkMode(mode === 'dark')
                }}>
                  Reset
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </TabPanel>
      </Card>
    </Box>
  )
}
