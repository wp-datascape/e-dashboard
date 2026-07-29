import { useState } from 'react';
import { useCompanies, useBranchesByCompany } from './useCompanies';
import { useDivisionOptions } from './useDivisionOptions';
import { useMyScope } from './useMyScope';
import { getScopedBranches, getScopedDivisions } from '@/utils/scopeFilters';

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

  const [companyId, setCompanyIdState] = useState<number | 'all'>('all');
  const [branchId, setBranchIdState] = useState<number | 'all'>('all');
  // Division sekarang FK integer per company (task012 v2) — division_id, bukan
  // string key lagi.
  const [division, setDivision] = useState<number | ''>('');
  // Toggle laporan (bukan RBAC scope) — exclude division 'intercompany' dari hasil
  // metrik. Independen dari company/branch/division di atas (tidak di-reset saat
  // filter lain berubah) - lihat ExcludeIntercompanyToggle.tsx + utils/scope.ts
  // buildExcludeIntercompanyCondition/-Raw (backend, dipakai saat wiring per halaman).
  const [excludeIntercompany, setExcludeIntercompany] = useState(false);

  // Company berganti -> branch+division direset; branch berganti -> division
  // direset (opsi di bawahnya mungkin sudah tidak valid). Reset langsung di setter
  // (bukan lewat useEffect terpisah) - selesai dalam 1 update, bukan 2 render effect
  // beruntun, dan tidak melanggar rule "jangan setState sinkron di dalam effect".
  const setCompanyId = (value: number | 'all') => {
    setCompanyIdState(value);
    setBranchIdState('all');
    setDivision('');
  };

  const setBranchId = (value: number | 'all') => {
    setBranchIdState(value);
    setDivision('');
  };

  const myScope = useMyScope();
  const scopedBranches = getScopedBranches(myScope, companyId);
  const { data: allBranches = [] } = useBranchesByCompany(companyId === 'all' ? null : companyId);
  // company_name cuma terisi di getScopedBranches() saat companyId==='all' (union
  // lintas company) - itulah satu-satunya kondisi nama branch bisa ambigu/bertabrakan
  // (mis. dua company sama-sama punya branch "Jakarta"), jadi suffix cuma muncul di
  // situ. Company spesifik dipilih -> company_name undefined -> tidak ada suffix.
  const branchOptions = scopedBranches.restricted
    ? scopedBranches.options.map((b) => ({
        id: b.branch_id,
        name: b.company_name ? `${b.company_name} - ${b.branch_name}` : b.branch_name,
      }))
    : allBranches.map((b) => ({ id: b.id, name: b.name }));
  // companyId==='all' tetap bisa tampilkan branch filter untuk user restricted (union branch
  // lintas company miliknya) - cuma unrestricted/superadmin yang di company='all' tidak
  // punya konteks branch sama sekali (branchOptions otomatis kosong, lihat scopeFilters.ts).
  const showBranchFilter = branchOptions.length > 1;

  const scopedDivisions = getScopedDivisions(myScope, companyId, branchId);
  const fullDivisionOptions = useDivisionOptions(companyId);
  // Scope tree cuma punya division_id (task012 v2) — label diambil dari
  // fullDivisionOptions (katalog divisions company ini, sudah include id+label),
  // difilter ke ID yang di-assign user.
  const divisionOptions = scopedDivisions.restricted
    ? fullDivisionOptions.filter((opt) => scopedDivisions.options.includes(opt.value))
    : fullDivisionOptions;
  const showDivisionFilter = divisionOptions.length > 1;

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
    showDivisionFilter,
    excludeIntercompany,
    setExcludeIntercompany,
  };
}
