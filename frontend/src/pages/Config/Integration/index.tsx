import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormLabel from '@mui/material/FormLabel'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import DoneIcon from '@mui/icons-material/Done'
import CloseIcon from '@mui/icons-material/Close'
import { useTranslation } from 'react-i18next'
import { useCompanies } from '@/hooks/useCompanies'
import { useBranches, useCredentials, useSaveCredentials, useTestConnection } from '@/hooks/useAccurate'
import type { AccurateCredentialsPayload } from '@/types/accurate'
import { Card } from '@/components/ui'
import { useCan } from '@/hooks/useCan'

export default function IntegrationPage() {
  const { t } = useTranslation()
  const can = useCan()

  const { data: companies = [] } = useCompanies()
  const [authMethod, setAuthMethod] = useState<'api-token' | 'oauth'>('api-token')
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(0)
  const [selectedBranchId, setSelectedBranchId] = useState<number>(0)

  const [subdomain, setSubdomain] = useState('')
  const [apiToken, setApiToken] = useState('')
  const [signatureSecret, setSignatureSecret] = useState('')

  const [appKey, setAppKey] = useState('')
  const [signatureSecretOauth, setSignatureSecretOauth] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [callbackUrl, setCallbackUrl] = useState('')
  const [companyDb, setCompanyDb] = useState('')

  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'testing' | 'success' | 'fail'
    message?: string
    host?: string
    alias?: string
    userName?: string
  }>({ status: 'idle' })

  const { data: branches = [] } = useBranches(selectedCompanyId || null)
  const selectedBranch = branches.find((b) => b.id === selectedBranchId)
  const { data: existingCredentials } = useCredentials(selectedBranchId || null)

  useEffect(() => {
    setSelectedBranchId(0)
    setSubdomain('')
    setApiToken('')
    setSignatureSecret('')
    setTestResult({ status: 'idle' })
    setStatus('idle')
  }, [selectedCompanyId])

  useEffect(() => {
    if (existingCredentials) {
      setSubdomain(existingCredentials.subdomain ?? '')
      setApiToken(existingCredentials.api_token ?? '')
      setSignatureSecret(existingCredentials.signature_secret ?? '')
    } else if (selectedBranchId === 0) {
      setSubdomain('')
      setApiToken('')
      setSignatureSecret('')
    }
  }, [existingCredentials, selectedBranchId])

  const saveMutation = useSaveCredentials()
  const testMutation = useTestConnection()

  const isFormValid = authMethod === 'api-token'
    ? (selectedBranchId > 0 && subdomain.trim() && apiToken.startsWith('aat.') && signatureSecret.trim())
    : (selectedBranchId > 0 && appKey.trim() && signatureSecretOauth.trim() && companyDb.trim())

  const handleSave = async () => {
    if (!isFormValid) return
    setStatus('saving')
    setStatusMessage('')
    if (authMethod === 'api-token') {
      const payload: AccurateCredentialsPayload = {
        branch_id: selectedBranchId,
        api_token: apiToken.trim(),
        signature_secret: signatureSecret.trim(),
        subdomain: subdomain.trim(),
      }
      try {
        await saveMutation.mutateAsync(payload)
        setStatus('saved')
        setTimeout(() => setStatus('idle'), 3000)
      } catch (err: unknown) {
        setStatus('error')
        setStatusMessage(err instanceof Error ? err.message : 'Failed to save credentials')
      }
    } else {
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  const handleTestConnection = async () => {
    if (!isFormValid || authMethod !== 'api-token') return
    setTestResult({ status: 'testing' })
    const payload: AccurateCredentialsPayload = {
      branch_id: selectedBranchId,
      api_token: apiToken.trim(),
      signature_secret: signatureSecret.trim(),
      subdomain: subdomain.trim(),
    }
    try {
      const result = await testMutation.mutateAsync(payload)
      if (result.success) {
        setTestResult({ status: 'success', message: result.message, host: result.host, alias: result.alias, userName: result.user_name })
      } else {
        setTestResult({ status: 'fail', message: result.message || 'Connection failed' })
      }
    } catch (err: unknown) {
      setTestResult({ status: 'fail', message: err instanceof Error ? err.message : 'Connection error' })
    }
  }

  const handleReset = () => {
    setSelectedBranchId(0)
    setSubdomain('')
    setApiToken('')
    setSignatureSecret('')
    setAppKey('')
    setSignatureSecretOauth('')
    setClientId('')
    setClientSecret('')
    setCallbackUrl('https://your-domain.com/api/v1/accurate/callback')
    setCompanyDb('')
    setTestResult({ status: 'idle' })
    setStatus('idle')
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>{t('nav.configIntegration')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{t('config.integration.subtitle')}</Typography>

      <Card sx={{ p: 3 }}>
        {status === 'saved' && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setStatus('idle')}>
            {t('config.integration.success')}
          </Alert>
        )}
        {status === 'error' && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setStatus('idle')}>
            {statusMessage || 'Failed to save'}
          </Alert>
        )}

        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>{t('config.integration.infoTitle')}</strong> {t('config.integration.infoText')}
          <br />
          <strong>App Key:</strong> <code>86ed8d58-3d00-487b-8e91-661d8f60e434</code>
          <br />
          <strong>Flow:</strong> API Token + HMAC-SHA256 signature → <code>/api/api-token.do</code> → host → data API
        </Alert>

        <Stack spacing={3}>
          <FormControl fullWidth>
            <InputLabel>{t('config.integration.selectCompany')}</InputLabel>
            <Select value={selectedCompanyId} label={t('config.integration.selectCompany')} onChange={(e) => setSelectedCompanyId(Number(e.target.value))}>
              <MenuItem value={0}><em>— {t('common.select')} —</em></MenuItem>
              {companies.map((c) => <MenuItem key={c.id} value={c.id}>{c.name} ({c.code})</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl fullWidth disabled={!selectedCompanyId}>
            <InputLabel>{t('config.integration.selectBranch')}</InputLabel>
            <Select value={selectedBranchId} label={t('config.integration.selectBranch')} onChange={(e) => setSelectedBranchId(Number(e.target.value))}>
              <MenuItem value={0}><em>— {t('common.select')} —</em></MenuItem>
              {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name} ({b.code})</MenuItem>)}
            </Select>
          </FormControl>

          <Divider />

          <FormControl component="fieldset">
            <FormLabel component="legend">{t('config.integration.authMethod')}</FormLabel>
            <RadioGroup row value={authMethod} onChange={(e) => setAuthMethod(e.target.value as 'api-token' | 'oauth')}>
              <FormControlLabel value="oauth" control={<Radio />} label={t('config.integration.oauthLabel')} />
              <FormControlLabel value="api-token" control={<Radio />} label={t('config.integration.apiTokenLabel')} />
            </RadioGroup>
          </FormControl>

          <Divider />

          {authMethod === 'api-token' && selectedBranch && (
            <>
              <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 600 }}>
                {t('config.integration.apiTokenTitle')} — {selectedBranch.name}
              </Typography>
              <TextField fullWidth label={t('config.integration.subdomain')} value={subdomain} onChange={(e) => setSubdomain(e.target.value)} placeholder="odin" helperText={t('config.integration.subdomainHelper')} />
              <TextField fullWidth label={t('config.integration.apiToken')} value={apiToken} onChange={(e) => setApiToken(e.target.value)} placeholder="aat.MTAw.eyJ2..." helperText={t('config.integration.apiTokenHelper')} type="password" />
              <TextField fullWidth label={t('config.integration.signatureSecret')} value={signatureSecret} onChange={(e) => setSignatureSecret(e.target.value)} placeholder="3soFMSAKxTdkraVPtLqyE2H1..." helperText={t('config.integration.signatureSecretHelper')} type="password" />

              {testResult.status === 'success' && (
                <Alert severity="success" icon={<DoneIcon />}>
                  <strong>{t('config.integration.testSuccess')}</strong>
                  <Box sx={{ mt: 1, fontSize: '0.875rem' }}>
                    <div>{t('config.integration.testUser')}: {testResult.userName}</div>
                    <div>{t('config.integration.testHost')}: {testResult.host}</div>
                    <div>{t('config.integration.testAlias')}: {testResult.alias}</div>
                  </Box>
                </Alert>
              )}
              {testResult.status === 'fail' && (
                <Alert severity="error" icon={<CloseIcon />}>
                  <strong>{t('config.integration.testFail')}</strong>
                  <Box sx={{ mt: 1, fontSize: '0.875rem' }}>{testResult.message}</Box>
                </Alert>
              )}
              {testResult.status === 'testing' && (
                <Alert severity="info" icon={<CircularProgress size={20} />}>{t('config.integration.testing')}</Alert>
              )}
            </>
          )}

          {authMethod === 'oauth' && selectedBranch && (
            <>
              <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 600 }}>
                {t('config.integration.oauthTitle')} — {selectedBranch.name}
              </Typography>
              <TextField fullWidth label={t('config.integration.appKey')} value={appKey} onChange={(e) => setAppKey(e.target.value)} placeholder="86ed8d58-3d00-487b-8e91-661d8f60e434" helperText={t('config.integration.appKeyHelper')} />
              <TextField fullWidth label={t('config.integration.signatureSecret')} type="password" value={signatureSecretOauth} onChange={(e) => setSignatureSecretOauth(e.target.value)} placeholder="3soFMSAKxTdkraVPtLqyE2H1..." helperText={t('config.integration.signatureSecretHelper')} />
              <TextField fullWidth label={t('config.integration.clientId')} value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="c5b8369d-a63f-4443-9500-895117e04f08" helperText={t('config.integration.clientIdHelper')} />
              <TextField fullWidth label={t('config.integration.clientSecret')} type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder="1a4257ad235c73702af2c194e484e6d2" helperText={t('config.integration.clientSecretHelper')} />
              <TextField fullWidth label={t('config.integration.callbackUrl')} value={callbackUrl} onChange={(e) => setCallbackUrl(e.target.value)} placeholder="https://your-domain.com/api/v1/accurate/callback" helperText={t('config.integration.callbackUrlHelper')} />
              <TextField fullWidth label={t('config.integration.companyDb')} value={companyDb} onChange={(e) => setCompanyDb(e.target.value)} placeholder="2704558" helperText={t('config.integration.companyDbHelper')} />
            </>
          )}

          {selectedBranch && (
            <>
              <Alert severity="warning">{t('config.integration.saveWarning')}</Alert>
              <Divider />
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {(can('config.integration:create') || can('config.integration:update')) && (
                  <Button variant="contained" onClick={handleSave} disabled={!isFormValid || status === 'saving'} startIcon={status === 'saving' ? <CircularProgress size={16} /> : undefined}>
                    {t('config.integration.saveButton')}
                  </Button>
                )}
                {authMethod === 'api-token' && can('config.integration:test') && (
                  <Button variant="outlined" color="secondary" onClick={handleTestConnection} disabled={!isFormValid || testResult.status === 'testing'} startIcon={testResult.status === 'testing' ? <CircularProgress size={16} /> : undefined}>
                    {t('config.integration.testButton')}
                  </Button>
                )}
                {can('config.integration:reset') && (
                  <Button variant="outlined" onClick={handleReset}>{t('common.reset')}</Button>
                )}
              </Box>
            </>
          )}
        </Stack>
      </Card>
    </Box>
  )
}
