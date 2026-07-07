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
import CheckIcon from '@mui/icons-material/Check'
import { useTranslation } from 'react-i18next'
import { useThemeMode } from '@/theme/theme.context'
import { PALETTES, PALETTE_KEYS, type PaletteKey } from '@/theme/palettes'
import { SUPPORTED_LANGUAGES } from '@/i18n/index'
import { StatusChip } from '@/components/ui/StatusChip'
import { Card } from '@/components/ui'
import { useUpdateMyPreferences } from '@/hooks/useAuth'

const PALETTE_LABELS: Record<PaletteKey, string> = {
  blue: 'config.appSettings.paletteBlue',
  green: 'config.appSettings.paletteGreen',
  yellow: 'config.appSettings.paletteYellow',
}

export default function AppSettingsPage() {
  const { t, i18n } = useTranslation()
  const { mode, toggleTheme, isDark, palette, setPalette } = useThemeMode()
  const { mutate: updatePreferences } = useUpdateMyPreferences()

  const handleToggleTheme = () => {
    const next = isDark ? 'light' : 'dark'
    toggleTheme()
    updatePreferences({ theme_mode: next })
  }

  const handleChangeLanguage = (code: string) => {
    void i18n.changeLanguage(code)
    updatePreferences({ language: code })
  }

  const handleChangePalette = (key: PaletteKey) => {
    setPalette(key)
    updatePreferences({ color_palette: key })
  }

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
              <Select labelId="language-label" value={i18n.language} label={t('common.language')} onChange={(e) => handleChangeLanguage(e.target.value as string)}>
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
              <FormControlLabel control={<Switch checked={isDark} onChange={handleToggleTheme} color="primary" />} label="" sx={{ m: 0 }} />
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
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
              {t('config.appSettings.paletteHelper')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              {PALETTE_KEYS.map((key) => {
                const swatch = isDark ? PALETTES[key].primary.dark : PALETTES[key].primary.light
                const selected = palette === key
                return (
                  <Box
                    key={key}
                    onClick={() => handleChangePalette(key)}
                    sx={{
                      width: 88,
                      height: 88,
                      bgcolor: swatch,
                      border: '2px solid',
                      borderColor: selected ? 'text.primary' : 'transparent',
                      borderRadius: 1,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 0.5,
                      transition: 'border-color 0.15s',
                    }}
                  >
                    {selected && <CheckIcon sx={{ color: '#fff', fontSize: 20 }} />}
                    <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600, fontSize: '0.65rem', textAlign: 'center' }}>
                      {t(PALETTE_LABELS[key])}
                    </Typography>
                  </Box>
                )
              })}
            </Box>
          </Box>
        </Stack>
      </Card>
    </Box>
  )
}
