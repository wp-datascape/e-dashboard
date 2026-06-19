import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Card } from '@/components/ui'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import FormLabel from '@mui/material/FormLabel'
import { useTranslation } from 'react-i18next'

export function IntegrationTab() {
  const { t } = useTranslation()
  
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

  const isIntegrationValid = authMethod === 'oauth'
    ? (clientId && clientSecret && callbackUrl && companyDb)
    : (appKey && signatureSecret && companyDb)

  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        {t('config.integration.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('config.integration.subtitle')}
      </Typography>

      {integrationSaved && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setIntegrationSaved(false)}>
          {t('config.integration.success')}
        </Alert>
      )}

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>{t('config.integration.infoTitle')}</strong> {t('config.integration.infoText')}<br />
        <strong>{t('config.integration.infoApiTitle')}</strong> {t('config.integration.infoApiText')}
      </Alert>

      <Stack spacing={3}>
        {/* Auth Method Selector */}
        <FormControl component="fieldset">
          <FormLabel component="legend">{t('config.integration.authMethod')}</FormLabel>
          <RadioGroup
            row
            value={authMethod}
            onChange={(e) => setAuthMethod(e.target.value as 'api-token' | 'oauth')}
          >
            <FormControlLabel value="oauth" control={<Radio />} label={t('config.integration.oauthLabel')} />
            <FormControlLabel value="api-token" control={<Radio />} label={t('config.integration.apiTokenLabel')} />
          </RadioGroup>
        </FormControl>

        <Divider />

        {/* OAuth Method */}
        {authMethod === 'oauth' && (
          <>
            <Typography variant="subtitle2" color="primary">
              {t('config.integration.oauthTitle')}
            </Typography>

            <TextField
              fullWidth
              label={t('config.integration.clientId')}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="c5b8369d-a63f-4443-9500-895117e04f08"
              helperText={t('config.integration.clientIdHelper')}
            />

            <TextField
              fullWidth
              label={t('config.integration.clientSecret')}
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="1a4257ad235c73702af2c194e484e6d2"
              helperText={t('config.integration.clientSecretHelper')}
            />

            <TextField
              fullWidth
              label={t('config.integration.callbackUrl')}
              value={callbackUrl}
              onChange={(e) => setCallbackUrl(e.target.value)}
              placeholder="https://your-domain.com/api/v1/accurate/callback"
              helperText={t('config.integration.callbackUrlHelper')}
            />
          </>
        )}

        {/* API Token Method */}
        {authMethod === 'api-token' && (
          <>
            <Typography variant="subtitle2" color="primary">
              {t('config.integration.apiTokenTitle')}
            </Typography>

            <TextField
              fullWidth
              label={t('config.integration.appKey')}
              value={appKey}
              onChange={(e) => setAppKey(e.target.value)}
              placeholder="5eaa6dda-376a-4dc9-97ba-f5f387bb519f"
              helperText={t('config.integration.appKeyHelper')}
            />

            <TextField
              fullWidth
              label={t('config.integration.signatureSecret')}
              type="password"
              value={signatureSecret}
              onChange={(e) => setSignatureSecret(e.target.value)}
              placeholder="F400EJif1S95iaHjDvfh4pHKemqAe2kpNDruXASDm0JctNVbr4o6VGMgSqph7V0M"
              helperText={t('config.integration.signatureSecretHelper')}
            />
          </>
        )}

        <Divider />

        {/* Common Fields */}
        <Typography variant="subtitle2" color="text.secondary">
          {t('config.integration.dbInfo')}
        </Typography>

        <TextField
          fullWidth
          label={t('config.integration.companyDb')}
          value={companyDb}
          onChange={(e) => setCompanyDb(e.target.value)}
          placeholder="12345"
          helperText={t('config.integration.companyDbHelper')}
        />

        <Alert severity="warning" sx={{ mt: 2 }}>
          {t('config.integration.saveWarning')}
        </Alert>

        <Divider />

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            onClick={handleSaveIntegration}
            disabled={!isIntegrationValid}
          >
            {t('config.integration.saveButton')}
          </Button>
          <Button variant="outlined" onClick={handleResetIntegration}>
            {t('common.reset')}
          </Button>
        </Box>
      </Stack>
    </Card>
  )
}
