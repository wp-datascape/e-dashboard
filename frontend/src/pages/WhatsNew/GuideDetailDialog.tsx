import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui'
import MarkdownContent from '@/components/ui/MarkdownContent'
import { getGuideContent } from './guideContent'
import type { GuideItem } from '@/config/whatsNewContent'

interface GuideDetailDialogProps {
  guide: GuideItem | null
  onClose: () => void
}

// Detail artikel Guide - reuse Dialog generik (bukan komponen modal baru) +
// MarkdownContent (renderer yang sama dipakai halaman Help), konsisten
// dengan task033 §2 "reuse design system, jangan bikin baru".
export default function GuideDetailDialog({ guide, onClose }: GuideDetailDialogProps) {
  const { t, i18n } = useTranslation()

  return (
    <Dialog
      open={!!guide}
      onClose={onClose}
      title={guide ? t(`whatsnew.guides.${guide.key}.title`) : ''}
      showCloseButton
      maxWidth="md"
    >
      {guide && <MarkdownContent content={getGuideContent(i18n.language, guide.slug)} />}
    </Dialog>
  )
}
