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
import Switch from '@mui/material/Switch'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import DoneIcon from '@mui/icons-material/Done'
import CloseIcon from '@mui/icons-material/Close'
import { useTranslation } from 'react-i18next'
import { useCompanies } from '@/hooks/useCompanies'
import { useBranches, useCredentials, useSaveCredentials, useTestConnection } from '@/hooks/useAccurate'
import { useResendSettings, useSaveResendSettings, useSendTestEmail, useSendTestDigestEmail } from '@/hooks/useResendSettings'
import type { AnalisisPeriodType } from '@/types/analisis'
import type { AccurateCredentialsPayload } from '@/types/accurate'
import { Card, DatePicker } from '@/components/ui'
import { useCan } from '@/hooks/useCan'
import { getApiErrorMessage } from '@/utils/apiError'

// ─── Tab 1: Accurate Online ───────────────────────────────────────────────────
function AccurateIntegrationTab() {
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

  // Company berganti -> reset semua field turunannya. Dipanggil langsung dari
  // onChange Select company (bukan lewat useEffect terpisah) - selesai dalam 1 update.
  const handleCompanyChange = (companyId: number) => {
    setSelectedCompanyId(companyId)
    setSelectedBranchId(0)
    setSubdomain('')
    setApiToken('')
    setSignatureSecret('')
    setTestResult({ status: 'idle' })
    setStatus('idle')
  }

  // Sinkron data dari server (query credentials) ke form editable - beda dari kasus
  // lain di file ini yang sudah dipindah ke handler, effect ini REAKTIF ke hasil
  // query (external system), bukan ke aksi user langsung - existingCredentials baru
  // resolve async setelah selectedBranchId berubah, jadi tidak bisa digabung ke
  // handler onChange branch seperti company di atas.
  /* eslint-disable react-hooks/set-state-in-effect */
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
  /* eslint-enable react-hooks/set-state-in-effect */

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
        setStatusMessage(getApiErrorMessage(err, t))
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
        setTestResult({ status: 'fail', message: result.message || t('config.integration.connectionFailed') })
      }
    } catch (err: unknown) {
      setTestResult({ status: 'fail', message: getApiErrorMessage(err, t) })
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
    <Card sx={{ p: 3 }}>
      {status === 'saved' && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setStatus('idle')}>
          {t('config.integration.success')}
        </Alert>
      )}
      {status === 'error' && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setStatus('idle')}>
          {statusMessage || t('config.integration.failedToSave')}
        </Alert>
      )}

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>{t('config.integration.infoTitle')}</strong> {t('config.integration.infoText')}
        <br />
        <strong>{t('config.integration.appKeyLabel')}</strong> <code>86ed8d58-3d00-487b-8e91-661d8f60e434</code>
        <br />
        <strong>{t('config.integration.flowLabel')}</strong> {t('config.integration.flowDescription')}
      </Alert>

      <Stack spacing={3}>
        <FormControl fullWidth>
          <InputLabel>{t('config.integration.selectCompany')}</InputLabel>
          <Select value={selectedCompanyId} label={t('config.integration.selectCompany')} onChange={(e) => handleCompanyChange(Number(e.target.value))}>
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
  )
}

