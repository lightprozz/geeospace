'use client'
// ---------------------------------------------------------------------------
// hooks/use-template-mutations.ts
// TanStack Query mutations for the FRM v2 form-builder.
// ---------------------------------------------------------------------------

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "@/features/forms/window-adapter"
import {
  createTemplate,
  updateTemplate,
  toggleActivate,
  setActive,
  createField,
  updateField,
  deleteField,
  reorderFields,
  type CreateTemplate,
  type UpdateTemplate,
  type NewField,
  type UpsertField,
  type ReorderFields,
} from "../lib/api"
import { templateKeys } from "./use-template"
import { fieldKeys } from "./use-template-fields"

export function useCreateTemplate() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: CreateTemplate) => createTemplate(body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all })
      router.push(`/form-templates/${data.id}/edit`)
    },
  })
}

export function useUpdateTemplate(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: UpdateTemplate) => updateTemplate(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all })
      queryClient.invalidateQueries({ queryKey: templateKeys.detail(id) })
    },
  })
}

export function useToggleActivate(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => toggleActivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all })
      queryClient.invalidateQueries({ queryKey: templateKeys.detail(id) })
    },
  })
}

export function useSetActive(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (isActive: boolean) => setActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all })
      queryClient.invalidateQueries({ queryKey: templateKeys.detail(id) })
    },
  })
}

export function useCreateField(templateId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: NewField) => createField(templateId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.detail(templateId) })
      queryClient.invalidateQueries({ queryKey: fieldKeys.list(templateId) })
    },
  })
}

export function useUpdateField(templateId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ fieldId, body }: { fieldId: string; body: UpsertField }) =>
      updateField(templateId, fieldId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.detail(templateId) })
      queryClient.invalidateQueries({ queryKey: fieldKeys.list(templateId) })
    },
  })
}

export function useDeleteField(templateId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (fieldId: string) => deleteField(templateId, fieldId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.detail(templateId) })
      queryClient.invalidateQueries({ queryKey: fieldKeys.list(templateId) })
    },
  })
}

export function useReorderFields(templateId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: ReorderFields) => reorderFields(templateId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.detail(templateId) })
      queryClient.invalidateQueries({ queryKey: fieldKeys.list(templateId) })
    },
  })
}
