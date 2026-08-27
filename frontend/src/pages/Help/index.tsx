import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import DownloadIcon from '@mui/icons-material/Download'
import FunctionsIcon from '@mui/icons-material/Functions'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import InsightsIcon from '@mui/icons-material/Insights'
import { useTranslation } from 'react-i18next'

interface HelpKpiDefinition {
  key: string
  code: string
  title: string
  purpose: string
  formula: string
  definitions: { term: string; desc: string }[]
  interpretation: string[]
  benchmark?: string[]
}

// Dokumen sumber SSOT (task029.md §37) — statis di public/docs, TANPA proteksi
// login (di luar SPA router). Untuk definisi bisnis internal ini risikonya
// sudah diberi tahu eksplisit ke user, bukan disembunyikan.
const REFERENCE_DOC_URL = '/docs/definisi-operasional-customer-loyal-dashboard.docx'

export default function HelpPage() {
  const { t } = useTranslation()
  const kpis = t('help.kpis', { returnObjects: true }) as HelpKpiDefinition[]

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

      <Stack spacing={1.5}>
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
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Chip label={kpi.code} size="small" color="primary" sx={{ fontWeight: 700 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{kpi.title}</Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2.5}>
                <Typography variant="body2" color="text.secondary">{kpi.purpose}</Typography>

                <Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.75 }}>
                    <FunctionsIcon fontSize="small" color="action" />
                    <Typography variant="subtitle2">{t('help.formulaLabel')}</Typography>
                  </Stack>
                  <Box sx={{ px: 2, py: 1.25, bgcolor: 'action.hover', borderRadius: 1, fontFamily: 'monospace' }}>
                    <Typography variant="body2">{kpi.formula}</Typography>
                  </Box>
                </Box>

                <Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.75 }}>
                    <MenuBookIcon fontSize="small" color="action" />
                    <Typography variant="subtitle2">{t('help.definitionsLabel')}</Typography>
                  </Stack>
                  <Stack spacing={1}>
                    {kpi.definitions.map((d) => (
                      <Box key={d.term}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{d.term}</Typography>
                        <Typography variant="body2" color="text.secondary">{d.desc}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>

                <Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.75 }}>
                    <InsightsIcon fontSize="small" color="action" />
                    <Typography variant="subtitle2">{t('help.interpretationLabel')}</Typography>
                  </Stack>
                  <Stack spacing={0.5}>
                    {kpi.interpretation.map((line) => (
                      <Typography key={line} variant="body2" color="text.secondary">• {line}</Typography>
                    ))}
                  </Stack>
                </Box>

                {kpi.benchmark && kpi.benchmark.length > 0 && (
                  <Box>
                    <Divider sx={{ mb: 1.5 }} />
                    <Typography variant="subtitle2" sx={{ mb: 0.75 }}>{t('help.benchmarkLabel')}</Typography>
                    <Stack spacing={0.5}>
                      {kpi.benchmark.map((line) => (
                        <Typography key={line} variant="body2" color="text.secondary">• {line}</Typography>
                      ))}
                    </Stack>
                  </Box>
                )}
              </Stack>
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>
    </Box>
  )
}
