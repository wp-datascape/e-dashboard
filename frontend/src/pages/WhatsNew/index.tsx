import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import TipsAndUpdatesOutlinedIcon from '@mui/icons-material/TipsAndUpdatesOutlined'
import WidgetsOutlinedIcon from '@mui/icons-material/WidgetsOutlined'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Card, StatusChip, Button } from '@/components/ui'
import type { StatusChipColor } from '@/components/ui/StatusChip'
import {
  WHATS_NEW_ITEMS,
  GUIDES,
  TIPS,
  FEATURE_GROUPS,
  type WhatsNewCategory,
  type GuideItem,
} from '@/config/whatsNewContent'
import { normalizeLangCode } from '@/utils/langCode'
import GuideDetailDialog from './GuideDetailDialog'
import SectionHeader from './SectionHeader'

type TabValue = 'all' | 'new' | 'guides' | 'tips'

// new = info baru netral (biru/primary), improved = perubahan positif (hijau/
// success), fixed = penyelesaian masalah, informasional bukan urgent (netral/
// default) - sengaja cuma 3 warna, tidak menambah varian baru (task033 §6
// "jangan membuat terlalu banyak jenis label").
const CATEGORY_COLOR: Record<WhatsNewCategory, StatusChipColor> = {
  new: 'primary',
  improved: 'success',
  fixed: 'default',
}

function formatItemDate(dateIso: string, lang: string): string {
  return new Date(dateIso).toLocaleDateString(normalizeLangCode(lang) === 'id' ? 'id-ID' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function WhatsNewPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabValue>('all')
  const [activeGuide, setActiveGuide] = useState<GuideItem | null>(null)

  const showWhatsNew = tab === 'all' || tab === 'new'
  const showGuides = tab === 'all' || tab === 'guides'
  const showTips = tab === 'all' || tab === 'tips'

  const openGuideByKey = (key: string) => {
    const guide = GUIDES.find((g) => g.key === key)
    if (guide) setActiveGuide(guide)
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="pageTitle">{t('whatsnew.title')}</Typography>
      <Typography variant="pageSubtitle" sx={{ mb: 3 }}>
        {t('whatsnew.subtitle')}
      </Typography>

      {/* Tabs cuma mengatur 3 section dinamis di bawah - Fitur (statis, product
          overview) SELALU tampil di luar filter ini, lihat task033 §3. */}
      <Tabs
        value={tab}
        onChange={(_, v: TabValue) => setTab(v)}
        sx={{
          mb: 3,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': { bgcolor: 'transparent', textTransform: 'none' },
          '& .MuiTab-root.Mui-selected': { bgcolor: 'transparent' },
        }}
      >
        <Tab value="all" label={t('whatsnew.tabs.all')} />
        <Tab value="new" label={t('whatsnew.tabs.whatsNew')} />
        <Tab value="guides" label={t('whatsnew.tabs.guides')} />
        <Tab value="tips" label={t('whatsnew.tabs.tips')} />
      </Tabs>

      <Stack spacing={4}>
        {showWhatsNew && (
          <Box>
            <SectionHeader icon={<AutoAwesomeOutlinedIcon fontSize="small" />} label={t('whatsnew.sections.whatsNew')} />
            <Stack spacing={1.5}>
              {WHATS_NEW_ITEMS.map((item) => (
                <Card key={item.key} sx={{ p: 2.5 }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1, flexWrap: 'wrap' }}>
                    <StatusChip label={t(`whatsnew.badges.${item.category}`)} color={CATEGORY_COLOR[item.category]} />
                    <Typography variant="caption" color="text.secondary">
                      {formatItemDate(item.date, i18n.language)}
                    </Typography>
                  </Stack>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {t(`whatsnew.items.${item.key}.title`)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: item.ctaTo || item.ctaGuideKey ? 1.5 : 0 }}>
                    {t(`whatsnew.items.${item.key}.description`)}
                  </Typography>
                  {item.ctaTo && (
                    <Button
                      size="small"
                      variant="text"
                      endIcon={<ArrowForwardOutlinedIcon />}
                      onClick={() => navigate(item.ctaTo!)}
                      sx={{ px: 0 }}
                    >
                      {t('whatsnew.exploreFeature')}
                    </Button>
                  )}
                  {item.ctaGuideKey && (
                    <Button
                      size="small"
                      variant="text"
                      endIcon={<ArrowForwardOutlinedIcon />}
                      onClick={() => openGuideByKey(item.ctaGuideKey!)}
                      sx={{ px: 0 }}
                    >
                      {t('whatsnew.readGuide')}
                    </Button>
                  )}
                </Card>
              ))}
            </Stack>
          </Box>
        )}

        {showGuides && (
          <Box>
            <SectionHeader icon={<MenuBookOutlinedIcon fontSize="small" />} label={t('whatsnew.sections.guides')} />
            <Grid container spacing={2}>
              {GUIDES.map((guide) => (
                <Grid key={guide.key} size={{ xs: 12, sm: 6 }}>
                  <Card
                    role="button"
                    tabIndex={0}
                    aria-label={t(`whatsnew.guides.${guide.key}.title`)}
                    onClick={() => setActiveGuide(guide)}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setActiveGuide(guide)
                      }
                    }}
                    sx={{
                      p: 2.5,
                      height: '100%',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s',
                      '&:hover': { borderColor: 'primary.main' },
                      '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {t(`whatsnew.guides.${guide.key}.title`)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      {t(`whatsnew.guides.${guide.key}.description`)}
                    </Typography>
                    <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
                      {t('whatsnew.readGuide')} →
                    </Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {showTips && (
          <Box>
            <SectionHeader icon={<TipsAndUpdatesOutlinedIcon fontSize="small" />} label={t('whatsnew.sections.tips')} />
            <Grid container spacing={2}>
              {TIPS.map((tip) => (
                <Grid key={tip.key} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Card sx={{ p: 2.5, height: '100%' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>
                      {t(`whatsnew.tips.${tip.key}.title`)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t(`whatsnew.tips.${tip.key}.body`)}
                    </Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {!showWhatsNew && !showGuides && !showTips && (
          <Typography variant="body2" color="text.secondary">
            {t('whatsnew.emptyState')}
          </Typography>
        )}
      </Stack>

      <Divider sx={{ my: 4 }} />

      {/* Features - statis, SELALU tampil, tidak ikut filter Tabs di atas
          (task033 §3: "product overview, bukan changelog"). */}
      <Box>
        <SectionHeader icon={<WidgetsOutlinedIcon fontSize="small" />} label={t('whatsnew.sections.features')} />
        <Grid container spacing={2}>
          {FEATURE_GROUPS.map((group) => (
            <Grid key={group.key} size={{ xs: 12, sm: 6, md: 3 }}>
              <Card
                role="link"
                tabIndex={0}
                aria-label={t(`whatsnew.features.${group.key}.title`)}
                onClick={() => navigate(group.to)}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate(group.to)
                  }
                }}
                sx={{
                  p: 2.5,
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                  '&:hover': { borderColor: 'primary.main' },
                  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.25 }}>
                  {t(`whatsnew.features.${group.key}.title`)}
                </Typography>
                <Stack spacing={0.75}>
                  {(t(`whatsnew.features.${group.key}.items`, { returnObjects: true }) as string[]).map((label) => (
                    <Typography key={label} variant="body2" color="text.secondary">
                      {label}
                    </Typography>
                  ))}
                </Stack>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      <GuideDetailDialog guide={activeGuide} onClose={() => setActiveGuide(null)} />
    </Box>
  )
}
