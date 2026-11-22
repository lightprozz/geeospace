// ---------------------------------------------------------------------------
// hooks/use-process-mutations.ts — TanStack Query mutations for process operations
// Every mutation surfaces the BE's problem detail on failure and refreshes the
// step list in `onSettled`, so a rejected write never leaves the canvas
// showing stale state.
// ---------------------------------------------------------------------------

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api-client'
import {
  createProcess,
  updateProcess,
  deleteProcess,
  reorderProcesses,
  setDenyBranch,
  attachWorklog,
} from '../lib/api'
import type {
  CreateProcessRequest,
  ReorderProcessesRequest,
  DenyBranchRequest,
  AttachWorklogRequest,
} from '../types/workflow'

/** Extracts the BE's human-readable reason from a failed mutation. */
export function describeError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    return err.problem?.detail ?? err.message ?? fallback
  }
  if (err instanceof Error && err.message) return err.message
  return fallback
}

function processKeys(templateId: string) {
  return {
    list: ['form-templates', templateId, 'processes'] as const,
    detail: (processId: string) =>
      ['form-templates', templateId, 'processes', processId] as const,
  }
}

export function useCreateProcessMutation(templateId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateProcessRequest) => createProcess(templateId, request),
    onSuccess: () => {
      toast.success('Đã tạo bước')
    },
    onError: (err) => {
      toast.error(describeError(err, 'Không tạo được bước.'))
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: processKeys(templateId).list })
    },
  })
}

export function useUpdateProcessMutation(templateId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      processId,
      request,
    }: { processId: string; request: CreateProcessRequest }) =>
      updateProcess(templateId, processId, request),
    onSuccess: () => {
      toast.success('Đã cập nhật bước')
    },
    onError: (err) => {
      toast.error(describeError(err, 'Không lưu được bước.'))
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: processKeys(templateId).list })
    },
  })
}

export function useDeleteProcessMutation(templateId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (processId: string) => deleteProcess(templateId, processId),
    onSuccess: () => {
      toast.success('Đã xoá bước')
    },
    onError: (err) => {
      toast.error(describeError(err, 'Không xoá được bước.'))
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: processKeys(templateId).list })
    },
  })
}

export function useReorderProcessesMutation(templateId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (request: ReorderProcessesRequest) => reorderProcesses(templateId, request),
    onError: (err) => {
      toast.error(describeError(err, 'Không sắp xếp lại được các bước.'))
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: processKeys(templateId).list })
    },
  })
}

export function useDenyBranchMutation(templateId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      processId,
      request,
    }: { processId: string; request: DenyBranchRequest }) =>
      setDenyBranch(templateId, processId, request),
    onSuccess: () => {
      toast.success('Đã lưu nhánh từ chối')
    },
    onError: (err) => {
      toast.error(describeError(err, 'Không lưu được nhánh từ chối.'))
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: processKeys(templateId).list })
    },
  })
}

export function useAttachWorklogMutation(templateId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      processId,
      request,
    }: { processId: string; request: AttachWorklogRequest }) =>
      attachWorklog(templateId, processId, request),
    onSuccess: () => {
      toast.success('Đã gắn worklog template')
    },
    onError: (err) => {
      toast.error(describeError(err, 'Không gắn được worklog template.'))
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: processKeys(templateId).list })
    },
  })
}
