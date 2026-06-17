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
import { SUPPORTED_LANGUAGES } from '@/i18n/index'
import { StatusChip } from '@/components/ui/StatusChip'

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
  const { mode, toggleTheme, isDark } = useThemeMode()
  const [activeTab, setActiveTab] = useState(0)

  // Integration form state
  const [authMethod, setAuthMethod] = useState<'api-token' | 'oauth'>('oauth')
  const [appKey, setAppKey] = useState('')
  const [signatureSecret, setSignatureSecret] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [callbackUrl, setCallbackUrl] = useState('https://your-domain.com/api/v1/accurate/callback')
  const [companyDb, setCompanyDb] = useState('')

  // Save feedback state
  const [integrationSaved, setIntegrationSaved] = useState(false)

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }

  const handleSaveIntegration = () => {
    // TODO: Ganti dengan API call ke backend ketika backend sudah siap
    setIntegrationSaved(true)
    setTimeout(() => setIntegrationSaved(false), 3000)
  }

  const handleResetIntegration = () => {
    setAppKey('')
    setSignatureSecret('')
    setClientId('')
    setClientSecret('')
    setCallbackUrl('https://your-domain.com/api/v1/accurate/callback')
    setCompanyDb('')
  }

  // ── Language: langsung apply saat ganti, tersimpan otomatis via i18n localStorage ──
  const handleLanguageChange = (code: string) => {
    void i18n.changeLanguage(code)
  }

  // ── Dark Mode: langsung toggle via ThemeContext, tersimpan otomatis via localStorage ──
  const handleThemeToggle = (_event: React.ChangeEvent<HTMLInputElement>) => {
    toggleTheme()
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

        {/* ── Tab 0: Integration — Accurate Credentials ── */}
        <TabPanel value={activeTab} index={0}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Accurate Online Integration
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Pilih metode autentikasi dan masukkan kredensial API Accurate Online
            </Typography>

            {integrationSaved && (
              <Alert severity="success" sx={{ mb: 3 }} onClose={() => setIntegrationSaved(false)}>
                Kredensial berhasil disimpan.
              </Alert>
            )}

            <Alert severity="info" sx={{ mb: 3 }}>
              <strong>OAuth (Recommended):</strong> Lebih aman, user authorization flow standar.<br />
              <strong>API Token:</strong> Lebih simple, langsung gunakan App Key &amp; Signature Secret.
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

        {/* ── Tab 1: App Settings — Theme & Language ── */}
        <TabPanel value={activeTab} index={1}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Application Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Perubahan diterapkan <strong>langsung</strong> dan tersimpan otomatis.
            </Typography>

            <Stack spacing={4}>

              {/* ── Language Selection ── */}
              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mb: 1.5 }}>
                  🌐 Bahasa / Language
                </Typography>
                <FormControl fullWidth>
                  <InputLabel id="language-label">Pilih Bahasa</InputLabel>
                  <Select
                    labelId="language-label"
                    value={i18n.language}
                    label="Pilih Bahasa"
                    onChange={(e) => handleLanguageChange(e.target.value)}
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <MenuItem key={lang.code} value={lang.code}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <span style={{ fontSize: '1.2rem' }}>{lang.flag}</span>
                          <Typography variant="body2" sx={{ fontWeight: i18n.language === lang.code ? 600 : 400 }}>
                            {lang.label}
                          </Typography>
                          {i18n.language === lang.code && (
                            <StatusChip label="Active" color="primary" sx={{ ml: 'auto' }} />
                          )}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Pilihan bahasa tersimpan otomatis dan berlaku untuk seluruh aplikasi.
                </Typography>
              </Box>

              <Divider />

              {/* ── Dark Mode Toggle ── */}
              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mb: 1.5 }}>
                  🎨 Tema Tampilan
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.default',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="body1" sx={{ fontSize: '1.4rem', lineHeight: 1 }}>
                      {isDark ? '🌙' : '☀️'}
                    </Typography>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {isDark ? 'Dark Mode' : 'Light Mode'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {isDark
                          ? 'Tema gelap — mengurangi ketegangan mata di lingkungan redup'
                          : 'Tema terang — visibilitas lebih baik di lingkungan terang'
                        }
                      </Typography>
                    </Box>
                  </Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={isDark}
                        onChange={handleThemeToggle}
                        color="primary"
                      />
                    }
                    label=""
                    sx={{ m: 0 }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Pilihan tema tersimpan otomatis dan berlaku untuk seluruh aplikasi.
                </Typography>
              </Box>

              <Divider />

              {/* ── Theme Color Preview ── */}
              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mb: 1.5 }}>
                  🎨 Palet Warna (Mode: {mode})
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Primary', bg: muiTheme.palette.primary.main, text: muiTheme.palette.primary.contrastText },
                    { label: 'Secondary', bg: muiTheme.palette.secondary.main, text: muiTheme.palette.secondary.contrastText },
                    { label: 'Success', bg: muiTheme.palette.success.main, text: '#fff' },
                    { label: 'Warning', bg: muiTheme.palette.warning.main, text: '#fff' },
                    { label: 'Error', bg: muiTheme.palette.error.main, text: '#fff' },
                    { label: 'Info', bg: muiTheme.palette.info.main, text: '#fff' },
                  ].map((color) => (
                    <Box
                      key={color.label}
                      sx={{
                        width: 72,
                        height: 72,
                        borderRadius: 2,
                        bgcolor: color.bg,
                        border: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography variant="caption" sx={{ color: color.text, fontWeight: 600, fontSize: '0.65rem', textAlign: 'center' }}>
                        {color.label}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

            </Stack>
          </CardContent>
        </TabPanel>
      </Card>
    </Box>
  )
}
