import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
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
import { Card } from '@/components/ui'

export default function AppSettingsPage() {
  const { t, i18n } = useTranslation()
  const muiTheme = useMuiTheme()
  const { mode, toggleTheme, isDark } = useThemeMode()

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>{t('nav.settingsApp')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{t('settings.app.subtitle')}</Typography>

      <Card sx={{ p: 3 }}>
        <Stack spacing={4}>
          <Box>
            <Typography variant="subtitle2" gutterBottom sx={{ mb: 1.5 }}>
              {t('config.appSettings.languageTitle')}
            </Typography>
            <FormControl fullWidth>
              <InputLabel id="language-label">{t('common.language')}</InputLabel>
              <Select labelId="language-label" value={i18n.language} label={t('common.language')} onChange={(e) => void i18n.changeLanguage(e.target.value as string)}>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <MenuItem key={lang.code} value={lang.code}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: i18n.language === lang.code ? 600 : 400 }}>{lang.label}</Typography>
                      {i18n.language === lang.code && <StatusChip label={t('common.active')} color="primary" sx={{ ml: 'auto' }} />}
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

          <Box>
            <Typography variant="subtitle2" gutterBottom sx={{ mb: 1.5 }}>
              {t('config.appSettings.themeTitle')}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{isDark ? t('common.darkMode') : t('common.lightMode')}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {isDark
                      ? t('config.appSettings.darkModeDesc')
                      : t('config.appSettings.lightModeDesc')}
                  </Typography>
                </Box>
              </Box>
              <FormControlLabel control={<Switch checked={isDark} onChange={toggleTheme} color="primary" />} label="" sx={{ m: 0 }} />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {t('config.appSettings.themeHelper')}
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" gutterBottom sx={{ mb: 1.5 }}>
              {t('config.appSettings.paletteTitle', { mode })}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              {[
                { label: t('common.colorNames.primary'), bg: muiTheme.palette.primary.main, text: muiTheme.palette.primary.contrastText },
                { label: t('common.colorNames.secondary'), bg: muiTheme.palette.secondary.main, text: muiTheme.palette.secondary.contrastText },
                { label: t('common.colorNames.success'), bg: muiTheme.palette.success.main, text: muiTheme.palette.getContrastText(muiTheme.palette.success.main) },
                { label: t('common.colorNames.warning'), bg: muiTheme.palette.warning.main, text: muiTheme.palette.getContrastText(muiTheme.palette.warning.main) },
                { label: t('common.colorNames.error'), bg: muiTheme.palette.error.main, text: muiTheme.palette.getContrastText(muiTheme.palette.error.main) },
                { label: t('common.colorNames.info'), bg: muiTheme.palette.info.main, text: muiTheme.palette.getContrastText(muiTheme.palette.info.main) },
              ].map((color) => (
                <Box key={color.label} sx={{ width: 72, height: 72, bgcolor: color.bg, border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="caption" sx={{ color: color.text, fontWeight: 600, fontSize: '0.65rem', textAlign: 'center' }}>{color.label}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Stack>
      </Card>
    </Box>
  )
}
