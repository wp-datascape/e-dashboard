import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Card } from '@/components/ui'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import { useTranslation } from 'react-i18next'
import { useTheme as useMuiTheme } from '@mui/material/styles'
import { useThemeMode } from '@/theme/theme.context'
import { SUPPORTED_LANGUAGES } from '@/i18n/index'
import { StatusChip } from '@/components/ui/StatusChip'

export function AppSettingsTab() {
  const { t, i18n } = useTranslation()
  const muiTheme = useMuiTheme()
  const { mode, toggleTheme, isDark } = useThemeMode()

  // ── Language: langsung apply saat ganti, tersimpan otomatis via i18n localStorage ──
  const handleLanguageChange = (code: string) => {
    void i18n.changeLanguage(code)
  }

  // ── Dark Mode: langsung toggle via ThemeContext, tersimpan otomatis via localStorage ──
  const handleThemeToggle = () => {
    toggleTheme()
  }

  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        {t('config.appSettings.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('config.appSettings.subtitle')}
      </Typography>

      <Stack spacing={4}>
        {/* ── Language Selection ── */}
        <Box>
          <Typography variant="subtitle2" gutterBottom sx={{ mb: 1.5 }}>
            🌐 {t('config.appSettings.languageTitle')}
          </Typography>
          <FormControl fullWidth>
            <InputLabel id="language-label">{t('common.language')}</InputLabel>
            <Select
              labelId="language-label"
              value={i18n.language}
              label={t('common.language')}
              onChange={(e) => handleLanguageChange(e.target.value as string)}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <MenuItem key={lang.code} value={lang.code}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <span style={{ fontSize: '1.2rem' }}>{lang.flag}</span>
                    <Typography variant="body2" sx={{ fontWeight: i18n.language === lang.code ? 600 : 400 }}>
                      {lang.label}
                    </Typography>
                    {i18n.language === lang.code && (
                      <StatusChip label={t('common.active')} color="primary" sx={{ ml: 'auto' }} />
                    )}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {t('config.appSettings.languageHelper')}
          </Typography>
        </Box>

        <Divider />

        {/* ── Dark Mode Toggle ── */}
        <Box>
          <Typography variant="subtitle2" gutterBottom sx={{ mb: 1.5 }}>
            🎨 {t('config.appSettings.themeTitle')}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
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
                  {isDark ? t('common.darkMode') : t('common.lightMode')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {isDark
                    ? t('theme.darkModeDesc', 'Tema gelap — mengurangi ketegangan mata di lingkungan redup')
                    : t('theme.lightModeDesc', 'Tema terang — visibilitas lebih baik di lingkungan terang')
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
            {t('config.appSettings.themeHelper')}
          </Typography>
        </Box>

        <Divider />

        {/* ── Theme Color Preview ── */}
        <Box>
          <Typography variant="subtitle2" gutterBottom sx={{ mb: 1.5 }}>
            🎨 {t('config.appSettings.paletteTitle', { mode })}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {[
              { label: 'Primary', bg: muiTheme.palette.primary.main, text: muiTheme.palette.primary.contrastText },
              { label: 'Secondary', bg: muiTheme.palette.secondary.main, text: muiTheme.palette.secondary.contrastText },
              { label: 'Success', bg: muiTheme.palette.success.main, text: muiTheme.palette.getContrastText(muiTheme.palette.success.main) },
              { label: 'Warning', bg: muiTheme.palette.warning.main, text: muiTheme.palette.getContrastText(muiTheme.palette.warning.main) },
              { label: 'Error', bg: muiTheme.palette.error.main, text: muiTheme.palette.getContrastText(muiTheme.palette.error.main) },
              { label: 'Info', bg: muiTheme.palette.info.main, text: muiTheme.palette.getContrastText(muiTheme.palette.info.main) },
            ].map((color) => (
              <Box
                key={color.label}
                sx={{
                  width: 72,
                  height: 72,
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
    </Card>
  )
}
