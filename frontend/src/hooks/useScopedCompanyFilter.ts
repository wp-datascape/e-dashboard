import { useState, useEffect } from 'react';
import { useCompanies, useBranchesByCompany } from './useCompanies';
import { useDivisionOptions } from './useDivisionOptions';
import { useMyScope } from './useMyScope';
import { getScopedBranches, getScopedDivisions } from '@/utils/scopeFilters';
import { formatEnumLabel } from '@/utils/format';
import type { Division } from '@/types/customers';

/**
 * State + opsi filter Company/Branch/Division yang dipakai berulang di tiap
 * halaman (Dashboard, Customer/Product/Transaction Workbench) — SSOT supaya
 * tidak duplikasi logic scope-aware di 8+ halaman (docs-v2/task/task001.md
 * Task H). Company berganti -> branch+division direset; branch berganti ->
 * division direset (opsi di bawahnya mungkin sudah tidak valid).
 *
 * Branch dropdown baru bermakna kalau company spesifik dipilih (bukan 'all')
 * DAN ada >1 opsi - caller yang mutuskan render dropdown-nya via showBranchFilter.
 */
export function useScopedCompanyFilter() {
  const { data: companies = [] } = useCompanies();
  const showCompanyFilter = companies.length > 1;

  const [companyId, setCompanyId] = useState<number | 'all'>('all');
  const [branchId, setBranchId] = useState<number | 'all'>('all');
  const [division, setDivision] = useState<NonNullable<Division> | ''>('');

  const myScope = useMyScope();
  const scopedBranches = getScopedBranches(myScope, companyId);
  const { data: allBranches = [] } = useBranchesByCompany(companyId === 'all' ? null : companyId);
  const branchOptions = scopedBranches.restricted
    ? scopedBranches.options.map((b) => ({ id: b.branch_id, name: b.branch_name }))
    : allBranches.map((b) => ({ id: b.id, name: b.name }));
  const showBranchFilter = companyId !== 'all' && branchOptions.length > 1;

  const scopedDivisions = getScopedDivisions(myScope, companyId, branchId);
  const fullDivisionOptions = useDivisionOptions(companyId);
  const divisionOptions = scopedDivisions.restricted
    ? scopedDivisions.options.map((value) => ({ value: value as NonNullable<Division>, label: formatEnumLabel(value) }))
    : fullDivisionOptions;

  useEffect(() => {
    setBranchId('all');
  }, [companyId]);

  useEffect(() => {
    setDivision('');
  }, [branchId]);

  return {
    companies,
    showCompanyFilter,
    companyId,
    setCompanyId,
    branchId,
    setBranchId,
    branchOptions,
    showBranchFilter,
    division,
    setDivision,
    divisionOptions,
  };
}