// ─── Tab 2: Resend (task016 Fase C, §21) — konfigurasi email GLOBAL ───────────
function ResendIntegrationTab() {
  const { t } = useTranslation()
  const can = useCan()

  const { data: resendSettings } = useResendSettings()
  const [resendApiKey, setResendApiKey] = useState('')
  const [resendSenderEmail, setResendSenderEmail] = useState('')
  const [resendSenderName, setResendSenderName] = useState('')
  const [resendAppBaseUrl, setResendAppBaseUrl] = useState('')
  const [resendActive, setResendActive] = useState(false)
  const [resendStatus, setResendStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [resendStatusMessage, setResendStatusMessage] = useState('')
  const [testEmailTo, setTestEmailTo] = useState('')
  const [testEmailResult, setTestEmailResult] = useState<{ status: 'idle' | 'testing' | 'success' | 'fail'; message?: string }>({ status: 'idle' })

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (resendSettings) {
      setResendSenderEmail(resendSettings.sender_email ?? '')
      setResendSenderName(resendSettings.sender_name_default ?? '')
      setResendAppBaseUrl(resendSettings.app_base_url ?? '')
      setResendActive(resendSettings.is_active)
    }
  }, [resendSettings])
  /* eslint-enable react-hooks/set-state-in-effect */

  const saveResendMutation = useSaveResendSettings()
  const testEmailMutation = useSendTestEmail()
  const testDigestMutation = useSendTestDigestEmail()
  const [testDigestResult, setTestDigestResult] = useState<{ status: 'idle' | 'testing' | 'success' | 'fail'; message?: string }>({ status: 'idle' })
  // "Kirim Laporan Manual" (task016 §29) — GANTI TOTAL dari dropdown simulasi
  // trigger lama. Admin pilih sendiri period_type + tanggal akhir BEBAS (tidak
  // terikat siklus trigger scheduler), start selalu awal periode yang
  // mengandung tanggal itu, apple-to-apple — MIRROR PERSIS logic filter
  // "Tanggal" di halaman Analisis (task016 §26).
  const [manualPeriodType, setManualPeriodType] = useState<AnalisisPeriodType>('quarter')
  const [manualEndDate, setManualEndDate] = useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })

  const handleSaveResend = async () => {
    setResendStatus('saving')
    setResendStatusMessage('')
    try {
      await saveResendMutation.mutateAsync({
        api_key: resendApiKey.trim() || undefined,
        sender_email: resendSenderEmail.trim(),
        sender_name_default: resendSenderName.trim(),
        app_base_url: resendAppBaseUrl.trim(),
        is_active: resendActive,
      })
      setResendApiKey('')
      setResendStatus('saved')
      setTimeout(() => setResendStatus('idle'), 3000)
    } catch (err: unknown) {
      setResendStatus('error')
      setResendStatusMessage(getApiErrorMessage(err, t))
    }
  }

  const handleSendTestEmail = async () => {
    if (!testEmailTo.trim()) return
    setTestEmailResult({ status: 'testing' })
    try {
      const result = await testEmailMutation.mutateAsync(testEmailTo.trim())
      setTestEmailResult({ status: result.success ? 'success' : 'fail', message: result.message })
    } catch (err: unknown) {
      setTestEmailResult({ status: 'fail', message: getApiErrorMessage(err, t) })
    }
  }

  const handleSendTestDigest = async () => {
    if (!testEmailTo.trim() || !manualEndDate) return
    setTestDigestResult({ status: 'testing' })
    try {
      const result = await testDigestMutation.mutateAsync({ to: testEmailTo.trim(), periodType: manualPeriodType, endDate: manualEndDate })
      setTestDigestResult({ status: result.success ? 'success' : 'fail', message: result.message })
    } catch (err: unknown) {
      setTestDigestResult({ status: 'fail', message: getApiErrorMessage(err, t) })
    }
  }

  if (!can('config.integration:view')) return null

  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 600, mb: 0.5 }}>
        {t('config.integration.resend.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('config.integration.resend.subtitle')}
      </Typography>

      {resendStatus === 'saved' && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setResendStatus('idle')}>
          {t('config.integration.resend.saveSuccess')}
        </Alert>
      )}
      {resendStatus === 'error' && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setResendStatus('idle')}>
          {resendStatusMessage || t('config.integration.resend.saveFail')}
        </Alert>
      )}

      <Alert severity="info" sx={{ mb: 3 }}>{t('config.integration.resend.infoText')}</Alert>

      <Stack spacing={3}>
        <TextField
          fullWidth
          type="password"
          label={t('config.integration.resend.apiKey')}
          value={resendApiKey}
          onChange={(e) => setResendApiKey(e.target.value)}
          placeholder={t('config.integration.resend.apiKeyPlaceholder')}
          helperText={resendSettings?.has_api_key ? t('config.integration.resend.apiKeySetHelper') : t('config.integration.resend.apiKeyHelper')}
        />
        <TextField
          fullWidth
          label={t('config.integration.resend.senderEmail')}
          value={resendSenderEmail}
          onChange={(e) => setResendSenderEmail(e.target.value)}
          placeholder="alert@perusahaan.com"
          helperText={t('config.integration.resend.senderEmailHelper')}
        />
        <TextField
          fullWidth
          label={t('config.integration.resend.senderName')}
          value={resendSenderName}
          onChange={(e) => setResendSenderName(e.target.value)}
          placeholder="Executive Dashboard"
          helperText={t('config.integration.resend.senderNameHelper')}
        />
        <TextField
          fullWidth
          label={t('config.integration.resend.appBaseUrl')}
          value={resendAppBaseUrl}
          onChange={(e) => setResendAppBaseUrl(e.target.value)}
          placeholder="https://dashboard.perusahaan.com"
          helperText={t('config.integration.resend.appBaseUrlHelper')}
        />
        <FormControlLabel
          control={<Switch checked={resendActive} onChange={(e) => setResendActive(e.target.checked)} />}
          label={
            <Box>
              <Typography variant="body2">{t('config.integration.resend.activeLabel')}</Typography>
              <Typography variant="caption" color="text.secondary">{t('config.integration.resend.activeHelper')}</Typography>
            </Box>
          }
        />

        <Divider />

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {(can('config.integration:create') || can('config.integration:update')) && (
            <Button
              variant="contained"
              onClick={handleSaveResend}
              disabled={resendStatus === 'saving'}
              startIcon={resendStatus === 'saving' ? <CircularProgress size={16} /> : undefined}
            >
              {t('config.integration.resend.saveButton')}
            </Button>
          )}
        </Box>

        {can('config.integration:test') && (
          <>
            <Divider />
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <TextField
                label={t('config.integration.resend.testEmailLabel')}
                value={testEmailTo}
                onChange={(e) => setTestEmailTo(e.target.value)}
                placeholder="you@example.com"
                sx={{ minWidth: 260 }}
              />
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleSendTestEmail}
                disabled={!testEmailTo.trim() || testEmailResult.status === 'testing'}
                startIcon={testEmailResult.status === 'testing' ? <CircularProgress size={16} /> : undefined}
              >
                {t('config.integration.resend.testEmailButton')}
              </Button>
              <TextField
                select
                label={t('config.integration.resend.manualPeriodTypeLabel')}
                value={manualPeriodType}
                onChange={(e) => setManualPeriodType(e.target.value as AnalisisPeriodType)}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="monthly">{t('paretoThreshold.period.monthly')}</MenuItem>
                <MenuItem value="quarter">{t('paretoThreshold.period.quarter')}</MenuItem>
                <MenuItem value="semester">{t('paretoThreshold.period.semester')}</MenuItem>
                <MenuItem value="ytd">{t('paretoThreshold.period.ytd')}</MenuItem>
                <MenuItem value="annual">{t('paretoThreshold.period.annual')}</MenuItem>
              </TextField>
              <DatePicker
                label={t('config.integration.resend.manualEndDateLabel')}
                value={manualEndDate}
                onChange={(e) => setManualEndDate(e.target.value)}
                sx={{ minWidth: 170 }}
              />
              <Button
                variant="outlined"
                onClick={handleSendTestDigest}
                disabled={!testEmailTo.trim() || !manualEndDate || testDigestResult.status === 'testing'}
                startIcon={testDigestResult.status === 'testing' ? <CircularProgress size={16} /> : undefined}
              >
                {t('config.integration.resend.testDigestButton')}
              </Button>
            </Box>
            {testEmailResult.status === 'success' && (
              <Alert severity="success" icon={<DoneIcon />}>{testEmailResult.message || t('config.integration.resend.testEmailSuccess')}</Alert>
            )}
            {testEmailResult.status === 'fail' && (
              <Alert severity="error" icon={<CloseIcon />}>{testEmailResult.message || t('config.integration.resend.testEmailFail')}</Alert>
            )}
            {testDigestResult.status === 'success' && (
              <Alert severity="success" icon={<DoneIcon />}>{testDigestResult.message}</Alert>
            )}
            {testDigestResult.status === 'fail' && (
              <Alert severity="error" icon={<CloseIcon />}>{testDigestResult.message || t('config.integration.resend.testDigestFail')}</Alert>
            )}
          </>
        )}
      </Stack>
    </Card>
  )
}

export default function IntegrationPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState(0)

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="pageTitle" sx={{ mb: 0.5 }}>{t('nav.configIntegration')}</Typography>
      <Typography variant="pageSubtitle" sx={{ mb: 3 }}>{t('config.integration.subtitle')}</Typography>

      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label={t('config.integration.tabAccurate')} />
        <Tab label={t('config.integration.tabResend')} />
      </Tabs>

      {activeTab === 0 && <AccurateIntegrationTab />}
      {activeTab === 1 && <ResendIntegrationTab />}
    </Box>
  )
}
