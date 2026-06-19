import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import { Card } from '@/components/ui';
import Divider from '@mui/material/Divider';
import { useTranslation } from 'react-i18next';
import { StatusChip } from '@/components/ui/StatusChip';
import type { CrossSellingDetailRow } from '@/types/metrics';

interface DetailCardProps {
  row: CrossSellingDetailRow;
}

export function DetailCard({ row }: DetailCardProps) {
  const { t } = useTranslation();

  return (
    <Card sx={{ mb: 1.5 }}>
      <CardContent sx={{ pb: '12px !important' }}>
        {/* Customer name + code */}
        <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.25 }}>
          {row.customer_name}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.25 }}>
          {row.customer_code}
        </Typography>

        <Divider sx={{ mb: 1.25 }} />

        {/* Category chips */}
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1.25 }}>
          <StatusChip
            label={t('crossSelling.colHardware')}
            color={row.hardware ? 'primary' : 'default'}
          />
          <StatusChip
            label={t('crossSelling.colConsumable')}
            color={row.consumable ? 'primary' : 'default'}
          />
          <StatusChip
            label={t('metrics.service', 'Service')}
            color={row.service ? 'primary' : 'default'}
          />
        </Box>

        {/* Stats row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('crossSelling.colCategoryCount')}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {row.category_count}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary">
              {t('crossSelling.colTotalRevenue')}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
              Rp {row.total_revenue.toLocaleString('id-ID')}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
