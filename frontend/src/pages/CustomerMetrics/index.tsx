import { useState } from 'react';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';

import { useCustomerMetrics } from '@/hooks/useMetrics';
import { useCompanies } from '@/hooks/useCompanies';
import { todayIsoDate } from './helpers';
import { M3Revenue }     from './M3Revenue';
import { M4GrossProfit } from './M4GrossProfit';
import { M5HighMargin }  from './M5HighMargin';
import { M6RepeatOrder } from './M6RepeatOrder';
import { M7Expansion }   from './M7Expansion';

export default function CustomerMetrics() {
  const [companyId,  setCompanyId]  = useState<number | 'all'>('all');
  const [periodEnd,  setPeriodEnd]  = useState(todayIsoDate());
  const [division,   setDivision]   = useState<string>('');

  const { data: companies = [] } = useCompanies();
  const { data, isLoading } = useCustomerMetrics({
    company_id:  companyId,
    period_end:  periodEnd,
    division:    division || undefined,
  });

  const trend = data?.trend ?? [];
  const hm    = data?.high_margin_current;
  const ror   = data?.repeat_order_current;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* ── Header + Filter ── */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'flex-start' },
        justifyContent: 'space-between',
        gap: 2,
      }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Customer Metrics
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Metrik 3–7 — Revenue, Gross Profit, High Margin Penetration, Repeat Order Rate, Customer Expansion
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
          <TextField
            select size="small" label="Entitas"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            sx={{ minWidth: { xs: '100%', sm: 160 } }}
          >
            <MenuItem value="all">Semua Entitas</MenuItem>
            {companies.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </TextField>

          <TextField
            select size="small" label="Divisi"
            value={division}
            onChange={(e) => setDivision(e.target.value)}
            sx={{ minWidth: { xs: '100%', sm: 150 } }}
          >
            <MenuItem value="">Semua Divisi</MenuItem>
            <MenuItem value="distribution">Distribution</MenuItem>
            <MenuItem value="project">Project</MenuItem>
            <MenuItem value="e_commerce">E-Commerce</MenuItem>
            <MenuItem value="intercompany">Intercompany</MenuItem>
            <MenuItem value="freelancer">Freelancer</MenuItem>
            <MenuItem value="support">Support</MenuItem>
          </TextField>

          <TextField
            type="date" size="small" label="Per Tanggal"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ minWidth: { xs: '100%', sm: 160 } }}
          />
        </Box>
      </Box>

      {/* ── M3 ── */}
      <M3Revenue trend={trend} isLoading={isLoading} />

      {/* ── M4 ── */}
      <M4GrossProfit
        trend={trend}
        isLoading={isLoading}
        companyId={companyId}
        division={division || undefined}
      />

      {/* ── M5 + M6 (side by side) ── */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <M5HighMargin
            isLoading={isLoading}
            hm={hm}
            companyId={companyId}
            division={division || undefined}
            periodEnd={periodEnd}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <M6RepeatOrder
            isLoading={isLoading}
            value={ror?.value ?? 0}
            thresholdPct={ror?.target_pct ?? 80}
            companyId={companyId}
            division={division || undefined}
            periodEnd={periodEnd}
          />
        </Grid>
      </Grid>

      {/* ── M7 ── */}
      <M7Expansion trend={trend} isLoading={isLoading} />
    </Box>
  );
}
