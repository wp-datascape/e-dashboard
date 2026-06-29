import { api } from '@/api/axios'

export interface ClassificationRule {
  id: number
  company_id: number | null
  match_type: string
  match_pattern: string
  item_type: string
  priority: number
  is_active: boolean
}

export interface CreateRulePayload {
  match_type: string
  match_pattern: string
  item_type: string
  is_active: boolean
}

export const getClassificationRules = (company_id?: number) =>
  api.get<{ data: ClassificationRule[] }>('/classification-rules', {
    params: company_id ? { company_id } : undefined,
  })

export const createClassificationRule = (data: CreateRulePayload) =>
  api.post<{ data: ClassificationRule }>('/classification-rules', data)

export const updateClassificationRule = (id: number, data: Partial<ClassificationRule>) =>
  api.put<{ data: ClassificationRule }>(`/classification-rules/${id}`, data)

export const deleteClassificationRule = (id: number) =>
  api.delete(`/classification-rules/${id}`)

export interface ImportClassificationResult {
  added: number
  skipped: number
  errors: Array<{ row: number; message: string }>
}

export const importClassificationRules = async (file: File, companyId: number): Promise<ImportClassificationResult> => {
  const form = new FormData()
  form.append('file', file)
  form.append('company_id', String(companyId))
  const res = await api.post<{ data: ImportClassificationResult }>('/classification-rules/import', form)
  return res.data.data
}

export const downloadClassificationTemplate = async (): Promise<void> => {
  const res = await api.get('/classification-rules/template', { responseType: 'blob' })
  const url = URL.createObjectURL(new Blob([res.data as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'classification_rules_template.xlsx'
  a.click()
  URL.revokeObjectURL(url)
}
