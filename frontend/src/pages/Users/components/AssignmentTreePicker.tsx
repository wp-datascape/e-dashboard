import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import FormHelperText from '@mui/material/FormHelperText';
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { useTranslation } from 'react-i18next';

import { useBranchesByCompany } from '@/hooks/useCompanies';
import { useDivisionOptions } from '@/hooks/useDivisionOptions';
import type { Company, CompanyBranch } from '@/types/companies';
import type { CompanyAssignment, BranchAssignment, DivisionValue } from '@/types/users';

interface AssignmentTreePickerProps {
  companies: Company[];
  value: CompanyAssignment[];
  onChange: (value: CompanyAssignment[]) => void;
  error?: string;
}

// Pilih Company -> per company pilih Branch -> per branch pilih Division.
// Struktur pohon, bukan 3 multi-select independen - pilihan di tingkat bawah
// dibatasi oleh pilihan di tingkat atas (docs-v2/task/task001.md Task D1).
export function AssignmentTreePicker({ companies, value, onChange, error }: AssignmentTreePickerProps) {
  const { t } = useTranslation();
  const selectedCompanyIds = value.map((a) => a.company_id);

  const handleCompanyChange = (companyIds: number[]) => {
    onChange(companyIds.map((cid) => value.find((a) => a.company_id === cid) ?? { company_id: cid, branches: [] }));
  };

  const updateCompanyBranches = (companyId: number, branches: BranchAssignment[]) => {
    onChange(value.map((a) => (a.company_id === companyId ? { ...a, branches } : a)));
  };

  return (
    <Stack spacing={1.5}>
      <FormControl fullWidth size="small" error={!!error}>
        <InputLabel>{t('users.selectCompanies')}</InputLabel>
        <Select
          multiple
          value={selectedCompanyIds}
          onChange={(e) => handleCompanyChange(e.target.value as number[])}
          input={<OutlinedInput label={t('users.selectCompanies')} />}
          renderValue={(selected) =>
            companies
              .filter((c) => (selected as number[]).includes(c.id))
              .map((c) => c.name)
              .join(', ')
          }
        >
          {companies.map((co) => (
            <MenuItem key={co.id} value={co.id}>
              <Checkbox size="small" checked={selectedCompanyIds.includes(co.id)} />
              <ListItemText primary={co.name} />
            </MenuItem>
          ))}
        </Select>
        {error && <FormHelperText>{error}</FormHelperText>}
      </FormControl>

      {value.map((assignment) => {
        const company = companies.find((c) => c.id === assignment.company_id);
        return (
          <CompanyBranchSection
            key={assignment.company_id}
            companyName={company?.name ?? ''}
            assignment={assignment}
            onChange={(branches) => updateCompanyBranches(assignment.company_id, branches)}
          />
        );
      })}
    </Stack>
  );
}

function CompanyBranchSection({
  companyName,
  assignment,
  onChange,
}: {
  companyName: string;
  assignment: CompanyAssignment;
  onChange: (branches: BranchAssignment[]) => void;
}) {
  const { t } = useTranslation();
  const { data: branches = [] } = useBranchesByCompany(assignment.company_id);
  const selectedBranchIds = assignment.branches.map((b) => b.branch_id);

  const handleBranchChange = (branchIds: number[]) => {
    onChange(branchIds.map((bid) => assignment.branches.find((b) => b.branch_id === bid) ?? { branch_id: bid, divisions: [] }));
  };

  const updateBranchDivisions = (branchId: number, divisions: DivisionValue[]) => {
    onChange(assignment.branches.map((b) => (b.branch_id === branchId ? { ...b, divisions } : b)));
  };

  return (
    <Box sx={{ pl: 2, borderLeft: '2px solid', borderColor: 'divider' }}>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        {companyName}
      </Typography>

      {/* D2: warning company tanpa branch ter-assign */}
      {assignment.branches.length === 0 && (
        <Alert severity="warning" sx={{ mb: 1 }}>
          {t('users.warningNoBranch', { company: companyName })}
        </Alert>
      )}

      <FormControl fullWidth size="small" sx={{ mb: 1 }}>
        <InputLabel>{t('users.selectBranches')}</InputLabel>
        <Select
          multiple
          value={selectedBranchIds}
          onChange={(e) => handleBranchChange(e.target.value as number[])}
          input={<OutlinedInput label={t('users.selectBranches')} />}
          renderValue={(selected) =>
            branches
              .filter((b: CompanyBranch) => (selected as number[]).includes(b.id))
              .map((b: CompanyBranch) => b.name)
              .join(', ')
          }
        >
          {branches.map((b: CompanyBranch) => (
            <MenuItem key={b.id} value={b.id}>
              <Checkbox size="small" checked={selectedBranchIds.includes(b.id)} />
              <ListItemText primary={b.name} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {assignment.branches.map((b) => (
        <BranchDivisionSection
          key={b.branch_id}
          companyId={assignment.company_id}
          branchName={branches.find((br: CompanyBranch) => br.id === b.branch_id)?.name ?? ''}
          branchAssignment={b}
          onChange={(divisions) => updateBranchDivisions(b.branch_id, divisions)}
        />
      ))}
    </Box>
  );
}

// Komponen terpisah (bukan inline di dalam .map()) — useDivisionOptions() adalah
// hook, tidak boleh dipanggil di dalam callback .map() (Rules of Hooks). Tiap
// baris branch fetch katalog divisi sendiri, di-scope company+branch yang
// sedang di-assign (task005 Session C — dulu DIVISION_VALUES hardcode 7 kode
// MKO, sekarang dinamis per company/branch).
function BranchDivisionSection({
  companyId,
  branchName,
  branchAssignment,
  onChange,
}: {
  companyId: number;
  branchName: string;
  branchAssignment: BranchAssignment;
  onChange: (divisions: DivisionValue[]) => void;
}) {
  const { t } = useTranslation();
  const divisionOptions = useDivisionOptions(companyId, branchAssignment.branch_id);
  const labelByValue = new Map(divisionOptions.map((opt) => [opt.value, opt.label]));

  return (
    <Box sx={{ pl: 2, mb: 1.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        {branchName}
      </Typography>

      {/* D2: warning branch tanpa division ter-assign */}
      {branchAssignment.divisions.length === 0 && (
        <Alert severity="warning" sx={{ mb: 1 }}>
          {t('users.warningNoDivision', { branch: branchName })}
        </Alert>
      )}

      <FormControl fullWidth size="small">
        <InputLabel>{t('users.selectDivisions')}</InputLabel>
        <Select
          multiple
          value={branchAssignment.divisions}
          onChange={(e) => onChange(e.target.value as DivisionValue[])}
          input={<OutlinedInput label={t('users.selectDivisions')} />}
          renderValue={(selected) =>
            (selected as DivisionValue[]).map((d) => labelByValue.get(d) ?? d).join(', ')
          }
        >
          {divisionOptions.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              <Checkbox size="small" checked={branchAssignment.divisions.includes(opt.value)} />
              <ListItemText primary={opt.label} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}
