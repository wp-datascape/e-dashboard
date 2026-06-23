import { type ChangeEvent } from 'react'
import Grid from '@mui/material/Grid'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import { useTranslation } from 'react-i18next'
import type { Company } from '@/types/users'

interface CompanyPeriodFieldsProps {
  companies: Company[]
  companyId: number | ''
  periodMonth: string
  onCompany: (v: number) => void
  onPeriod: (v: string) => void
}

export function CompanyPeriodFields({
  companies,
  companyId,
  periodMonth,
  onCompany,
  onPeriod,
}: CompanyPeriodFieldsProps) {
  const { t } = useTranslation()
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6 }}>
        <FormControl fullWidth size="small">
          <InputLabel>{t('import.form.company')}</InputLabel>
          <Select
            value={companyId}
            label={t('import.form.company')}
            onChange={e => onCompany(e.target.value as number)}
          >
            {companies.map(c => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          label={t('import.form.period')}
          type="month"
          size="small"
          value={periodMonth}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onPeriod(e.target.value)}
          placeholder="YYYY-MM"
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ minWidth: 160 }}
          helperText={t('import.form.periodHint')}
        />
      </Grid>
    </Grid>
  )
}