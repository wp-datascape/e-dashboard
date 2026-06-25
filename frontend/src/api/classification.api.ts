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
