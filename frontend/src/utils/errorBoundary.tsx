import { Component, type ReactNode, type ErrorInfo } from 'react'
import { isChunkLoadError, CHUNK_RELOAD_FLAG } from './chunkLoadError'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import CircularProgress from '@mui/material/CircularProgress'

import { styled } from '@mui/material/styles'
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import HomeIcon from '@mui/icons-material/Home'
import i18n from '@/i18n'

// ─── Styled ───────────────────────────────────────────────────────────────────
const Wrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.default,
}))

const ErrorCard = styled(Paper)(({ theme }) => ({
  maxWidth: 480,
  width: '100%',
  padding: theme.spacing(5),
  textAlign: 'center',
}))

const IconWrap = styled(Box)(({ theme }) => ({
  width: 64,
  height: 64,
  borderRadius: '50%',
  backgroundColor: theme.palette.error.main + '18',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto',
  marginBottom: theme.spacing(3),
  '& svg': {
    fontSize: 32,
    color: theme.palette.error.main,
  },
}))

const ErrorCode = styled('pre')(({ theme }) => ({
  marginTop: theme.spacing(2),
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.action.hover,
  fontSize: '0.75rem',
  color: theme.palette.text.secondary,
  textAlign: 'left',
  overflow: 'auto',
  maxHeight: 120,
  fontFamily: theme.typography.caption.fontFamily,
}))

// ─── Props & State ────────────────────────────────────────────────────────────
interface Props {
  children: ReactNode
  /** Tampilkan error detail (hanya di development) */
  showDetail?: boolean
  /** Callback ketika error terjadi */
  onError?: (error: Error, info: ErrorInfo) => void
  /** Fallback custom (opsional) */
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

// ─── Component ────────────────────────────────────────────────────────────────
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ errorInfo: info })
    this.props.onError?.(error, info)

    // Log ke console — selalu, karena error boundary penting untuk debug
    // (di production, idealnya dikirim ke Sentry/monitoring tool)
    console.error('[ErrorBoundary]', error, info)

    // Chunk JS lazy-load gagal (biasanya setelah deploy baru — lihat
    // utils/chunkLoadError.ts) → satu-satunya perbaikan yang benar adalah reload,
    // user tidak perlu diminta klik manual. Guard sessionStorage cegah infinite
    // loop kalau reload TERNYATA masih gagal (server down beneran, bukan stale cache).
    if (isChunkLoadError(error) && !sessionStorage.getItem(CHUNK_RELOAD_FLAG)) {
      sessionStorage.setItem(CHUNK_RELOAD_FLAG, '1')
      window.location.reload()
    }
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = '/'
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  override render() {
    const { hasError, error, errorInfo } = this.state
    const { children, fallback, showDetail } = this.props

    if (!hasError) return children

    // Chunk error yang belum pernah dicoba reload — componentDidCatch akan reload
    // sesaat lagi (lihat di atas), tampilkan loading ringan alih-alih error card
    // penuh supaya tidak ada kedipan tombol yang langsung hilang.
    if (error && isChunkLoadError(error) && !sessionStorage.getItem(CHUNK_RELOAD_FLAG)) {
      return (
        <Wrapper>
          <CircularProgress size={32} />
        </Wrapper>
      )
    }

    // Gunakan custom fallback jika ada
    if (fallback) return fallback

    const isDev = import.meta.env.DEV
    const showErrorDetail = showDetail ?? isDev

    return (
      <Wrapper>
        <ErrorCard elevation={0}>
          <IconWrap>
            <ReportProblemOutlinedIcon />
          </IconWrap>

          <Typography variant="h5" sx={{ fontWeight: 700 }} gutterBottom>
            {i18n.t('error.boundary.title')}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {i18n.t('error.boundary.subtitle')}
          </Typography>

          {showErrorDetail && error && (
            <ErrorCode>
              {error.name}: {error.message}
              {errorInfo?.componentStack && (
                <>
                  {'\n\n'}
                  {errorInfo.componentStack.trim()}
                </>
              )}
            </ErrorCode>
          )}

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 4 }}>
            <Button
              variant="outlined"
              startIcon={<HomeIcon />}
              onClick={this.handleGoHome}
            >
              {i18n.t('error.boundary.goHome')}
            </Button>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={this.handleReload}
            >
              {i18n.t('error.boundary.reload')}
            </Button>
          </Box>

          {isDev && (
            <Button
              size="small"
              color="secondary"
              sx={{ mt: 2, textDecoration: 'underline' }}
              onClick={this.handleRetry}
            >
              Coba Render Ulang (Dev Only)
            </Button>
          )}
        </ErrorCard>
      </Wrapper>
    )
  }
}

// ─── Inline / Section Error Boundary ─────────────────────────────────────────
// Dipakai untuk wrap section kecil (bukan full-page)
interface SectionErrorBoundaryProps {
  children: ReactNode
  label?: string
}

interface SectionState {
  hasError: boolean
}

export class SectionErrorBoundary extends Component<SectionErrorBoundaryProps, SectionState> {
  constructor(props: SectionErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): SectionState {
    return { hasError: true }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[SectionErrorBoundary: ${this.props.label ?? 'unknown'}]`, error, info)
  }

  override render() {
    if (!this.state.hasError) return this.props.children

    return (
      <Box
        sx={{
          p: 3,
          textAlign: 'center',
          border: '1px dashed',
          borderColor: 'error.main',
          borderRadius: 2,
          color: 'text.secondary',
        }}
      >
        <ReportProblemOutlinedIcon sx={{ mb: 1, color: 'error.main', fontSize: 28 }} />
        <Typography variant="body2">
          {this.props.label ? `Gagal memuat: ${this.props.label}` : 'Gagal memuat komponen ini'}
        </Typography>
        <Button
          size="small"
          sx={{ mt: 1 }}
          onClick={() => this.setState({ hasError: false })}
        >
          Coba Lagi
        </Button>
      </Box>
    )
  }
}
