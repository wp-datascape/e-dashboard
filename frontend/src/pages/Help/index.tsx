import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import DownloadIcon from '@mui/icons-material/Download'
import { useTranslation } from 'react-i18next'
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

export default function HelpPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const kpis = t('help.kpis', { returnObjects: true }) as HelpKpi[]
  const glossary = t('help.glossary', { returnObjects: true }) as HelpGlossary

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
        <Box>
          <Typography variant="pageTitle">{t('help.title')}</Typography>
          <Typography variant="pageSubtitle">{t('help.subtitle')}</Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<DownloadIcon />}
          href={REFERENCE_DOC_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('help.downloadDoc')}
        </Button>
      </Box>

      <Divider sx={{ mb: 4 }} />

      <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 2 }}>
        {glossary.title}
      </Typography>
      <MarkdownContent content={getHelpContent(lang, 'glossary')} />

      <Stack spacing={1.5} sx={{ mt: 4 }}>
        {kpis.map((kpi) => (
          <Accordion
            key={kpi.key}
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
