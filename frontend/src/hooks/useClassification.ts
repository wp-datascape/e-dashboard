import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getClassificationRules,
  createClassificationRule,
  updateClassificationRule,
  deleteClassificationRule,
  type ClassificationRule,
  type CreateRulePayload,
} from '@/api/classification.api'

export type { ClassificationRule }

export const useClassificationRules = (company_id?: number) =>
  useQuery({
    queryKey: ['classification-rules', company_id],
    queryFn: () => getClassificationRules(company_id).then(r => r.data.data ?? []),
  })

export const useCreateClassificationRule = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateRulePayload) => createClassificationRule(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['classification-rules'] }),
  })
}

export const useUpdateClassificationRule = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ClassificationRule> }) =>
      updateClassificationRule(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['classification-rules'] }),
  })
}

export const useDeleteClassificationRule = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteClassificationRule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['classification-rules'] }),
  })
}
