import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import DownloadIcon from '@mui/icons-material/Download'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnackbar } from 'notistack'
import { Card } from '@/components/ui'
import MarkdownContent from '../../components/ui/MarkdownContent'
import { getHelpContent } from './helpContent'

interface HelpKpi {
  key: string
  code: string
  title: string
}

interface HelpGlossary {
  title: string
}

// Dokumen sumber SSOT (task029.md §37), statis di public/docs, TANPA proteksi
// login (di luar SPA router). Untuk definisi bisnis internal ini risikonya
// sudah diberi tahu eksplisit ke user, bukan disembunyikan.
const REFERENCE_DOC_URL = '/docs/definisi-operasional-customer-loyal-dashboard.docx'
const REFERENCE_DOC_FILENAME = 'definisi-operasional-customer-loyal-dashboard.docx'

export default function HelpPage() {
  const { t, i18n } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const lang = i18n.language
  const kpis = t('help.kpis', { returnObjects: true }) as HelpKpi[]
  const glossary = t('help.glossary', { returnObjects: true }) as HelpGlossary

  // Accordion saling eksklusif - buka satu otomatis tutup yang lain, supaya
  // scroll ke KPI berikutnya tidak numpuk beberapa panel terbuka sekaligus.
  const [expandedKey, setExpandedKey] = useState<string | false>(false)

  // Unduh lewat blob + elemen <a download> sintetis, BUKAN href+target="_blank"
  // langsung - link biasa gagal diam-diam di PWA mode standalone (mobile,
  // "Add to Home Screen") karena tidak ada browsing context baru yang bisa
  // dibuka untuk target="_blank". Pola sama seperti downloadFakturTemplate
  // di api/import.api.ts.
  const handleDownload = async () => {
    try {
      const res = await fetch(REFERENCE_DOC_URL)
      if (!res.ok) throw new Error(String(res.status))
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = REFERENCE_DOC_FILENAME
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      enqueueSnackbar(t('help.downloadError'), { variant: 'error' })
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* flexWrap SENGAJA tidak dipakai - kalau baris ini boleh wrap, tombol
          unduh ikut turun ke bawah judul di layar sempit (flex item yang
          wrap jatuh ke kiri baris baru, bukan tetap di kanan). minWidth:0 di
          blok judul WAJIB supaya teks judul boleh menyusut/wrap sendiri,
          bukan mendorong tombol keluar container. */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="pageTitle">{t('help.title')}</Typography>
          <Typography variant="pageSubtitle">{t('help.subtitle')}</Typography>
        </Box>
        <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={handleDownload} sx={{ flexShrink: 0 }}>
          {t('help.downloadDoc')}
        </Button>
      </Box>

      {/* Sama seperti Card lain di app ini (border 1px + bgcolor, elevation=0,
          tanpa shadow) - full-width & responsive mengikuti kontainer, bukan
          dibatasi lebar artifisial. */}
      <Card sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 2 }}>
          {glossary.title}
        </Typography>
        <MarkdownContent content={getHelpContent(lang, 'glossary')} />
      </Card>

      <Stack spacing={1.5}>
        {kpis.map((kpi) => (
          <Accordion
            key={kpi.key}
            expanded={expandedKey === kpi.key}
            onChange={(_, isExpanded) => setExpandedKey(isExpanded ? kpi.key : false)}
            disableGutters
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              '&:before': { display: 'none' },
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {kpi.code}: {kpi.title}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <MarkdownContent content={getHelpContent(lang, kpi.key)} />
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>
    </Box>
  )
}
